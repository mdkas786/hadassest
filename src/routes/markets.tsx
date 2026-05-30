import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LiveTicker } from "@/components/LiveTicker";
import {
  CoinAsset,
  fmtInr,
  fmtPct,
  fmtUsd,
  getAllAssets,
  getInrRate,
  searchAssets,
  subscribeRealTimePrice,
} from "@/services/coinCapService";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets — H.A.D." },
      { name: "description", content: "Live crypto market data and H.A.D. company portfolio." },
    ],
  }),
  component: MarketsPage,
});

interface TradingAsset {
  id: string;
  asset_name: string;
  symbol: string;
  coincap_id: string | null;
  entry_price: number;
  current_price: number;
  custom_current_price: number | null;
  use_manual_price: boolean;
  allocation_percent: number;
  risk_level: string;
  expected_duration_days: number;
  profit_target_percent: number;
  admin_note: string | null;
  asset_category: string;
}

function MarketsPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [assets, setAssets] = useState<CoinAsset[]>([]);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<"all" | "top" | "gainers" | "losers">("top");
  const [inrRate, setInrRate] = useState(83);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [companyAssets, setCompanyAssets] = useState<TradingAsset[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CoinAsset[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      setReady(true);
    })();
  }, [nav]);

  // Load INR rate + company portfolio
  useEffect(() => {
    if (!ready) return;
    getInrRate().then(setInrRate);
    supabase
      .from("trading_assets")
      .select("*")
      .eq("status", "active")
      .then(({ data }) => setCompanyAssets((data as any) || []));
  }, [ready]);

  // Load market list
  useEffect(() => {
    if (!ready) return;
    getAllAssets(20, offset, "").then((d) => {
      setAssets((prev) => (offset === 0 ? d : [...prev, ...d]));
      setUpdatedAt(new Date());
    }).catch(() => {});
    const t = setInterval(() => {
      getAllAssets(20, 0, "").then((d) => {
        if (offset === 0) setAssets(d);
        setUpdatedAt(new Date());
      }).catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
  }, [ready, offset]);

  // Realtime live prices for company portfolio + top assets
  useEffect(() => {
    if (!ready) return;
    const ids = Array.from(new Set([
      ...companyAssets.map((a) => a.coincap_id).filter(Boolean) as string[],
      ...assets.slice(0, 10).map((a) => a.id),
    ]));
    if (ids.length === 0) return;
    return subscribeRealTimePrice(ids, (prices) => setLivePrices((p) => ({ ...p, ...prices })));
  }, [ready, companyAssets, assets]);

  // Search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try { setSearchResults(await searchAssets(search.trim())); }
      catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [search]);

  const displayedAssets = useMemo(() => {
    const withLive = assets.map((a) => ({ ...a, livePrice: livePrices[a.id] }));
    if (filter === "gainers") return [...withLive].sort((a, b) => Number(b.changePercent24Hr) - Number(a.changePercent24Hr));
    if (filter === "losers") return [...withLive].sort((a, b) => Number(a.changePercent24Hr) - Number(b.changePercent24Hr));
    if (filter === "top") return withLive.slice(0, 20);
    return withLive;
  }, [assets, filter, livePrices]);

  const companyIds = useMemo(() => new Set(companyAssets.map((a) => a.coincap_id).filter(Boolean) as string[]), [companyAssets]);

  if (!ready) return <div className="min-h-screen bg-navy text-white grid place-items-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40 sticky top-0 z-20 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl text-gold shrink-0">H.A.D.</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <Link to="/dashboard" className="hover:text-gold">Dashboard</Link>
            <Link to="/markets" className="text-gold">Markets</Link>
            <Link to="/pay" className="hover:text-gold">Pay</Link>
            <Link to="/referral" className="hover:text-gold">Referral</Link>
            <Link to="/profile" className="hover:text-gold">Profile</Link>
          </nav>
          <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="text-sm text-white/70 hover:text-gold">Logout</button>
        </div>
      </header>

      <LiveTicker />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Search */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Koi bhi crypto search karein — Bitcoin, Ethereum, Solana, Dogecoin…"
            className="w-full rounded-xl bg-navy-light border border-gold/30 px-5 py-4 text-base outline-none focus:border-gold"
          />
          {(searching || searchResults.length > 0) && search && (
            <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gold/30 bg-navy-light shadow-2xl z-30 max-h-96 overflow-auto">
              {searching && <div className="px-4 py-3 text-sm text-white/60">Searching…</div>}
              {searchResults.map((r) => (
                <Link
                  key={r.id}
                  to="/markets/$coinId" params={{ coinId: r.id }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-navy border-b border-white/5 last:border-0"
                >
                  <span className="text-sm">
                    <span className="text-gold font-medium">{r.symbol}</span>
                    <span className="text-white/70 ml-2">{r.name}</span>
                  </span>
                  <span className="text-sm text-white/80">
                    {fmtUsd(r.priceUsd)} <span className={Number(r.changePercent24Hr) >= 0 ? "text-emerald-400" : "text-red-400"}>{fmtPct(r.changePercent24Hr)}</span>
                  </span>
                </Link>
              ))}
              {!searching && searchResults.length === 0 && <div className="px-4 py-3 text-sm text-white/60">No matches.</div>}
            </div>
          )}
        </div>

        {/* Company portfolio */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-[0.3em] text-gold uppercase">Live</p>
              <h2 className="font-serif text-3xl mt-1">H.A.D. Company Portfolio</h2>
              <p className="text-white/60 text-sm mt-1">Yahan aapka paisa invest ho raha hai.</p>
            </div>
          </div>
          {companyAssets.length === 0 ? (
            <div className="mt-6 rounded-xl border border-gold/20 bg-navy-light/40 p-8 text-white/60 text-sm">
              Abhi koi active company investment nahi hai. Admin update karega.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {companyAssets.map((a) => {
                const live = a.use_manual_price && a.custom_current_price
                  ? a.custom_current_price
                  : Number(a.coincap_id ? livePrices[a.coincap_id] || a.current_price : a.current_price);
                const pnl = a.entry_price > 0 ? ((Number(live) - a.entry_price) / a.entry_price) * 100 : 0;
                return (
                  <div key={a.id} className="rounded-xl border border-gold/30 bg-navy-light/40 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-serif text-2xl">{a.asset_name} <span className="text-gold/70 text-base">({a.symbol})</span></p>
                        <p className="text-xs text-white/60 mt-1 uppercase tracking-widest">{a.asset_category}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 text-xs text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />LIVE
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Cell label="Entry" value={fmtUsd(a.entry_price)} />
                      <Cell label="Current" value={fmtUsd(Number(live))} />
                      <Cell label="P&L" value={fmtPct(pnl)} valueClass={pnl >= 0 ? "text-emerald-400" : "text-red-400"} />
                      <Cell label="Allocation" value={`${a.allocation_percent}%`} />
                      <Cell label="Risk" value={a.risk_level} />
                      <Cell label="Target" value={`${a.profit_target_percent}% in ${a.expected_duration_days}d`} />
                    </dl>
                    {a.admin_note && (
                      <p className="mt-4 text-sm text-white/70 italic border-l-2 border-gold/50 pl-3">"{a.admin_note}"</p>
                    )}
                    {a.coincap_id && (
                      <Link to="/markets/$coinId" params={{ coinId: a.coincap_id }} className="mt-4 inline-block text-sm text-gold hover:underline">
                        Full analysis →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Market table */}
        <section className="mt-12">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-serif text-3xl">Live Crypto Market</h2>
            <div className="flex items-center gap-2 text-sm">
              {(["top","all","gainers","losers"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md border ${filter===f?"border-gold bg-gold/10 text-gold":"border-white/10 text-white/70 hover:border-gold/40"}`}>
                  {f === "top" ? "Top 20" : f[0].toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/50 mt-2">Updated {Math.round((Date.now()-updatedAt.getTime())/1000)}s ago • INR @ ₹{inrRate.toFixed(2)}/$</p>

          <div className="mt-4 rounded-xl border border-gold/20 bg-navy-light/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-navy-light/70 text-white/60 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-right">Price (USD)</th>
                  <th className="px-4 py-3 text-right">Price (INR)</th>
                  <th className="px-4 py-3 text-right">24h</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {displayedAssets.map((a) => {
                  const live = a.livePrice ? Number(a.livePrice) : Number(a.priceUsd);
                  const isCo = companyIds.has(a.id);
                  return (
                    <tr key={a.id} className="border-t border-white/5 hover:bg-navy">
                      <td className="px-4 py-3 text-white/50">{a.rank}</td>
                      <td className="px-4 py-3">
                        <Link to="/markets/$coinId" params={{ coinId: a.id }} className="font-medium hover:text-gold">
                          {a.name} <span className="text-white/50 text-xs">{a.symbol}</span>
                        </Link>
                        {isCo && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold border border-gold/40 px-1.5 py-0.5 rounded">Holding</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtUsd(live)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-white/70">{fmtInr(live, inrRate)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${Number(a.changePercent24Hr) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtPct(a.changePercent24Hr)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-white/70 hidden md:table-cell">${(Number(a.marketCapUsd)/1e9).toFixed(2)}B</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filter === "all" && (
            <div className="mt-4 text-center">
              <button onClick={() => setOffset((o) => o + 20)} className="px-6 py-2 rounded-md border border-gold/40 text-gold hover:bg-gold/10">Load more</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Cell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-white/50">{label}</dt>
      <dd className={`mt-0.5 ${valueClass ?? "text-white"}`}>{value}</dd>
    </div>
  );
}
