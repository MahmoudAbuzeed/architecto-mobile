import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  Card,
  GhostButton,
  MonoText,
  PrimaryButton,
  Screen,
} from '@/components/Primitives';
import { PressableScale } from '@/components/PressableScale';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { useAuthStore, selectIsPro } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';
import { strings } from '@/i18n/strings';
import { paywallCopyFor } from '@/i18n/paywall-copy';
import { isArabic } from '@/lib/languages';
import { haptic } from '@/lib/haptics';
import { PRIVACY_URL, TERMS_URL } from '@/services/env';
import * as purchases from '@/lib/purchases';
import type { RcOffering, RcPackage } from '@/lib/purchases';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Plan = 'monthly' | 'annual';
type Phase = 'idle' | 'purchasing' | 'activating';

/**
 * The real in-app-purchase paywall (RevenueCat). Sells Pro's value, reads live
 * prices from the store, and completes the purchase via StoreKit. Pro is
 * server-driven, so after a purchase we optimistically switch to "activating"
 * and poll /auth/me (reconcilePro) until the RevenueCat→backend webhook flips
 * the subscription row. Degrades to a Close+Restore card if offerings/SDK are
 * unavailable — never a dead-end. Reached only when purchases.isAvailable().
 */
export function PaywallScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const rtl = isArabic(contentLanguage);
  const copy = paywallCopyFor(contentLanguage);
  const reconcilePro = useAuthStore((s) => s.reconcilePro);

  // undefined = loading, null = unavailable, else the offering.
  const [offering, setOffering] = useState<RcOffering | null | undefined>(
    undefined,
  );
  const [plan, setPlan] = useState<Plan>('annual');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void purchases.getOfferings().then((o) => {
      if (!alive) return;
      setOffering(o);
      // Default to whichever plan exists; prefer annual.
      if (o && !o.annual && o.monthly) setPlan('monthly');
    });
    return () => {
      alive = false;
    };
  }, []);

  const selectedPkg: RcPackage | null = useMemo(() => {
    if (!offering) return null;
    const primary = plan === 'annual' ? offering.annual : offering.monthly;
    return primary ?? offering.annual ?? offering.monthly ?? null;
  }, [offering, plan]);

  // Annual saving vs. paying monthly for 12 months.
  const savingsPct = useMemo(() => {
    const m = offering?.monthly?.price;
    const a = offering?.annual?.price;
    if (!m || !a) return 0;
    const pct = Math.round((1 - a / 12 / m) * 100);
    return pct > 0 ? pct : 0;
  }, [offering]);

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const onPurchase = useCallback(async () => {
    if (!selectedPkg || phase !== 'idle') return;
    setError(null);
    setNotice(null);
    haptic('impactLight');
    setPhase('purchasing');
    const res = await purchases.purchasePackage(selectedPkg);
    if (res.status === 'cancelled') {
      setPhase('idle');
      return;
    }
    if (res.status === 'error') {
      setError(strings.paywall.purchaseError);
      setPhase('idle');
      return;
    }
    // Purchased — reconcile the server-side Pro row (webhook may lag).
    setPhase('activating');
    const ok = await reconcilePro();
    if (ok) {
      haptic('selection');
      close();
    } else {
      setNotice(strings.paywall.pending);
      setPhase('idle');
    }
  }, [selectedPkg, phase, reconcilePro, close]);

  const onRestore = useCallback(async () => {
    if (phase !== 'idle') return;
    setError(null);
    setNotice(null);
    const { isProEntitled } = await purchases.restorePurchases();
    if (!isProEntitled) {
      setNotice(strings.paywall.restoreNone);
      return;
    }
    setPhase('activating');
    const ok = await reconcilePro();
    if (ok || selectIsPro(useAuthStore.getState())) {
      haptic('selection');
      close();
    } else {
      setNotice(strings.paywall.pending);
      setPhase('idle');
    }
  }, [phase, reconcilePro, close]);

  const busy = phase !== 'idle';
  const rtlText = rtl && styles.rtl;

  const header = (
    <View style={styles.header}>
      <Pressable onPress={close} hitSlop={12}>
        <CloseIcon size={18} color={theme.textSecondary} />
      </Pressable>
      <MonoText weight="semiBold" color={theme.xp} style={styles.kicker}>
        {strings.paywall.kicker}
      </MonoText>
      <View style={styles.headerSpacer} />
    </View>
  );

  // ── Fallback: offerings/SDK unavailable — never a dead-end ────────────
  if (offering === null) {
    return (
      <Screen edges={['top', 'bottom']}>
        {header}
        <View style={styles.center}>
          <AppText style={[styles.hero, { color: theme.text }, rtlText]}>
            {copy.hero}
          </AppText>
          <AppText secondary style={[styles.fallbackBody, rtlText]}>
            {strings.paywall.unavailableBody}
          </AppText>
          {notice ? (
            <AppText secondary style={styles.notice}>
              {notice}
            </AppText>
          ) : null}
          <GhostButton
            label={strings.paywall.restore}
            onPress={() => void onRestore()}
            bordered={false}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText style={[styles.hero, { color: theme.text }, rtlText]}>
          {copy.hero}
        </AppText>
        <AppText secondary style={[styles.subtitle, rtlText]}>
          {copy.subtitle}
        </AppText>

        <Card style={styles.bullets}>
          {copy.bullets.map((b, i) => (
            <View key={i} style={[styles.bulletRow, rtl && styles.rowRtl]}>
              <CheckIcon size={14} color={theme.emerald} />
              <AppText style={[styles.bulletText, rtlText]}>{b}</AppText>
            </View>
          ))}
        </Card>

        {/* Plan selector */}
        <View style={styles.plans}>
          <PlanOption
            label={strings.paywall.monthly}
            pkg={offering?.monthly ?? null}
            period={strings.paywall.perMonth}
            selected={plan === 'monthly'}
            loading={offering === undefined}
            onPress={() => setPlan('monthly')}
            rtl={rtl}
          />
          <PlanOption
            label={strings.paywall.annual}
            pkg={offering?.annual ?? null}
            period={strings.paywall.perYear}
            selected={plan === 'annual'}
            loading={offering === undefined}
            badge={savingsPct > 0 ? strings.paywall.saveBadge(savingsPct) : undefined}
            onPress={() => setPlan('annual')}
            rtl={rtl}
          />
        </View>

        {error ? (
          <AppText style={[styles.error, { color: theme.red }]}>{error}</AppText>
        ) : null}
        {notice ? (
          <AppText secondary style={styles.notice}>
            {notice}
          </AppText>
        ) : null}

        <PrimaryButton
          label={phase === 'activating' ? strings.paywall.activating : strings.paywall.cta}
          onPress={() => void onPurchase()}
          disabled={busy || !selectedPkg}
          icon={busy ? <ActivityIndicator color={theme.actionText} size="small" /> : undefined}
          style={styles.cta}
        />
        <GhostButton
          label={strings.paywall.restore}
          onPress={() => void onRestore()}
          bordered={false}
        />

        {/* Auto-renew disclosure + legal (App Store 3.1.2) */}
        <AppText dim style={[styles.disclosure, rtlText]}>
          {strings.paywall.autoRenewDisclosure}
        </AppText>
        <Text style={[styles.legal, { color: theme.textDim }, rtlText]}>
          {strings.paywall.termsPrefix}
          <Text
            style={[styles.link, { color: theme.textDim }]}
            onPress={() => Linking.openURL(TERMS_URL)}
          >
            {strings.paywall.termsLink}
          </Text>
          {strings.paywall.and}
          <Text
            style={[styles.link, { color: theme.textDim }]}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >
            {strings.paywall.privacyLink}
          </Text>
          {strings.paywall.period}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function PlanOption({
  label,
  pkg,
  period,
  selected,
  loading,
  badge,
  onPress,
  rtl,
}: {
  label: string;
  pkg: RcPackage | null;
  period: string;
  selected: boolean;
  loading: boolean;
  badge?: string;
  onPress: () => void;
  rtl: boolean;
}) {
  const theme = useTheme();
  const price = loading
    ? strings.paywall.loadingPrice
    : (pkg?.priceString ?? strings.paywall.loadingPrice);
  return (
    <PressableScale
      onPress={onPress}
      haptics
      disabled={!loading && !pkg}
      style={[
        styles.plan,
        {
          borderColor: selected ? theme.accent : theme.borderStrong,
          backgroundColor: theme.card,
        },
        !loading && !pkg && styles.planUnavailable,
      ]}
    >
      <View style={[styles.planTop, rtl && styles.rowRtl]}>
        <MonoText weight="semiBold" color={theme.textSecondary} style={styles.planLabel}>
          {label.toUpperCase()}
        </MonoText>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
            <MonoText weight="bold" color={theme.accent} style={styles.badgeText}>
              {badge}
            </MonoText>
          </View>
        ) : null}
      </View>
      <View style={[styles.planPriceRow, rtl && styles.rowRtl]}>
        <AppText style={[styles.planPrice, { color: theme.text }]}>{price}</AppText>
        <AppText dim style={styles.planPeriod}>
          {period}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  kicker: { fontSize: 11, letterSpacing: 2 },
  headerSpacer: { width: 18 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  hero: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, lineHeight: 32 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  fallbackBody: { fontSize: 14.5, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  bullets: { padding: 16, gap: 12, marginTop: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowRtl: { flexDirection: 'row-reverse' },
  bulletText: { flex: 1, fontSize: 14.5, lineHeight: 21 },
  plans: { flexDirection: 'row', gap: 10, marginTop: 2 },
  plan: { flex: 1, borderWidth: 1.5, borderRadius: radius.lg, padding: 14, gap: 10 },
  planUnavailable: { opacity: 0.5 },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planLabel: { fontSize: 10.5, letterSpacing: 1.2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 9.5, letterSpacing: 0.5 },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  planPrice: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  planPeriod: { fontSize: 12, marginBottom: 2 },
  cta: { marginTop: 6 },
  error: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  notice: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  disclosure: { fontSize: 11.5, lineHeight: 16, textAlign: 'center', marginTop: 6 },
  legal: { fontSize: 11.5, lineHeight: 16, textAlign: 'center' },
  link: { textDecorationLine: 'underline' },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
});
