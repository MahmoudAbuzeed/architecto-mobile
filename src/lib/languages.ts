/**
 * Content-language registry, ported from the web app
 * (architecto/frontend/src/lib/languages.ts). v1 exposes EN + Arabic dialects
 * in the UI; the backend accepts the full list.
 */

export const ARABIC_DIALECTS = [
  { code: 'ar', name: 'Modern Standard Arabic', nativeName: 'العربية الفصحى' },
  { code: 'ar-eg', name: 'Egyptian Arabic', nativeName: 'مصري' },
  { code: 'ar-sa', name: 'Saudi Arabic', nativeName: 'سعودي' },
  { code: 'ar-lb', name: 'Lebanese Arabic', nativeName: 'لبناني' },
  { code: 'ar-sy', name: 'Syrian Arabic', nativeName: 'سوري' },
  { code: 'ar-iq', name: 'Iraqi Arabic', nativeName: 'عراقي' },
  { code: 'ar-ma', name: 'Moroccan Arabic', nativeName: 'مغربي' },
  { code: 'ar-dz', name: 'Algerian Arabic', nativeName: 'جزائري' },
  { code: 'ar-tn', name: 'Tunisian Arabic', nativeName: 'تونسي' },
  { code: 'ar-jo', name: 'Jordanian Arabic', nativeName: 'أردني' },
  { code: 'ar-ae', name: 'Emirati Arabic', nativeName: 'إماراتي' },
  { code: 'ar-kw', name: 'Kuwaiti Arabic', nativeName: 'كويتي' },
  { code: 'ar-sd', name: 'Sudanese Arabic', nativeName: 'سوداني' },
] as const;

export type ArabicDialectCode = (typeof ARABIC_DIALECTS)[number]['code'];
export type ContentLanguage = 'en' | ArabicDialectCode;

export function isArabic(code: string): boolean {
  return code === 'ar' || code.startsWith('ar-');
}

export function getArabicDialect(code: string) {
  return ARABIC_DIALECTS.find((d) => d.code === code) ?? ARABIC_DIALECTS[0];
}

/**
 * Map app language codes to BCP-47 locales for the native speech recognizer
 * (SFSpeechRecognizer / android.speech) — full locale codes recognize
 * dialects far better.
 */
const SPEECH_LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  'ar-eg': 'ar-EG',
  'ar-sa': 'ar-SA',
  'ar-lb': 'ar-LB',
  'ar-sy': 'ar-SY',
  'ar-iq': 'ar-IQ',
  'ar-ma': 'ar-MA',
  'ar-dz': 'ar-DZ',
  'ar-tn': 'ar-TN',
  'ar-jo': 'ar-JO',
  'ar-ae': 'ar-AE',
  'ar-kw': 'ar-KW',
  'ar-sd': 'ar-SD',
};

export function toSpeechLocale(code: string): string {
  return SPEECH_LOCALE_MAP[code] ?? 'en-US';
}
