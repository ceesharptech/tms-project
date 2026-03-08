/**
 * LoadingSpinner
 *
 * Props:
 *   size    — "sm" | "md" | "lg"  (default: "md")
 *   overlay — boolean: render a full-screen backdrop  (default: false)
 *   label   — optional text shown beneath the spinner
 */
export default function LoadingSpinner({ size = "md", overlay = false, label }) {
  const sizes = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <svg
        className={`animate-spin text-blue-600 ${sizes[size]}`}
        xmlns="http://www.w3.org/2000/svg"
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
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-40">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-16">{spinner}</div>;
}
