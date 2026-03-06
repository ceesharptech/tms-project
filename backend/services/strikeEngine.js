// Strike & Penalty calculation logic
// Full implementation in Phase 8
const strikeEngine = {
  calculateFine(baseFine, multiplier) {
    return baseFine * multiplier;
  },

  determineStatus(strikeCount, penaltyRules) {
    const rule = penaltyRules
      .sort((a, b) => b.min_strikes - a.min_strikes)
      .find((r) => strikeCount >= r.min_strikes);
    return rule ? rule.status_change : "active";
  },
};

module.exports = strikeEngine;
