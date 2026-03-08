import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";

// ── Placeholder dashboard pages (replaced in Phase 5+) ─────────────────────
function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome, {user?.full_name}
        </h1>
        <p className="text-gray-400 mb-1">
          Role: <span className="text-blue-400 font-medium">{user?.role}</span>
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Officer ID: {user?.officer_id}
        </p>
        <button
          onClick={logout}
          className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function AdminDashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <h1 className="text-2xl font-bold text-white">
        Admin Dashboard (Phase 5+)
      </h1>
    </div>
  );
}

function OfficerDashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <h1 className="text-2xl font-bold text-white">
        Officer Dashboard (Phase 5+)
      </h1>
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
