import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserShell } from "@/components/UserShell";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/session";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — H.A.D." }] }),
  component: Dashboard,
});

function Dashboard() {
  const [inv, setInv] = useState<any>(null);
  const [pending, setPending] = useState(0);
  const [income, setIncome] = useState({ ref: 0, level: 0, roi: 0 });
  const [trading, setTrading] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, { price: number; change: number }>>({});
  const [offers, setOffers] = useState<any[]>([]);
  const u = typeof window !== "undefined" ? getUser() : null;

  useEffect(() => {
    if (!u) return;
    async function load() {
      const { data: invs } = await supabase.from("investments").select("*").eq("had_id", u!.had_id);
      const list = invs ?? [];
      const monthly = list.reduce((sum, x: any) => {
        if (x.is_special && x.monthly_roi) return sum + Number(x.monthly_roi);
        return sum + (Number(x.amount_invested) * Number(x.plan_rate)) / 100;
      }, 0);
      const cap = list.reduce((sum, x: any) => sum + (x.is_special && x.total_return ? Number(x.total_return) : Number(x.amount_invested) * 2), 0);
      const agg = list.reduce(
        (a, x: any) => ({
          amount_invested: a.amount_invested + Number(x.amount_invested),
          total_income_received: a.total_income_received + Number(x.total_income_received),
        }),
        { amount_invested: 0, total_income_received: 0 }
      );
      const planLabel =
        list.length === 0 ? "—" :
        list.length === 1 ? `${list[0].plan_name} (${Number(list[0].plan_rate)}%)` :
        "Multiple Active Plans";
      setInv({ ...agg, plan_label: planLabel, monthly_total: monthly, cap_total: cap, items: list });
      const { data: pend } = await supabase.from("transactions").select("amount").eq("had_id", u!.had_id).eq("status", "pending");
      setPending((pend ?? []).reduce((a, t) => a + Number(t.amount), 0));
      const { data: si } = await supabase.from("sponsor_income").select("type, income_amount").eq("earner_had_id", u!.had_id).eq("status", "paid");
      const ic = { ref: 0, level: 0, roi: 0 };
      (si ?? []).forEach((s: any) => {
        if (s.type === "referral") ic.ref += Number(s.income_amount);
        else if (s.type === "level") ic.level += Number(s.income_amount);
        else if (s.type === "roi") ic.roi += Number(s.income_amount);
      });
      setIncome(ic);
    }
    load();
    const ch = supabase
      .channel("dash-" + u.had_id)
      .on("postgres_changes", { event: "*", schema: "public", table: "investments", filter: `had_id=eq.${u.had_id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `had_id=eq.${u.had_id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsor_income", filter: `earner_had_id=eq.${u.had_id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [u?.had_id]);

  // Admin-pushed trading assets
  useEffect(() => {
    async function loadAssets() {
      const { data } = await supabase.from("trading_assets").select("*").eq("status", "active").order("created_at", { ascending: false });
      setTrading(data ?? []);
    }
    loadAssets();
    const ch = supabase.channel("dash-trading").on("postgres_changes", { event: "*", schema: "public", table: "trading_assets" }, loadAssets).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Binance prices for pushed assets
  useEffect(() => {
    if (trading.length === 0) return;
    let cancelled = false;
    async function loadPrices() {
      try {
        const symbols = trading.map((t) => (t.symbol || "").toUpperCase() + "USDT").filter(Boolean);
        if (!symbols.length) return;
        const q = encodeURIComponent(JSON.stringify(symbols));
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${q}`);
        const json = await res.json();
        if (cancelled || !Array.isArray(json)) return;
        const map: Record<string, { price: number; change: number }> = {};
        json.forEach((d: any) => {
          const sym = String(d.symbol).replace("USDT", "");
          map[sym] = { price: Number(d.lastPrice), change: Number(d.priceChangePercent) };
        });
        setPrices(map);
      } catch {}
    }
    loadPrices();
    const t = setInterval(loadPrices, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [trading]);

  // Published special offers (animated banner)
  useEffect(() => {
    async function loadOffers() {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await (supabase as any)
        .from("special_offers")
        .select("*")
        .eq("published", true)
        .neq("status", "expired")
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("created_at", { ascending: false })
        .limit(3);
      setOffers(data ?? []);
    }
    loadOffers();
    const ch = supabase.channel("dash-offers").on("postgres_changes", { event: "*", schema: "public", table: "special_offers" }, loadOffers).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const target2x = inv?.cap_total ?? (inv?.amount_invested ?? 0) * 2;
  const totalEarned = (income.roi || 0) + (income.ref || 0) + (income.level || 0);
  const remaining = Math.max(0, target2x - totalEarned);
  const progress = target2x > 0 ? (totalEarned / target2x) * 100 : 0;
  const monthlyRoi = inv?.monthly_total ?? 0;

  return (
    <UserShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hello {u?.name} 👋</h1>
          <p className="text-sm text-muted-foreground">HAD ID: {u?.had_id} · Plan: {inv?.plan_label ?? "—"} · Next payout: 10th</p>
        </div>

        {offers.length > 0 && (
          <div className="space-y-3">
            {offers.map((o) => (
              <Link
                key={o.id}
                to="/special-offers"
                className="block relative overflow-hidden rounded-xl border-2 border-[var(--gold)] bg-gradient-to-r from-[var(--gold)]/20 via-card to-[var(--gold)]/20 p-5 animate-fade-in hover:scale-[1.01] transition-transform"
              >
                <div className="absolute inset-0 bg-[var(--gold)]/5 animate-pulse pointer-events-none" />
                <div className="relative flex items-center gap-4">
                  {o.image && <img src={o.image} alt="" className="w-16 h-16 object-cover rounded-lg border border-[var(--gold)]/60" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] bg-[var(--gold)] text-[var(--primary-foreground)] px-2 py-0.5 rounded font-bold uppercase tracking-wider">🔥 Special Offer</span>
                    <p className="font-bold text-[var(--gold)] mt-1 truncate">{o.title}</p>
                    {o.description && <p className="text-xs text-muted-foreground line-clamp-2">{o.description}</p>}
                  </div>
                  <span className="text-[var(--gold)] text-sm font-semibold whitespace-nowrap">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="bg-card border border-[var(--gold)]/40 rounded-lg p-6">
          <h2 className="text-[var(--gold)] font-semibold mb-4">Investment Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Stat label="Investment" value={formatINR(inv?.amount_invested)} />
            <Stat label="Plan" value={inv?.plan_label ?? "—"} />
            <Stat label="Monthly ROI" value={formatINR(monthlyRoi)} />
            <Stat label="Next Payout" value="10th" />
            <Stat label="Referral Income" value={formatINR(income.ref)} />
            <Stat label="ROI Income" value={formatINR(income.roi)} />
            <Stat label="Level Income" value={formatINR(income.level)} />
            <Stat label="Total Received" value={formatINR(totalEarned)} />
            <Stat label="2X Target" value={formatINR(target2x)} highlight />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground"><span>2X Progress</span><span>{progress.toFixed(1)}%</span></div>
            <div className="h-2 bg-secondary rounded mt-1 overflow-hidden">
              <div className="h-full bg-[var(--gold)]" style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Remaining: {formatINR(remaining)}</p>
          </div>
          {inv?.items && inv.items.length > 1 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Active Plans Breakdown</p>
              <div className="space-y-2">
                {inv.items.map((it: any) => {
                  const m = it.is_special && it.monthly_roi ? Number(it.monthly_roi) : (Number(it.amount_invested) * Number(it.plan_rate)) / 100;
                  return (
                    <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 text-xs bg-secondary/40 rounded p-2">
                      <span className="font-semibold">{it.plan_name} <span className="text-[var(--gold)]">({Number(it.plan_rate)}%)</span></span>
                      <span>Invested: {formatINR(it.amount_invested)}</span>
                      <span>Monthly: {formatINR(m)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {pending > 0 && (
          <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/40 rounded-lg p-4">
            <p className="text-xs text-[var(--warning)] font-semibold">PENDING APPROVAL</p>
            <p className="text-xl font-bold mt-1">{formatINR(pending)}</p>
            <p className="text-xs text-muted-foreground">Waiting for admin verification</p>
          </div>
        )}

        <div className="bg-card border border-[var(--gold)]/40 rounded-lg p-5">
          <h2 className="text-[var(--gold)] font-semibold mb-3">📈 Admin Active Trading</h2>
          {trading.length === 0 ? (
            <p className="text-sm text-muted-foreground">Admin abhi koi trade active nahi kar raha. Jaisi hi trading shuru hogi, yahan dikh jayegi.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trading.map((a) => {
                const live = prices[(a.symbol || "").toUpperCase()];
                const entry = Number(a.entry_price) || 0;
                const pnl = live && entry ? ((live.price - entry) / entry) * 100 : 0;
                return (
                  <div key={a.id} className="border border-border rounded p-3 bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{a.asset_name} <span className="text-xs text-muted-foreground">{a.symbol}/USDT</span></p>
                        <p className="text-xs text-muted-foreground">Risk: {a.risk_level} · Alloc: {a.allocation_percent}%</p>
                      </div>
                      <span className="text-xs bg-[var(--success)]/20 text-[var(--success)] px-2 py-1 rounded">{a.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                      <div><p className="text-muted-foreground">Entry</p><p className="font-semibold">${entry.toFixed(2)}</p></div>
                      <div><p className="text-muted-foreground">Current</p><p className="font-semibold">{live ? `$${live.price.toFixed(2)}` : "—"}</p></div>
                      <div><p className="text-muted-foreground">P&L</p><p className={`font-semibold ${pnl >= 0 ? "text-[var(--success)]" : "text-destructive"}`}>{pnl ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%` : "—"}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: "/pay", t: "Make payment", d: "UPI or crypto" },
            { to: "/income", t: "My Income", d: "Sponsor & partner bonuses" },
            { to: "/referral", t: "Refer & earn", d: "5% sponsor income" },
            { to: "/profile", t: "My Profile", d: "Wallets & payout info" },
          ].map((q) => (
            <Link key={q.to} to={q.to} className="bg-card border border-border rounded-lg p-4 hover:border-[var(--gold)] transition">
              <p className="font-semibold text-sm">{q.t}</p>
              <p className="text-xs text-muted-foreground mt-1">{q.d}</p>
            </Link>
          ))}
        </div>
      </div>
    </UserShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`bg-secondary/50 rounded p-3 ${highlight ? "border border-[var(--gold)]/40" : ""}`}>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
      <p className={`font-semibold mt-1 ${highlight ? "text-[var(--gold)]" : ""}`}>{value}</p>
    </div>
  );
}