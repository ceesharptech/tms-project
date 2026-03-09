import { useAuth } from "../context/AuthContext";

// ── Confidence badge helpers ──────────────────────────────────────────────────

function getConfidenceBadge(confidence) {
  if (confidence >= 90)
    return { label: "Excellent Match", cls: "bg-green-100 text-green-800" };
  if (confidence >= 80)
    return { label: "Good Match", cls: "bg-blue-100 text-blue-800" };
  if (confidence >= 70)
    return { label: "Probable Match", cls: "bg-yellow-100 text-yellow-800" };
  return {
    label: "Low Confidence — Verify Manually",
    cls: "bg-orange-100 text-orange-800",
  };
}

function getStrikeColor(count) {
  if (count <= 2) return "text-green-700";
  if (count <= 5) return "text-yellow-700";
  return "text-red-700";
}

const STATUS_BADGE = {
  Active: "bg-green-100 text-green-800",
  Warning: "bg-yellow-100 text-yellow-800",
  Flagged: "bg-red-100 text-red-700",
  Suspended: "bg-gray-100 text-gray-600",
};

// ── Matched driver card ────────────────────────────────────────────────────────

function MatchCard({ result, onViewProfile, onIssueOffence, onReset }) {
  const { user } = useAuth();
  const { driver, confidence } = result;
  const badge = getConfidenceBadge(confidence);
  const statusCls = STATUS_BADGE[driver.status] || "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-5">
      {/* Success header */}
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-green-800">Driver Identified</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className={`text-sm font-semibold ${getStrikeColor(confidence)}`}
            >
              {confidence}% Match
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}
            >
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Low confidence warning */}
      {confidence < 70 && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <p>
            Low confidence match. Please verify driver details manually before
            proceeding.
          </p>
        </div>
      )}

      {/* Driver summary card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-gray-900">
            {driver.full_name}
          </h2>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls}`}
          >
            {driver.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">
              License No.
            </p>
            <p className="font-mono font-semibold text-gray-800">
              {driver.license_no}
            </p>
          </div>
          {driver.plate_no && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">
                Plate No.
              </p>
              <p className="font-mono font-semibold text-gray-800">
                {driver.plate_no}
              </p>
            </div>
          )}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">
              Strike Count
            </p>
            <p
              className={`text-2xl font-extrabold ${getStrikeColor(driver.strike_count)}`}
            >
              {driver.strike_count}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">
              Face Enrolled
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-blue-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </span>
              <span className="text-sm font-medium text-blue-700">Yes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onViewProfile}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition"
        >
          View Full Profile
        </button>
        <button
          onClick={onIssueOffence}
          className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-95 transition"
        >
          Issue Offence
        </button>
        <button
          onClick={onReset}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          Identify Another
        </button>
      </div>
    </div>
  );
}

// ── No match card ─────────────────────────────────────────────────────────────

function NoMatchCard({ onReset, onSwitchTab, isAdmin }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-blue-600"
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
        </div>
        <div>
          <p className="text-sm font-bold text-blue-800">No Match Found</p>
          <p className="text-sm text-blue-700 mt-1">
            No driver in the system matches this face with sufficient
            confidence.
          </p>
          <p className="text-sm text-blue-600 mt-1">
            The driver may not be registered, or the photo quality may be
            insufficient.
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 pl-1">
        {[
          "Try uploading a clearer photo (better lighting, frontal face)",
          "Use Manual Search if you know the driver's details",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="mt-0.5 text-gray-400">•</span>
            {s}
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReset}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          Try Another Photo
        </button>
        <button
          onClick={onSwitchTab}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          Manual Search
        </button>
      </div>
    </div>
  );
}

// ── Error card ────────────────────────────────────────────────────────────────

const ERROR_CONFIG = {
  NO_FACE: {
    icon: "⚠️",
    heading: "No Face Detected",
    message:
      "Could not detect a face in this image. Ensure the photo shows a clear, frontal view of the driver's face.",
    cls: "bg-yellow-50 border-yellow-200",
    headingCls: "text-yellow-800",
    textCls: "text-yellow-700",
  },
  MULTIPLE_FACES: {
    icon: "⚠️",
    heading: "Multiple Faces Detected",
    message:
      "The photo contains more than one face. Please upload a photo with only the driver.",
    cls: "bg-yellow-50 border-yellow-200",
    headingCls: "text-yellow-800",
    textCls: "text-yellow-700",
  },
  POOR_QUALITY: {
    icon: "⚠️",
    heading: "Image Quality Issue",
    message: null,
    cls: "bg-yellow-50 border-yellow-200",
    headingCls: "text-yellow-800",
    textCls: "text-yellow-700",
  },
  SERVICE_UNAVAILABLE: {
    icon: "❌",
    heading: "Service Temporarily Unavailable",
    message:
      "The facial recognition service is not responding. Please try manual search or try again later.",
    cls: "bg-red-50 border-red-200",
    headingCls: "text-red-800",
    textCls: "text-red-700",
  },
  TIMEOUT: {
    icon: "❌",
    heading: "Request Timed Out",
    message:
      "The request took too long. The service may be busy — please try again.",
    cls: "bg-red-50 border-red-200",
    headingCls: "text-red-800",
    textCls: "text-red-700",
  },
  NETWORK_ERROR: {
    icon: "❌",
    heading: "Connection Error",
    message: "Cannot connect to the server. Check your connection.",
    cls: "bg-red-50 border-red-200",
    headingCls: "text-red-800",
    textCls: "text-red-700",
  },
};

function ErrorCard({ error, onReset, onSwitchTab }) {
  const cfg = ERROR_CONFIG[error?.type] || {
    icon: "❌",
    heading: "Identification Failed",
    message: null,
    cls: "bg-red-50 border-red-200",
    headingCls: "text-red-800",
    textCls: "text-red-700",
  };

  const displayMessage = cfg.message || error?.message || "An error occurred.";

  return (
    <div className="space-y-4">
      <div className={`p-5 border rounded-2xl ${cfg.cls}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{cfg.icon}</span>
          <div>
            <p className={`text-sm font-bold ${cfg.headingCls}`}>
              {cfg.heading}
            </p>
            <p className={`text-sm mt-1 ${cfg.textCls}`}>{displayMessage}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReset}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          Try Another Photo
        </button>
        <button
          onClick={onSwitchTab}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          Use Manual Search
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * IdentificationResult — renders one of: match, no-match, error.
 *
 * Props:
 *   result        — API response or Error object
 *   isError       — boolean: true when result is an Error
 *   onViewProfile(driverId) — navigate to profile
 *   onIssueOffence(driverId) — navigate to offence form
 *   onReset()     — back to image-upload state
 *   onSwitchTab() — switch to manual search tab
 */
export default function IdentificationResult({
  result,
  isError,
  onViewProfile,
  onIssueOffence,
  onReset,
  onSwitchTab,
}) {
  const { user } = useAuth();

  if (isError) {
    return (
      <ErrorCard error={result} onReset={onReset} onSwitchTab={onSwitchTab} />
    );
  }

  if (!result) return null;

  if (!result.matched) {
    return (
      <NoMatchCard
        onReset={onReset}
        onSwitchTab={onSwitchTab}
        isAdmin={user?.role === "admin"}
      />
    );
  }

  return (
    <MatchCard
      result={result}
      onViewProfile={() => onViewProfile(result.driver.id)}
      onIssueOffence={() => onIssueOffence(result.driver.id)}
      onReset={onReset}
    />
  );
}
