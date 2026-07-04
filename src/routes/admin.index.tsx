import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard" }] }),
  component: AdminDash,
});

function AdminDash() {
  const [s, setS] = useState({ users: 0, invested: 0, pending: 0, trades: 0 });
  useEffect(() => {
    async function load() {
      const [u, inv, pend, tr] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("investments").select("amount_invested"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("trading_assets").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setS({
        users: u.count ?? 0,
        invested: (inv.data ?? []).reduce((a, b: any) => a + Number(b.amount_invested), 0),
        pending: pend.count ?? 0,
        trades: tr.count ?? 0,
      });
    }
    load();
  }, []);
  return (
    <AdminShell title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Users" value={String(s.users)} />
        <Stat label="Total Invested" value={formatINR(s.invested)} />
        <Stat label="Pending Verifications" value={String(s.pending)} highlight />
        <Stat label="Active Trades" value={String(s.trades)} />
      </div>
    </AdminShell>
  );
}
function Stat({ label, value, highlight }: any) {
  return <div className={`bg-card border ${highlight ? "border-[var(--gold)]/40" : "border-border"} rounded-lg p-5`}><p className="text-xs uppercase text-muted-foreground tracking-wider">{label}</p><p className={`text-2xl font-bold mt-2 ${highlight ? "text-[var(--gold)]" : ""}`}>{value}</p></div>;
}