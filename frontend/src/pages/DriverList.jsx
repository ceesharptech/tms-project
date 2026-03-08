import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DriverSearchBar from "../components/DriverSearchBar";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  Active: "bg-green-100 text-green-700",
  Warning: "bg-amber-100 text-amber-700",
  Flagged: "bg-red-100 text-red-700",
  Suspended: "bg-gray-200 text-gray-600",
};

function StatusBadge({ status }) {
  const cls = STATUS_BADGE[status] ?? "bg-gray-100 text-gray-500";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {status}
    </span>
  );
}

function FaceEnrolledBadge({ enrolled }) {
  return enrolled ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      <svg
        className="w-3 h-3"
        xmlns="http://www.w3.org/2000/svg"
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
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
      <svg
        className="w-3 h-3"
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
      No
    </span>
  );
}

// Skeleton row for loading state
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

const LIMIT = 20;

// ── DriverList ─────────────────────────────────────────────────────────────────

export default function DriverList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  // Determine profile link base path from current URL segment
  const basePath = location.pathname.includes("/admin/")
    ? "/dashboard/admin/drivers"
    : "/dashboard/officer/drivers";

  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchDrivers = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const offset = (pageNum - 1) * LIMIT;
      const res = await api.get(`/drivers?limit=${LIMIT}&offset=${offset}`);
      const { drivers: list, total: count } = res.data.data;
      setDrivers(list);
      setTotal(count);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers(page);
  }, [fetchDrivers, page]);

  function handleSearchResults(results) {
    setIsSearchMode(true);
    setDrivers(results);
    setTotal(results.length);
  }

  function handleClearSearch() {
    setIsSearchMode(false);
    setPage(1);
    fetchDrivers(1);
  }

  function handlePageChange(newPage) {
    setPage(newPage);
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Drivers</h1>
          {!isSearchMode && !loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total} driver{total !== 1 ? "s" : ""} registered
            </p>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/dashboard/admin/drivers/new")}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shrink-0"
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Register New Driver
          </button>
        )}
      </div>

      {/* Search bar */}
      <DriverSearchBar
        onSearchResults={handleSearchResults}
        onClear={handleClearSearch}
      />

      {/* Table card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead />
              <tbody>
                {[...Array(8)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : drivers.length === 0 ? (
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
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            }
            title={
              isSearchMode ? "No drivers found" : "No drivers registered yet"
            }
            message={
              isSearchMode
                ? "Try a different search term or clear the search."
                : isAdmin
                  ? "Register the first driver to get started."
                  : "No driver records found."
            }
            action={
              isAdmin && !isSearchMode
                ? {
                    label: "Register Driver",
                    onClick: () => navigate("/dashboard/admin/drivers/new"),
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead />
              <tbody className="divide-y divide-gray-50">
                {drivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="hover:bg-gray-50/70 transition"
                  >
                    {/* Name */}
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {driver.full_name}
                    </td>
                    {/* License */}
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                      {driver.license_no}
                    </td>
                    {/* Plate — hidden on mobile */}
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap hidden md:table-cell">
                      {driver.plate_no ?? "—"}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={driver.status} />
                    </td>
                    {/* Strikes */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`font-bold ${driver.strike_count > 0 ? "text-red-600" : "text-gray-400"}`}
                      >
                        {driver.strike_count ?? 0}
                      </span>
                    </td>
                    {/* Face enrolled */}
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      <FaceEnrolledBadge enrolled={driver.face_enrolled} />
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`${basePath}/${driver.id}`)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination — only in normal mode (not search) */}
      {!isSearchMode && !loading && drivers.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              ← Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-gray-100 bg-gray-50/80">
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Full Name
        </th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
          License No.
        </th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
          Plate No.
        </th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Status
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Strikes
        </th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
          Face
        </th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Actions
        </th>
      </tr>
    </thead>
  );
}
