import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, getPlan } from "@/lib/format";
import { toast } from "sonner";
import { VerificationModeToggle } from "@/components/VerificationModeToggle";

export const Route = createFileRoute("/admin/payment-verification")({
  head: () => ({ meta: [{ title: "Payment Verification — Admin" }] }),
  component: PV,
});

function PV() {
  const [tab, setTab] = useState<"pending" | "verified" | "rejected">("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  async function load() {
    const { data } = await supabase.from("transactions").select("*").eq("status", tab).order("created_at", { ascending: false });
    setRows(data ?? []);
    const paths = (data ?? []).map((t: any) => t.screenshot_url).filter(Boolean);
    if (paths.length) {
      const { data: s } = await supabase.storage.from("payment-screenshots").createSignedUrls(paths, 3600);
      const m: Record<string, string> = {};
      (s ?? []).forEach((x: any) => { if (x.signedUrl) m[x.path] = x.signedUrl; });
      setSigned(m);
    } else { setSigned({}); }
  }
  useEffect(() => { load(); }, [tab]);

  async function approve(tx: any) {
    if (!confirm(`Approve ${formatINR(tx.amount)} for ${tx.had_id}?`)) return;
    // 1. mark transaction verified
    await supabase.from("transactions").update({ status: "verified" }).eq("id", tx.id);
    let planLabel = "";
    let planRateLabel = 0;
    // 2. SPECIAL OFFER path — create a separate investment locked to the chosen slab
    if (tx.slab_id && tx.offer_id) {
      const { data: slab } = await (supabase as any).from("special_offer_slabs").select("*").eq("id", tx.slab_id).maybeSingle();
      const { data: offer } = await (supabase as any).from("special_offers").select("*").eq("id", tx.offer_id).maybeSingle();
      if (slab) {
        const amt = Number(slab.investment_amount);
        const monthly = Number(slab.monthly_profit);
        const rate = amt > 0 ? Number(((monthly / amt) * 100).toFixed(4)) : 0;
        const total = Number(slab.total_return);
        const label = `${offer?.title ?? "SPECIAL"} · ${slab.slab_label ?? "Plan"}`;
        await supabase.from("investments").insert({
          had_id: tx.had_id,
          amount_invested: amt,
          plan_name: label,
          plan_rate: rate,
          is_special: true,
          offer_id: tx.offer_id,
          slab_id: tx.slab_id,
          monthly_roi: monthly,
          duration_months: Number(slab.duration_months),
          total_return: total,
          transaction_id: tx.id,
        });
        await (supabase as any).from("user_special_investments").update({ status: "active", start_date: new Date().toISOString().slice(0, 10) }).eq("transaction_id", tx.id);
        planLabel = label;
        planRateLabel = rate;
      }
    } else {
      // REGULAR path — aggregate into single regular investment
      const { data: existing } = await supabase.from("investments").select("*").eq("had_id", tx.had_id).eq("is_special", false).maybeSingle();
      const newTotal = (existing ? Number(existing.amount_invested) : 0) + Number(tx.amount);
      const plan = getPlan(newTotal);
      if (existing) {
        await supabase.from("investments").update({ amount_invested: newTotal, plan_name: plan.name, plan_rate: plan.rate }).eq("id", existing.id);
      } else {
        await supabase.from("investments").insert({ had_id: tx.had_id, amount_invested: newTotal, plan_name: plan.name, plan_rate: plan.rate, is_special: false });
      }
      planLabel = plan.name;
      planRateLabel = plan.rate;
    }
    // 3. referral income
    const { data: user } = await supabase.from("users").select("referred_by").eq("had_id", tx.had_id).single();
    if (user?.referred_by) {
      const refIncome = Number(tx.amount) * 0.05;
      await supabase.from("sponsor_income").insert({
        earner_had_id: user.referred_by, source_had_id: tx.had_id, type: "referral",
        percentage: 5, base_amount: tx.amount, income_amount: refIncome, status: "pending",
      });
      await supabase.from("notifications").insert({
        had_id: user.referred_by, title: "Sponsor Income Earned 🎉",
        body: `Aapke referral ${tx.had_id} ne ${formatINR(tx.amount)} invest kiya. Aapko ${formatINR(refIncome)} (5%) sponsor income mila.`,
        type: "success",
      });
    }
    // 4. notify user
    await supabase.from("notifications").insert({
      had_id: tx.had_id, title: "Payment Verified ✅",
      body: `${formatINR(tx.amount)} aapke portfolio mein add ho gayi. Plan: ${planLabel} @ ${planRateLabel}% monthly.`,
      type: "success",
    });
    toast.success("Approved");
    load();
  }
  async function reject(tx: any) {
    const reason = prompt("Reject reason?") ?? "Invalid";
    await supabase.from("transactions").update({ status: "rejected" }).eq("id", tx.id);
    await supabase.from("notifications").insert({ had_id: tx.had_id, title: "Payment Rejected ❌", body: `Reason: ${reason}. Dobara pay karein.`, type: "error" });
    load();
  }
  async function del(tx: any) {
    if (!confirm("Delete record?")) return;
    await supabase.from("transactions").delete().eq("id", tx.id);
    load();
  }

  return (
    <AdminShell title="Payment Verification">
      <VerificationModeToggle />
      <div className="flex gap-2 mb-4">
        {(["pending", "verified", "rejected"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-sm capitalize ${tab === t ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : "bg-secondary"}`}>{t}</button>
        ))}
      </div>
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-muted-foreground text-sm">No records</p>}
        {rows.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[var(--gold)] font-semibold">{r.had_id}</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded">{r.type}</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded">{r.payment_method}</span>
              <span className="text-xs bg-[var(--gold)]/20 text-[var(--gold)] px-2 py-1 rounded">{r.plan_name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--gold)] mt-2">{formatINR(r.amount)}</p>
            <p className="text-xs text-muted-foreground">UTR: {r.utr_number}</p>
            {r.screenshot_url && signed[r.screenshot_url] && (
              <a href={signed[r.screenshot_url]} target="_blank" rel="noreferrer" className="inline-block mt-2">
                <img src={signed[r.screenshot_url]} alt="proof" className="max-h-40 rounded border border-border" />
                <span className="text-xs text-[var(--gold)] underline">Open screenshot</span>
              </a>
            )}
            <div className="flex gap-2 mt-3">
              {tab === "pending" && <>
                <button onClick={() => approve(r)} className="bg-[var(--success)] text-white text-xs px-3 py-1 rounded">Approve</button>
                <button onClick={() => reject(r)} className="bg-destructive text-white text-xs px-3 py-1 rounded">Reject</button>
              </>}
              <button onClick={() => del(r)} className="border border-destructive text-destructive text-xs px-3 py-1 rounded">Delete record</button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}