import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — H.A.D." }] }),
  component: AdminHome,
});

function AdminHome() {
  const [stats, setStats] = useState({ users: 0, invested: 0, pending: 0, active: 0 });

  useEffect(() => {
    (async () => {
      const [u, inv, pend, act] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("investments").select("amount_invested"),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("trading_assets").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setStats({
        users: u.count || 0,
        invested: (inv.data || []).reduce((a, b) => a + Number(b.amount_invested), 0),
        pending: pend.count || 0,
        active: act.count || 0,
      });
    })();
  }, []);

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Total Users" value={stats.users} to="/admin/users" />
        <Card label="Total Invested" value={`₹${stats.invested.toLocaleString("en-IN")}`} to="/admin/investments" />
        <Card label="Pending Verifications" value={stats.pending} accent to="/admin/payments" />
        <Card label="Active Trades" value={stats.active} to="/admin/trading" />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <QuickAction title="Broadcast notification" to="/admin/notifications" />
        <QuickAction title="Update wallets / UPI" to="/admin/wallets" />
        <QuickAction title="Maintenance mode" to="/admin/settings" />
        <QuickAction title="Add trading asset" to="/admin/trading" />
      </div>
    </AdminShell>
  );
}

function Card({ label, value, accent, to }: { label: string; value: string | number; accent?: boolean; to: string }) {
  return (
    <Link to={to} className={`block rounded-xl border p-6 transition hover:border-gold ${accent ? "border-gold bg-gold/5" : "border-gold/20 bg-navy-light/40"}`}>
      <div className="text-xs text-white/60 uppercase tracking-widest">{label}</div>
      <div className="mt-2 font-serif text-3xl text-gold">{value}</div>
    </Link>
  );
}
function QuickAction({ title, to }: { title: string; to: string }) {
  return (
    <Link to={to} className="rounded-xl border border-gold/20 bg-navy-light/40 p-5 hover:border-gold transition flex items-center justify-between">
      <span>{title}</span>
      <span className="text-gold">→</span>
    </Link>
  );
}
