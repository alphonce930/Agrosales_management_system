import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import StaffDashboard from './pages/StaffDashboard';
import StaffCustomersPage from './pages/StaffCustomersPage';
import StaffProductsPage from './pages/StaffProductsPage';
import StaffSalesPage from './pages/StaffSalesPage';
import StaffLendingPage from './pages/StaffLendingPage';
import StaffPaymentsPage from './pages/StaffPaymentsPage';
import StaffReceiptsPage from './pages/StaffReceiptsPage';
import StaffReportsPage from './pages/StaffReportsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminSalesPage from './pages/AdminSalesPage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import SuperAdminUsersPage from './pages/SuperAdminUsersPage';
import ProfilePage from './pages/ProfilePage';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={user ? <Navigate to={user.role === 'super_admin' ? '/super-admin' : user.role === 'admin' ? '/admin' : '/staff'} replace /> : <LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout role="super_admin" /></ProtectedRoute>}>
        <Route index element={<SuperAdminUsersPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout role="admin" /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="sales" element={<AdminSalesPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff']}><DashboardLayout role="staff" /></ProtectedRoute>}>
        <Route index element={<StaffDashboard />} />
        <Route path="customers" element={<StaffCustomersPage />} />
        <Route path="products" element={<StaffProductsPage />} />
        <Route path="sales" element={<StaffSalesPage />} />
        <Route path="lending" element={<StaffLendingPage />} />
        <Route path="payments" element={<StaffPaymentsPage />} />
        <Route path="receipts" element={<StaffReceiptsPage />} />
        <Route path="reports" element={<StaffReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
