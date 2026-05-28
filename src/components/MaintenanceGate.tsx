import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/had-logo.jpg";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState("We are performing scheduled maintenance. Please check back shortly.");
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data } = await supabase.from("app_settings").select("key,value").in("key", ["maintenance_mode", "maintenance_message"]);
      if (!mounted) return;
      const m = (data || []).find((r) => r.key === "maintenance_mode")?.value === "true";
      const t = (data || []).find((r) => r.key === "maintenance_message")?.value;
      setOn(m); if (t) setMsg(t);
    }
    check();
    const ch = supabase.channel("settings_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, check)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  // Always allow admin routes through so admin can disable maintenance
  const isAdminRoute = path.startsWith("/admin");
  if (on && !isAdminRoute) {
    return (
      <div className="min-h-screen bg-navy text-white grid place-items-center px-6">
        <div className="text-center max-w-md">
          <img src={logo} className="h-16 w-16 rounded mx-auto mb-6" alt="" />
          <p className="text-xs tracking-[0.3em] text-gold uppercase">H.A.D.</p>
          <h1 className="font-serif text-3xl mt-2">Under maintenance</h1>
          <p className="text-white/70 mt-4">{msg}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
