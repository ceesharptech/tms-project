import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import DriverEditModal from "../components/DriverEditModal";

// ── Shared helpers ─────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  Active: "bg-green-100 text-green-700 border-green-200",
  Warning: "bg-amber-100 text-amber-700 border-amber-200",
  Flagged: "bg-red-100 text-red-700 border-red-200",
  Suspended: "bg-gray-200 text-gray-600 border-gray-300",
};

function StatusBadge({ status, large = false }) {
  const cls =
    STATUS_BADGE[status] ?? "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <span
      className={`inline-flex items-center border font-semibold rounded-full ${
        large ? "px-4 py-1.5 text-sm" : "px-3 py-0.5 text-xs"
      } ${cls}`}
    >
      {status}
    </span>
  );
}

function formatContact(contact) {
  if (!contact) return "—";
  if (typeof contact === "string") return contact;
  if (typeof contact === "object") {
    return [contact.email, contact.phone].filter(Boolean).join("  ·  ") || "—";
  }
  return "—";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Detail row helper ──────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-32 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

// ── ConfirmDeleteModal ─────────────────────────────────────────────────────────

function ConfirmDeleteModal({ driverName, onConfirm, onCancel, deleting }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">
          Delete Driver
        </h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-700">{driverName}</span>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold rounded-xl transition"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DriverProfile ──────────────────────────────────────────────────────────────

export default function DriverProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const isAdmin = user?.role === "admin";
  const listPath = location.pathname.includes("/admin/")
    ? "/dashboard/admin/drivers"
    : "/dashboard/officer/drivers";

  const [driver, setDriver] = useState(null);
  const [offences, setOffences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Offence filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offenceTypeFilter, setOffenceTypeFilter] = useState("");

  async function loadDriver() {
    try {
      const res = await api.get(`/drivers/${id}`);
      setDriver(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
    }
  }

  async function loadOffences() {
    try {
      const res = await api.get(`/offences?driver_id=${id}`);
      setOffences(res.data.data?.offences ?? []);
    } catch {
      // Offences endpoint not yet implemented — show empty gracefully
      setOffences([]);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDriver(), loadOffences()]).finally(() =>
      setLoading(false),
    );
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/drivers/${id}`);
      toast("Driver deleted successfully", "success");
      navigate(listPath);
    } catch (err) {
      const msg = err.response?.data?.message ?? "Failed to delete driver.";
      toast(msg, "error");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // Filtered offences
  const filteredOffences = offences.filter((o) => {
    if (dateFrom && new Date(o.issued_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(o.issued_at) > new Date(dateTo + "T23:59:59"))
      return false;
    if (offenceTypeFilter && o.offence_type_name !== offenceTypeFilter)
      return false;
    return true;
  });

  const offenceTypes = [
    ...new Set(offences.map((o) => o.offence_type_name).filter(Boolean)),
  ];

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner label="Loading driver profile…" />;

  if (notFound) {
    return (
      <EmptyState
        icon={
          <svg
            className="w-7 h-7"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        }
        title="Driver not found"
        message="This driver does not exist or has been removed."
        action={{ label: "Back to Drivers", onClick: () => navigate(listPath) }}
      />
    );
  }

  if (!driver) return null;

  return (
    <>
      {/* Back link */}
      <button
        onClick={() => navigate(listPath)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition"
      >
        <svg
          className="w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Drivers
      </button>

      <div className="space-y-5">
        {/* ── Section 1: Driver info card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Top row: picture + name/status/strikes */}
          <div className="flex flex-col sm:flex-row gap-5 mb-5">
            {/* Profile picture (128×128) */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              {driver.profile_picture_url ? (
                <img
                  src={driver.profile_picture_url}
                  alt={driver.full_name}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling.style.display = "flex";
                  }}
                  className="w-32 h-32 object-cover rounded-2xl border border-gray-200"
                />
              ) : null}
              {/* Placeholder */}
              <div
                className="w-32 h-32 rounded-2xl border border-gray-200 bg-gray-100 flex-col items-center justify-center text-gray-400"
                style={{
                  display: driver.profile_picture_url ? "none" : "flex",
                }}
              >
                <svg
                  className="w-10 h-10 mb-1"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                <span className="text-xs text-center">No photo</span>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                >
                  Update Photo
                </button>
              )}
            </div>

            {/* Name + status + strikes */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {driver.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={driver.status} large />
                  {driver.face_enrolled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                      <svg
                        className="w-3.5 h-3.5"
                        xmlns="http://www.w3.org/2000/svg"
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
                      Face Enrolled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-xs font-semibold">
                      No Face Data
                    </span>
                  )}
                </div>
              </div>

              {/* Strike counter */}
              <div className="text-center bg-gray-50 rounded-xl px-5 py-3 border border-gray-100 shrink-0">
                <p
                  className={`text-3xl font-bold ${driver.strike_count > 0 ? "text-red-600" : "text-gray-300"}`}
                >
                  {driver.strike_count ?? 0}
                </p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Strike{(driver.strike_count ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <div className="border border-gray-100 rounded-xl px-4 divide-y divide-gray-50">
            <DetailRow
              label="License No."
              value={<span className="font-mono">{driver.license_no}</span>}
            />
            <DetailRow
              label="Plate No."
              value={
                <span className="font-mono">{driver.plate_no ?? "—"}</span>
              }
            />
            <DetailRow label="Contact" value={formatContact(driver.contact)} />
            <DetailRow
              label="Registered"
              value={formatDate(driver.registered_at)}
            />
            <DetailRow
              label="Last Updated"
              value={formatDate(driver.updated_at)}
            />
          </div>
        </div>

        {/* ── Section 2: Issue Offence button (officer + admin) ── */}
        <button
          onClick={() =>
            navigate("/dashboard/officer/issue-offence", {
              state: {
                driver: {
                  id: driver.id,
                  full_name: driver.full_name,
                  license_no: driver.license_no,
                  plate_no: driver.plate_no,
                  strike_count: driver.strike_count,
                  status: driver.status,
                  profile_picture_url: driver.profile_picture_url,
                  contact: driver.contact,
                },
              },
            })
          }
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition shadow-sm"
        >
          <svg
            className="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
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
          Issue Offence to This Driver
        </button>

        {/* ── Section 4: Admin actions ── */}
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition shadow-sm"
            >
              <svg
                className="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
              Edit Driver
            </button>

            {!driver.face_enrolled && (
              <button
                onClick={() =>
                  navigate(`/dashboard/admin/drivers/new?enroll=${id}`)
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition shadow-sm"
              >
                <svg
                  className="w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.864 47.864 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                </svg>
                Enroll Face
              </button>
            )}

            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-red-600 text-sm font-semibold rounded-xl transition shadow-sm"
            >
              <svg
                className="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              Delete Driver
            </button>
          </div>
        )}

        {/* ── Section 5: Offence filters ── */}
        {offences.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Filter Offences
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {offenceTypes.length > 0 && (
                <select
                  value={offenceTypeFilter}
                  onChange={(e) => setOffenceTypeFilter(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All offence types</option>
                  {offenceTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
              {(dateFrom || dateTo || offenceTypeFilter) && (
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setOffenceTypeFilter("");
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Section 6: Offence history ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">
              Offence History
              {filteredOffences.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({filteredOffences.length} record
                  {filteredOffences.length !== 1 ? "s" : ""})
                </span>
              )}
            </h2>
          </div>

          {filteredOffences.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  className="w-6 h-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              }
              title="No offences recorded"
              message={
                dateFrom || dateTo || offenceTypeFilter
                  ? "No offences match your filters."
                  : "This driver has a clean record."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Offence Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      Fine (₦)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Strikes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                      Issued By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOffences.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(o.issued_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">
                        {o.offence_type_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap font-mono">
                        ₦{Number(o.fine_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-semibold text-xs">
                          +{o.strike_delta ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell whitespace-nowrap">
                        {o.officer_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            o.paid
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {o.paid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <DriverEditModal
        driver={driver}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={loadDriver}
      />

      {deleteOpen && (
        <ConfirmDeleteModal
          driverName={driver.full_name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
          deleting={deleting}
        />
      )}
    </>
  );
}
