type ApiLikeError = {
  error?: string;
  message?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
};

export const mapFieldErrors = (
  response: ApiLikeError | undefined,
  fieldAlias: Record<string, string> = {}
): Record<string, string> => {
  const out: Record<string, string> = {};
  const list = response?.fieldErrors || [];

  for (const item of list) {
    const raw = (item.field || '').trim();
    if (!raw) continue;
    const key = fieldAlias[raw] || raw;
    if (!out[key]) out[key] = item.message || 'Invalid value';
  }

  return out;
};

export const getUserErrorMessage = (
  response: ApiLikeError | undefined,
  fallback: string
): string => {
  return response?.message || response?.error || fallback;
};
