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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading…</span>
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
          <p className="text-white text-xl font-semibold mb-2">Access Denied</p>
          <p className="text-gray-400 text-sm">
            You do not have permission to view this page.
            <br />
            Required role: <span className="text-blue-400">
              {requiredRole}
            </span>{" "}
            — your role: <span className="text-yellow-400">{user?.role}</span>.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
