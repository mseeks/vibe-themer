/**
 * How complete a generated theme is, judged against the model's own estimated
 * setting count rather than v1's fixed `<50/<80` thresholds. A deliberately small
 * iteration is no longer mislabeled "partial".
 */

export type Coverage = 'partial' | 'good' | 'comprehensive';

export const coverage = (applied: number, expected: number): Coverage => {
  if (expected <= 0) {
    return 'comprehensive';
  }
  const ratio = applied / expected;
  return ratio < 0.5 ? 'partial' : ratio < 0.85 ? 'good' : 'comprehensive';
};

export const describeCoverage = (c: Coverage): string => {
  switch (c) {
    case 'partial':
      return '⚠️ Partial theme — you may want to regenerate for fuller coverage';
    case 'good':
      return '✅ Good coverage — most UI elements are styled';
    case 'comprehensive':
      return '🎨 Comprehensive theme — all major UI areas styled';
  }
};
