export function parseProtectedNumber(
  value: number | string | null | undefined,
  options?: { allowInfinity?: boolean },
) {
  if (value === null || value === undefined) {
    return null;
  }

  if (options?.allowInfinity && value === "Infinity") {
    return Number.POSITIVE_INFINITY;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
