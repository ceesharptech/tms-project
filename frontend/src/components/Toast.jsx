import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

const TYPE_STYLES = {
  success: {
    wrap: "bg-green-50 border-green-200 text-green-800",
    icon: "bg-green-100 text-green-600",
  },
  error: {
    wrap: "bg-red-50 border-red-200 text-red-800",
    icon: "bg-red-100 text-red-600",
  },
  info: {
    wrap: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "bg-blue-100 text-blue-600",
  },
};

function ToastIcon({ type }) {
  if (type === "success")
    return (
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
    );
  if (type === "error")
    return (
      <svg
        className="w-4 h-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  return (
    <svg
      className="w-4 h-4"
      xmlns="http://www.w3.org/2000/svg"
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
  );
}

function ToastItem({ toast, onRemove }) {
  const styles = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium w-72 ${styles.wrap}`}
    >
      <span className={`p-0.5 rounded-full shrink-0 ${styles.icon}`}>
        <ToastIcon type={toast.type} />
      </span>
      <span className="flex-1 leading-5">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 opacity-40 hover:opacity-80 transition shrink-0"
      >
        <svg
          className="w-3.5 h-3.5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
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
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (message, type = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns a function: toast(message, type) */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
