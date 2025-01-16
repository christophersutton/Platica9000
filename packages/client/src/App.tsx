import "./index.css";
import AuthComponent from "./components/Auth";
import React, { useRef } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { Register } from "./pages/Register";
import { useSupabase } from "./hooks/use-supabase";
import { Messages } from "./components/Messages";
import { Secretary } from "./components/Secretary";
import { EphemeralChatProvider } from "./contexts/EphemeralChatContext";
import { EphemeralChats } from "./components/EphemeralChats";
import { motion } from "framer-motion";

export default function App() {
  const { user, loading } = useSupabase();
  const constraintsRef = useRef(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <EphemeralChatProvider>
        <motion.div ref={constraintsRef} className="w-screen h-screen overflow-hidden">
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <AuthComponent />}
            />
            <Route
              path="/register"
              element={user ? <Navigate to="/" replace /> : <Register />}
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                  <EphemeralChats constraintsRef={constraintsRef} />
                </ProtectedRoute>
              }
            >
              <Route index element={<div className="p-4">Select a channel</div>} />
              <Route path="channels/:channelId" element={<Messages />} />
              <Route path="secretary" element={<Secretary />} />
            </Route>
            <Route
              path="*"
              element={
                user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
              }
            />
          </Routes>
        </motion.div>
      </EphemeralChatProvider>
    </BrowserRouter>
  );
}