import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedAdminRoute() {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
