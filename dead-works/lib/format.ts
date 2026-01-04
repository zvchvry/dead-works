export function formatPrice(
  value: number | null,
  maxDecimals = 3
): string {
  if (value == null) return "—";

  if (value > 0 && value < Math.pow(10, -maxDecimals)) {
    return `<${Math.pow(10, -maxDecimals)}`;
  }

  return value
    .toFixed(maxDecimals)
    .replace(/\.?0+$/, "");
}
