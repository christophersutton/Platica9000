import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { SupabaseProvider } from "./contexts/supabaseContext";
import { SidebarProvider } from "./components/RightSidebar";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SupabaseProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </SupabaseProvider>
  </StrictMode>
);