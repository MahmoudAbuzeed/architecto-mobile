import { isArabic } from '@/lib/languages';
import type { ContentLanguage } from '@/lib/languages';

export interface ReminderCopy {
  title: string;
  body: string;
}

/**
 * Compound-learning notification copy. Content-adjacent motivational text (not
 * UI chrome), so it's localized by the user's contentLanguage. Rotated
 * deterministically by day so the nudge doesn't feel like the same alarm.
 */
export const REMINDER_COPY: Record<'en' | 'ar', ReminderCopy[]> = {
  en: [
    { title: '5 minutes today', body: '5 minutes a day is 30+ hours a year. Take today’s lesson.' },
    { title: 'Keep the chain alive', body: 'Your streak is a system, not a mood. One lesson, then coffee.' },
    { title: 'Compound your edge', body: 'Small daily reps beat rare big ones. Today’s 5 minutes are ready.' },
    { title: 'Future you says thanks', body: 'Learn one thing today so it’s obvious in six months.' },
    { title: 'Don’t break the streak', body: 'A 5-minute lesson is waiting. Momentum loves consistency.' },
    { title: 'One topic, five minutes', body: 'Read it, answer a few questions, done. Let’s keep growing.' },
    { title: 'Tiny effort, huge curve', body: 'The compounding starts the day you show up. That’s today.' },
    { title: 'Your daily dose', body: 'Five focused minutes now beats an hour you’ll never schedule.' },
  ],
  ar: [
    { title: '٥ دقائق اليوم', body: '٥ دقائق يوميًا = أكثر من ٣٠ ساعة في السنة. خُذ درس اليوم.' },
    { title: 'حافظ على السلسلة', body: 'سلسلتك نظام وليست مزاجًا. درس واحد ثم قهوتك.' },
    { title: 'راكم تفوّقك', body: 'التكرار اليومي الصغير يتفوّق على الجهد النادر الكبير. درس اليوم جاهز.' },
    { title: 'نفسك المستقبلية تشكرك', body: 'تعلّم شيئًا اليوم ليصبح واضحًا بعد ستة أشهر.' },
    { title: 'لا تكسر السلسلة', body: 'درس من ٥ دقائق بانتظارك. الاستمرارية تصنع الفرق.' },
    { title: 'موضوع واحد، خمس دقائق', body: 'اقرأه، أجب عن بعض الأسئلة، وانتهيت. لنواصل النمو.' },
    { title: 'جهد بسيط، منحنى كبير', body: 'التراكم يبدأ يوم تحضر. وهذا اليوم هو اليوم.' },
    { title: 'جرعتك اليومية', body: 'خمس دقائق مركّزة الآن أفضل من ساعة لن تجد وقتها أبدًا.' },
  ],
};

export function reminderPoolFor(language: ContentLanguage): ReminderCopy[] {
  return isArabic(language) ? REMINDER_COPY.ar : REMINDER_COPY.en;
}
