import { useState } from "react";
import api from "../services/api";

const SEARCH_TYPES = [
  { value: "name", label: "Name", placeholder: "Search by full name…" },
  { value: "license", label: "License No.", placeholder: "e.g. LAG-23-482731" },
  { value: "plate", label: "Plate No.", placeholder: "e.g. ABC-12345" },
];

/**
 * DriverSearchBar — submit triggers POST /api/drivers/search, results handed to parent.
 *
 * Props:
 *   onSearchResults — (drivers: Driver[]) => void
 *   onClear         — () => void   (parent should reload unfiltered list)
 */
export default function DriverSearchBar({ onSearchResults, onClear }) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [active, setActive] = useState(false); // true after a search has been performed

  const placeholder =
    SEARCH_TYPES.find((t) => t.value === searchType)?.placeholder ?? "Search…";

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setNoResults(false);

    try {
      const res = await api.post("/drivers/search", { query: q, searchType });
      const { drivers } = res.data.data;
      setActive(true);
      setNoResults(drivers.length === 0);
      onSearchResults(drivers);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery("");
    setActive(false);
    setNoResults(false);
    onClear();
  }

  return (
    <div className="space-y-1.5">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        {/* Search type */}
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-36 shrink-0"
        >
          {SEARCH_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Query input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Search button */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition shrink-0"
        >
          {loading ? "Searching…" : "Search"}
        </button>

        {/* Clear — only visible after a search */}
        {active && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-lg transition shrink-0"
          >
            Clear
          </button>
        )}
      </form>

      {noResults && (
        <p className="text-sm text-gray-500 px-1">
          No drivers match your search.
        </p>
      )}
    </div>
  );
}
