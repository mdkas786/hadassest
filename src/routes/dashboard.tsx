import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { LiveTicker } from "@/components/LiveTicker";
import {
  CoinAsset, fmtInr, fmtPct, fmtUsd,
  getInrRate, getTopAssets, subscribeRealTimePrice,
} from "@/services/coinCapService";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — H.A.D." }] }),
  component: Dashboard,
});

interface Profile { id: string; had_id: string; full_name: string }
interface Investment { id: string; plan_name: string; plan_rate: number; amount_invested: number; amount_received: number; expected_2x: number | null; status: string }
interface PendingTxn { id: string; amount: number; status: string; payment_method: string | null; plan_name: string | null; created_at: string; utr_number: string | null }
interface CompanyAsset {
  id: string; asset_name: string; symbol: string; coincap_id: string | null;
  entry_price: number; current_price: number; custom_current_price: number | null;
  use_manual_price: boolean; allocation_percent: number; admin_note: string | null; risk_level: string;
}

function Dashboard() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invs, setInvs] = useState<Investment[]>([]);
  const [pendingTxns, setPendingTxns] = useState<PendingTxn[]>([]);
  const [companyAssets, setCompanyAssets] = useState<CompanyAsset[]>([]);
  const [topAssets, setTopAssets] = useState<CoinAsset[]>([]);
  const [live, setLive] = useState<Record<string, string>>({});
  const [inrRate, setInrRate] = useState(83);
  const [unread, setUnread] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data: p } = await supabase.from("profiles").select("id, had_id, full_name").eq("id", user.id).maybeSingle();
      setProfile(p as any);
      const [{ data: i }, { data: ca }, { data: settings }, { data: tx }] = await Promise.all([
        supabase.from("investments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("trading_assets").select("*").eq("status", "active"),
        supabase.from("app_settings").select("key, value"),
        supabase.from("transactions").select("id, amount, status, payment_method, plan_name, created_at, utr_number").eq("user_id", user.id).in("status", ["pending", "verified"]).order("created_at", { ascending: false }).limit(10),
      ]);
      setInvs((i as any) || []);
      setCompanyAssets((ca as any) || []);
      setPendingTxns(((tx as any) || []).filter((row: any) => row.status === "pending"));
      const map = new Map((settings || []).map((s: any) => [s.key, s.value]));
      setBanner(map.get("announcement_banner") || null);
      setMaintenance(map.get("maintenance_mode") === "true");
      if (p) {
        const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
          .or(`had_id.eq.${(p as any).had_id},had_id.eq.ALL`).is("read_at", null);
        setUnread(count || 0);
      }
    })();
    getInrRate().then(setInrRate);
    getTopAssets(10).then(setTopAssets).catch(() => {});
  }, [nav]);

  useEffect(() => {
    const ids = Array.from(new Set([
      ...companyAssets.map((a) => a.coincap_id).filter(Boolean) as string[],
      ...topAssets.map((a) => a.id),
    ]));
    if (ids.length === 0) return;
    return subscribeRealTimePrice(ids, (p) => setLive((prev) => ({ ...prev, ...p })));
  }, [companyAssets, topAssets]);

  // Realtime: investments + notifications
  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel(`dash_${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "investments", filter: `user_id=eq.${profile.id}` },
        async () => {
          const { data } = await supabase.from("investments").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
          setInvs((data as any) || []);
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${profile.id}` },
        async () => {
          const { data } = await supabase.from("transactions").select("id, amount, status, payment_method, plan_name, created_at, utr_number").eq("user_id", profile.id).in("status", ["pending", "verified"]).order("created_at", { ascending: false }).limit(10);
          setPendingTxns(((data as any) || []).filter((row: any) => row.status === "pending"));
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as any;
          if (n.had_id === profile.had_id || n.had_id === "ALL") setUnread((c) => c + 1);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  const totals = useMemo(() => {
    const invested = invs.reduce((a, b) => a + Number(b.amount_invested), 0);
    const received = invs.reduce((a, b) => a + Number(b.amount_received), 0);
    const target = invested * 2;
    const remaining = Math.max(target - received, 0);
    const pct = target > 0 ? Math.min(100, (received / target) * 100) : 0;
    return { invested, received, target, remaining, pct };
  }, [invs]);
  const pendingTotal = useMemo(() => pendingTxns.reduce((sum, txn) => sum + Number(txn.amount), 0), [pendingTxns]);
  const activePlan = invs.find((i) => i.status === "active")?.plan_name ?? "—";

  if (maintenance) {
    return (
      <div className="min-h-screen bg-navy text-white grid place-items-center text-center p-8">
        <div>
          <p className="text-6xl">🔧</p>
          <h1 className="font-serif text-3xl mt-4">App maintenance chal rahi hai.</h1>
          <p className="text-white/60 mt-2">Thodi der mein wapas aayein.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl text-gold">H.A.D.</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <Link to="/dashboard" className="text-gold">Dashboard</Link>
            <Link to="/markets" className="hover:text-gold">Markets</Link>
            <Link to="/pay" className="hover:text-gold">Pay</Link>
            <Link to="/referral" className="hover:text-gold">Referral</Link>
            <Link to="/profile" className="hover:text-gold">Profile</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="relative text-white/70 hover:text-gold">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -top-1 -right-1 bg-gold text-navy text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{unread}</span>}
            </Link>
            {profile && <span className="text-sm text-white/70 hidden sm:block">{profile.had_id}</span>}
            <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="text-sm text-white/70 hover:text-gold">Logout</button>
          </div>
        </div>
      </header>

      {/* Live market ticker — Binance WebSocket with CoinCap fallback */}
      <LiveTicker />


      {banner && (
        <div className="bg-amber-400/15 border-b border-amber-400/30 text-amber-200 px-6 py-2 text-sm text-center">{banner}</div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <div>
          <h1 className="font-serif text-4xl">Hello {profile?.full_name?.split(" ")[0] || "investor"} 👋</h1>
          <p className="text-white/60 mt-1">HAD ID: <span className="text-gold">{profile?.had_id || "—"}</span> · Plan: {activePlan}</p>
        </div>

        {/* Investment summary */}
        <section className="rounded-xl border border-gold/30 bg-navy-light/40 p-6">
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Investment Summary</p>
          <div className="mt-4 grid sm:grid-cols-4 gap-4">
            <Metric label="Invested" value={`₹${totals.invested.toLocaleString("en-IN")}`} />
            <Metric label="Received" value={`₹${totals.received.toLocaleString("en-IN")}`} />
            <Metric label="2X Target" value={`₹${totals.target.toLocaleString("en-IN")}`} />
            <Metric label="Remaining" value={`₹${totals.remaining.toLocaleString("en-IN")}`} accent />
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-white/60 mb-1"><span>2X progress</span><span>{totals.pct.toFixed(1)}%</span></div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold to-amber-300" style={{ width: `${totals.pct}%` }} />
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-widest text-amber-200/80">Pending approval</p>
                <p className="mt-1 font-serif text-2xl text-amber-200">₹{pendingTotal.toLocaleString("en-IN")}</p>
              </div>
              <span className="text-sm text-white/60">{pendingTxns.length} payment{pendingTxns.length === 1 ? "" : "s"} waiting for admin verification</span>
            </div>
            {pendingTxns.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingTxns.slice(0, 3).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between gap-3 rounded-md bg-navy/40 px-3 py-2 text-sm">
                    <div>
                      <div className="text-white">₹{Number(txn.amount).toLocaleString("en-IN")} <span className="text-white/50">· {(txn.plan_name || "starter").toUpperCase()}</span></div>
                      <div className="text-xs text-white/50">{txn.payment_method || "Payment"} · {new Date(txn.created_at).toLocaleString()} {txn.utr_number ? `· UTR ${txn.utr_number}` : ""}</div>
                    </div>
                    <span className="rounded bg-amber-400/15 px-2 py-1 text-xs text-amber-200">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Company portfolio feed */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Company Trading Feed</h2>
            <Link to="/markets" className="text-sm text-gold hover:underline">View Markets →</Link>
          </div>
          {companyAssets.length === 0 ? (
            <p className="text-white/60 text-sm mt-3">No active company holdings right now.</p>
          ) : (
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              {companyAssets.map((a) => {
                const cur = a.use_manual_price && a.custom_current_price
                  ? Number(a.custom_current_price)
                  : a.coincap_id && live[a.coincap_id] ? Number(live[a.coincap_id])
                  : Number(a.current_price);
                const pnl = a.entry_price > 0 ? ((cur - a.entry_price) / a.entry_price) * 100 : 0;
                return (
                  <div key={a.id} className="rounded-xl border border-gold/20 bg-navy-light/30 p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-xl">{a.asset_name} <span className="text-gold/70">({a.symbol})</span></p>
                      <span className={`text-sm tabular-nums ${pnl>=0?"text-emerald-400":"text-red-400"}`}>{fmtPct(pnl)}</span>
                    </div>
                    <p className="text-sm text-white/70 mt-1 tabular-nums">{fmtUsd(cur)} <span className="text-white/50">/ {fmtInr(cur, inrRate)}</span></p>
                    <p className="text-xs text-white/50 mt-1">Allocation {a.allocation_percent}% · Risk {a.risk_level}</p>
                    {a.admin_note && <p className="mt-3 text-xs text-white/70 italic border-l-2 border-gold/40 pl-2">"{a.admin_note}"</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="grid sm:grid-cols-3 gap-4">
          <ActionCard to="/pay" title="Make payment" desc="Send investment via UPI or crypto." />
          <ActionCard to="/markets" title="Browse markets" desc="Live crypto and company holdings." />
          <ActionCard to="/referral" title="Refer & earn" desc="Share your code with friends." />
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className={`mt-1 font-serif text-2xl tabular-nums ${accent ? "text-gold" : "text-white"}`}>{value}</div>
    </div>
  );
}
function ActionCard({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="block rounded-xl border border-gold/20 bg-navy-light/30 p-5 hover:border-gold/60 transition">
      <p className="font-serif text-lg text-gold">{title}</p>
      <p className="text-sm text-white/60 mt-1">{desc}</p>
    </Link>
  );
}
