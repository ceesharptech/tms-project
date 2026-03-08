/**
 * EmptyState — "no data" placeholder.
 *
 * Props:
 *   icon    — SVG element to display (optional)
 *   title   — heading text
 *   message — sub-text (optional)
 *   action  — { label: string, onClick: fn } (optional)
 */
export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      {message && (
        <p className="text-sm text-gray-500 mb-5 max-w-xs leading-relaxed">
          {message}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
