import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { VerificationModeToggle } from "@/components/VerificationModeToggle";

export const Route = createFileRoute("/admin/income")({
  head: () => ({ meta: [{ title: "Income Management — Admin" }] }),
  component: AdminIncome,
});

function AdminIncome() {
  const [tab, setTab] = useState<"referral" | "level">("referral");
  const [status, setStatus] = useState<"pending" | "paid" | "all">("pending");
  const [rows, setRows] = useState<any[]>([]);
  async function load() {
    let q = supabase.from("sponsor_income").select("*").eq("type", tab).order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [tab, status]);
  async function markPaid(r: any) {
    await supabase.from("sponsor_income").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", r.id);
    // add to earner's investment total received
    const { data: inv } = await supabase.from("investments").select("*").eq("had_id", r.earner_had_id).maybeSingle();
    if (inv) {
      const cap = Number(inv.amount_invested) * 2;
      const newReceived = Number(inv.total_income_received) + Number(r.income_amount);
      await supabase.from("investments").update({
        total_income_received: newReceived,
        status: newReceived >= cap ? "completed" : "active",
      }).eq("id", inv.id);
    }
    await supabase.from("notifications").insert({ had_id: r.earner_had_id, title: tab === "referral" ? "Sponsor Income Paid 🎉" : "Partner Bonus Paid 🎁", body: `${formatINR(r.income_amount)} credited.`, type: "success" });
    toast.success("Paid"); load();
  }
  async function del(r: any) { await supabase.from("sponsor_income").delete().eq("id", r.id); load(); }
  return (
    <AdminShell title="Income Management">
      <VerificationModeToggle />
      <div className="flex gap-2 mb-4">
        {(["referral", "level"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-sm capitalize ${tab === t ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : "bg-secondary"}`}>{t === "referral" ? "Sponsor Income" : "Partner Income"}</button>
        ))}
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="ml-auto bg-input border border-border rounded px-2 py-1 text-sm">
          <option value="pending">Pending</option><option value="paid">Paid</option><option value="all">All</option>
        </select>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-secondary/50 text-xs text-muted-foreground"><tr><th className="text-left p-3">Earner</th><th className="text-left p-3">Source</th><th className="text-right p-3">Base</th><th className="text-right p-3">%</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Status</th><th className="text-left p-3">Date</th><th className="text-left p-3">Action</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No records</td></tr> : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 text-[var(--gold)]">{r.earner_had_id}</td>
                <td className="p-3">{r.source_had_id ?? "—"}</td>
                <td className="p-3 text-right">{formatINR(r.base_amount)}</td>
                <td className="p-3 text-right">{r.percentage}%</td>
                <td className="p-3 text-right text-[var(--gold)]">{formatINR(r.income_amount)}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">{formatDate(r.created_at)}</td>
                <td className="p-3">{r.status === "pending" && <button onClick={() => markPaid(r)} className="bg-[var(--success)] text-white text-xs px-2 py-1 rounded mr-2">Mark Paid</button>}<button onClick={() => del(r)} className="border border-destructive text-destructive text-xs px-2 py-1 rounded">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Plan rates: Starter 5% · Growth 6% · Fortune 7% · Partner = 10% of direct ROI.</p>
    </AdminShell>
  );
}