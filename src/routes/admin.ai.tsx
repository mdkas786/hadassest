import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { askAdminAI } from "@/lib/gemini.functions";
import { subscribeBinanceMulti, type TickerData } from "@/services/binanceWs";
import {
  getKlines, get24h, getAllTickers24h, getExchangeSymbols,
  ema, rsi, macd, bollinger, stochRsi, atr, supportResistance,
  type Kline,
} from "@/services/binanceRest";
import {
  AreaChart, Area, LineChart, Line, ComposedChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "AI Analysis Engine — Admin" }] }),
  component: AdminAI,
});

function AdminAI() {
  const [tab, setTab] = useState<"deep" | "scan" | "bot" | "chat" | "optimizer" | "projection">("deep");
  return (
    <AdminShell title="AI Analysis Engine">
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          ["deep", "🔬 Deep Analysis"],
          ["scan", "🛰️ Hourly Market Scan"],
          ["bot", "🤖 Paper Trading Bot"],
          ["chat", "💬 Gemini Assistant"],
          ["optimizer", "🥧 Portfolio Optimizer"],
          ["projection", "📊 Profit Projection"],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-md text-sm border ${tab === k ? "bg-gold text-navy border-gold" : "border-gold/30 text-white/70 hover:bg-gold/10"}`}>{l}</button>
        ))}
      </div>
      {tab === "deep" && <DeepAnalysis />}
      {tab === "scan" && <MarketScan />}
      {tab === "bot" && <PaperBot />}
      {tab === "chat" && <GeminiChat />}
      {tab === "optimizer" && <Optimizer />}
      {tab === "projection" && <Projection />}
      <p className="mt-8 text-xs text-white/50">⚠️ Yeh technical indicators hain, guaranteed prediction nahi hai. Markets carry inherent risk.</p>
    </AdminShell>
  );
}

// ======================= DEEP ANALYSIS =======================
function DeepAnalysis() {
  const ask = useServerFn(askAdminAI);
  const [symbols, setSymbols] = useState<{ symbol: string; base: string }[]>([]);
  const [query, setQuery] = useState("BTC");
  const [pair, setPair] = useState("BTCUSDT");
  const [klines, setKlines] = useState<Kline[]>([]);
  const [ticker, setTicker] = useState<Awaited<ReturnType<typeof get24h>> | null>(null);
  const [live, setLive] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [period, setPeriod] = useState<"7" | "30" | "90" | "180" | "365">("90");
  const [overlay, setOverlay] = useState({ ema9: true, ema21: true, ema50: true, bb: true });

  useEffect(() => { getExchangeSymbols().then((s) => setSymbols(s.slice(0, 600))).catch(() => {}); }, []);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [k, t] = await Promise.all([getKlines(pair, "1d", 200), get24h(pair)]);
        setKlines(k); setTicker(t);
      } catch { setKlines([]); setTicker(null); }
      setLoading(false);
    })();
  }, [pair]);
  useEffect(() => subscribeBinanceMulti([pair.toLowerCase()], (t) => setLive(t)), [pair]);

  const filtered = useMemo(() =>
    !query ? [] : symbols.filter((s) => s.symbol.startsWith(query.toUpperCase()) || s.base.startsWith(query.toUpperCase())).slice(0, 8),
    [symbols, query]);

  const ind = useMemo(() => {
    if (klines.length < 30) return null;
    const closes = klines.map((k) => k.close);
    const last = closes.at(-1)!;
    const r = rsi(closes); const rsiVal = r.at(-1)!;
    const m = macd(closes);
    const bb = bollinger(closes);
    const e9 = ema(closes, 9); const e21 = ema(closes, 21);
    const e50 = ema(closes, 50); const e200 = ema(closes, 200);
    const sr = stochRsi(closes);
    const atrVal = atr(klines);
    const sup = supportResistance(klines);
    const volAvg20 = klines.slice(-20).reduce((a, b) => a + b.volume, 0) / 20;
    const volCur = klines.at(-1)!.volume;
    return {
      last, rsi: rsiVal, rsiZone: rsiVal < 30 ? "Oversold" : rsiVal > 70 ? "Overbought" : "Neutral",
      macd: m.last,
      bb: { upper: bb.upper.at(-1)!, mid: bb.mid.at(-1)!, lower: bb.lower.at(-1)!,
            width: ((bb.upper.at(-1)! - bb.lower.at(-1)!) / bb.mid.at(-1)!) * 100 },
      ema: { e9: e9.at(-1)!, e21: e21.at(-1)!, e50: e50.at(-1)!, e200: e200.at(-1)! },
      cross: e50.at(-1)! > e200.at(-1)! ? "Golden Cross (bullish)" : "Death Cross (bearish)",
      stoch: sr.last, atr: atrVal,
      vol: { cur: volCur, avg20: volAvg20, ratio: (volCur / volAvg20) * 100 },
      sr: sup,
    };
  }, [klines]);

  const chartData = useMemo(() => {
    if (!klines.length) return [];
    const closes = klines.map((k) => k.close);
    const e9 = ema(closes, 9), e21 = ema(closes, 21), e50 = ema(closes, 50);
    const bb = bollinger(closes);
    const n = Math.min(closes.length, +period);
    return klines.slice(-n).map((k, i) => {
      const idx = klines.length - n + i;
      return {
        time: new Date(k.closeTime).toLocaleDateString(),
        price: k.close, volume: k.volume,
        ema9: e9[idx], ema21: e21[idx], ema50: e50[idx],
        bbU: bb.upper[idx], bbL: bb.lower[idx],
      };
    });
  }, [klines, period]);

  async function runGemini() {
    if (!ind || !ticker) return;
    setAiLoading(true); setAiText("");
    const prompt = `You are an institutional-grade crypto analyst for H.A.D. Asset Management.
Analyze ${pair} in depth.

CURRENT MARKET DATA (Binance live):
Current Price: $${ind.last.toFixed(4)}
24h Change: ${ticker.priceChangePercent.toFixed(2)}%
24h High: $${ticker.highPrice}, 24h Low: $${ticker.lowPrice}, 24h Volume: ${ticker.volume.toFixed(0)}

TECHNICAL INDICATORS:
RSI-14: ${ind.rsi.toFixed(2)} (${ind.rsiZone})
MACD Line: ${ind.macd.line.toFixed(4)}, Signal: ${ind.macd.signal.toFixed(4)}, Histogram: ${ind.macd.hist.toFixed(4)} (${ind.macd.hist >= 0 ? "bullish" : "bearish"})
EMA-9: ${ind.ema.e9.toFixed(2)}, EMA-21: ${ind.ema.e21.toFixed(2)}, EMA-50: ${ind.ema.e50.toFixed(2)}, EMA-200: ${ind.ema.e200.toFixed(2)}
Crossover: ${ind.cross}
Bollinger Upper: $${ind.bb.upper.toFixed(2)}, Mid: $${ind.bb.mid.toFixed(2)}, Lower: $${ind.bb.lower.toFixed(2)}, Width: ${ind.bb.width.toFixed(2)}%
Price position: ${ind.last > ind.bb.mid ? "above" : "below"} middle band
ATR-14: ${ind.atr.toFixed(4)} (volatility)
Stoch %K: ${ind.stoch.k.toFixed(2)}, %D: ${ind.stoch.d.toFixed(2)}
Volume vs 20d avg: ${ind.vol.ratio.toFixed(0)}%
Nearest Support: $${ind.sr.support.toFixed(2)}, Resistance: $${ind.sr.resistance.toFixed(2)}

Provide institutional analysis with sections:
1. MARKET STRUCTURE ANALYSIS
2. ENTRY POINT RECOMMENDATION (exact range $X-$Y with reasoning)
3. EXIT STRATEGY (Target 1/2/3 + Stop Loss with reasoning)
4. HOLD OR SELL DECISION (BUY/HOLD/SELL/WAIT, time horizon, confidence %)
5. RISK ASSESSMENT (Low/Medium/High + invalidation triggers)
6. 15-MINUTE MOMENTUM (Upward/Downward/Neutral — momentum only, NOT a price prediction)

Be specific with price levels. Be honest about uncertainty. This is for professional decisions.`;
    try {
      const res = await ask({ data: { question: prompt, model: "google/gemini-2.5-pro", system: "You are an institutional crypto analyst. Use clear markdown headers. Be precise with numbers." } });
      setAiText(res.text);
    } catch (e: any) { setAiText(`Error: ${e.message || e}`); }
    setAiLoading(false);
  }

  function saveAnalysis() {
    const blob = new Blob([`# ${pair} Analysis\n\n${aiText}\n\n---\nGenerated: ${new Date().toISOString()}`], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${pair}-analysis-${Date.now()}.md`; a.click();
  }

  const livePrice = live?.price ?? ind?.last ?? 0;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5">
      {/* Left panel */}
      <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-4 space-y-3 h-fit">
        <div>
          <label className="text-xs text-white/70">Search Binance pair</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="BTC, ETH…"
            className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
          {filtered.length > 0 && (
            <div className="mt-1 rounded-md border border-gold/20 bg-navy max-h-48 overflow-y-auto">
              {filtered.map((s) => (
                <button key={s.symbol} onClick={() => { setPair(s.symbol); setQuery(s.base); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gold/10">{s.symbol}</button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-md bg-navy p-3">
          <div className="text-xs text-white/60">Selected</div>
          <div className="font-mono text-gold text-lg">{pair}</div>
          <div className="text-2xl font-serif text-white">${livePrice.toFixed(4)}</div>
          {ticker && <div className={`text-sm ${ticker.priceChangePercent >= 0 ? "text-emerald-300" : "text-red-300"}`}>{ticker.priceChangePercent.toFixed(2)}% 24h</div>}
        </div>
        {ind && (
          <div className="space-y-1.5 text-xs">
            <Row k="RSI-14" v={`${ind.rsi.toFixed(1)} (${ind.rsiZone})`} />
            <Row k="MACD Hist" v={ind.macd.hist.toFixed(4)} color={ind.macd.hist >= 0 ? "emerald" : "red"} />
            <Row k="EMA-50/200" v={ind.cross} color={ind.cross.includes("Golden") ? "emerald" : "red"} />
            <Row k="BB Width" v={`${ind.bb.width.toFixed(2)}%`} />
            <Row k="Stoch %K" v={ind.stoch.k.toFixed(1)} />
            <Row k="ATR" v={ind.atr.toFixed(4)} />
            <Row k="Vol vs 20d" v={`${ind.vol.ratio.toFixed(0)}%`} />
            <Row k="Support" v={`$${ind.sr.support.toFixed(2)}`} />
            <Row k="Resistance" v={`$${ind.sr.resistance.toFixed(2)}`} />
          </div>
        )}
        <button onClick={runGemini} disabled={!ind || aiLoading}
          className="w-full px-4 py-2 rounded bg-gold text-navy text-sm font-medium disabled:opacity-50">
          {aiLoading ? "Analyzing…" : "🔬 Run Gemini Pro Deep Analysis"}
        </button>
      </div>

      {/* Right panel */}
      <div className="space-y-5">
        <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-sm text-white/70 uppercase tracking-widest">Price + Overlays</div>
            <div className="flex gap-1 text-xs">
              {(["7", "30", "90", "180", "365"] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2 py-1 rounded ${period === p ? "bg-gold text-navy" : "border border-gold/20 text-white/60"}`}>
                  {p === "7" ? "1W" : p === "30" ? "1M" : p === "90" ? "3M" : p === "180" ? "6M" : "1Y"}
                </button>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              {(["ema9", "ema21", "ema50", "bb"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={overlay[k]} onChange={(e) => setOverlay({ ...overlay, [k]: e.target.checked })} />
                  {k.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          {loading ? <div className="h-80 grid place-items-center text-white/60">Loading klines…</div> : (
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="p" stroke="#94a3b8" tick={{ fontSize: 10 }} domain={["dataMin", "dataMax"]} />
                <YAxis yAxisId="v" orientation="right" stroke="#475569" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #c9a84c33" }} />
                <Bar yAxisId="v" dataKey="volume" fill="#1e293b" />
                <Area yAxisId="p" type="monotone" dataKey="price" stroke="#c9a84c" fill="#c9a84c22" />
                {overlay.ema9 && <Line yAxisId="p" type="monotone" dataKey="ema9" stroke="#f97316" dot={false} />}
                {overlay.ema21 && <Line yAxisId="p" type="monotone" dataKey="ema21" stroke="#3b82f6" dot={false} />}
                {overlay.ema50 && <Line yAxisId="p" type="monotone" dataKey="ema50" stroke="#a855f7" dot={false} />}
                {overlay.bb && <Line yAxisId="p" type="monotone" dataKey="bbU" stroke="#64748b" strokeDasharray="3 3" dot={false} />}
                {overlay.bb && <Line yAxisId="p" type="monotone" dataKey="bbL" stroke="#64748b" strokeDasharray="3 3" dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {aiText && (
          <div className="rounded-xl border border-gold/30 bg-navy-light/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif text-lg text-gold">🔬 Gemini Pro Analysis — {pair}</div>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(aiText)} className="text-xs px-3 py-1.5 rounded border border-gold/30 text-white/80">Copy</button>
                <button onClick={saveAnalysis} className="text-xs px-3 py-1.5 rounded bg-gold text-navy">Save .md</button>
              </div>
            </div>
            <pre className="text-sm whitespace-pre-wrap text-white/90 leading-relaxed">{aiText}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: "emerald" | "red" }) {
  return (
    <div className="flex justify-between border-b border-gold/10 pb-1">
      <span className="text-white/60">{k}</span>
      <span className={color === "emerald" ? "text-emerald-300" : color === "red" ? "text-red-300" : "text-white"}>{v}</span>
    </div>
  );
}

// ======================= MARKET SCAN =======================
type ScanRow = { symbol: string; price: number; change24h: number; rsi: number; macdHist: number; score: number; signal: "BUY" | "HOLD" | "AVOID" };

function MarketScan() {
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function runScan() {
    setLoading(true);
    try {
      const tickers = await getAllTickers24h();
      const stable = /USDC|BUSD|DAI|TUSD|FDUSD|USDP/;
      const usdt = tickers.filter((t) => t.symbol.endsWith("USDT") && !stable.test(t.symbol.replace("USDT", "")));
      const top = usdt.sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 50);
      const out: ScanRow[] = [];
      // Sequential to be gentle on rate limits; 50 quick calls
      for (const t of top) {
        try {
          const k = await getKlines(t.symbol, "1h", 100);
          const closes = k.map((x) => x.close);
          if (closes.length < 30) continue;
          const r = rsi(closes).at(-1)!;
          const m = macd(closes).last.hist;
          // Score: oversold + bullish MACD => higher
          const rsiPts = r < 30 ? 30 : r < 50 ? 20 : r < 70 ? 10 : 5;
          const macdPts = m > 0 ? 25 : 8;
          const trendPts = closes.at(-1)! > closes.at(-25)! ? 15 : 5;
          const volPts = t.priceChangePercent > 0 ? 15 : 5;
          const score = rsiPts + macdPts + trendPts + volPts;
          const signal: ScanRow["signal"] = score >= 65 ? "BUY" : score >= 45 ? "HOLD" : "AVOID";
          out.push({ symbol: t.symbol, price: t.lastPrice, change24h: t.priceChangePercent, rsi: r, macdHist: m, score, signal });
        } catch {}
      }
      out.sort((a, b) => b.score - a.score);
      setRows(out.slice(0, 10));
      setLastRun(new Date().toLocaleString());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    runScan();
    const t = window.setInterval(runScan, 60 * 60 * 1000); // hourly
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-serif text-lg text-gold">🛰️ Top 10 Buy Opportunities</div>
          <div className="text-xs text-white/50">Hourly scan of top-50 USDT pairs by volume. {lastRun && `Last run: ${lastRun}`}</div>
        </div>
        <button onClick={runScan} disabled={loading} className="px-4 py-2 rounded bg-gold text-navy text-sm font-medium disabled:opacity-50">
          {loading ? "Scanning…" : "Run scan now"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white/70">
            <tr>
              <th className="text-left p-2">#</th><th className="text-left p-2">Coin</th>
              <th className="text-right p-2">Price</th><th className="text-right p-2">24h%</th>
              <th className="text-right p-2">RSI-1h</th><th className="text-right p-2">MACD</th>
              <th className="text-right p-2">Score</th><th className="text-center p-2">Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = r.signal === "BUY" ? "bg-emerald-500/20 text-emerald-300"
                : r.signal === "HOLD" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300";
              return (
                <tr key={r.symbol} className="border-t border-gold/10">
                  <td className="p-2 text-white/50">{i + 1}</td>
                  <td className="p-2 font-mono text-gold">{r.symbol}</td>
                  <td className="p-2 text-right">${r.price.toFixed(4)}</td>
                  <td className={`p-2 text-right ${r.change24h >= 0 ? "text-emerald-300" : "text-red-300"}`}>{r.change24h.toFixed(2)}%</td>
                  <td className="p-2 text-right">{r.rsi.toFixed(1)}</td>
                  <td className={`p-2 text-right ${r.macdHist >= 0 ? "text-emerald-300" : "text-red-300"}`}>{r.macdHist.toFixed(4)}</td>
                  <td className="p-2 text-right text-gold">{r.score}</td>
                  <td className="p-2 text-center"><span className={`px-2 py-1 rounded text-xs ${c}`}>{r.signal}</span></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={8} className="p-6 text-center text-white/60">{loading ? "Scanning Binance…" : "No data yet."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ======================= PAPER TRADING BOT =======================
type Strategy = "rsi" | "macd" | "ema" | "bollinger" | "combined";
type Trade = { time: string; side: "BUY" | "SELL"; price: number; qty: number; reason: string; pnl?: number };

function PaperBot() {
  const [pair, setPair] = useState("BTCUSDT");
  const [strategy, setStrategy] = useState<Strategy>("combined");
  const [startBal, setStartBal] = useState(10000);
  const [running, setRunning] = useState(false);
  const [cash, setCash] = useState(10000);
  const [qty, setQty] = useState(0);
  const [lastSignal, setLastSignal] = useState<{ signal: "BUY" | "SELL" | "HOLD"; reason: string; price: number } | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const timer = useRef<number | null>(null);

  const totalValue = cash + qty * (lastSignal?.price || 0);
  const pnl = totalValue - startBal;
  const pnlPct = (pnl / startBal) * 100;

  function reset() {
    setCash(startBal); setQty(0); setTrades([]); setLastSignal(null);
  }

  async function tick() {
    try {
      const k = await getKlines(pair, "1m", 200);
      const closes = k.map((x) => x.close);
      if (closes.length < 30) return;
      const price = closes.at(-1)!;
      const r = rsi(closes).at(-1)!;
      const m = macd(closes);
      const bb = bollinger(closes);
      const e9 = ema(closes, 9), e21 = ema(closes, 21);
      const e9L = e9.at(-1)!, e9P = e9.at(-2)!, e21L = e21.at(-1)!, e21P = e21.at(-2)!;
      const bbU = bb.upper.at(-1)!, bbL = bb.lower.at(-1)!;
      const mHist = m.last.hist, mHistP = m.hist.at(-2)!;

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let reason = "";
      if (strategy === "rsi") {
        if (r < 30) { signal = "BUY"; reason = `RSI ${r.toFixed(1)} oversold`; }
        else if (r > 70) { signal = "SELL"; reason = `RSI ${r.toFixed(1)} overbought`; }
      } else if (strategy === "macd") {
        if (mHistP <= 0 && mHist > 0) { signal = "BUY"; reason = "MACD golden cross"; }
        else if (mHistP >= 0 && mHist < 0) { signal = "SELL"; reason = "MACD death cross"; }
      } else if (strategy === "ema") {
        if (e9P <= e21P && e9L > e21L) { signal = "BUY"; reason = "EMA-9 crossed above EMA-21"; }
        else if (e9P >= e21P && e9L < e21L) { signal = "SELL"; reason = "EMA-9 crossed below EMA-21"; }
      } else if (strategy === "bollinger") {
        if (price <= bbL) { signal = "BUY"; reason = "Price at lower band"; }
        else if (price >= bbU) { signal = "SELL"; reason = "Price at upper band"; }
      } else {
        const bull = (r < 40 ? 1 : 0) + (mHist > 0 ? 1 : 0) + (e9L > e21L ? 1 : 0) + (price < bb.mid.at(-1)! ? 1 : 0);
        const bear = (r > 60 ? 1 : 0) + (mHist < 0 ? 1 : 0) + (e9L < e21L ? 1 : 0) + (price > bb.mid.at(-1)! ? 1 : 0);
        if (bull >= 3) { signal = "BUY"; reason = `Combined bullish (${bull}/4)`; }
        else if (bear >= 3) { signal = "SELL"; reason = `Combined bearish (${bear}/4)`; }
      }

      setLastSignal({ signal, reason, price });

      // Execute paper trade
      if (signal === "BUY" && qty === 0 && cash > 10) {
        const buyQty = (cash * 0.95) / price;
        setQty(buyQty); setCash(cash - buyQty * price);
        setTrades((t) => [{ time: new Date().toLocaleTimeString(), side: "BUY" as const, price, qty: buyQty, reason }, ...t].slice(0, 50));
      } else if (signal === "SELL" && qty > 0) {
        const proceeds = qty * price;
        const lastBuy = trades.find((x) => x.side === "BUY");
        const tradePnl = lastBuy ? proceeds - lastBuy.qty * lastBuy.price : 0;
        setCash(cash + proceeds); setQty(0);
        setTrades((t) => [{ time: new Date().toLocaleTimeString(), side: "SELL" as const, price, qty, reason, pnl: tradePnl }, ...t].slice(0, 50));
      }

      // Auto-stop on 20% drawdown
      const val = (qty === 0 ? cash : cash + qty * price);
      if (val < startBal * 0.8) {
        setRunning(false);
      }
    } catch {}
  }

  useEffect(() => {
    if (!running) { if (timer.current) clearInterval(timer.current); return; }
    tick();
    timer.current = window.setInterval(tick, 5 * 60 * 1000); // 5 min
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pair, strategy]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
        ⚠️ Paper Trading Only. This bot generates signals based on technical analysis. No real money is traded. Past performance does not guarantee future results. Always verify before real trading.
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-5 space-y-3">
          <div className="font-serif text-lg text-gold">Bot Configuration</div>
          <div>
            <label className="text-xs text-white/70">Binance pair</label>
            <input value={pair} onChange={(e) => setPair(e.target.value.toUpperCase())}
              className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-white/70">Strategy</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)} disabled={running}
              className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2">
              <option value="rsi">RSI (oversold/overbought)</option>
              <option value="macd">MACD crossover</option>
              <option value="ema">EMA-9 / EMA-21 crossover</option>
              <option value="bollinger">Bollinger Bands</option>
              <option value="combined">Combined (all indicators)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/70">Starting virtual balance ($)</label>
            <input type="number" value={startBal} onChange={(e) => setStartBal(+e.target.value)} disabled={running}
              className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2" />
          </div>
          <div className="flex gap-2">
            {!running ? (
              <button onClick={() => { reset(); setRunning(true); }} className="flex-1 px-4 py-2 rounded bg-emerald-500 text-white text-sm font-medium">▶ Start Bot</button>
            ) : (
              <button onClick={() => setRunning(false)} className="flex-1 px-4 py-2 rounded bg-red-500 text-white text-sm font-medium">■ Stop Bot</button>
            )}
            <button onClick={reset} disabled={running} className="px-4 py-2 rounded border border-gold/30 text-white/70 text-sm">Reset</button>
          </div>
        </div>

        <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-5 space-y-3">
          <div className="font-serif text-lg text-gold">Paper Wallet</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat k="Cash" v={`$${cash.toFixed(2)}`} />
            <Stat k="Position" v={qty > 0 ? `${qty.toFixed(6)} ${pair.replace("USDT", "")}` : "—"} />
            <Stat k="Total Value" v={`$${totalValue.toFixed(2)}`} />
            <Stat k="P&L" v={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)`} color={pnl >= 0 ? "emerald" : "red"} />
          </div>
          {lastSignal && (
            <div className="rounded-md bg-navy p-3 mt-2">
              <div className="text-xs text-white/60">Current signal</div>
              <div className={`text-xl font-mono ${lastSignal.signal === "BUY" ? "text-emerald-300" : lastSignal.signal === "SELL" ? "text-red-300" : "text-white/70"}`}>{lastSignal.signal}</div>
              <div className="text-xs text-white/60 mt-1">{lastSignal.reason || "No trigger"}</div>
              <div className="text-xs text-white/50">@ ${lastSignal.price.toFixed(4)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-5">
        <div className="font-serif text-lg text-gold mb-3">Last 10 Paper Trades</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60"><tr><th className="text-left p-2">Time</th><th className="text-left p-2">Side</th><th className="text-right p-2">Price</th><th className="text-right p-2">Qty</th><th className="text-left p-2">Reason</th><th className="text-right p-2">P&L</th></tr></thead>
            <tbody>
              {trades.slice(0, 10).map((t, i) => (
                <tr key={i} className="border-t border-gold/10">
                  <td className="p-2 text-white/60">{t.time}</td>
                  <td className={`p-2 font-mono ${t.side === "BUY" ? "text-emerald-300" : "text-red-300"}`}>{t.side}</td>
                  <td className="p-2 text-right">${t.price.toFixed(4)}</td>
                  <td className="p-2 text-right">{t.qty.toFixed(6)}</td>
                  <td className="p-2 text-white/70">{t.reason}</td>
                  <td className={`p-2 text-right ${t.pnl == null ? "" : t.pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>{t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}` : "—"}</td>
                </tr>
              ))}
              {!trades.length && <tr><td colSpan={6} className="p-6 text-center text-white/60">No trades yet. Start the bot.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v, color }: { k: string; v: string; color?: "emerald" | "red" }) {
  return (
    <div className="rounded-md bg-navy p-2">
      <div className="text-xs text-white/60">{k}</div>
      <div className={`font-mono ${color === "emerald" ? "text-emerald-300" : color === "red" ? "text-red-300" : "text-white"}`}>{v}</div>
    </div>
  );
}

// ======================= GEMINI CHAT =======================
function GeminiChat() {
  const ask = useServerFn(askAdminAI);
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!q.trim()) return;
    const question = q; setQ("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await ask({ data: { question } });
      setMsgs((m) => [...m, { role: "ai", text: res.text }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "ai", text: `Error: ${e.message || e}` }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-5 flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {msgs.length === 0 && <p className="text-white/50 text-sm">Ask anything about a coin, plan, or market condition.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-gold/10 text-white ml-12" : "bg-navy border border-gold/20 mr-12"}`}>
            <div className="text-[10px] uppercase text-white/40 mb-1">{m.role === "user" ? "You" : "Gemini"}</div>{m.text}
          </div>
        ))}
        {loading && <div className="text-white/50 text-xs">Thinking…</div>}
      </div>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask Gemini…" className="flex-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
        <button onClick={send} disabled={loading} className="px-4 py-2 rounded bg-gold text-navy text-sm font-medium disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}

// ======================= OPTIMIZER =======================
function Optimizer() {
  const [fund, setFund] = useState(1000000);
  const [data, setData] = useState<{ name: string; value: number; pct: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: assets } = await supabase.from("trading_assets").select("symbol").eq("status", "active");
      const list = (assets || []).slice(0, 8);
      const scored: { name: string; score: number }[] = [];
      for (const a of list) {
        try {
          const k = await getKlines(`${a.symbol}USDT`, "1d", 100);
          const p = k.map((x) => x.close);
          if (p.length < 30) continue;
          const r = rsi(p).at(-1)!, m = macd(p).last.hist, bb = bollinger(p);
          const score = (r < 50 ? 20 : 10) + (m > 0 ? 20 : 8) + (p.at(-1)! < bb.mid.at(-1)! ? 15 : 8) + 15;
          scored.push({ name: a.symbol, score });
        } catch {}
      }
      const sum = scored.reduce((s, x) => s + x.score, 0) || 1;
      setData(scored.map((s) => ({ name: s.name, pct: (s.score / sum) * 100, value: (s.score / sum) * fund })));
    })();
  }, [fund]);

  const COLORS = ["#c9a84c", "#10b981", "#3b82f6", "#a855f7", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899"];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-white/70">Total fund (₹)</label>
        <input type="number" value={fund} onChange={(e) => setFund(+e.target.value || 0)}
          className="rounded-md bg-navy border border-gold/20 px-3 py-2 w-48" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-4">
          {data.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={data} dataKey="pct" nameKey="name" outerRadius={110} label={(d: any) => `${d.name} ${d.pct.toFixed(0)}%`}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #c9a84c33" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-white/50 text-sm">No active assets to optimize.</div>}
        </div>
        <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-4">
          <table className="w-full text-sm">
            <thead className="text-white/60"><tr><th className="text-left p-2">Asset</th><th className="text-right p-2">Alloc %</th><th className="text-right p-2">Amount ₹</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.name} className="border-t border-gold/10">
                  <td className="p-2">{d.name}</td>
                  <td className="p-2 text-right text-gold">{d.pct.toFixed(1)}%</td>
                  <td className="p-2 text-right">₹{Math.round(d.value).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ======================= PROJECTION =======================
function Projection() {
  const [amount, setAmount] = useState(100000);
  const plans = [
    { name: "Starter", rate: 0.05, color: "#10b981" },
    { name: "Growth", rate: 0.06, color: "#3b82f6" },
    { name: "Fortune", rate: 0.07, color: "#c9a84c" },
  ];
  const data = useMemo(() => Array.from({ length: 25 }, (_, m) => {
    const row: any = { month: `M${m}` };
    plans.forEach((p) => { row[p.name] = Math.round(amount * Math.pow(1 + p.rate, m)); });
    return row;
  }), [amount]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-white/70">Investment ₹</label>
        <input type="number" value={amount} onChange={(e) => setAmount(+e.target.value || 0)}
          className="rounded-md bg-navy border border-gold/20 px-3 py-2 w-48" />
      </div>
      <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-4">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #c9a84c33" }} formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
            <Legend />
            {plans.map((p) => <Line key={p.name} type="monotone" dataKey={p.name} stroke={p.color} dot={false} strokeWidth={2} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
