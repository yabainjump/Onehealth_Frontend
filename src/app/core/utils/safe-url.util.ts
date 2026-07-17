export function normalizeSafeHttpUrl(
  value: string | null | undefined,
  baseUrl: string,
): string | null {
  const candidate = `${value || ''}`.trim();
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate, baseUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export function openSafeHttpUrl(value: string | null | undefined): void {
  const safeUrl = normalizeSafeHttpUrl(value, window.location.origin);
  if (safeUrl) {
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }
}
