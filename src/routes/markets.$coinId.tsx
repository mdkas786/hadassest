import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  CoinAsset,
  HistoryPoint,
  fmtInr,
  fmtPct,
  fmtUsd,
  getAssetById,
  getAssetHistory,
  getInrRate,
  subscribeRealTimePrice,
} from "@/services/coinCapService";

export const Route = createFileRoute("/markets/$coinId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.coinId} — H.A.D. Markets` },
      { name: "description", content: `Live ${params.coinId} price and H.A.D. analysis.` },
    ],
  }),
  component: CoinDetail,
});

const PERIODS = [
  { key: "1D", interval: "m30", limit: 48 },
  { key: "7D", interval: "h6", limit: 28 },
  { key: "1M", interval: "d1", limit: 30 },
  { key: "3M", interval: "d1", limit: 90 },
] as const;

function CoinDetail() {
  const { coinId } = Route.useParams();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [asset, setAsset] = useState<CoinAsset | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [period, setPeriod] = useState<typeof PERIODS[number]>(PERIODS[2]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [inrRate, setInrRate] = useState(83);
  const [companyEntry, setCompanyEntry] = useState<number | null>(null);
  const [companyNote, setCompanyNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      setReady(true);
    })();
  }, [nav]);

  useEffect(() => {
    if (!ready) return;
    setAsset(null); setErr(null);
    getAssetById(coinId).then((a) => { setAsset(a); setLivePrice(Number(a.priceUsd)); }).catch((e) => setErr(String(e.message || e)));
    getInrRate().then(setInrRate);
    supabase.from("trading_assets").select("entry_price, admin_note").eq("coincap_id", coinId).eq("status", "active").maybeSingle()
      .then(({ data }) => { if (data) { setCompanyEntry(Number((data as any).entry_price)); setCompanyNote((data as any).admin_note); } });
  }, [ready, coinId]);

  useEffect(() => {
    if (!ready) return;
    getAssetHistory(coinId, period.interval).then((h) => setHistory(h.slice(-period.limit))).catch(() => setHistory([]));
  }, [ready, coinId, period]);

  useEffect(() => {
    if (!ready || !asset) return;
    return subscribeRealTimePrice([coinId], (prices) => {
      const p = prices[coinId];
      if (p) setLivePrice(Number(p));
    });
  }, [ready, asset, coinId]);

  const chartData = useMemo(
    () => history.map((p) => ({ t: p.time, price: Number(p.priceUsd), date: new Date(p.time).toLocaleDateString() })),
    [history]
  );
  const stats = useMemo(() => {
    if (chartData.length === 0) return { hi: 0, lo: 0, trend7d: 0 };
    const prices = chartData.map((d) => d.price);
    const hi = Math.max(...prices), lo = Math.min(...prices);
    const trend7d = chartData.length > 1 ? ((chartData[chartData.length-1].price - chartData[0].price) / chartData[0].price) * 100 : 0;
    return { hi, lo, trend7d };
  }, [chartData]);
  const profitScore = useMemo(() => {
    if (!asset) return 50;
    const change24 = Number(asset.changePercent24Hr);
    const trend = stats.trend7d;
    const entryGap = companyEntry && livePrice ? ((livePrice - companyEntry) / companyEntry) * 100 : 0;
    const raw = 50 + change24 * 1.5 + trend * 0.5 + entryGap * 0.3;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [asset, stats, companyEntry, livePrice]);
  const change24 = Number(asset?.changePercent24Hr || 0);
  const positive = change24 >= 0;

  if (!ready) return <div className="min-h-screen bg-navy text-white grid place-items-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link to="/markets" className="text-sm text-white/70 hover:text-gold">← Markets</Link>
          <Link to="/" className="font-serif text-xl text-gold">H.A.D.</Link>
          <Link to="/dashboard" className="text-sm text-white/70 hover:text-gold">Dashboard</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {err && <div className="rounded-md bg-red-500/10 border border-red-500/40 px-4 py-3 text-sm text-red-300">{err === "rate_limited" ? "Data refreshing… please retry in a moment." : err}</div>}
        {!asset ? (
          <div className="text-white/60">Loading {coinId}…</div>
        ) : (
          <>
            {companyEntry !== null && (
              <div className="rounded-xl border border-gold/50 bg-gold/10 px-5 py-3 text-sm text-gold mb-6">
                🏢 H.A.D. Company is trading this! Entry: {fmtUsd(companyEntry)} · Current P&L: {fmtPct(((Number(livePrice ?? asset.priceUsd) - companyEntry) / companyEntry) * 100)}
              </div>
            )}
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs tracking-[0.3em] text-gold uppercase">#{asset.rank}</p>
                <h1 className="font-serif text-4xl mt-1">{asset.name} <span className="text-gold/70 text-2xl">({asset.symbol})</span></h1>
              </div>
              <div className="text-right">
                <div className="font-serif text-4xl tabular-nums">{fmtUsd(livePrice ?? asset.priceUsd)}</div>
                <div className="text-sm text-white/60 tabular-nums">{fmtInr(livePrice ?? Number(asset.priceUsd), inrRate)}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${positive?"bg-emerald-500/15 text-emerald-400":"bg-red-500/15 text-red-400"}`}>{fmtPct(change24)} 24h</span>
              </div>
            </div>

            {/* Period tabs */}
            <div className="mt-6 flex gap-2">
              {PERIODS.map((p) => (
                <button key={p.key} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-md text-sm border ${period.key===p.key?"border-gold bg-gold/10 text-gold":"border-white/10 text-white/70 hover:border-gold/40"}`}>{p.key}</button>
              ))}
            </div>

            {/* Chart */}
            <div className="mt-4 rounded-xl border border-gold/20 bg-navy-light/30 p-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} minTickGap={20} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} domain={["auto","auto"]} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} width={70} />
                  <Tooltip contentStyle={{ background: "#0A1628", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8 }} formatter={(v: any) => fmtUsd(v)} />
                  <Area type="monotone" dataKey="price" stroke="#C9A84C" strokeWidth={2} fill="url(#gold)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Stats grid */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Market Cap" value={`$${(Number(asset.marketCapUsd)/1e9).toFixed(2)}B`} />
              <Stat label="24h Volume" value={`$${(Number(asset.volumeUsd24Hr)/1e9).toFixed(2)}B`} />
              <Stat label="Rank" value={`#${asset.rank}`} />
              <Stat label="Supply" value={`${(Number(asset.supply)/1e6).toFixed(2)}M`} />
              <Stat label={`${period.key} High`} value={fmtUsd(stats.hi)} />
              <Stat label={`${period.key} Low`} value={fmtUsd(stats.lo)} />
            </div>

            {/* HAD Prediction */}
            <div className="mt-8 rounded-xl border border-gold/30 bg-navy-light/40 p-6">
              <p className="text-xs tracking-[0.3em] text-gold uppercase">HAD Prediction</p>
              <h3 className="font-serif text-2xl mt-1">Profit Probability</h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-4 flex-1 rounded-full overflow-hidden bg-white/10">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" style={{ width: `${profitScore}%` }} />
                </div>
                <div className={`font-serif text-3xl tabular-nums ${profitScore>=66?"text-emerald-400":profitScore>=33?"text-amber-400":"text-red-400"}`}>{profitScore}%</div>
              </div>
              <p className="mt-3 text-sm text-white/70">
                Factors: 24h momentum {fmtPct(change24)} · {period.key} trend {fmtPct(stats.trend7d)}
                {companyEntry !== null && livePrice !== null && <> · entry gap {fmtPct(((livePrice-companyEntry)/companyEntry)*100)}</>}.
              </p>
              {companyNote && <p className="mt-2 text-sm text-gold/80 italic">Admin says: "{companyNote}"</p>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gold/15 bg-navy-light/30 p-4">
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className="mt-1 font-serif text-xl text-white tabular-nums">{value}</div>
    </div>
  );
}
