import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';

export function SignOutButton() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3zm11.707 4.707a1 1 0 0 0-1.414-1.414L10 9.586 6.707 6.293a1 1 0 0 0-1.414 1.414L8.586 11l-3.293 3.293a1 1 0 1 0 1.414 1.414L10 12.414l3.293 3.293a1 1 0 0 0 1.414-1.414L11.414 11l3.293-3.293z" clipRule="evenodd" />
      </svg>
      <span>Sign Out</span>
    </button>
  );
} 