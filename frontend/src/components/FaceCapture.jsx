import { useRef, useState, useEffect, useCallback } from "react";

/**
 * FaceCapture — live camera preview with capture + preview flow.
 *
 * Props:
 *   onCapture(file) — called with a File object when user confirms photo
 *   onCancel()      — called when user dismisses the camera
 */
export default function FaceCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState("preview"); // 'preview' | 'captured'
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(false);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (cancelled) return;
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError(
            "Camera access was denied. Please allow camera access in your browser settings and try again.",
          );
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          setError("No camera was found on this device.");
        } else if (
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          setError("Camera is already in use by another application.");
        } else {
          setError(`Could not start camera: ${err.message}`);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedDataUrl(dataUrl);
    setPhase("captured");

    // Flash animation
    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    // Stop stream once captured
    stopStream();
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedDataUrl(null);
    setPhase("preview");

    // Restart camera
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        setError("Could not restart camera. Please close and try again.");
      });
  }, []);

  const handleUsePhoto = useCallback(() => {
    if (!capturedDataUrl) return;

    // Convert dataURL → Blob → File
    const byteString = atob(capturedDataUrl.split(",")[1]);
    const mime = "image/jpeg";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++)
      ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mime });
    const file = new File([blob], "capture.jpg", { type: mime });

    onCapture(file);
  }, [capturedDataUrl, onCapture]);

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-yellow-50 border border-yellow-200 rounded-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-yellow-600"
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
        <div>
          <p className="text-sm font-semibold text-yellow-800">
            Camera Unavailable
          </p>
          <p className="text-sm text-yellow-700 mt-1">{error}</p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-yellow-300 text-yellow-800 rounded-xl text-sm font-medium hover:bg-yellow-50 transition"
        >
          Use File Upload Instead
        </button>
      </div>
    );
  }

  // ── Live preview ─────────────────────────────────────────────────────────────
  if (phase === "preview") {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          {flash && (
            <div className="absolute inset-0 bg-white/80 z-10 pointer-events-none" />
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Centre guide oval */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-52 border-2 border-white/60 rounded-full opacity-70" />
          </div>

          {/* Capture button */}
          <div className="absolute bottom-4 inset-x-0 flex justify-center">
            <button
              onClick={handleCapture}
              className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:scale-105 active:scale-95 transition shadow-lg flex items-center justify-center"
            >
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel — use file upload instead
          </button>
        </div>
      </div>
    );
  }

  // ── Captured preview ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        <img
          src={capturedDataUrl}
          alt="Captured photo"
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRetake}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Retake
        </button>
        <button
          onClick={handleUsePhoto}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          Use This Photo
        </button>
      </div>
    </div>
  );
}
