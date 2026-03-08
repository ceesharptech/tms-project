import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute — guards pages that require authentication (and optionally a role).
 *
 * Usage:
 *   <ProtectedRoute>                        // any authenticated user
 *   <ProtectedRoute requiredRole="admin">   // admin only
 *   <ProtectedRoute requiredRole="officer"> // officer only
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // While session is being restored from localStorage, render nothing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
        <div className="flex items-center gap-2 text-gray-400">
          <svg
            className="animate-spin w-4 h-4"
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
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but wrong role → show 403
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 font-sans">
        <div className="bg-white rounded-2xl shadow-md px-10 py-9 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.6}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-1">403</h1>
          <p className="text-base font-semibold text-gray-800 mb-2">
            Access Denied
          </p>
          <p className="text-sm text-gray-500">
            You do not have permission to view this page.
          </p>
          <div className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Required:{" "}
            <span className="font-semibold text-blue-600 capitalize">
              {requiredRole}
            </span>{" "}
            — Your role:{" "}
            <span className="font-semibold text-gray-700 capitalize">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
