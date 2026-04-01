import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen relative z-50">
      <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#10b981]" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(user.role)) {
    console.warn(`Unauthorized role: ${user.role}. Expected: ${roles}`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
