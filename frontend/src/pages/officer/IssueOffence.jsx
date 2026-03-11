import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import StepIndicator from "../../components/StepIndicator";
import PenaltyCalculation from "../../components/PenaltyCalculation";
import SeverityBadge from "../../components/SeverityBadge";
import DriverSearchBar from "../../components/DriverSearchBar";
import { formatCurrency } from "../../utils/formatters";

const STEPS = ["Identify Driver", "Select Offence", "Review", "Confirm"];

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  Active: "bg-green-100 text-green-800 border-green-200",
  Warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Flagged: "bg-red-100 text-red-700 border-red-200",
  Suspended: "bg-gray-100 text-gray-600 border-gray-300",
};

function StatusBadge({ status, large = false }) {
  const cls =
    STATUS_BADGE[status] ?? "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <span
      className={`inline-flex items-center border font-semibold rounded-full ${
        large ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"
      } ${cls}`}
    >
      {status}
    </span>
  );
}

function getStrikeColor(count) {
  if (count <= 2) return "text-green-700";
  if (count <= 5) return "text-yellow-700";
  return "text-red-700";
}

// ── CancelConfirmModal ────────────────────────────────────────────────────────

function CancelConfirmModal({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">
          Cancel Offence Issuance?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          Your progress will be lost and no offence will be recorded.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            No, Continue
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EscalationConfirmModal ────────────────────────────────────────────────────

function EscalationConfirmModal({ newStatus, onConfirm, onCancel, issuing }) {
  const isSuspended = newStatus === "Suspended";
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">
          {isSuspended
            ? "This will suspend the driver"
            : "This will flag the driver"}
        </h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          {isSuspended
            ? "The driver's licence will be suspended after this offence. Are you sure you want to proceed?"
            : "The driver will be flagged for review after this offence. Are you sure you want to proceed?"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={issuing}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={issuing}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold rounded-xl transition"
          >
            {issuing ? "Issuing…" : "Yes, Issue Offence"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Identify Driver ───────────────────────────────────────────────────

function Step1IdentifyDriver({ onDriverSelected }) {
  const [searchResults, setSearchResults] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [tab, setTab] = useState("manual");

  function handleSelect(driver) {
    setSelectedDriver(driver);
    setSearchResults(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Identify Driver</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Search for the driver by name, licence number, or plate number.
        </p>
      </div>

      {/* Driver selected summary */}
      {selectedDriver ? (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-4">
              {/* Profile pic */}
              {selectedDriver.profile_picture_url ? (
                <img
                  src={selectedDriver.profile_picture_url}
                  alt={selectedDriver.full_name}
                  className="w-20 h-20 rounded-xl object-cover border border-gray-200 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedDriver.full_name}
                  </h3>
                  <StatusBadge status={selectedDriver.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide">
                      Licence No.
                    </p>
                    <p className="font-mono font-semibold text-gray-800">
                      {selectedDriver.license_no}
                    </p>
                  </div>
                  {selectedDriver.plate_no && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">
                        Plate No.
                      </p>
                      <p className="font-mono font-semibold text-gray-800">
                        {selectedDriver.plate_no}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide">
                      Strikes
                    </p>
                    <p
                      className={`text-2xl font-extrabold ${getStrikeColor(selectedDriver.strike_count)}`}
                    >
                      {selectedDriver.strike_count ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSelectedDriver(null)}
              className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              Change Driver
            </button>
            <button
              onClick={() => onDriverSelected(selectedDriver)}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              Next: Select Offence →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <DriverSearchBar
            onSearchResults={(res) => setSearchResults(res)}
            onClear={() => setSearchResults(null)}
          />

          {searchResults && searchResults.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No drivers found. Try a different search term.
            </p>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              {searchResults.map((driver) => {
                const statusCls =
                  STATUS_BADGE[driver.status] || "bg-gray-100 text-gray-600";
                return (
                  <div
                    key={driver.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {driver.full_name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {driver.license_no}
                        {driver.plate_no ? ` · ${driver.plate_no}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusCls}`}
                      >
                        {driver.status}
                      </span>
                      <span
                        className={`text-sm font-bold ${getStrikeColor(driver.strike_count)}`}
                      >
                        {driver.strike_count ?? 0}⚡
                      </span>
                    </div>
                    <button
                      onClick={() => handleSelect(driver)}
                      className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                      Select
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Select Offence Type ───────────────────────────────────────────────

function Step2SelectOffence({
  driver,
  selectedOffence,
  onOffenceSelected,
  onBack,
}) {
  const [offenceTypes, setOffenceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [picked, setPicked] = useState(selectedOffence || null);

  useEffect(() => {
    api
      .get("/offence-types")
      .then((r) => setOffenceTypes(r.data.data.filter((o) => o.is_active)))
      .catch(() => setOffenceTypes([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = offenceTypes.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      o.name.toLowerCase().includes(q) ||
      (o.description && o.description.toLowerCase().includes(q));
    const matchesSev = !severityFilter || o.severity === severityFilter;
    return matchesSearch && matchesSev;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Select Offence Type</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Issuing offence for:{" "}
          <strong className="text-gray-700">{driver.full_name}</strong>
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search offence types..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All severities</option>
          <option value="Minor">Minor</option>
          <option value="Moderate">Moderate</option>
          <option value="Severe">Severe</option>
        </select>
      </div>

      {/* Offence cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No offence types match your search.
        </p>
      ) : (
        <div className="space-y-2 max-h-105 overflow-y-auto pr-1">
          {filtered.map((o) => {
            const isSelected = picked?.id === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setPicked(o)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">
                        {o.name}
                      </span>
                      <SeverityBadge severity={o.severity} size="sm" />
                    </div>
                    {o.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {o.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs font-semibold text-gray-700">
                        Base fine: {formatCurrency(o.base_fine)}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        +{o.strike_weight} strike
                        {o.strike_weight !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          ← Back
        </button>
        <button
          disabled={!picked}
          onClick={() => picked && onOffenceSelected(picked)}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition"
        >
          Next: Review →
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Review & Penalty Calculation ─────────────────────────────────────

function Step3Review({
  driver,
  offence,
  notes,
  onNotesChange,
  onBack,
  onIssue,
  issuing,
}) {
  const [calcLoading, setCalcLoading] = useState(true);
  const [calculation, setCalculation] = useState(null);
  const [calcError, setCalcError] = useState(null);
  const [showEscalationModal, setShowEscalationModal] = useState(false);

  useEffect(() => {
    setCalcLoading(true);
    setCalcError(null);
    api
      .post("/offences/calculate-penalty", {
        driver_id: driver.id,
        offence_type_id: offence.id,
      })
      .then((r) => setCalculation(r.data.data))
      .catch((err) => {
        setCalcError(
          err.response?.data?.message || "Failed to calculate penalty",
        );
      })
      .finally(() => setCalcLoading(false));
  }, [driver.id, offence.id]);

  const isCritical =
    calculation &&
    (calculation.new_status === "Flagged" ||
      calculation.new_status === "Suspended");

  function handleIssueClick() {
    if (isCritical) {
      setShowEscalationModal(true);
    } else {
      onIssue();
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Review & Confirm</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Review the penalty calculation before issuing.
        </p>
      </div>

      {/* Offence summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
              Selected Offence
            </p>
            <p className="font-bold text-blue-900">{offence.name}</p>
            {offence.description && (
              <p className="text-xs text-blue-700 mt-0.5">
                {offence.description}
              </p>
            )}
          </div>
          <SeverityBadge severity={offence.severity} />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs font-semibold text-blue-800">
            Base fine: {formatCurrency(offence.base_fine)}
          </span>
          <span className="text-xs font-semibold text-blue-800">
            +{offence.strike_weight} strike
            {offence.strike_weight !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Driver status */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Driver
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{driver.full_name}</p>
            <p className="text-xs font-mono text-gray-500">
              {driver.license_no}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={driver.status} />
            <p
              className={`text-xl font-bold mt-1 ${getStrikeColor(driver.strike_count)}`}
            >
              {driver.strike_count ?? 0} strikes
            </p>
          </div>
        </div>
      </div>

      {/* Penalty calculation */}
      <PenaltyCalculation
        calculation={calculation}
        loading={calcLoading}
        error={calcError}
      />

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Add any additional details about this violation..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 text-right mt-1">
          {notes.length}/500
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          onClick={onBack}
          disabled={issuing}
          className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleIssueClick}
          disabled={issuing || calcLoading || !!calcError}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition"
        >
          {issuing ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Issuing…
            </>
          ) : (
            "Issue Offence"
          )}
        </button>
      </div>

      {/* Escalation confirmation modal */}
      {showEscalationModal && calculation && (
        <EscalationConfirmModal
          newStatus={calculation.new_status}
          issuing={issuing}
          onConfirm={() => {
            setShowEscalationModal(false);
            onIssue();
          }}
          onCancel={() => setShowEscalationModal(false)}
        />
      )}
    </div>
  );
}

// ── Step 4: Confirmation ──────────────────────────────────────────────────────

function Step4Confirm({
  result,
  officer,
  onIssueAnother,
  onViewProfile,
  onDashboard,
}) {
  const { offence, driver, calculation } = result;

  function formatDateTime(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function truncateId(id) {
    if (!id) return "—";
    return id.split("-")[0].toUpperCase();
  }

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
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
        <h2 className="text-xl font-bold text-gray-900">
          Offence Issued Successfully
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          The offence record has been created and the driver's strike count
          updated.
        </p>
      </div>

      {/* Receipt */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Offence Receipt
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <ReceiptRow
            label="Reference ID"
            value={truncateId(offence.id)}
            mono
          />
          <ReceiptRow
            label="Date & Time"
            value={formatDateTime(offence.issued_at)}
          />
          <ReceiptRow
            label="Driver"
            value={`${driver.full_name} · ${driver.license_no}`}
          />
          <ReceiptRow label="Offence" value={calculation.offence_type_name} />
          <ReceiptRow
            label="Fine Amount"
            value={
              <span className="text-lg font-extrabold text-gray-900">
                {formatCurrency(offence.fine_amount)}
              </span>
            }
          />
          <ReceiptRow
            label="Strikes Added"
            value={
              <span className="font-semibold text-red-600">
                +{offence.strike_delta}
              </span>
            }
          />
          <ReceiptRow
            label="New Total Strikes"
            value={
              <span
                className={`font-bold ${getStrikeColor(driver.strike_count)}`}
              >
                {driver.strike_count}
              </span>
            }
          />
          <ReceiptRow
            label="New Status"
            value={<StatusBadge status={driver.status} />}
          />
          {officer && (
            <ReceiptRow
              label="Issuing Officer"
              value={`${officer.full_name}${officer.officer_id ? ` (${officer.officer_id})` : ""}`}
            />
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={onViewProfile}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            View Driver Profile
          </button>
          <button
            onClick={onIssueAnother}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
          >
            Issue Another
          </button>
        </div>
        <button
          onClick={onDashboard}
          className="w-full px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span
        className={`text-sm text-gray-800 text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main: IssueOffence Wizard ─────────────────────────────────────────────────

export default function IssueOffence() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedOffence, setSelectedOffence] = useState(null);
  const [notes, setNotes] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [result, setResult] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // If driver was passed via navigation state (from IdentificationResult or DriverProfile),
  // pre-populate step 1 and skip to step 2.
  useEffect(() => {
    const state = location.state;
    if (state?.driver) {
      setSelectedDriver(state.driver);
      setStep(2);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDriverSelected(driver) {
    setSelectedDriver(driver);
    setStep(2);
  }

  function handleOffenceSelected(offence) {
    setSelectedOffence(offence);
    setStep(3);
  }

  async function handleIssue() {
    if (!selectedDriver || !selectedOffence) return;
    setIssuing(true);

    try {
      const res = await api.post("/offences/issue", {
        driver_id: selectedDriver.id,
        offence_type_id: selectedOffence.id,
        notes: notes.trim() || undefined,
      });

      const data = res.data.data;
      // Attach officer info from JWT user context for the receipt
      data.officer = {
        id: user?.id,
        full_name: user?.full_name,
        officer_id: user?.officer_id,
      };
      setResult(data);
      setStep(4);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to issue offence. Please try again.";
      toast(msg, "error");
    } finally {
      setIssuing(false);
    }
  }

  function handleIssueAnother() {
    setStep(1);
    setSelectedDriver(null);
    setSelectedOffence(null);
    setNotes("");
    setResult(null);
    // Clear navigation state so driver won't be re-selected
    navigate(location.pathname, { replace: true, state: {} });
  }

  function handleViewProfile() {
    const prefix = user?.role === "admin" ? "admin" : "officer";
    navigate(`/dashboard/${prefix}/drivers/${result.driver.id}`);
  }

  function handleDashboard() {
    const prefix = user?.role === "admin" ? "admin" : "officer";
    navigate(
      user?.role === "admin"
        ? "/dashboard/admin/drivers"
        : "/dashboard/officer",
    );
  }

  function handleCancelClick() {
    if (step > 1 && step < 4) {
      setShowCancelModal(true);
    } else if (step === 1) {
      handleDashboard();
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issue Offence</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Record a traffic violation against a driver
          </p>
        </div>
        {step < 4 && (
          <button
            onClick={handleCancelClick}
            className="text-sm text-gray-400 hover:text-gray-600 transition mt-1"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="mb-8">
          <StepIndicator currentStep={step} steps={STEPS} />
        </div>
      )}

      {/* Step content */}
      {step === 1 && (
        <Step1IdentifyDriver onDriverSelected={handleDriverSelected} />
      )}

      {step === 2 && selectedDriver && (
        <Step2SelectOffence
          driver={selectedDriver}
          selectedOffence={selectedOffence}
          onOffenceSelected={handleOffenceSelected}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && selectedDriver && selectedOffence && (
        <Step3Review
          driver={selectedDriver}
          offence={selectedOffence}
          notes={notes}
          onNotesChange={setNotes}
          onBack={() => setStep(2)}
          onIssue={handleIssue}
          issuing={issuing}
        />
      )}

      {step === 4 && result && (
        <Step4Confirm
          result={result}
          officer={result.officer}
          onIssueAnother={handleIssueAnother}
          onViewProfile={handleViewProfile}
          onDashboard={handleDashboard}
        />
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <CancelConfirmModal
          onConfirm={handleDashboard}
          onCancel={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
}
