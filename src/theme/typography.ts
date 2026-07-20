import { TextStyle } from 'react-native';

// JetBrains Mono is bundled (react-native.config.js assets). File names match
// PostScript names so fontFamily resolves identically on iOS and Android.
export const mono = {
  regular: 'JetBrainsMono-Regular',
  medium: 'JetBrainsMono-Medium',
  semiBold: 'JetBrainsMono-SemiBold',
  bold: 'JetBrainsMono-Bold',
} as const;

/** Letterspaced mono label, e.g. "TODAY'S REP", "ARCHIE". */
export const monoLabel: TextStyle = {
  fontFamily: mono.semiBold,
  fontSize: 10.5,
  letterSpacing: 1.5,
};

/** Mono numerics, e.g. timers, XP counts. */
export const monoNumber: TextStyle = {
  fontFamily: mono.bold,
};

/** The ARCHITECTO wordmark style. */
export const wordmark: TextStyle = {
  fontFamily: mono.medium,
  fontSize: 11,
  letterSpacing: 4,
};
