import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — H.A.D." }] }),
  component: AdminHome,
});

function AdminHome() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, invested: 0, pending: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/admin/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!(roles || []).some((r) => r.role === "admin")) { nav({ to: "/admin/login" }); return; }
      const [u, inv, pend] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("investments").select("amount_invested"),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setStats({
        users: u.count || 0,
        invested: (inv.data || []).reduce((a, b) => a + Number(b.amount_invested), 0),
        pending: pend.count || 0,
      });
      setLoading(false);
    })();
  }, [nav]);

  if (loading) return <div className="min-h-screen bg-navy text-white grid place-items-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <h1 className="font-serif text-xl text-gold">H.A.D. Admin Panel</h1>
          <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/admin/login" }); }} className="text-sm text-white/70 hover:text-gold">Logout</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs tracking-[0.3em] text-gold uppercase">Dashboard</p>
        <h2 className="font-serif text-3xl mt-1">Overview</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card label="Total Users" value={stats.users} />
          <Card label="Total Invested" value={`₹${stats.invested.toLocaleString("en-IN")}`} />
          <Card label="Pending Verifications" value={stats.pending} accent />
        </div>
        <div className="mt-10 rounded-xl border border-gold/20 bg-navy-light/40 p-6">
          <p className="text-white/70 text-sm">Phase 2 (user dashboard + Markets + CoinCap) and Phase 3 (full admin pages — Users, Investments, Payment Verification, Trading Control, etc.) will be added next. Schema, auth, and Phase 1 foundation are live.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-gold">← Back to site</Link>
        </div>
      </main>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-6 ${accent ? "border-gold bg-gold/5" : "border-gold/20 bg-navy-light/40"}`}>
      <div className="text-xs text-white/60 uppercase tracking-widest">{label}</div>
      <div className="mt-2 font-serif text-3xl text-gold">{value}</div>
    </div>
  );
}
