import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — H.A.D." }] }),
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ had_id: string; full_name: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data } = await supabase.from("profiles").select("had_id, full_name").eq("id", user.id).maybeSingle();
      setProfile(data as any);
    })();
  }, [nav]);

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-serif text-xl text-gold">H.A.D.</Link>
          <div className="flex items-center gap-4">
            {profile && <span className="text-sm text-white/70">{profile.had_id}</span>}
            <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="text-sm text-white/70 hover:text-gold">Logout</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-serif text-4xl">Hello {profile?.full_name?.split(" ")[0] || "investor"} 👋</h1>
        <p className="text-white/60 mt-2">Your investor dashboard is being built. Phase 2 brings investment summary, live company portfolio (CoinCap), AI analysis, transactions and pay flow.</p>
        <div className="mt-8 rounded-xl border border-gold/20 bg-navy-light/40 p-8">
          <p className="text-xs text-white/60 uppercase tracking-widest">Your HAD ID</p>
          <p className="font-serif text-5xl text-gold mt-2">{profile?.had_id || "—"}</p>
        </div>
      </main>
    </div>
  );
}
