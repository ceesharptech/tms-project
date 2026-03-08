import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";

// ── Placeholder dashboard pages (replaced in Phase 5+) ─────────────────────
function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 font-sans">
      <div className="bg-white rounded-2xl shadow-md px-10 py-9 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.6}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          Welcome back, {user?.full_name}
        </h1>
        <p className="text-sm text-gray-500 mb-1">
          Role:{" "}
          <span className="font-semibold text-blue-600 capitalize">
            {user?.role}
          </span>
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Badge ID: {user?.officer_id}
        </p>
        <p className="text-xs text-gray-400 mb-6 bg-blue-50 rounded-lg px-3 py-2">
          TOMS dashboard — coming in Phase 5
        </p>
        <button
          onClick={logout}
          className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold border border-red-200 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function AdminDashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white rounded-2xl shadow-md px-10 py-9 text-center">
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-2">Coming in Phase 5+</p>
      </div>
    </div>
  );
}

function OfficerDashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white rounded-2xl shadow-md px-10 py-9 text-center">
        <h1 className="text-xl font-bold text-gray-900">Officer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-2">Coming in Phase 5+</p>
      </div>
    </div>
  );
}

// ── Root redirect: /  →  /login  or  /dashboard ────────────────────────────
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

// ── App with routing ────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected — any authenticated user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            }
          />

          {/* Protected — officer or admin */}
          <Route
            path="/dashboard/officer/*"
            element={
              <ProtectedRoute requiredRole="officer">
                <OfficerDashboardPlaceholder />
              </ProtectedRoute>
            }
          />

          {/* Protected — admin only */}
          <Route
            path="/dashboard/admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboardPlaceholder />
              </ProtectedRoute>
            }
          />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
