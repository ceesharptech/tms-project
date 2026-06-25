import { formatCurrency, formatMultiplier } from "../utils/formatters";
import { AlertTriangle } from "lucide-react";

// Status color helpers
function statusColor(status) {
  switch (status) {
    case "Active":
      return "text-green-700 bg-green-50 border-green-200";
    case "Warning":
      return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "Flagged":
      return "text-red-700 bg-red-50 border-red-200";
    case "Suspended":
      return "text-gray-600 bg-gray-100 border-gray-300";
    default:
      return "text-gray-600 bg-gray-100 border-gray-200";
  }
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center border font-semibold rounded-full px-2.5 py-0.5 text-xs ${statusColor(status)}`}
    >
      {status}
    </span>
  );
}

// Skeleton row for loading state
function SkeletonRow() {
  return <div className="h-5 bg-gray-100 rounded-lg animate-pulse" />;
}

/**
 * PenaltyCalculation — displays penalty preview from /calculate-penalty endpoint.
 *
 * Props:
 *   calculation — object from the API (or null)
 *   loading     — boolean: show skeleton while fetching
 *   error       — string error message (or null)
 */
export default function PenaltyCalculation({ calculation, loading, error }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Calculating Penalty…
        </p>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
        <div className="flex items-start gap-2">
          <span className="text-red-500 shrink-0 mt-0.5">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-red-800">Calculation Error</p>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!calculation) return null;

  const {
    base_fine,
    multiplier,
    final_fine,
    strike_delta,
    current_strikes,
    new_strikes,
    current_status,
    new_status,
    tier_changed,
    offence_type_name,
  } = calculation;

  const statusEscalated =
    tier_changed && new_status !== "Active" && new_status !== current_status;
  const isCritical = new_status === "Flagged" || new_status === "Suspended";

  return (
    <div className="space-y-4">
      {/* Calculation card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Penalty Calculation
        </h3>

        {/* Strike count change */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm text-gray-500">Strike weight</span>
          <span className="text-sm font-semibold text-gray-800">
            +{strike_delta} {strike_delta === 1 ? "strike" : "strikes"}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm text-gray-500">Strike count</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-600">
              {current_strikes}
            </span>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
            <span
              className={`text-sm font-bold ${
                new_strikes > current_strikes ? "text-red-600" : "text-gray-800"
              }`}
            >
              {new_strikes}
            </span>
          </div>
        </div>

        {/* Fine calculation */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm text-gray-500">Base fine</span>
          <span className="text-sm font-mono text-gray-800">
            {formatCurrency(base_fine)}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm text-gray-500">Penalty multiplier</span>
          <span className="text-sm font-semibold text-gray-800">
            {formatMultiplier(multiplier)}
          </span>
        </div>

        {/* Final fine — large and prominent */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-gray-700">Total fine</span>
          <span className="text-2xl font-extrabold text-gray-900">
            {formatCurrency(final_fine)}
          </span>
        </div>
      </div>

      {/* Status impact */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Status Impact
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Previous status</span>
          <StatusBadge status={current_status} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">New status</span>
          <div className="flex items-center gap-2">
            {tier_changed && (
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            )}
            <StatusBadge status={new_status} />
          </div>
        </div>
      </div>

      {/* Warning banners for escalation */}
      {isCritical && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            new_status === "Suspended"
              ? "bg-gray-50 border-gray-300"
              : "bg-red-50 border-red-200"
          }`}
        >
          <span className="text-2xl text-red-700 shrink-0">
            <AlertTriangle />
          </span>
          <div>
            <p
              className={`text-sm font-bold ${
                new_status === "Suspended" ? "text-gray-800" : "text-red-800"
              }`}
            >
              {new_status === "Suspended"
                ? "This offence will suspend the driver's licence"
                : "This offence will flag the driver for review"}
            </p>
            <p
              className={`text-sm mt-0.5 ${
                new_status === "Suspended" ? "text-gray-600" : "text-red-700"
              }`}
            >
              {new_status === "Suspended"
                ? "The driver's status will be changed to Suspended, restricting their driving privileges."
                : "The driver's status will be changed to Flagged, triggering a review."}
            </p>
          </div>
        </div>
      )}

      {statusEscalated && !isCritical && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-start gap-3">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-yellow-800">
              Driver status will change
            </p>
            <p className="text-sm text-yellow-700 mt-0.5">
              After this offence, the driver will move from{" "}
              <strong>{current_status}</strong> to <strong>{new_status}</strong>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
