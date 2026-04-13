import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen relative z-50 bg-black">
      <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  const userRole = user.role?.toLowerCase();
  const allowedRoles = roles.map(r => r.toLowerCase());

  if (userRole === 'pending' && !allowedRoles.includes('pending')) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
