/**
 * Shared formatting helpers for currency, multipliers, and strike ranges.
 */

/**
 * Format a number as Nigerian Naira with commas.
 * e.g. 25000 → "₦25,000"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount)))
    return "₦0";
  return "₦" + Number(amount).toLocaleString("en-NG");
}

/**
 * Format a decimal multiplier with × suffix.
 * e.g. 1.5 → "1.5×"  |  2 → "2.0×"
 */
export function formatMultiplier(value) {
  if (value === null || value === undefined) return "1.0×";
  const n = Number(value);
  if (isNaN(n)) return "1.0×";
  return n % 1 === 0 ? `${n.toFixed(1)}×` : `${n}×`;
}

/**
 * Format a strike range.
 * e.g. min=0, max=2  → "0 – 2"
 *      min=6, max=9999 → "6+"
 */
export function formatStrikeRange(min, max) {
  if (Number(max) >= 9999) return `${min}+`;
  return `${min} – ${max}`;
}

/**
 * Return Tailwind class strings for a severity badge.
 */
export function getSeverityClasses(severity) {
  switch (severity) {
    case "Minor":
      return { bg: "bg-blue-100", text: "text-blue-800" };
    case "Moderate":
      return { bg: "bg-yellow-100", text: "text-yellow-800" };
    case "Severe":
      return { bg: "bg-red-100", text: "text-red-800" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-700" };
  }
}

/**
 * Return Tailwind classes for a penalty tier based on its position (1-indexed).
 */
export function getTierClasses(tierIndex) {
  if (tierIndex === 1)
    return {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      badge: "bg-green-100 text-green-700",
    };
  if (tierIndex === 2)
    return {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      badge: "bg-yellow-100 text-yellow-700",
    };
  return {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    badge: "bg-red-100 text-red-700",
  };
}
