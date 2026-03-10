import { useState, useEffect } from "react";
import api from "../services/api";
import {
  formatCurrency,
  formatMultiplier,
  formatStrikeRange,
} from "../utils/formatters";
import {
  checkRangeOverlap,
  validateStrikeRange,
} from "../utils/penaltyValidation";

const EMPTY_FORM = {
  min_strikes: "",
  max_strikes: "",
  fine_multiplier: "1.0",
  status_flag: "",
};

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

export default function PenaltyRuleModal({
  isOpen,
  onClose,
  onSave,
  penaltyRule,
  mode,
  existingRules,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && penaltyRule) {
        setForm({
          min_strikes: penaltyRule.min_strikes ?? "",
          max_strikes: penaltyRule.max_strikes ?? "",
          fine_multiplier: penaltyRule.fine_multiplier ?? "1.0",
          status_flag: penaltyRule.status_flag ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setServerError("");
    }
  }, [isOpen, mode, penaltyRule]);

  if (!isOpen) return null;

  function validate() {
    const errs = {};

    const min = form.min_strikes === "" ? null : Number(form.min_strikes);
    const max = form.max_strikes === "" ? null : Number(form.max_strikes);

    if (min === null) errs.min_strikes = "Minimum strikes is required.";
    else if (isNaN(min) || !Number.isInteger(min) || min < 0)
      errs.min_strikes = "Must be a non-negative whole number.";

    if (max === null) errs.max_strikes = "Maximum strikes is required.";
    else if (isNaN(max) || !Number.isInteger(max))
      errs.max_strikes = "Must be a whole number (use 9999 for 'and above').";

    if (
      min !== null &&
      max !== null &&
      !errs.min_strikes &&
      !errs.max_strikes
    ) {
      const rangeErr = validateStrikeRange(min, max);
      if (rangeErr) errs.max_strikes = rangeErr;
    }

    const multiplier = Number(form.fine_multiplier);
    if (!form.fine_multiplier)
      errs.fine_multiplier = "Fine multiplier is required.";
    else if (isNaN(multiplier) || multiplier < 1.0 || multiplier > 5.0)
      errs.fine_multiplier = "Must be between 1.0 and 5.0.";

    if (!form.status_flag.trim()) errs.status_flag = "Status flag is required.";

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError("");
    setSaving(true);

    const payload = {
      min_strikes: Number(form.min_strikes),
      max_strikes: Number(form.max_strikes),
      fine_multiplier: Number(form.fine_multiplier),
      status_flag: form.status_flag.trim(),
    };

    try {
      if (mode === "edit") {
        await api.put(`/penalty-rules/${penaltyRule.id}`, payload);
      } else {
        await api.post("/penalty-rules", payload);
      }
      onSave();
    } catch (err) {
      const msg = err.response?.data?.message ?? "Failed to save penalty rule.";
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  }

  // Live preview calculation
  const EXAMPLE_BASE_FINE = 20000;
  const multiplier = Number(form.fine_multiplier);
  const previewFine =
    !isNaN(multiplier) && multiplier >= 1
      ? formatCurrency(Math.round(EXAMPLE_BASE_FINE * multiplier))
      : null;

  // Client-side overlap warning (informational, backend also validates)
  const overlapWarning = (() => {
    const min = Number(form.min_strikes);
    const max = Number(form.max_strikes);
    if (isNaN(min) || isNaN(max) || max <= min) return null;
    const excludeId = mode === "edit" ? penaltyRule?.id : null;
    const overlap = checkRangeOverlap(
      { min_strikes: min, max_strikes: max },
      existingRules ?? [],
      excludeId,
    );
    if (!overlap) return null;
    return `Overlaps with existing rule: ${formatStrikeRange(overlap.min_strikes, overlap.max_strikes)} (${overlap.status_flag})`;
  })();

  const maxDisplay =
    form.max_strikes === "9999" || Number(form.max_strikes) >= 9999
      ? `${form.min_strikes}+`
      : form.max_strikes;
  const rangePreview =
    form.min_strikes !== "" && form.max_strikes !== ""
      ? Number(form.max_strikes) >= 9999
        ? `${form.min_strikes}+`
        : `${form.min_strikes} – ${form.max_strikes}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "edit" ? "Edit Penalty Rule" : "New Penalty Rule"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {serverError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {serverError}
            </div>
          )}
          {overlapWarning && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700 flex gap-2">
              <svg
                className="w-4 h-4 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              {overlapWarning}
            </div>
          )}

          {/* Strike Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strike Range <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Min Strikes
                </label>
                <input
                  type="number"
                  value={form.min_strikes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, min_strikes: e.target.value }))
                  }
                  min={0}
                  step={1}
                  placeholder="0"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.min_strikes ? "border-red-400" : "border-gray-300"}`}
                />
                <FieldError msg={errors.min_strikes} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Max Strikes
                </label>
                <input
                  type="number"
                  value={form.max_strikes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_strikes: e.target.value }))
                  }
                  min={1}
                  step={1}
                  placeholder="9999 for 'and above'"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.max_strikes ? "border-red-400" : "border-gray-300"}`}
                />
                <FieldError msg={errors.max_strikes} />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Use <strong>9999</strong> as the maximum to represent "and above"
              (e.g. 6+).
              {rangePreview && (
                <span className="ml-1 text-blue-600 font-medium">
                  Range: {rangePreview}
                </span>
              )}
            </p>
          </div>

          {/* Fine Multiplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fine Multiplier <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.fine_multiplier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fine_multiplier: e.target.value }))
                }
                min={1.0}
                max={5.0}
                step={0.1}
                placeholder="1.5"
                className={`w-full px-3 py-2 pr-8 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fine_multiplier ? "border-red-400" : "border-gray-300"}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                ×
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Base fine × multiplier = actual fine applied (1.0 = no change)
            </p>
            <FieldError msg={errors.fine_multiplier} />
          </div>

          {/* Status Flag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Flag <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.status_flag}
              onChange={(e) =>
                setForm((f) => ({ ...f, status_flag: e.target.value }))
              }
              placeholder="e.g. Active, Warning, Flagged, Suspended"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.status_flag ? "border-red-400" : "border-gray-300"}`}
            />
            <p className="mt-1 text-xs text-gray-400">
              Driver status when they reach this penalty tier
            </p>
            <FieldError msg={errors.status_flag} />
          </div>

          {/* Live Preview */}
          {previewFine && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">
              <span className="font-medium">Preview:</span> Speeding (₦20,000
              base fine) → <span className="font-semibold">{previewFine}</span>{" "}
              with {formatMultiplier(form.fine_multiplier)} multiplier
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving
              ? "Saving…"
              : mode === "edit"
                ? "Save Changes"
                : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
