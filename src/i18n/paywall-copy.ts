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
};

export function paywallCopyFor(language: ContentLanguage): PaywallCopy {
  return isArabic(language) ? AR : EN;
}
