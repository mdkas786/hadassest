import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtInr } from "@/lib/plans";

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "My Income — H.A.D." }] }),
  component: IncomePage,
});

interface SponsorRow { id: string; referred_had_id: string; investment_amount: number; sponsor_amount: number; status: string; created_at: string; }
interface PartnerRow { id: string; period_month: string; direct1_had_id: string | null; direct2_had_id: string | null; total_bonus: number; status: string; created_at: string; }

function IncomePage() {
  const nav = useNavigate();
  const [sponsor, setSponsor] = useState<SponsorRow[]>([]);
  const [partner, setPartner] = useState<PartnerRow[]>([]);
  const [directCount, setDirectCount] = useState(0);
  const [hadId, setHadId] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { nav({ to: "/login" }); return; }
    const { data: p } = await supabase.from("profiles").select("had_id").eq("id", user.id).maybeSingle();
    const id = (p as any)?.had_id || "";
    setHadId(id);
    const [{ data: s }, { data: pa }, { count }] = await Promise.all([
      supabase.from("sponsor_income").select("*").eq("earner_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("partner_income").select("*").eq("earner_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", id),
    ]);
    setSponsor((s as any) || []);
    setPartner((pa as any) || []);
    setDirectCount(count || 0);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel("income_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsor_income" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_income" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const totalSponsor = sponsor.reduce((a, b) => a + Number(b.sponsor_amount), 0);
  const totalPartner = partner.reduce((a, b) => a + Number(b.total_bonus), 0);
  const partnerActive = directCount >= 2;

  return (
    <div className="min-h-screen bg-navy text-white pb-24 md:pb-8">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-4xl px-5 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-white/70 hover:text-gold">← Dashboard</Link>
          <span className="font-serif text-gold">My Income</span>
          <span className="text-xs text-white/50">{hadId}</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-6 space-y-6">
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gold/30 bg-navy-light/40 p-5">
            <p className="text-[10px] uppercase tracking-widest text-gold">Sponsor Income (5%)</p>
            <p className="font-serif text-3xl text-gold mt-1">{fmtInr(totalSponsor)}</p>
            <p className="text-xs text-white/60 mt-1">From {sponsor.length} referral payment(s) · included in 2X package</p>
          </div>
          <div className={`rounded-xl border p-5 ${partnerActive ? "border-emerald-400/40 bg-emerald-400/5" : "border-amber-400/40 bg-amber-400/5"}`}>
            <p className="text-[10px] uppercase tracking-widest text-gold">Partner Bonus (10% of ROI)</p>
            <p className="font-serif text-3xl text-gold mt-1">{fmtInr(totalPartner)}</p>
            <p className="text-xs text-white/60 mt-1">
              {partnerActive
                ? `Active · ${directCount} direct referrals`
                : `${Math.max(0, 2 - directCount)} aur direct referral chahiye (need 2 to unlock)`}
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-xl text-gold mb-3">Sponsor Income History</h2>
          {sponsor.length === 0 ? (
            <p className="text-sm text-white/60">Abhi tak koi sponsor income nahi. Refer karein aur 5% commission paayein.</p>
          ) : (
            <div className="rounded-xl border border-gold/20 bg-navy-light/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-navy/60 text-white/60">
                  <tr><th className="text-left p-3">Referred</th><th className="text-right p-3">Investment</th><th className="text-right p-3">Your 5%</th><th className="text-right p-3">Status</th><th className="text-right p-3">Date</th></tr>
                </thead>
                <tbody>
                  {sponsor.map((r) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="p-3 font-mono text-gold/90">{r.referred_had_id}</td>
                      <td className="p-3 text-right tabular-nums">{fmtInr(r.investment_amount)}</td>
                      <td className="p-3 text-right tabular-nums text-gold">{fmtInr(r.sponsor_amount)}</td>
                      <td className="p-3 text-right"><span className={`text-xs px-2 py-0.5 rounded ${r.status === "paid" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{r.status}</span></td>
                      <td className="p-3 text-right text-xs text-white/50">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-serif text-xl text-gold mb-3">Partner Income History</h2>
          {partner.length === 0 ? (
            <p className="text-sm text-white/60">Jab aapke 2 direct referrals ka ROI process hoga, aapko 10% partner bonus milega.</p>
          ) : (
            <div className="rounded-xl border border-gold/20 bg-navy-light/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-navy/60 text-white/60">
                  <tr><th className="text-left p-3">Month</th><th className="text-left p-3">Direct 1</th><th className="text-left p-3">Direct 2</th><th className="text-right p-3">Bonus</th><th className="text-right p-3">Status</th></tr>
                </thead>
                <tbody>
                  {partner.map((r) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="p-3">{r.period_month}</td>
                      <td className="p-3 font-mono text-xs">{r.direct1_had_id || "—"}</td>
                      <td className="p-3 font-mono text-xs">{r.direct2_had_id || "—"}</td>
                      <td className="p-3 text-right tabular-nums text-gold">{fmtInr(r.total_bonus)}</td>
                      <td className="p-3 text-right"><span className={`text-xs px-2 py-0.5 rounded ${r.status === "paid" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
