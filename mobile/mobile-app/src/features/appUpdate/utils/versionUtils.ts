/**
 * Compares two dotted semantic version strings (e.g., "1.2.0" vs "1.10.0").
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export const compareVersions = (a: string = '0.0.0', b: string = '0.0.0'): number => {
  const parse = (v: string) =>
    String(v || '0')
      .split('-')[0]
      .split('.')
      .map((part) => parseInt(part, 10) || 0);

  const pa = parse(a);
  const pb = parse(b);
  const maxLen = Math.max(pa.length, pb.length);

  for (let i = 0; i < maxLen; i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * Calculates remaining days in grace period. Returns 0 if expired.
 */
export const calculateRemainingDays = (deadlineString: string | null | undefined): number => {
  if (!deadlineString) return 0;
  const deadline = new Date(deadlineString).getTime();
  const now = Date.now();
  if (now >= deadline) return 0;
  return Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
};
