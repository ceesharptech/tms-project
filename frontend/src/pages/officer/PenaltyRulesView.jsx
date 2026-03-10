import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import {
  formatMultiplier,
  formatStrikeRange,
  formatCurrency,
  getTierClasses,
} from "../../utils/formatters";
import { checkRangeGaps } from "../../utils/penaltyValidation";

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-50 rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function PenaltyRulesView() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    api
      .get("/penalty-rules")
      .then((res) => {
        const sorted = (res.data.data ?? []).sort(
          (a, b) => a.min_strikes - b.min_strikes,
        );
        setRules(sorted);
      })
      .catch(() =>
        setFetchError("Failed to load penalty rules. Please refresh."),
      )
      .finally(() => setLoading(false));
  }, []);

  const gaps = useMemo(() => checkRangeGaps(rules), [rules]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Penalty Escalation Tiers
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            How fines increase as drivers accumulate strikes
          </p>
        </div>

        {/* How it works */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex gap-3">
          <svg
            className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-0.5">Reference guide</p>
            <p className="text-blue-700">
              When issuing an offence, the driver's current strike count
              determines which tier applies. The tier's multiplier is applied to
              the offence base fine to calculate the actual penalty.
            </p>
          </div>
        </div>

        {/* Gap warning */}
        {!loading && gaps.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 text-sm text-yellow-800">
            <p className="font-medium">
              Note: Some strike ranges are not covered by any rule.
            </p>
          </div>
        )}

        {fetchError && (
          <div className="p-4 mb-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
            <p className="text-base font-medium">
              No penalty tiers configured yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule, index) => {
              const tier = index + 1;
              const tc = getTierClasses(tier);

              return (
                <div
                  key={rule.id}
                  className={`rounded-xl border-2 ${tc.border} ${tc.bg} p-5 space-y-4`}
                >
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${tc.badge}`}
                  >
                    Tier {tier}
                  </span>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Strike Range
                      </span>
                      <span className={`text-sm font-bold ${tc.text}`}>
                        {formatStrikeRange(rule.min_strikes, rule.max_strikes)}{" "}
                        strikes
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Fine Multiplier
                      </span>
                      <span className="text-sm font-bold text-gray-800">
                        {formatMultiplier(rule.fine_multiplier)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Driver Status
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {rule.status_flag}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/60 px-3 py-2 text-xs text-gray-500">
                    Example: {formatCurrency(20000)} base →{" "}
                    <strong className="text-gray-700">
                      {formatCurrency(Math.round(20000 * rule.fine_multiplier))}
                    </strong>{" "}
                    applied
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
