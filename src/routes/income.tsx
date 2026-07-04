import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserShell } from "@/components/UserShell";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/session";
import { formatINR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "Income — H.A.D." }] }),
  component: Income,
});

function Income() {
  const u = typeof window !== "undefined" ? getUser() : null;
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState<"roi" | "referral" | "level">("roi");
  useEffect(() => {
    if (!u) return;
    supabase.from("sponsor_income").select("*").eq("earner_had_id", u.had_id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [u?.had_id]);
  const sum = (t: string) => rows.filter((r) => r.type === t && r.status === "paid").reduce((a, b) => a + Number(b.income_amount), 0);
  const filtered = rows.filter((r) => r.type === tab);
  return (
    <UserShell>
      <h1 className="text-2xl font-bold mb-4">My Income</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card label="ROI" value={formatINR(sum("roi"))} />
        <Card label="Referral" value={formatINR(sum("referral"))} />
        <Card label="Level" value={formatINR(sum("level"))} />
        <Card label="Total" value={formatINR(sum("roi") + sum("referral") + sum("level"))} highlight />
      </div>
      <div className="flex gap-2 mb-3">
        {(["roi", "referral", "level"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-sm ${tab === t ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : "bg-secondary"}`}>{t.toUpperCase()}</button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs text-muted-foreground"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">From</th><th className="text-right p-3">Base</th><th className="text-right p-3">%</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Status</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No records</td></tr> : filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{formatDate(r.created_at)}</td>
                <td className="p-3">{r.source_had_id ?? "—"}</td>
                <td className="p-3 text-right">{formatINR(r.base_amount)}</td>
                <td className="p-3 text-right">{r.percentage}%</td>
                <td className="p-3 text-right text-[var(--gold)]">{formatINR(r.income_amount)}</td>
                <td className="p-3">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </UserShell>
  );
}
function Card({ label, value, highlight }: any) {
  return <div className={`bg-card border ${highlight ? "border-[var(--gold)]/40" : "border-border"} rounded p-4`}><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold mt-1 ${highlight ? "text-[var(--gold)]" : ""}`}>{value}</p></div>;
}