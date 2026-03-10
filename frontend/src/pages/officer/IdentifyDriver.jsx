import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { identifyDriver } from "../../services/faceRecognitionService";
import FaceCapture from "../../components/FaceCapture";
import FacePhotoGuidelines from "../../components/FacePhotoGuidelines";
import IdentificationResult from "../../components/IdentificationResult";
import DriverSearchBar from "../../components/DriverSearchBar";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

// ── Step labels shown during processing ──────────────────────────────────────
const LOADING_STEPS = [
  { until: 2000, label: "Uploading image..." },
  { until: 5000, label: "Detecting face..." },
  { until: 99999, label: "Matching against database..." },
];

// ── SearchResults — list of drivers from manual search ───────────────────────
function SearchResults({ results, onSelect }) {
  const STATUS_BADGE = {
    Active: "bg-green-100 text-green-800",
    Warning: "bg-yellow-100 text-yellow-800",
    Flagged: "bg-red-100 text-red-700",
    Suspended: "bg-gray-100 text-gray-600",
  };

  if (!results) return null;

  if (results.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No drivers match your search.
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      {results.map((driver) => {
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
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}
            >
              {driver.status}
            </span>
            <button
              onClick={() => onSelect(driver)}
              className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Select
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── ManualSelectedResult — driver summary from manual search ─────────────────
function ManualSelectedResult({
  driver,
  onViewProfile,
  onIssueOffence,
  onClear,
}) {
  const navigate = useNavigate();
  const getStrikeColor = (c) =>
    c <= 2 ? "text-green-700" : c <= 5 ? "text-yellow-700" : "text-red-700";
  const STATUS_BADGE = {
    Active: "bg-green-100 text-green-800",
    Warning: "bg-yellow-100 text-yellow-800",
    Flagged: "bg-red-100 text-red-700",
    Suspended: "bg-gray-100 text-gray-600",
  };
  const statusCls = STATUS_BADGE[driver.status] || "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-gray-900">
            {driver.full_name}
          </h2>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls}`}
          >
            {driver.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">
              License No.
            </p>
            <p className="font-mono font-semibold text-gray-800">
              {driver.license_no}
            </p>
          </div>
          {driver.plate_no && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">
                Plate No.
              </p>
              <p className="font-mono font-semibold text-gray-800">
                {driver.plate_no}
              </p>
            </div>
          )}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">
              Strike Count
            </p>
            <p
              className={`text-2xl font-extrabold ${getStrikeColor(driver.strike_count)}`}
            >
              {driver.strike_count}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onViewProfile(driver.id)}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          View Full Profile
        </button>
        <button
          onClick={() => onIssueOffence(driver.id, driver)}
          className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
        >
          Issue Offence
        </button>
        <button
          onClick={onClear}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          Back to Search
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IdentifyDriver() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);

  // State
  const [activeTab, setActiveTab] = useState("face"); // 'face' | 'manual'
  const [inputMode, setInputMode] = useState("upload"); // 'upload' | 'camera'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [imageWarnings, setImageWarnings] = useState([]);

  const [loadingState, setLoadingState] = useState(null); // null | 'loading'
  const [loadingLabel, setLoadingLabel] = useState("");
  const [result, setResult] = useState(null); // API result
  const [resultError, setResultError] = useState(null); // Error object
  const [hasResult, setHasResult] = useState(false);

  // Manual search state
  const [searchResults, setSearchResults] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // ── File validation ─────────────────────────────────────────────────────────
  function validateAndSetFile(file) {
    setFileError(null);
    setImageWarnings([]);
    setResult(null);
    setResultError(null);
    setHasResult(false);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Invalid file type. Please use JPG or PNG.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Image too large. Maximum size is 5 MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);

    // Client-side quality warnings (non-blocking)
    const warnings = [];
    if (file.size < 10 * 1024)
      warnings.push("File is very small — image quality may be too low.");

    // Check resolution via Image element
    const img = new Image();
    img.onload = () => {
      if (img.width < 200 || img.height < 200) {
        setImageWarnings((w) => [
          ...w,
          `Low resolution (${img.width}×${img.height}px). A larger image gives better results.`,
        ]);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;

    if (warnings.length) setImageWarnings(warnings);
  }

  // ── Drag-and-drop ───────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }

  // ── Loading step ticker ─────────────────────────────────────────────────────
  function startLoadingTicker() {
    const start = Date.now();
    let idx = 0;
    setLoadingLabel(LOADING_STEPS[0].label);

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      while (
        idx < LOADING_STEPS.length - 1 &&
        elapsed >= LOADING_STEPS[idx].until
      ) {
        idx++;
      }
      setLoadingLabel(LOADING_STEPS[idx].label);
    }, 500);

    return () => clearInterval(timer);
  }

  // ── Identify ────────────────────────────────────────────────────────────────
  const handleIdentify = useCallback(async () => {
    if (!selectedFile) return;

    setLoadingState("loading");
    const stopTicker = startLoadingTicker();

    try {
      const data = await identifyDriver(selectedFile);
      stopTicker();
      setResult(data);
      setResultError(null);
      setHasResult(true);
    } catch (err) {
      stopTicker();
      setResultError(err);
      setResult(null);
      setHasResult(true);
    } finally {
      setLoadingState(null);
      setLoadingLabel("");
    }
  }, [selectedFile]);

  function handleReset() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    setImageWarnings([]);
    setResult(null);
    setResultError(null);
    setHasResult(false);
    setInputMode("upload");
  }

  function handleViewProfile(driverId) {
    const prefix = user?.role === "admin" ? "admin" : "officer";
    navigate(`/dashboard/${prefix}/drivers/${driverId}`);
  }

  function handleIssueOffence(driverId, driverObj) {
    // Navigate to the IssueOffence wizard with driver pre-populated (skip Step 1)
    navigate("/dashboard/officer/issue-offence", {
      state: { driver: driverObj || { id: driverId } },
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Identify Driver</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload or capture a photo to identify the driver
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {[
          { key: "face", label: "Facial Recognition" },
          { key: "manual", label: "Manual Search" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              handleReset();
              setSearchResults(null);
              setSelectedDriver(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === key
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Facial Recognition ─────────────────────────────────────── */}
      {activeTab === "face" && (
        <div className="space-y-5">
          {/* Guidelines */}
          <FacePhotoGuidelines />

          {/* Show result after identification */}
          {hasResult && (
            <IdentificationResult
              result={resultError || result}
              isError={!!resultError}
              onViewProfile={handleViewProfile}
              onIssueOffence={handleIssueOffence}
              onReset={handleReset}
              onSwitchTab={() => {
                setActiveTab("manual");
                handleReset();
              }}
            />
          )}

          {/* Image input area — hide after result (user must reset) */}
          {!hasResult && (
            <>
              {/* Sub-mode toggle: upload vs camera */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setInputMode("upload");
                    handleReset();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    inputMode === "upload"
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  Upload File
                </button>
                <button
                  onClick={() => {
                    setInputMode("camera");
                    handleReset();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    inputMode === "camera"
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.864 47.864 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                    />
                  </svg>
                  Use Camera
                </button>
              </div>

              {/* Camera mode */}
              {inputMode === "camera" && (
                <FaceCapture
                  onCapture={(file) => {
                    setInputMode("upload");
                    validateAndSetFile(file);
                  }}
                  onCancel={() => setInputMode("upload")}
                />
              )}

              {/* Upload mode */}
              {inputMode === "upload" && !selectedFile && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl py-12 cursor-pointer transition ${
                    dragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Drag &amp; drop or{" "}
                      <span className="text-blue-600">browse</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      JPG, PNG · Max 5 MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) validateAndSetFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {/* File error */}
              {fileError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {fileError}
                </p>
              )}

              {/* Image preview + action buttons */}
              {selectedFile && !fileError && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={previewUrl}
                      alt="Selected driver photo"
                      className="w-full max-h-72 object-contain"
                    />
                    <button
                      onClick={handleReset}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600 hover:bg-white transition"
                      title="Remove image"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Quality warnings */}
                  {imageWarnings.map((w, i) => (
                    <p
                      key={i}
                      className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"
                    >
                      ⚠️ {w}
                    </p>
                  ))}

                  {/* Loading overlay */}
                  {loadingState === "loading" ? (
                    <div className="flex items-center justify-center gap-3 py-4 text-sm text-gray-600">
                      <svg
                        className="w-5 h-5 animate-spin text-blue-600"
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
                      <span>{loadingLabel}</span>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={handleIdentify}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-95 transition"
                      >
                        Identify Driver
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB 2: Manual Search ─────────────────────────────────────────────── */}
      {activeTab === "manual" && (
        <div className="space-y-5">
          {selectedDriver ? (
            <ManualSelectedResult
              driver={selectedDriver}
              onViewProfile={handleViewProfile}
              onIssueOffence={handleIssueOffence}
              onClear={() => {
                setSelectedDriver(null);
                setSearchResults(null);
              }}
            />
          ) : (
            <>
              <DriverSearchBar
                onSearchResults={(res) => setSearchResults(res)}
                onClear={() => setSearchResults(null)}
              />
              <SearchResults
                results={searchResults}
                onSelect={(driver) => setSelectedDriver(driver)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
