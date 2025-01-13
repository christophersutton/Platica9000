// src/components/Auth.jsx
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabase } from "../hooks/useSupabase";
export default function AuthComponent() {
  const { supabase } = useSupabase();
  return (
    <div className="flex justify-center flex-col items-center h-screen">
      <h1 className="text-2xl font-bold mb-12">Welcome to Platica</h1>
      <div className="w-full max-w-sm">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={[]}
        />
      </div>
    </div>
  );
}