import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import api from "../../services/api";
import { useToast } from "../../components/Toast";
import ImageUploadPreview from "../../components/ImageUploadPreview";
import LoadingSpinner from "../../components/LoadingSpinner";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

// ── Validation helpers ────────────────────────────────────────────────────────

const LICENSE_RE = /^[A-Z0-9]{11}$/;
const PLATE_RE = /^[A-Z]{3}-[A-Z0-9]{5}$/;

function validate(form) {
  const errs = {};
  if (!form.full_name.trim()) {
    errs.full_name = "Full name is required.";
  } else if (form.full_name.trim().length < 3) {
    errs.full_name = "Full name must be at least 3 characters.";
  }
  if (!form.license_no) {
    errs.license_no = "License number is required.";
  } else if (!LICENSE_RE.test(form.license_no)) {
    errs.license_no =
      "Must be exactly 11 alphanumeric characters (e.g. A1B2C3D4E5F).";
  }
  if (form.plate_no && !PLATE_RE.test(form.plate_no)) {
    errs.plate_no =
      "Format: XXX-XXXXX (e.g. KSF-516GF). Only letters and numbers.";
  }
  return errs;
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-0">
      {[1, 2].map((n, i) => (
        <div key={n} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 transition ${
              step === n
                ? "bg-blue-600 border-blue-600 text-white"
                : step > n
                  ? "bg-blue-100 border-blue-300 text-blue-600"
                  : "bg-white border-gray-300 text-gray-400"
            }`}
          >
            {step > n ? (
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
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            ) : (
              n
            )}
          </div>
          <span
            className={`ml-1.5 text-xs font-semibold hidden sm:inline ${
              step === n ? "text-blue-700" : "text-gray-400"
            }`}
          >
            {n === 1 ? "Driver Details" : "Face Enrollment"}
          </span>
          {i === 0 && (
            <div
              className={`w-12 sm:w-20 h-0.5 mx-2 ${step > 1 ? "bg-blue-400" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── FieldError ─────────────────────────────────────────────────────────────────

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

// ── DriverRegistration ─────────────────────────────────────────────────────────

export default function DriverRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // If the profile page sends ?enroll=<id>, jump straight to step 2
  const enrollForId = searchParams.get("enroll");

  const [step, setStep] = useState(enrollForId ? 2 : 1);
  const [createdDriverId, setCreatedDriverId] = useState(enrollForId ?? null);

  // Step 1 form state
  const [form, setForm] = useState({
    full_name: "",
    license_no: "",
    plate_no: "",
    contact: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Profile picture state
  const [profilePic, setProfilePic] = useState(null); // File object
  const [profilePicPreview, setProfilePicPreview] = useState(""); // data URL
  const [profilePicError, setProfilePicError] = useState("");

  // Step 2 state
  const [images, setImages] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // Auto-reformat plate number: insert hyphen after 3rd char, uppercase
  function handlePlateChange(raw) {
    let value = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    // Auto-insert hyphen
    if (value.length === 3 && !value.includes("-")) {
      value = value + "-";
    }
    setForm((f) => ({ ...f, plate_no: value }));
  }

  // License: uppercase only, strip non-alphanumeric
  function handleLicenseChange(raw) {
    const value = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 11);
    setForm((f) => ({ ...f, license_no: value }));
  }

  function handleProfilePicChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePicError("");

    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setProfilePicError("Only JPG and PNG files are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfilePicError("File size must be less than 2MB.");
      e.target.value = "";
      return;
    }

    setProfilePic(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePicPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleProfilePicRemove() {
    setProfilePic(null);
    setProfilePicPreview("");
    setProfilePicError("");
  }

  // ── Step 1: Submit driver details ──────────────────────────────────────────

  async function handleStep1Submit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError("");
    setSubmitting(true);

    // Use FormData so we can optionally attach a profile picture
    const formData = new FormData();
    formData.append("full_name", form.full_name.trim());
    formData.append("license_no", form.license_no);
    if (form.plate_no.trim()) formData.append("plate_no", form.plate_no.trim());
    if (form.contact.trim()) formData.append("contact", form.contact.trim());
    if (profilePic) formData.append("profile_picture", profilePic);

    try {
      const res = await api.post("/drivers", formData);
      const { id } = res.data.data;
      setCreatedDriverId(id);
      toast("Driver registered successfully", "success");
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message ?? "Failed to register driver.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 2: Enroll face ────────────────────────────────────────────────────

  async function handleEnroll() {
    if (images.length < 3) {
      setEnrollError("Please upload at least 3 images.");
      return;
    }
    if (images.length > 5) {
      setEnrollError("Maximum 5 images allowed.");
      return;
    }
    const oversized = images.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      setEnrollError(
        `${oversized.length} image(s) exceed 5 MB. Please remove them.`,
      );
      return;
    }
    setEnrollError("");
    setEnrolling(true);

    const formData = new FormData();
    images.forEach((img) => formData.append("images", img));

    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${API_BASE}/drivers/${createdDriverId}/enroll-face`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast("Face enrolled successfully", "success");
      navigate(`/dashboard/admin/drivers/${createdDriverId}`);
    } catch (err) {
      const detail = err.response?.data?.detail ?? err.response?.data?.message;
      setEnrollError(detail ?? "Face enrollment failed. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }

  function handleSkip() {
    navigate(`/dashboard/admin/drivers/${createdDriverId}`);
  }

  // ── Shared input class ─────────────────────────────────────────────────────

  function inputCls(field) {
    return `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"
    }`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Register New Driver</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Complete both steps to fully register a driver.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator step={step} />

      {/* ── Step 1: Driver Details ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">
            Step 1 — Driver Details
          </h2>

          {serverError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {serverError}
            </div>
          )}

          <form onSubmit={handleStep1Submit} noValidate className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                placeholder="e.g. Chinedu Okafor"
                className={inputCls("full_name")}
                autoFocus
              />
              <FieldError msg={errors.full_name} />
            </div>

            {/* License number */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                License Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.license_no}
                onChange={(e) => handleLicenseChange(e.target.value)}
                placeholder="e.g. A1B2C3D4E5F"
                maxLength={11}
                className={`${inputCls("license_no")} font-mono uppercase`}
              />
              <p className="text-xs text-gray-400 mt-1">
                11 characters · letters and numbers only
                {form.license_no && (
                  <span
                    className={`ml-2 font-mono ${form.license_no.length === 11 ? "text-green-600" : "text-gray-400"}`}
                  >
                    ({form.license_no.length}/11)
                  </span>
                )}
              </p>
              <FieldError msg={errors.license_no} />
            </div>

            {/* Plate number */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Plate Number{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.plate_no}
                onChange={(e) => handlePlateChange(e.target.value)}
                placeholder="e.g. KSF-516GF"
                maxLength={9}
                className={`${inputCls("plate_no")} font-mono uppercase`}
              />
              <p className="text-xs text-gray-400 mt-1">
                Format: XXX-XXXXX (3 letters + hyphen + 5 letters/numbers)
              </p>
              <FieldError msg={errors.plate_no} />
            </div>

            {/* Contact */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Contact{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
                }
                placeholder="Phone number or email address"
                className={inputCls("contact")}
              />
            </div>

            {/* Profile picture */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Profile Picture{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                For visual identification confirmation only. Separate from
                facial recognition data. Max 2 MB, JPG or PNG.
              </p>

              {profilePicPreview ? (
                <div className="flex items-start gap-3">
                  <img
                    src={profilePicPreview}
                    alt="Profile preview"
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {profilePic?.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {profilePic
                        ? (profilePic.size / 1024).toFixed(1) + " KB"
                        : ""}
                    </p>
                    <button
                      type="button"
                      onClick={handleProfilePicRemove}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition">
                  <svg
                    className="w-5 h-5 text-gray-400 shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 3.75h7.5M17.25 3.75v7.5m-13.5 9h15a2.25 2.25 0 002.25-2.25v-15A2.25 2.25 0 0018.75.75h-15A2.25 2.25 0 001.5 3.75v15A2.25 2.25 0 003.75 21z"
                    />
                  </svg>
                  <span className="text-sm text-gray-500">Choose photo…</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleProfilePicChange}
                    className="sr-only"
                  />
                </label>
              )}

              {profilePicError && (
                <p className="text-xs text-red-500 mt-1">{profilePicError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate("/dashboard/admin/drivers")}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition"
              >
                {submitting ? "Registering…" : "Next →"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 2: Face Enrollment ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-1">
            Step 2 — Face Enrollment
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload 3–5 clear, well-lit photos of the driver's face. Different
            angles improve identification accuracy.
          </p>

          {enrollError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {enrollError}
            </div>
          )}

          <ImageUploadPreview
            images={images}
            onImagesChange={setImages}
            maxImages={5}
            minImages={3}
          />

          {enrolling && (
            <div className="mt-4">
              <LoadingSpinner
                size="sm"
                label="Processing face images… this may take 10–30 seconds."
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={handleSkip}
              disabled={enrolling}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Skip for Now
            </button>
            <button
              type="button"
              onClick={handleEnroll}
              disabled={enrolling || images.length < 3}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition"
            >
              {enrolling ? "Enrolling…" : "Enroll Face"}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            You can enroll face data later from the driver's profile page.
          </p>
        </div>
      )}
    </div>
  );
}
