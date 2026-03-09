import { useState } from "react";

const TIPS = [
  { ok: true, text: "Use good lighting — avoid shadows on the face" },
  { ok: true, text: "Ensure the face is clearly visible and frontal" },
  { ok: true, text: "Remove sunglasses or face coverings" },
  { ok: true, text: "Use a recent photo of the driver" },
  { ok: false, text: "Avoid blurry or low-resolution images" },
  { ok: false, text: "Avoid photos with multiple people" },
  { ok: false, text: "Avoid extreme angles — side profiles will not work" },
];

export default function FacePhotoGuidelines() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-500 shrink-0"
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
          <span className="text-sm font-medium text-blue-800">
            Tips for Best Results
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-blue-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                    tip.ok
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {tip.ok ? "✓" : "✕"}
                </span>
                <span className="text-sm text-blue-900">{tip.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
