import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/trading")({
  head: () => ({ meta: [{ title: "Trading Control — Admin" }] }),
  component: AdminTrading,
});

// Popular Binance USDT symbols — admin picks from these to push to users
const POPULAR = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "AVAX", "DOT", "MATIC", "LINK", "TRX", "LTC", "SHIB", "ATOM", "ARB", "OP", "NEAR", "APT", "UNI"];

type Ticker = { symbol: string; price: number; change: number };

function AdminTrading() {
  const [rows, setRows] = useState<any[]>([]);
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [pick, setPick] = useState({ symbol: "BTC", asset_name: "Bitcoin", allocation_percent: 10, target_percent: 15, risk_level: "medium" });

  async function load() {
    const { data } = await supabase.from("trading_assets").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  // Live Binance prices
  useEffect(() => {
    let cancelled = false;
    async function loadPrices() {
      try {
        const syms = POPULAR.map((s) => s + "USDT");
        const q = encodeURIComponent(JSON.stringify(syms));
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${q}`);
        const json = await res.json();
        if (cancelled || !Array.isArray(json)) return;
        const map: Record<string, Ticker> = {};
        json.forEach((d: any) => {
          const sym = String(d.symbol).replace("USDT", "");
          map[sym] = { symbol: sym, price: Number(d.lastPrice), change: Number(d.priceChangePercent) };
        });
        setTickers(map);
      } catch {}
    }
    loadPrices();
    const t = setInterval(loadPrices, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  async function pushTrade() {
    const live = tickers[pick.symbol];
    if (!live) return toast.error("Live price not loaded yet, try again");
    await supabase.from("trading_assets").insert({
      asset_name: pick.asset_name || pick.symbol,
      symbol: pick.symbol,
      asset_type: "crypto",
      coincap_id: pick.symbol.toLowerCase(),
      entry_price: live.price,
      current_price: live.price,
      allocation_percent: pick.allocation_percent,
      target_percent: pick.target_percent,
      risk_level: pick.risk_level,
      status: "active",
    });
    toast.success(`${pick.symbol} pushed to user dashboards`);
    load();
  }

  async function setStatus(r: any, status: string) {
    await supabase.from("trading_assets").update({ status }).eq("id", r.id);
    load();
  }
  async function del(r: any) {
    if (!confirm("Remove this trade?")) return;
    await supabase.from("trading_assets").delete().eq("id", r.id);
    load();
  }

  const sortedTickers = useMemo(() => POPULAR.map((s) => tickers[s]).filter(Boolean), [tickers]);

  return (
    <AdminShell title="Trading Control (Binance)">
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-[var(--gold)]/40 rounded-lg p-4">
          <h3 className="text-[var(--gold)] font-semibold mb-3">📊 Push Trading to Users</h3>
          <label className="text-xs text-muted-foreground">Coin (Binance USDT pair)</label>
          <select value={pick.symbol} onChange={(e) => setPick({ ...pick, symbol: e.target.value, asset_name: e.target.value })} className="w-full bg-input border border-border rounded px-3 py-2 text-sm mt-1">
            {POPULAR.map((s) => (
              <option key={s} value={s}>{s}/USDT {tickers[s] ? `· $${tickers[s].price.toFixed(2)}` : ""}</option>
            ))}
          </select>
          <input placeholder="Display name" value={pick.asset_name} onChange={(e) => setPick({ ...pick, asset_name: e.target.value })} className="w-full bg-input border border-border rounded px-3 py-2 text-sm mt-2" />
          <div className="grid grid-cols-3 gap-2 mt-2">
            <input type="number" placeholder="Alloc %" value={pick.allocation_percent} onChange={(e) => setPick({ ...pick, allocation_percent: Number(e.target.value) })} className="bg-input border border-border rounded px-2 py-2 text-sm" />
            <input type="number" placeholder="Target %" value={pick.target_percent} onChange={(e) => setPick({ ...pick, target_percent: Number(e.target.value) })} className="bg-input border border-border rounded px-2 py-2 text-sm" />
            <select value={pick.risk_level} onChange={(e) => setPick({ ...pick, risk_level: e.target.value })} className="bg-input border border-border rounded px-2 py-2 text-sm">
              <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
            </select>
          </div>
          <button onClick={pushTrade} className="w-full mt-3 bg-[var(--gold)] text-[var(--primary-foreground)] py-2 rounded font-semibold text-sm">🚀 Push Trading</button>
          {tickers[pick.symbol] && (
            <p className="text-xs text-muted-foreground mt-2">Entry will be locked at live ${tickers[pick.symbol].price.toFixed(2)} ({tickers[pick.symbol].change.toFixed(2)}% 24h)</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Live Binance Tickers</h3>
          <div className="grid grid-cols-2 gap-1 text-xs max-h-72 overflow-y-auto">
            {sortedTickers.map((t) => (
              <div key={t.symbol} className="flex items-center justify-between p-1 border-b border-border/40">
                <span className="text-muted-foreground">{t.symbol}</span>
                <span className="font-mono">${t.price.toFixed(2)}</span>
                <span className={t.change >= 0 ? "text-[var(--success)]" : "text-destructive"}>{t.change.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-secondary/50 text-xs text-muted-foreground"><tr><th className="text-left p-3">Asset</th><th className="text-right p-3">Entry</th><th className="text-right p-3">Live</th><th className="text-right p-3">P&L%</th><th className="text-right p-3">Alloc%</th><th className="text-left p-3">Risk</th><th className="text-left p-3">Status</th><th className="text-left p-3">Action</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No trades pushed yet</td></tr> : rows.map((r) => {
              const live = tickers[(r.symbol || "").toUpperCase()];
              const pnl = live && r.entry_price ? ((live.price - Number(r.entry_price)) / Number(r.entry_price)) * 100 : 0;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.asset_name} <span className="text-muted-foreground text-xs">{r.symbol}/USDT</span></td>
                  <td className="p-3 text-right">${Number(r.entry_price).toFixed(2)}</td>
                  <td className="p-3 text-right">{live ? `$${live.price.toFixed(2)}` : "—"}</td>
                  <td className={`p-3 text-right ${pnl >= 0 ? "text-[var(--success)]" : "text-destructive"}`}>{pnl ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%` : "—"}</td>
                  <td className="p-3 text-right">{r.allocation_percent}%</td>
                  <td className="p-3">{r.risk_level}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3 flex gap-1">
                    {r.status === "active"
                      ? <button onClick={() => setStatus(r, "closed")} className="text-xs bg-secondary px-2 py-1 rounded">Close</button>
                      : <button onClick={() => setStatus(r, "active")} className="text-xs bg-[var(--success)]/20 text-[var(--success)] px-2 py-1 rounded">Reopen</button>}
                    <button onClick={() => del(r)} className="text-xs text-destructive">Del</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}