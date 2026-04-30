/** Parenthetical count e.g. ride cards: "(12)" or encouraging copy when none yet. */
export function reviewsCountShort(count: unknown, t: (key: string) => string): string {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n === 0) return t('common.startYourRide');
  return String(n);
}

/** Phrase with word "review(s)", e.g. tracking: "3 reviews" or start-your-ride when zero. */
export function reviewsCountLong(count: unknown, t: (key: string) => string): string {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n === 0) return t('common.startYourRide');
  const label = n === 1 ? t('common.review') : t('common.reviews');
  return `${n} ${label}`;
}
