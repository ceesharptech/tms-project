import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import SeverityBadge from "../../components/SeverityBadge";
import { formatCurrency } from "../../utils/formatters";

const SEVERITY_ORDER = { Severe: 0, Moderate: 1, Minor: 2 };

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function OffenceTypesView() {
  const [offences, setOffences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortField, setSortField] = useState("severity");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    api
      .get("/offence-types")
      .then((res) => {
        // Officers see active types only
        setOffences((res.data.data ?? []).filter((o) => o.is_active));
      })
      .catch(() =>
        setFetchError("Failed to load offence types. Please refresh."),
      )
      .finally(() => setLoading(false));
  }, []);

  const activeCount = offences.length;

  const displayed = useMemo(() => {
    let list = offences.filter((o) => {
      if (search && !o.name.toLowerCase().includes(search.toLowerCase()))
        return false;
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
      } else {
        valA = Number(a.base_fine);
        valB = Number(b.base_fine);
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [offences, search, severityFilter, sortField, sortDir]);

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
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

  const hasFilters = search || severityFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Traffic Offence Types
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Reference guide to violation types and applicable fines
            {!loading && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {activeCount} active
              </span>
            )}
          </p>
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Strikes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Description
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
                      colSpan={5}
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      {hasFilters
                        ? "No offences match your search. Try different keywords."
                        : "No active offence types available."}
                    </td>
                  </tr>
                ) : (
                  displayed.map((offence) => (
                    <tr
                      key={offence.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {offence.name}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={offence.severity} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {formatCurrency(offence.base_fine)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-gray-700">
                          {offence.strike_weight}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          strike{offence.strike_weight !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">
                        {offence.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && displayed.length > 0 && (
          <p className="mt-3 text-xs text-gray-400 text-right">
            Showing {displayed.length} of {activeCount} active offence
            {activeCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
