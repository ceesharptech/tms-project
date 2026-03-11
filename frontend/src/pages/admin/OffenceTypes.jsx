import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import { useToast } from "../../components/Toast";
import SeverityBadge from "../../components/SeverityBadge";
import OffenceTypeModal from "../../components/OffenceTypeModal";
import { formatCurrency } from "../../utils/formatters";

const SEVERITY_ORDER = { Severe: 0, Moderate: 1, Minor: 2 };

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function OffenceTypes() {
  const toast = useToast();

  const [offences, setOffences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [severityFilter, setSeverityFilter] = useState("all"); // all | Minor | Moderate | Severe

  // Sort
  const [sortField, setSortField] = useState("severity"); // severity | name | base_fine | strike_weight
  const [sortDir, setSortDir] = useState("asc");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedOffence, setSelectedOffence] = useState(null);

  // Confirm dialog
  const [confirmId, setConfirmId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function fetchOffences() {
    setLoading(true);
    setFetchError("");
    try {
      const res = await api.get("/offence-types");
      setOffences(res.data.data ?? []);
    } catch {
      setFetchError("Failed to load offence types. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOffences();
  }, []);

  // Computed counts
  const activeCount = offences.filter((o) => o.is_active).length;

  // Filtered + sorted list
  const displayed = useMemo(() => {
    let list = offences.filter((o) => {
      if (search && !o.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (statusFilter === "active" && !o.is_active) return false;
      if (statusFilter === "inactive" && o.is_active) return false;
      if (severityFilter !== "all" && o.severity !== severityFilter)
        return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let valA, valB;
      if (sortField === "severity") {
        valA = SEVERITY_ORDER[a.severity] ?? 99;
        valB = SEVERITY_ORDER[b.severity] ?? 99;
        if (valA === valB) {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        }
      } else if (sortField === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === "base_fine") {
        valA = Number(a.base_fine);
        valB = Number(b.base_fine);
      } else if (sortField === "strike_weight") {
        valA = a.strike_weight;
        valB = b.strike_weight;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [offences, search, statusFilter, severityFilter, sortField, sortDir]);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }) {
    if (sortField !== field)
      return <span className="text-gray-300 ml-1">↕</span>;
    return (
      <span className="text-blue-600 ml-1">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  function openCreate() {
    setSelectedOffence(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openEdit(offence) {
    setSelectedOffence(offence);
    setModalMode("edit");
    setModalOpen(true);
  }

  function handleModalSave() {
    setModalOpen(false);
    toast(
      modalMode === "edit" ? "Offence type updated" : "Offence type created",
      "success",
    );
    fetchOffences();
  }

  async function handleToggle(id) {
    setConfirmLoading(true);
    try {
      const res = await api.delete(`/offence-types/${id}`);
      setOffences((prev) => prev.map((o) => (o.id === id ? res.data.data : o)));
      toast(res.data.message, "success");
    } catch {
      toast("Failed to update offence status", "error");
    } finally {
      setConfirmLoading(false);
      setConfirmId(null);
    }
  }

  const confirmTarget = offences.find((o) => o.id === confirmId);
  const hasFilters =
    search || statusFilter !== "all" || severityFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Traffic Offence Types
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage violation types and penalties
              {!loading && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {activeCount} active
                </span>
              )}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shrink-0"
          >
            <svg
              className="w-4 h-4"
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
            Add New Offence Type
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-45">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by offence name…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Offences</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="Minor">Minor</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setSeverityFilter("all");
              }}
              className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {fetchError && (
          <div className="p-4 mb-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none"
                    onClick={() => toggleSort("name")}
                  >
                    Offence Name <SortIcon field="name" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none"
                    onClick={() => toggleSort("severity")}
                  >
                    Severity <SortIcon field="severity" />
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none"
                    onClick={() => toggleSort("base_fine")}
                  >
                    Base Fine <SortIcon field="base_fine" />
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none"
                    onClick={() => toggleSort("strike_weight")}
                  >
                    Strikes <SortIcon field="strike_weight" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : displayed.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      {hasFilters
                        ? "No offences match your search. Try different keywords."
                        : "No offence types found. Add your first offence type."}
                    </td>
                  </tr>
                ) : (
                  displayed.map((offence) => (
                    <tr
                      key={offence.id}
                      className={`hover:bg-gray-50 transition ${!offence.is_active ? "opacity-50" : ""}`}
                    >
                      {/* Status */}
                      <td className="px-4 py-3">
                        {offence.is_active ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                            <svg
                              className="w-3.5 h-3.5 text-green-600"
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
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                            <svg
                              className="w-3.5 h-3.5 text-gray-400"
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
                          </span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {offence.name}
                        </p>
                        {offence.description && (
                          <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                            {offence.description}
                          </p>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3">
                        <SeverityBadge severity={offence.severity} />
                      </td>

                      {/* Base Fine */}
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {formatCurrency(offence.base_fine)}
                      </td>

                      {/* Strike Weight */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <span className="font-semibold">
                            {offence.strike_weight}
                          </span>
                          <span className="text-xs text-gray-400">
                            strike{offence.strike_weight !== 1 ? "s" : ""}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(offence)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit"
                          >
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
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmId(offence.id)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                              offence.is_active
                                ? "text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                                : "text-green-700 bg-green-50 hover:bg-green-100"
                            }`}
                          >
                            {offence.is_active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results count */}
        {!loading && displayed.length > 0 && (
          <p className="mt-3 text-xs text-gray-400 text-right">
            Showing {displayed.length} of {offences.length} offence
            {offences.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Offence type create/edit modal */}
      <OffenceTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        offenceType={selectedOffence}
        mode={modalMode}
      />

      {/* Confirm enable/disable dialog */}
      {confirmId && confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {confirmTarget.is_active ? "Disable" : "Enable"} Offence Type?
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {confirmTarget.is_active
                ? `"${confirmTarget.name}" will be hidden from new offence issuance.`
                : `"${confirmTarget.name}" will be available for new offence issuance.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggle(confirmId)}
                disabled={confirmLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${
                  confirmTarget.is_active
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {confirmLoading
                  ? "Processing…"
                  : confirmTarget.is_active
                    ? "Disable"
                    : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
