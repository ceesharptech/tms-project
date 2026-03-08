import { useState, useEffect } from "react";
import api from "../services/api";
import { useToast } from "./Toast";

const STATUS_OPTIONS = ["Active", "Flagged", "Suspended"];

function formatContact(contact) {
  if (!contact) return "";
  if (typeof contact === "string") return contact;
  if (typeof contact === "object") {
    return [contact.phone, contact.email].filter(Boolean).join(" | ");
  }
  return String(contact);
}

/**
 * DriverEditModal — modal for editing an existing driver.
 *
 * Props:
 *   driver  — current driver object
 *   isOpen  — boolean
 *   onClose — () => void
 *   onSave  — () => void  (called on successful save; parent should refresh data)
 */
export default function DriverEditModal({ driver, isOpen, onClose, onSave }) {
  const toast = useToast();
  const [form, setForm] = useState({
    full_name: "",
    plate_no: "",
    contact: "",
    status: "Active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill form whenever driver prop changes
  useEffect(() => {
    if (driver) {
      setForm({
        full_name: driver.full_name ?? "",
        plate_no: driver.plate_no ?? "",
        contact: formatContact(driver.contact),
        status: driver.status ?? "Active",
      });
      setError("");
    }
  }, [driver]);

  if (!isOpen || !driver) return null;

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      full_name: form.full_name.trim(),
      status: form.status,
    };
    if (form.plate_no.trim())
      payload.plate_no = form.plate_no.trim().toUpperCase();
    if (form.contact.trim()) payload.contact = form.contact.trim();

    try {
      await api.put(`/drivers/${driver.id}`, payload);
      toast("Driver updated successfully", "success");
      onSave();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message ?? "Failed to update driver.";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Edit Driver</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Full name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Full Name
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={set("full_name")}
              required
              minLength={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* License — read-only */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              License Number
            </label>
            <input
              type="text"
              value={driver.license_no ?? ""}
              disabled
              className="w-full px-3 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              License number cannot be changed.
            </p>
          </div>

          {/* Plate number */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Plate Number
            </label>
            <input
              type="text"
              value={form.plate_no}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  plate_no: e.target.value.toUpperCase(),
                }))
              }
              placeholder="e.g. KSF-516GF"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Contact
            </label>
            <input
              type="text"
              value={form.contact}
              onChange={set("contact")}
              placeholder="Phone or email"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <select
              value={form.status}
              onChange={set("status")}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
