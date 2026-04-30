/**
 * Normalizes platform fee (rupees) for UI.
 * Treats corrupted values like "7rd" as 0; clamps invalid/negative numbers.
 */
export function displayPlatformFeeRupees(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  const s = String(raw).trim().toLowerCase();
  if (/\b7\s*rd\b/.test(s) || s.includes('7rd')) return 0;
  const n =
    typeof raw === 'number' && Number.isFinite(raw)
      ? raw
      : parseFloat(String(raw).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}
