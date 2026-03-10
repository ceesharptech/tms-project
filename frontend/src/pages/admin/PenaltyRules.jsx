import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import { useToast } from "../../components/Toast";
import PenaltyRuleModal from "../../components/PenaltyRuleModal";
import {
  formatMultiplier,
  formatStrikeRange,
  formatCurrency,
  getTierClasses,
} from "../../utils/formatters";
import { checkRangeGaps } from "../../utils/penaltyValidation";

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-50 rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
        <div className="h-6 w-20 bg-gray-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function PenaltyRules() {
  const toast = useToast();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedRule, setSelectedRule] = useState(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function fetchRules() {
    setLoading(true);
    setFetchError("");
    try {
      const res = await api.get("/penalty-rules");
      const sorted = (res.data.data ?? []).sort(
        (a, b) => a.min_strikes - b.min_strikes,
      );
      setRules(sorted);
    } catch {
      setFetchError("Failed to load penalty rules. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRules();
  }, []);

  const gaps = useMemo(() => checkRangeGaps(rules), [rules]);

  function openCreate() {
    setSelectedRule(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openEdit(rule) {
    setSelectedRule(rule);
    setModalMode("edit");
    setModalOpen(true);
  }

  function handleModalSave() {
    setModalOpen(false);
    toast(
      modalMode === "edit" ? "Penalty rule updated" : "Penalty rule created",
      "success",
    );
    fetchRules();
  }

  async function handleDelete(id) {
    setDeleteLoading(true);
    try {
      await api.delete(`/penalty-rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast("Penalty rule deleted", "success");
    } catch {
      toast("Failed to delete penalty rule", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  }

  const deleteTarget = rules.find((r) => r.id === deleteId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Penalty Escalation Rules
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Configure strike-based fine multipliers and driver status changes
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
            Add New Rule
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex gap-3">
          <svg
            className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
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
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-0.5">How penalty rules work</p>
            <p className="text-blue-700">
              When a driver's strike count falls within a rule's range, the fine
              multiplier is applied to the base fine of any new offence. The
              status flag determines the driver's account status at that tier.
            </p>
          </div>
        </div>

        {/* Gap warning */}
        {!loading && gaps.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 flex gap-3">
            <svg
              className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5"
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
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Coverage gaps detected</p>
              <ul className="space-y-0.5">
                {gaps.map((g, i) => (
                  <li key={i}>
                    Strikes {g.from}–{g.to} are not covered by any rule.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {fetchError && (
          <div className="p-4 mb-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
            <p className="text-base font-medium mb-1">
              No penalty rules configured
            </p>
            <p className="text-sm">
              Add your first penalty rule to define escalation tiers.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule, index) => {
              const tier = index + 1;
              const tc = getTierClasses(tier);

              return (
                <div
                  key={rule.id}
                  className={`rounded-xl border-2 ${tc.border} ${tc.bg} p-5 flex flex-col gap-4`}
                >
                  {/* Tier badge + actions */}
                  <div className="flex items-start justify-between">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${tc.badge}`}
                    >
                      Tier {tier}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(rule)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white/70 transition"
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
                        onClick={() => setDeleteId(rule.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white/70 transition"
                        title="Delete"
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
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Strike Range
                      </span>
                      <span className={`text-sm font-bold ${tc.text}`}>
                        {formatStrikeRange(rule.min_strikes, rule.max_strikes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Multiplier
                      </span>
                      <span className="text-sm font-bold text-gray-800">
                        {formatMultiplier(rule.fine_multiplier)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Driver Status
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {rule.status_flag}
                      </span>
                    </div>
                  </div>

                  {/* Example */}
                  <div
                    className={`rounded-lg bg-white/60 px-3 py-2 text-xs text-gray-500`}
                  >
                    Example: {formatCurrency(20000)} base →{" "}
                    <strong className="text-gray-700">
                      {formatCurrency(Math.round(20000 * rule.fine_multiplier))}
                    </strong>{" "}
                    applied
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <PenaltyRuleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        penaltyRule={selectedRule}
        mode={modalMode}
        existingRules={rules}
      />

      {/* Delete confirm */}
      {deleteId && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Delete Penalty Rule?
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              This will permanently delete the Tier{" "}
              {rules.findIndex((r) => r.id === deleteId) + 1} rule covering
              strikes{" "}
              {formatStrikeRange(
                deleteTarget.min_strikes,
                deleteTarget.max_strikes,
              )}
              .
            </p>
            <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3 mb-5">
              Warning: This may affect penalty calculations for drivers in this
              strike range.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleteLoading ? "Deleting…" : "Delete Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
