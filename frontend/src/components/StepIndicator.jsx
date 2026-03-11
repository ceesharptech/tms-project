/**
 * StepIndicator — horizontal progress indicator for multi-step wizards.
 *
 * Props:
 *   currentStep  — 1-based index of the active step
 *   steps        — array of step label strings
 */
export default function StepIndicator({ currentStep, steps }) {
  return (
    <nav aria-label="Progress" className="w-full">
      {/* Desktop: horizontal */}
      <ol className="hidden sm:flex items-center w-full">
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <li
              key={label}
              className={`flex items-center ${idx < steps.length - 1 ? "flex-1" : ""}`}
            >
              {/* Circle + label */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isComplete
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isComplete ? (
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
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isCurrent
                      ? "text-blue-700"
                      : isComplete
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Connector line between steps */}
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                    isComplete ? "bg-green-400" : "bg-gray-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: stacked compact indicator */}
      <div className="sm:hidden flex items-center gap-2 px-1">
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isComplete
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isComplete ? (
                  <svg
                    className="w-3 h-3"
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
                ) : (
                  stepNum
                )}
              </div>
              {isCurrent && (
                <span className="text-xs font-semibold text-blue-700">
                  {label}
                </span>
              )}
              {idx < steps.length - 1 && (
                <div
                  className={`w-4 h-0.5 ${isComplete ? "bg-green-400" : "bg-gray-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
