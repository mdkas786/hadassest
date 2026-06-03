import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { fmtInr, planRate } from "@/lib/plans";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/income")({
  head: () => ({ meta: [{ title: "Income Management — Admin" }] }),
  component: AdminIncome,
});

interface Sponsor { id: string; earner_had_id: string; referred_had_id: string; investment_amount: number; sponsor_amount: number; status: string; created_at: string; }
interface Partner { id: string; earner_had_id: string; period_month: string; direct1_had_id: string | null; direct2_had_id: string | null; total_bonus: number; status: string; }

function AdminIncome() {
  const [tab, setTab] = useState<"sponsor" | "partner">("sponsor");
  const [sponsor, setSponsor] = useState<Sponsor[]>([]);
  const [partner, setPartner] = useState<Partner[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("pending");
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  async function load() {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("sponsor_income").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("partner_income").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setSponsor((s as any) || []);
    setPartner((p as any) || []);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel("admin_income")
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsor_income" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_income" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fSponsor = sponsor.filter((r) => statusFilter === "all" || r.status === statusFilter);
  const fPartner = partner.filter((r) => statusFilter === "all" || r.status === statusFilter);
  const totalPendingSponsor = sponsor.filter((r) => r.status === "pending").reduce((a, b) => a + Number(b.sponsor_amount), 0);
  const totalPendingPartner = partner.filter((r) => r.status === "pending").reduce((a, b) => a + Number(b.total_bonus), 0);

  async function markPaid(table: "sponsor_income" | "partner_income", id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from(table).update({
      status: "paid", paid_at: new Date().toISOString(), paid_by: user?.id || null,
    }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Marked paid"); load(); }
  }

  async function processPartnerBonus() {
    setBusy(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("id, had_id");
      if (!profiles) return;
      let created = 0;
      for (const p of profiles as any[]) {
        const { data: directs } = await supabase.from("profiles")
          .select("id, had_id").eq("referred_by", p.had_id).limit(2);
        if (!directs || directs.length < 2) continue;
        const d1 = directs[0], d2 = directs[1];
        const { data: invs } = await supabase.from("investments")
          .select("user_id, amount_invested, plan_rate")
          .in("user_id", [d1.id, d2.id]);
        if (!invs || invs.length < 2) continue;
        const roi1 = Number((invs as any).find((i: any) => i.user_id === d1.id)?.amount_invested || 0) * Number((invs as any).find((i: any) => i.user_id === d1.id)?.plan_rate || 0) / 100;
        const roi2 = Number((invs as any).find((i: any) => i.user_id === d2.id)?.amount_invested || 0) * Number((invs as any).find((i: any) => i.user_id === d2.id)?.plan_rate || 0) / 100;
        const bonus = Math.round((roi1 + roi2) * 0.10);
        if (bonus <= 0) continue;
        const { error } = await supabase.from("partner_income").upsert({
          earner_user_id: p.id, earner_had_id: p.had_id, period_month: month,
          direct1_had_id: d1.had_id, direct2_had_id: d2.had_id,
          direct1_roi: roi1, direct2_roi: roi2, total_bonus: bonus, status: "pending",
        } as any, { onConflict: "earner_had_id,period_month" });
        if (!error) {
          created++;
          // bump running total
          const { data: invRow } = await supabase.from("investments").select("id, partner_income_total").eq("user_id", p.id).maybeSingle();
          if (invRow) {
            await supabase.from("investments").update({
              partner_income_total: Number((invRow as any).partner_income_total || 0) + bonus,
            }).eq("id", (invRow as any).id);
          }
          await supabase.from("notifications").insert({
            had_id: p.had_id, title: "Partner Bonus Earned 🎁",
            body: `${month}: ${fmtInr(bonus)} partner bonus (10% of ${fmtInr(roi1 + roi2)} combined ROI).`,
            notif_type: "success",
          });
        }
      }
      toast.success(`Processed ${created} partner bonus rows for ${month}`);
      load();
    } finally { setBusy(false); }
  }

  return (
    <AdminShell title="Income Management">
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-gold/20 bg-navy-light/30 p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/60">Pending Sponsor Income</p>
          <p className="font-serif text-3xl text-gold mt-1">{fmtInr(totalPendingSponsor)}</p>
        </div>
        <div className="rounded-xl border border-gold/20 bg-navy-light/30 p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/60">Pending Partner Bonus</p>
          <p className="font-serif text-3xl text-gold mt-1">{fmtInr(totalPendingPartner)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {(["sponsor", "partner"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm capitalize ${tab === t ? "bg-gold text-navy" : "bg-navy-light text-white/70"}`}>
            {t} Income
          </button>
        ))}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="ml-auto rounded bg-navy-light border border-gold/20 text-sm px-3 py-2">
          <option value="pending">Pending</option><option value="paid">Paid</option><option value="all">All</option>
        </select>
      </div>

      {tab === "partner" && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="rounded bg-navy-light border border-gold/20 text-sm px-3 py-2" />
          <button onClick={processPartnerBonus} disabled={busy}
            className="px-4 py-2 text-sm rounded bg-gold text-navy font-medium disabled:opacity-50">
            {busy ? "Processing…" : `Process Partner Bonus for ${month}`}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gold/20 bg-navy-light/30 overflow-x-auto">
        {tab === "sponsor" ? (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-navy/60 text-white/60">
              <tr><th className="text-left p-3">Earner</th><th className="text-left p-3">Referred</th><th className="text-right p-3">Investment</th><th className="text-right p-3">5%</th><th className="text-right p-3">Status</th><th className="text-right p-3">Date</th><th className="text-right p-3">Action</th></tr>
            </thead>
            <tbody>
              {fSponsor.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3 font-mono text-gold/90">{r.earner_had_id}</td>
                  <td className="p-3 font-mono text-xs">{r.referred_had_id}</td>
                  <td className="p-3 text-right tabular-nums">{fmtInr(r.investment_amount)}</td>
                  <td className="p-3 text-right tabular-nums text-gold">{fmtInr(r.sponsor_amount)}</td>
                  <td className="p-3 text-right"><span className={`text-xs px-2 py-0.5 rounded ${r.status === "paid" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{r.status}</span></td>
                  <td className="p-3 text-right text-xs text-white/50">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    {r.status === "pending" && <button onClick={() => markPaid("sponsor_income", r.id)} className="text-xs px-3 py-1 rounded bg-emerald-500/80 text-white">Mark Paid</button>}
                  </td>
                </tr>
              ))}
              {fSponsor.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-white/50">No rows.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-navy/60 text-white/60">
              <tr><th className="text-left p-3">Earner</th><th className="text-left p-3">Month</th><th className="text-left p-3">D1</th><th className="text-left p-3">D2</th><th className="text-right p-3">Bonus</th><th className="text-right p-3">Status</th><th className="text-right p-3">Action</th></tr>
            </thead>
            <tbody>
              {fPartner.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3 font-mono text-gold/90">{r.earner_had_id}</td>
                  <td className="p-3">{r.period_month}</td>
                  <td className="p-3 font-mono text-xs">{r.direct1_had_id || "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.direct2_had_id || "—"}</td>
                  <td className="p-3 text-right tabular-nums text-gold">{fmtInr(r.total_bonus)}</td>
                  <td className="p-3 text-right"><span className={`text-xs px-2 py-0.5 rounded ${r.status === "paid" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{r.status}</span></td>
                  <td className="p-3 text-right">
                    {r.status === "pending" && <button onClick={() => markPaid("partner_income", r.id)} className="text-xs px-3 py-1 rounded bg-emerald-500/80 text-white">Mark Paid</button>}
                  </td>
                </tr>
              ))}
              {fPartner.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-white/50">No rows.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-white/40 mt-3">Plan rates: Starter 5% · Growth 6% · Fortune 7% · Partner = 10% of combined direct ROI (current: {planRate("starter")}% base).</p>
    </AdminShell>
  );
}
