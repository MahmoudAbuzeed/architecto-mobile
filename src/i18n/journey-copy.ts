import { isArabic } from '@/lib/languages';
import type { ContentLanguage } from '@/lib/languages';

/**
 * Journey-path + daily-loop copy. Like [[reminder-copy]], these are
 * content-adjacent motivational strings (not UI chrome), so they follow the
 * user's contentLanguage with a single Arabic set serving every dialect. Pure
 * chrome labels (e.g. section kickers) stay in [[strings]].
 */
export interface JourneyCopy {
  startPill: string;
  doneTodayPill: string;
  todayKicker: string;
  continueCta: string;
  reviewCta: string;
  doneTodayTitle: string;
  doneTodayBody: (streak: number) => string;
  doneTodaySub: (streak: number) => string;
  reviewToday: string;
  gotIt: string;
  lockedTitle: string;
  todayElsewhere: (categoryName: string) => string;
  keepGoingUpsell: string;
}

const EN: JourneyCopy = {
  startPill: 'START · 5 MIN',
  doneTodayPill: 'DONE TODAY',
  todayKicker: 'TODAY',
  continueCta: 'Continue · 5 MIN',
  reviewCta: 'Review · 5 MIN',
  doneTodayTitle: 'Done for today.',
  doneTodayBody: (streak) =>
    streak > 0
      ? `Day ${streak} in the bag. Come back tomorrow for the next one.`
      : 'Nice. Come back tomorrow for the next one.',
  doneTodaySub: (streak) =>
    streak > 0
      ? `Done today · day ${streak} — come back tomorrow`
      : 'Done today — come back tomorrow',
  reviewToday: 'Review today',
  gotIt: 'Got it',
  lockedTitle: 'Locked for now.',
  todayElsewhere: (categoryName) => `Today’s lesson is in ${categoryName} →`,
  keepGoingUpsell: 'Want to keep going? Unlock every topic · PRO',
};

const AR: JourneyCopy = {
  startPill: 'ابدأ · ٥ دقائق',
  doneTodayPill: 'أُنجز اليوم',
  todayKicker: 'اليوم',
  continueCta: 'واصل · ٥ دقائق',
  reviewCta: 'مراجعة · ٥ دقائق',
  doneTodayTitle: 'أنجزت درس اليوم.',
  doneTodayBody: (streak) =>
    streak > 0
      ? `اليوم ${streak} في رصيدك. عُد غدًا للدرس التالي.`
      : 'أحسنت. عُد غدًا للدرس التالي.',
  doneTodaySub: (streak) =>
    streak > 0
      ? `أُنجز اليوم · اليوم ${streak} — عُد غدًا`
      : 'أُنجز اليوم — عُد غدًا',
  reviewToday: 'راجع درس اليوم',
  gotIt: 'حسنًا',
  lockedTitle: 'مقفل الآن.',
  todayElsewhere: (categoryName) => `درس اليوم في ${categoryName} →`,
  keepGoingUpsell: 'تريد المواصلة؟ افتح كل المواضيع · PRO',
};

export function journeyCopyFor(language: ContentLanguage): JourneyCopy {
  return isArabic(language) ? AR : EN;
}
