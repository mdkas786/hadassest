import { supabase } from "@/integrations/supabase/client";
import { formatINR, getPlan } from "@/lib/format";

// Auto / manual approval shared logic. Mirrors admin.payment-verification approve().
export async function approveTransaction(txId: string) {
  const { data: tx } = await supabase.from("transactions").select("*").eq("id", txId).maybeSingle();
  if (!tx || tx.status !== "pending") return { ok: false, reason: "not_pending" };
  await supabase.from("transactions").update({ status: "verified" }).eq("id", tx.id);
  let planLabel = "";
  let planRateLabel = 0;
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
        had_id: tx.had_id, amount_invested: amt, plan_name: label, plan_rate: rate,
        is_special: true, offer_id: tx.offer_id, slab_id: tx.slab_id,
        monthly_roi: monthly, duration_months: Number(slab.duration_months),
        total_return: total, transaction_id: tx.id,
      });
      await (supabase as any).from("user_special_investments").update({ status: "active", start_date: new Date().toISOString().slice(0, 10) }).eq("transaction_id", tx.id);
      planLabel = label; planRateLabel = rate;
    }
  } else {
    const { data: existing } = await supabase.from("investments").select("*").eq("had_id", tx.had_id).eq("is_special", false).maybeSingle();
    const newTotal = (existing ? Number(existing.amount_invested) : 0) + Number(tx.amount);
    const plan = getPlan(newTotal);
    if (existing) {
      await supabase.from("investments").update({ amount_invested: newTotal, plan_name: plan.name, plan_rate: plan.rate }).eq("id", existing.id);
    } else {
      await supabase.from("investments").insert({ had_id: tx.had_id, amount_invested: newTotal, plan_name: plan.name, plan_rate: plan.rate, is_special: false });
    }
    planLabel = plan.name; planRateLabel = plan.rate;
  }
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
  await supabase.from("notifications").insert({
    had_id: tx.had_id, title: "Payment Verified ✅",
    body: `${formatINR(tx.amount)} aapke portfolio mein add ho gayi. Plan: ${planLabel} @ ${planRateLabel}% monthly.`,
    type: "success",
  });
  return { ok: true };
}

export async function getVerificationMode(): Promise<"manual" | "automatic"> {
  const { data } = await supabase.from("config").select("value").eq("key", "payment_verification_mode").maybeSingle();
  return (data?.value === "automatic" ? "automatic" : "manual");
}

export async function setVerificationMode(mode: "manual" | "automatic") {
  await supabase.from("config").upsert({ key: "payment_verification_mode", value: mode });
}