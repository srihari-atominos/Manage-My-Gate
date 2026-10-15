/**
 * Compares dotted version strings ("1.0.5" vs "1.1.0"). Missing parts count as 0 and
 * non-numeric suffixes are ignored, so "1.2" === "1.2.0" and "1.2.0-beta" === "1.2.0".
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export const compareVersions = (a: string, b: string): number => {
  const parts = (v: string) =>
    String(v || '0')
      .split('.')
      .map((p) => parseInt(p, 10) || 0);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

export const isVersionSupported = (installed: string, minSupported: string | null | undefined): boolean =>
  !minSupported || compareVersions(installed, minSupported) >= 0;
