import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';

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
        <Route path="login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace /> : <LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout role="admin" /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
      </Route>

      <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff']}><DashboardLayout role="staff" /></ProtectedRoute>}>
        <Route index element={<StaffDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
