import { Navigate, Route, Routes, lazy, Suspense } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";

// Lazy load dashboard pages for better performance
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const StaffCustomersPage = lazy(() => import("./pages/StaffCustomersPage"));
const StaffProductsPage = lazy(() => import("./pages/StaffProductsPage"));
const StaffSalesPage = lazy(() => import("./pages/StaffSalesPage"));
const StaffLendingPage = lazy(() => import("./pages/StaffLendingPage"));
const StaffPaymentsPage = lazy(() => import("./pages/StaffPaymentsPage"));
const StaffReceiptsPage = lazy(() => import("./pages/StaffReceiptsPage"));
const StaffReportsPage = lazy(() => import("./pages/StaffReportsPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCustomersPage = lazy(() => import("./pages/AdminCustomersPage"));
const AdminProductsPage = lazy(() => import("./pages/AdminProductsPage"));
const AdminSalesPage = lazy(() => import("./pages/AdminSalesPage"));
const AdminPaymentsPage = lazy(() => import("./pages/AdminPaymentsPage"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));
const SuperAdminUsersPage = lazy(() => import("./pages/SuperAdminUsersPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role))
    return <Navigate to="/" replace />;

  return children;
};

const LoadingFallback = () => (
  <div className="p-8 text-center">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    <p className="mt-2 text-gray-600">Loading...</p>
  </div>
);

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="login"
          element={
            user ? (
              <Navigate
                to={
                  user.role === "super_admin"
                    ? "/super-admin"
                    : user.role === "admin"
                      ? "/admin"
                      : "/staff"
                }
                replace
              />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <DashboardLayout role="super_admin" />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<LoadingFallback />}>
              <SuperAdminUsersPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ProfilePage />
            </Suspense>
          }
        />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route
          path="customers"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminCustomersPage />
            </Suspense>
          }
        />
        <Route
          path="products"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminProductsPage />
            </Suspense>
          }
        />
        <Route
          path="sales"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminSalesPage />
            </Suspense>
          }
        />
        <Route
          path="payments"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminPaymentsPage />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminReportsPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ProfilePage />
            </Suspense>
          }
        />
      </Route>

      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <DashboardLayout role="staff" />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<LoadingFallback />}>
              <StaffDashboard />
            </Suspense>
          }
        />
        <Route
          path="customers"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <StaffCustomersPage />
            </Suspense>
          }
        />
        <Route
          path="products"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <StaffProductsPage />
            </Suspense>
          }
        />
        <Route
          path="sales"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <StaffSalesPage />
            </Suspense>
          }
        />
        <Route
          path="lending"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <StaffLendingPage />
            </Suspense>
          }
        />
        <Route
          path="payments"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <StaffPaymentsPage />
            </Suspense>
          }
        />
        <Route
          path="receipts"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <StaffReceiptsPage />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <StaffReportsPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ProfilePage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
