import { useContext } from "react";
import { Context } from "../contexts/supabaseContext";

export function useSupabase() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error(
      "useSupabase must be used within a SupabaseProvider"
    );
  }
  return context;
}