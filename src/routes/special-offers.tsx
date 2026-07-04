import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserShell } from "@/components/UserShell";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/special-offers")({
  head: () => ({ meta: [{ title: "Special Offers — H.A.D." }] }),
  component: SpecialOffersPage,
});

function SpecialOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [slabs, setSlabs] = useState<Record<string, any[]>>({});

  useEffect(() => {
    async function load() {
      const { data: o } = await (supabase as any)
        .from("special_offers")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setOffers(o ?? []);
      if (o && o.length) {
        const { data: s } = await (supabase as any).from("special_offer_slabs").select("*").in("offer_id", o.map((x: any) => x.id)).order("sort_order");
        const grouped: Record<string, any[]> = {};
        (s ?? []).forEach((row: any) => { (grouped[row.offer_id] ||= []).push(row); });
        setSlabs(grouped);
      }
    }
    load();
    const ch = (supabase as any).channel("special-offers-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "special_offers" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "special_offer_slabs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <UserShell>
      <div className="space-y-6 relative">
        <CryptoParticles />
        <div>
          <p className="text-xs text-[var(--gold)] tracking-widest animate-pulse">🔥 LIMITED TIME</p>
          <h1 className="text-2xl font-bold">Special Offers</h1>
          <p className="text-sm text-muted-foreground">Exceptional profit slabs hand-picked by the H.A.D team.</p>
        </div>

        {offers.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            No special offers active right now. Stay tuned!
          </div>
        )}

        {offers.map((o) => {
          const expired = o.end_date && new Date(o.end_date) < new Date();
          return (
          <div key={o.id} className={`relative overflow-hidden bg-gradient-to-br from-[var(--gold)]/10 to-card border-2 ${expired ? "border-border opacity-90" : "border-[var(--gold)]/60 hover:border-[var(--gold)]"} rounded-xl p-5 animate-fade-in transition-all duration-300 hover:shadow-[0_0_40px_-10px_var(--gold)] hover:-translate-y-0.5`}>
            {!expired && <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-tr from-transparent via-[var(--gold)]/10 to-transparent opacity-0 hover:opacity-100 transition" />}
            <div className="flex items-start gap-4 flex-wrap">
              {o.image && <img src={o.image} alt="" className="w-32 h-32 object-cover rounded-lg border border-[var(--gold)]/40" />}
              <div className="flex-1 min-w-[200px]">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${expired ? "bg-secondary text-muted-foreground" : "bg-[var(--gold)] text-[var(--primary-foreground)] animate-pulse"}`}>{expired ? "Past Offer" : "Special Offer"}</span>
                <h2 className="text-xl font-bold text-[var(--gold)] mt-2">{o.title}</h2>
                {o.description && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{o.description}</p>}
                {o.end_date && <p className={`text-xs mt-2 ${expired ? "text-muted-foreground" : "text-[var(--warning)]"}`}>{expired ? `📅 Ended ${o.end_date}` : `⏳ Valid until ${o.end_date}`}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
              {(slabs[o.id] ?? []).map((s) => (
                <div key={s.id} className="group bg-card border border-[var(--gold)]/40 rounded-lg p-4 hover:border-[var(--gold)] hover:shadow-[0_0_25px_-8px_var(--gold)] hover:-translate-y-0.5 transition-all duration-300">
                  <p className="text-xs text-[var(--gold)] font-bold uppercase tracking-wider">{s.slab_label || "Plan"}</p>
                  <p className="text-2xl font-bold mt-1">{formatINR(s.investment_amount)}</p>
                  <p className="text-xs text-muted-foreground">Investment</p>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div><p className="text-muted-foreground">Monthly</p><p className="font-semibold text-[var(--success)]">{formatINR(s.monthly_profit)}</p></div>
                    <div><p className="text-muted-foreground">Duration</p><p className="font-semibold">{s.duration_months}m</p></div>
                    <div><p className="text-muted-foreground">Total Return</p><p className="font-semibold text-[var(--gold)]">{formatINR(s.total_return)}</p></div>
                  </div>
                  {s.benefits && <p className="text-xs text-muted-foreground mt-2">✨ {s.benefits}</p>}
                  {expired ? (
                    <p className="text-center mt-3 bg-secondary/60 text-muted-foreground py-2 rounded text-xs">Offer Ended</p>
                  ) : (
                    <Link
                      to="/pay"
                      search={{ offer: o.id, slab: s.id } as any}
                      className="block text-center mt-3 bg-[var(--gold)] text-[var(--primary-foreground)] py-2 rounded font-semibold text-sm hover:opacity-90 group-hover:shadow-lg"
                    >
                      Invest Now →
                    </Link>
                  )}
                </div>
              ))}
              {(slabs[o.id] ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground col-span-2">No slabs configured for this offer yet.</p>
              )}
            </div>
          </div>
        );})}
      </div>
    </UserShell>
  );
}

function CryptoParticles() {
  const symbols = ["₿", "Ξ", "◎", "₮", "₿", "Ξ"];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-30">
      {symbols.map((s, i) => (
        <span
          key={i}
          className="absolute text-[var(--gold)] font-bold select-none animate-float"
          style={{
            left: `${(i * 17 + 5) % 90}%`,
            top: `${(i * 23 + 10) % 80}%`,
            fontSize: `${24 + (i % 3) * 10}px`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${10 + (i % 4) * 3}s`,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}