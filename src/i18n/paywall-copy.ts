import { isArabic } from '@/lib/languages';
import type { ContentLanguage } from '@/lib/languages';

/**
 * Paywall value-prop copy. Like [[journey-copy]], the hero + benefit bullets are
 * content-adjacent motivational strings, so they follow the user's
 * contentLanguage (one Arabic set for every dialect). The plan-selector labels,
 * prices, CTA and legal disclosure are UI chrome and live in [[strings]].
 *
 * Bullets are accurate to the `pro` plan's capabilities (learnTopics + on-demand
 * topics, voiceListen) — do not promise features the plan doesn't grant.
 */
export interface PaywallCopy {
  hero: string;
  subtitle: string;
  bullets: string[];
  // Web-checkout upgrade flow. Only ever shown when the `payment_web_mobile`
  // flag is ON (i.e. never during Apple review). All copy stays price-free and
  // store-neutral — plans and prices live on the web.
  webUpgradeTitle: string;
  webUpgradeBody: string;
  webUpgradeCta: string;
  notNow: string;
  profileUpgradeCta: string;
  webOpenErrorTitle: string;
  webOpenErrorBody: string;
  proUnlockedTitle: string;
  proUnlockedBody: string;
}

const EN: PaywallCopy = {
  hero: 'Go Pro. Master every answer.',
  subtitle: 'Five minutes a day adds up faster with the whole path unlocked.',
  bullets: [
    'Every topic, unlocked — learn ahead, no daily gate',
    'Unlimited Listen — Archie reads every lesson aloud',
    'The full journey across all tracks',
    'Keep your streak compounding',
  ],
  webUpgradeTitle: 'Go further with Pro.',
  webUpgradeBody:
    'Unlock every topic, unlimited listening, and the full journey. Continue on the web to see plans and subscribe.',
  webUpgradeCta: 'Continue on the web',
  notNow: 'Not now',
  profileUpgradeCta: 'Upgrade to Pro',
  webOpenErrorTitle: 'Couldn’t open the upgrade page.',
  webOpenErrorBody: 'Check your connection and try again.',
  proUnlockedTitle: 'Pro unlocked.',
  proUnlockedBody: 'Everything is open. Go learn something.',
};

const AR: PaywallCopy = {
  hero: 'اشترك في Pro. أتقن كل إجابة.',
  subtitle: 'خمس دقائق يوميًا تتراكم أسرع حين يكون المسار كله مفتوحًا.',
  bullets: [
    'كل المواضيع مفتوحة — تعلّم بلا حدود يومية',
    'استماع بلا حدود — يقرأ آرتشي كل درس بصوته',
    'المسار الكامل عبر جميع المجالات',
    'حافظ على تصاعد إنجازك اليومي',
  ],
  webUpgradeTitle: 'انطلق أبعد مع Pro.',
  webUpgradeBody:
    'افتح كل المواضيع والاستماع بلا حدود والمسار الكامل. تابع على الويب لعرض الخطط والاشتراك.',
  webUpgradeCta: 'المتابعة على الويب',
  notNow: 'ليس الآن',
  profileUpgradeCta: 'الترقية إلى Pro',
  webOpenErrorTitle: 'تعذّر فتح صفحة الترقية.',
  webOpenErrorBody: 'تحقق من اتصالك وحاول مرة أخرى.',
  proUnlockedTitle: 'تم تفعيل Pro.',
  proUnlockedBody: 'كل شيء مفتوح الآن. هيا تعلّم شيئًا.',
};

export function paywallCopyFor(language: ContentLanguage): PaywallCopy {
  return isArabic(language) ? AR : EN;
}
