import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import App from "./App.tsx";
import "./index.css";

// Force sign out and clear all storage on first load
const forceCleanStart = async () => {
  const hasCleared = sessionStorage.getItem("fresh_start_v2");
  if (!hasCleared) {
    // Clear all localStorage
    localStorage.clear();

    // Also explicitly sign out from Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      await supabase.auth.signOut();
    }

    sessionStorage.setItem("fresh_start_v2", "true");
    console.log("Force signed out and cleared all storage");
    window.location.reload();
  }
};

forceCleanStart();

createRoot(document.getElementById("root")!).render(<App />);
