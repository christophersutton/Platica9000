// src/App.jsx
import "./index.css";
import { useEffect } from "react";
import Auth from "./components/Auth";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { SignIn } from "./pages/SignIn";
import { Register } from "./pages/Register";
import { useSupabase } from "./hooks/useSupabase";

export default function App() {
  const { user, loading } = useSupabase();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes - redirect to dashboard if already logged in */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" replace /> : <Auth />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/" replace /> : <Register />
          }
        />

        {/* Protected routes - redirect to login if not authenticated */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect unmatched routes to appropriate destination based on auth state */}
        <Route 
          path="*" 
          element={
            user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
