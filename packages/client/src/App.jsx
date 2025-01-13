// src/App.jsx
import "./index.css";
import { useEffect, useState } from "react";
import Auth from "./components/Auth";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { SignIn } from "./pages/SignIn";
import { Register } from "./pages/Register";
import { useSupabase } from "./hooks/useSupabase";
export default function App() {
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const { user, supabase } = useSupabase();

  useEffect(() => {
    if (user) {
      // Fetch channels
      const fetchChannels = async () => {
        const { data } = await supabase.from("channels").select("*");
        // Add any filters you need
        setChannels(data || []);
        if (data?.length > 0 && !currentChannel) {
          setCurrentChannel(data[0]);
        }
      };
      fetchChannels();
    }
  }, [user]);

  if (!user) {
    console.log("No session");
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all redirect to main dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
