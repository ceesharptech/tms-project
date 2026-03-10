import { useState, useEffect } from "react";
import api from "../services/api";
import { formatCurrency } from "../utils/formatters";

const SEVERITY_OPTIONS = ["Minor", "Moderate", "Severe"];

const EMPTY_FORM = {
  name: "",
  description: "",
  base_fine: "",
  strike_weight: "",
  severity: "Minor",
};

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

export default function OffenceTypeModal({
  isOpen,
  onClose,
  onSave,
  offenceType,
  mode,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && offenceType) {
        setForm({
          name: offenceType.name ?? "",
          description: offenceType.description ?? "",
          base_fine: offenceType.base_fine ?? "",
          strike_weight: offenceType.strike_weight ?? "",
          severity: offenceType.severity ?? "Minor",
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setServerError("");
    }
  }, [isOpen, mode, offenceType]);

  if (!isOpen) return null;

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Offence name is required.";
    else if (form.name.trim().length > 100) errs.name = "Max 100 characters.";

    if (!form.description.trim()) errs.description = "Description is required.";
    else if (form.description.trim().length > 500)
      errs.description = "Max 500 characters.";

    const fine = Number(form.base_fine);
    if (!form.base_fine) errs.base_fine = "Base fine is required.";
    else if (isNaN(fine) || fine < 1000 || fine > 500000)
      errs.base_fine = "Fine must be between ₦1,000 and ₦500,000.";

    const weight = Number(form.strike_weight);
    if (!form.strike_weight) errs.strike_weight = "Strike weight is required.";
    else if (
      isNaN(weight) ||
      !Number.isInteger(weight) ||
      weight < 1 ||
      weight > 5
    )
      errs.strike_weight = "Strike weight must be 1–5.";

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
      name: form.name.trim(),
      description: form.description.trim(),
      base_fine: Number(form.base_fine),
      strike_weight: Number(form.strike_weight),
      severity: form.severity,
    };

    try {
      if (mode === "edit") {
        await api.put(`/offence-types/${offenceType.id}`, payload);
      } else {
        await api.post("/offence-types", payload);
      }
      onSave();
    } catch (err) {
      const msg = err.response?.data?.message ?? "Failed to save offence type.";
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  }

  const finePreview =
    form.base_fine && !isNaN(Number(form.base_fine))
      ? formatCurrency(Number(form.base_fine))
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "edit" ? "Edit Offence Type" : "New Offence Type"}
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Offence Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={100}
              placeholder="e.g. Speeding, Running Red Light"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-400" : "border-gray-300"}`}
            />
            <FieldError msg={errors.name} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              maxLength={500}
              rows={3}
              placeholder="Describe the violation and any specific conditions..."
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.description ? "border-red-400" : "border-gray-300"}`}
            />
            <div className="flex justify-between mt-0.5">
              <FieldError msg={errors.description} />
              <span className="text-xs text-gray-400 ml-auto">
                {form.description.length}/500
              </span>
            </div>
          </div>

          {/* Base Fine + Severity row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Fine <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                  ₦
                </span>
                <input
                  type="number"
                  value={form.base_fine}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, base_fine: e.target.value }))
                  }
                  min={1000}
                  max={500000}
                  step={1000}
                  placeholder="25000"
                  className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.base_fine ? "border-red-400" : "border-gray-300"}`}
                />
              </div>
              {finePreview && !errors.base_fine && (
                <p className="mt-0.5 text-xs text-gray-400">{finePreview}</p>
              )}
              <FieldError msg={errors.base_fine} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity <span className="text-red-500">*</span>
              </label>
              <select
                value={form.severity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, severity: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Strike Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Strike Weight <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.strike_weight}
              onChange={(e) =>
                setForm((f) => ({ ...f, strike_weight: e.target.value }))
              }
              min={1}
              max={5}
              step={1}
              placeholder="1"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.strike_weight ? "border-red-400" : "border-gray-300"}`}
            />
            <p className="mt-1 text-xs text-gray-400">
              Number of strikes added when this offence is issued (1–5)
            </p>
            <FieldError msg={errors.strike_weight} />
          </div>
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
                : "Create Offence Type"}
          </button>
        </div>
      </div>
    </div>
  );
}
