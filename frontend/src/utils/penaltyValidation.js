/**
 * Validation helpers for penalty rule strike ranges.
 */

/**
 * Check if a new rule's range overlaps any existing rule.
 * Returns the overlapping rule object, or null if no overlap.
 *
 * @param {{ min_strikes: number, max_strikes: number }} newRule
 * @param {Array<{ id: string, min_strikes: number, max_strikes: number }>} existingRules
 * @param {string|null} excludeId — rule id to exclude (for edit mode)
 */
export function checkRangeOverlap(newRule, existingRules, excludeId = null) {
  const { min_strikes: min, max_strikes: max } = newRule;
  return (
    existingRules.find((r) => {
      if (excludeId && r.id === excludeId) return false;
      return min <= r.max_strikes && max >= r.min_strikes;
    }) ?? null
  );
}

/**
 * Detect gaps in the combined coverage of all rules.
 * Returns an array of gap descriptors: [{ from, to }]
 *
 * @param {Array<{ min_strikes: number, max_strikes: number }>} allRules
 */
export function checkRangeGaps(allRules) {
  if (!allRules || allRules.length === 0) return [];
  const sorted = [...allRules].sort((a, b) => a.min_strikes - b.min_strikes);
  const gaps = [];

  // Check that coverage starts at 0
  if (sorted[0].min_strikes > 0) {
    gaps.push({ from: 0, to: sorted[0].min_strikes - 1 });
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    // A gap exists if the next rule doesn't immediately follow the current one
    if (next.min_strikes > current.max_strikes + 1) {
      gaps.push({ from: current.max_strikes + 1, to: next.min_strikes - 1 });
    }
  }

  return gaps;
}

/**
 * Validate that min < max and min >= 0.
 * Returns an error string or null.
 */
export function validateStrikeRange(min, max) {
  if (isNaN(Number(min)) || Number(min) < 0) {
    return "Minimum strikes must be 0 or greater.";
  }
  if (isNaN(Number(max)) || !Number.isInteger(Number(max))) {
    return "Maximum strikes must be a whole number.";
  }
  if (Number(max) <= Number(min)) {
    return "Maximum strikes must be greater than minimum strikes.";
  }
  return null;
}
