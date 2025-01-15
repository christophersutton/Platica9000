import { Navigate } from 'react-router-dom';
import { useSupabase } from '../hooks/use-supabase';

export function ProtectedRoute({ children }) {
  const { user, loading } = useSupabase();

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

