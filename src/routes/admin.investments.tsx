import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/investments")({
  head: () => ({ meta: [{ title: "Investments — Admin" }] }),
  component: AdminInvestments,
});

type Inv = {
  id: string; had_id: string; user_id: string; amount_invested: number; amount_received: number;
  plan_name: string; plan_rate: number; expected_2x: number | null; status: string;
  start_date: string; created_at: string;
};

function AdminInvestments() {
  const [rows, setRows] = useState<Inv[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "completed" | "paused">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let qq = supabase.from("investments").select("*").order("created_at", { ascending: false }).limit(500);
    if (status !== "all") qq = qq.eq("status", status);
    const { data } = await qq;
    setRows((data as Inv[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [status]);

  async function setStatusFor(id: string, s: "active" | "completed" | "paused") {
    await supabase.from("investments").update({ status: s }).eq("id", id);
    load();
  }

  const filtered = rows.filter((r) => !q || r.had_id.toLowerCase().includes(q.toLowerCase()));
  const total = filtered.reduce((a, b) => a + Number(b.amount_invested), 0);

  return (
    <AdminShell title="Investments">
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by HAD ID"
          className="rounded-md bg-navy-light border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
        <select value={status} onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-md bg-navy-light border border-gold/20 px-3 py-2 outline-none focus:border-gold">
          <option value="all">All</option><option value="active">Active</option>
          <option value="completed">Completed</option><option value="paused">Paused</option>
        </select>
        <div className="text-sm text-white/70 ml-auto">Total invested: <span className="text-gold">₹{total.toLocaleString("en-IN")}</span></div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="w-full text-sm">
          <thead className="bg-navy-light/60 text-white/70">
            <tr>
              <th className="text-left p-3">HAD ID</th><th className="text-left p-3">Plan</th>
              <th className="text-right p-3">Invested</th><th className="text-right p-3">Received</th>
              <th className="text-right p-3">2X target</th><th className="text-left p-3">Start</th>
              <th className="text-left p-3">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="p-6 text-center text-white/60">Loading…</td></tr> :
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-gold/10">
                  <td className="p-3 font-mono text-gold">{r.had_id}</td>
                  <td className="p-3 capitalize">{r.plan_name} ({r.plan_rate}%)</td>
                  <td className="p-3 text-right">₹{Number(r.amount_invested).toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">₹{Number(r.amount_received).toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-white/70">₹{Number(r.expected_2x || r.amount_invested * 2).toLocaleString("en-IN")}</td>
                  <td className="p-3 text-white/70">{new Date(r.start_date).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      r.status === "active" ? "bg-emerald-500/15 text-emerald-300" :
                      r.status === "completed" ? "bg-gold/15 text-gold" : "bg-white/10 text-white/60"}`}>{r.status}</span>
                  </td>
                  <td className="p-3 space-x-2 text-xs">
                    {r.status !== "paused" && <button onClick={() => setStatusFor(r.id, "paused")} className="text-white/70 hover:text-gold">Pause</button>}
                    {r.status !== "active" && <button onClick={() => setStatusFor(r.id, "active")} className="text-white/70 hover:text-gold">Activate</button>}
                    {r.status !== "completed" && <button onClick={() => setStatusFor(r.id, "completed")} className="text-white/70 hover:text-gold">Complete</button>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
