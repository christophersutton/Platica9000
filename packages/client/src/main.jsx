import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { SupabaseProvider } from "./contexts/supabaseContext";

// NEW IMPORT:
import { SidebarProvider } from "./components/RightSidebar";
import { RightSidebar } from "./components/RightSidebar";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SupabaseProvider>
      {/* Wrap the entire app in SidebarProvider */}
      <SidebarProvider>
        <App />
        {/* Render the actual right-hand sidebar container once, globally */}
        <RightSidebar />
      </SidebarProvider>
    </SupabaseProvider>
  </StrictMode>
);