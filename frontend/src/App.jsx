import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import DriverList from "./pages/DriverList";
import DriverProfile from "./pages/DriverProfile";
import DriverRegistration from "./pages/admin/DriverRegistration";

// ── Root redirect: /  →  /login  or  /dashboard ────────────────────────────
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

// ── Dashboard home: redirect based on role ──────────────────────────────────
function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Navigate
      to={
        user.role === "admin"
          ? "/dashboard/admin/drivers"
          : "/dashboard/officer/drivers"
      }
      replace
    />
  );
}

// ── App with routing ────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected dashboard shell — DashboardLayout renders <Outlet /> */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* /dashboard → redirect based on role */}
              <Route index element={<DashboardHome />} />

              {/* Admin routes */}
              <Route path="admin" element={<Navigate to="drivers" replace />} />
              <Route path="admin/drivers" element={<DriverList />} />
              <Route
                path="admin/drivers/new"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DriverRegistration />
                  </ProtectedRoute>
                }
              />
              <Route path="admin/drivers/:id" element={<DriverProfile />} />

              {/* Officer routes */}
              <Route
                path="officer"
                element={<Navigate to="drivers" replace />}
              />
              <Route path="officer/drivers" element={<DriverList />} />
              <Route path="officer/drivers/:id" element={<DriverProfile />} />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
