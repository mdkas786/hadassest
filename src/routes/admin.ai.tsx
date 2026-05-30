import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { askAdminAI } from "@/lib/gemini.functions";
import { getAssetHistory, getTopAssets, searchAssets, type CoinAsset, type HistoryPoint } from "@/services/coinCapService";
import { subscribeBinanceMulti, coincapToBinance, type TickerData } from "@/services/binanceWs";
import {
  AreaChart, Area, LineChart, Line, ComposedChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "Premium AI Tools — Admin" }] }),
  component: AdminAI,
});

// ---- indicators ----
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => { out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)); });
  return out;
}
function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  const rs = gains / (losses || 1e-9);
  return 100 - 100 / (1 + rs);
}
function macd(values: number[]) {
  const e12 = ema(values, 12); const e26 = ema(values, 26);
  const line = values.map((_, i) => e12[i] - e26[i]);
  const signal = ema(line, 9);
  const hist = line.map((v, i) => v - signal[i]);
  return { line: line.at(-1) ?? 0, signal: signal.at(-1) ?? 0, hist: hist.at(-1) ?? 0 };
}
function bollinger(values: number[], period = 20, mult = 2) {
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  const sd = Math.sqrt(variance);
  return { mean, upper: mean + mult * sd, lower: mean - mult * sd };
}
function hadScore(prices: number[], entryPrice = 0) {
  if (prices.length < 30) return 50;
  const last = prices.at(-1)!;
  const r = rsi(prices);
  const m = macd(prices);
  const b = bollinger(prices);
  const rsiPts = r < 30 ? 20 : r < 50 ? 15 : r < 70 ? 10 : 5;
  const macdPts = m.hist > 0 ? (m.line > m.signal ? 20 : 14) : 6;
  const bbPos = (last - b.lower) / Math.max(b.upper - b.lower, 1e-9);
  const bbPts = bbPos < 0.3 ? 15 : bbPos < 0.7 ? 10 : 5;
  const entryPts = entryPrice > 0 ? Math.min(15, Math.max(0, ((last - entryPrice) / entryPrice) * 100)) : 8;
  return Math.round(rsiPts + macdPts + bbPts + entryPts + 10 + 7);
}

function AdminAI() {
  const [tab, setTab] = useState<"chart" | "signals" | "chat" | "optimizer" | "projection">("chart");
  return (
    <AdminShell title="Premium AI Tools">
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          ["chart", "📈 Chart Analysis"],
          ["signals", "🚦 Signal Monitor"],
          ["chat", "🤖 Gemini Assistant"],
          ["optimizer", "🥧 Portfolio Optimizer"],
          ["projection", "📊 Profit Projection"],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-md text-sm border ${tab === k ? "bg-gold text-navy border-gold" : "border-gold/30 text-white/70 hover:bg-gold/10"}`}>{l}</button>
        ))}
      </div>
      {tab === "chart" && <ChartAnalysis />}
      {tab === "signals" && <SignalMonitor />}
      {tab === "chat" && <GeminiChat />}
      {tab === "optimizer" && <Optimizer />}
      {tab === "projection" && <Projection />}
      <p className="mt-8 text-xs text-white/50">⚠️ Yeh technical indicators hain, guaranteed prediction nahi hai. Markets carry inherent risk.</p>
    </AdminShell>
  );
}

// ---- Chart Analysis ----
function ChartAnalysis() {
  const [q, setQ] = useState("bitcoin");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CoinAsset[]>([]);
  const [interval, setInterval] = useState<"h1" | "d1">("d1");
  const [hist, setHist] = useState<HistoryPoint[]>([]);

  useEffect(() => { getAssetHistory(q, interval).then(setHist).catch(() => setHist([])); }, [q, interval]);

  async function doSearch(v: string) {
    setSearch(v);
    if (v.length < 2) return setResults([]);
    try { setResults((await searchAssets(v)).slice(0, 6)); } catch {}
  }

  const data = useMemo(() => {
    const prices = hist.map((h) => Number(h.priceUsd));
    const e7 = ema(prices, 7); const e21 = ema(prices, 21); const e50 = ema(prices, 50);
    return hist.map((h, i) => {
      const slice = prices.slice(0, i + 1);
      const bb = slice.length >= 20 ? bollinger(slice) : { upper: prices[i], lower: prices[i], mean: prices[i] };
      return {
        time: new Date(h.time).toLocaleDateString(),
        price: prices[i], ema7: e7[i], ema21: e21[i], ema50: e50[i],
        bbUpper: bb.upper, bbLower: bb.lower,
      };
    });
  }, [hist]);

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <input value={search} onChange={(e) => doSearch(e.target.value)} placeholder="Search coin…"
            className="w-full rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-gold/20 bg-navy z-10">
              {results.map((c) => (
                <button key={c.id} onClick={() => { setQ(c.id); setSearch(""); setResults([]); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gold/10">{c.name} <span className="text-white/50">({c.symbol})</span></button>
              ))}
            </div>
          )}
        </div>
        <select value={interval} onChange={(e) => setInterval(e.target.value as any)}
          className="rounded-md bg-navy border border-gold/20 px-3 py-2 text-sm">
          <option value="h1">1H bars</option><option value="d1">Daily</option>
        </select>
      </div>
      <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-4">
        <div className="text-sm text-white/70 mb-3 uppercase tracking-widest">{q} — Price + EMA + Bollinger</div>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={data}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={["dataMin", "dataMax"]} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #c9a84c33" }} />
            <Area type="monotone" dataKey="price" stroke="#c9a84c" fill="#c9a84c22" />
            <Line type="monotone" dataKey="ema7" stroke="#10b981" dot={false} />
            <Line type="monotone" dataKey="ema21" stroke="#3b82f6" dot={false} />
            <Line type="monotone" dataKey="ema50" stroke="#a855f7" dot={false} />
            <Line type="monotone" dataKey="bbUpper" stroke="#ef4444" strokeDasharray="3 3" dot={false} />
            <Line type="monotone" dataKey="bbLower" stroke="#ef4444" strokeDasharray="3 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Signal Monitor ----
type SignalRow = { id: string; name: string; symbol: string; coincap_id: string | null; price: number; rsi: number; macdHist: number; trend: "up" | "down" | "flat"; score: number; signal: "BUY" | "HOLD" | "WAIT" };

function SignalMonitor() {
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [live, setLive] = useState<Record<string, TickerData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: assets } = await supabase.from("trading_assets").select("id, asset_name, symbol, coincap_id, entry_price").eq("status", "active");
      const list = (assets || []).slice(0, 12);
      const computed: SignalRow[] = [];
      for (const a of list) {
        try {
          const id = a.coincap_id || a.symbol?.toLowerCase();
          if (!id) continue;
          const hist = await getAssetHistory(id, "d1");
          const prices = hist.map((h) => Number(h.priceUsd));
          if (prices.length < 30) continue;
          const r = rsi(prices); const m = macd(prices);
          const last = prices.at(-1)!; const prev = prices.at(-7) || last;
          const trend = last > prev * 1.02 ? "up" : last < prev * 0.98 ? "down" : "flat";
          const score = hadScore(prices, Number(a.entry_price));
          const signal: SignalRow["signal"] = score > 70 && r < 50 && m.hist > 0 ? "BUY" : score < 45 || r > 70 || m.hist < 0 ? "WAIT" : "HOLD";
          computed.push({ id: a.id, name: a.asset_name, symbol: a.symbol, coincap_id: a.coincap_id, price: last, rsi: r, macdHist: m.hist, trend, score, signal });
        } catch {}
      }
      setRows(computed); setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const pairs = rows.map((r) => coincapToBinance(r.coincap_id, r.symbol)).filter(Boolean) as string[];
    if (!pairs.length) return;
    return subscribeBinanceMulti(pairs, (t) => setLive((p) => ({ ...p, [t.symbol]: t })));
  }, [rows]);

  if (loading) return <div className="text-white/60">Computing signals…</div>;
  if (!rows.length) return <div className="text-white/60">No active trading assets. Add some in Trading Control first.</div>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gold/20">
      <table className="w-full text-sm">
        <thead className="bg-navy-light/60 text-white/70">
          <tr><th className="text-left p-3">Asset</th><th className="text-right p-3">Live</th><th className="text-right p-3">RSI</th><th className="text-right p-3">MACD</th><th className="text-center p-3">Trend</th><th className="text-right p-3">HAD Score</th><th className="text-center p-3">Signal</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pair = coincapToBinance(r.coincap_id, r.symbol);
            const livePrice = pair ? live[pair]?.price : undefined;
            const sigColor = r.signal === "BUY" ? "bg-emerald-500/20 text-emerald-300" : r.signal === "HOLD" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300";
            return (
              <tr key={r.id} className="border-t border-gold/10">
                <td className="p-3">{r.name} <span className="text-white/50">({r.symbol})</span></td>
                <td className="p-3 text-right">${(livePrice ?? r.price).toFixed(2)}</td>
                <td className="p-3 text-right">{r.rsi.toFixed(1)}</td>
                <td className={`p-3 text-right ${r.macdHist >= 0 ? "text-emerald-300" : "text-red-300"}`}>{r.macdHist.toFixed(2)}</td>
                <td className="p-3 text-center">{r.trend === "up" ? "↑" : r.trend === "down" ? "↓" : "→"}</td>
                <td className="p-3 text-right text-gold">{r.score}</td>
                <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs ${sigColor}`}>{r.signal}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- Gemini Chat ----
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
        {msgs.length === 0 && <p className="text-white/50 text-sm">Ask anything about a coin, plan, or market condition. e.g. "BTC ka short-term outlook kya hai?"</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-gold/10 text-white ml-12" : "bg-navy border border-gold/20 mr-12"}`}>
            <div className="text-[10px] uppercase text-white/40 mb-1">{m.role === "user" ? "You" : "Gemini"}</div>
            {m.text}
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

// ---- Optimizer ----
function Optimizer() {
  const [fund, setFund] = useState(1000000);
  const [data, setData] = useState<{ name: string; value: number; pct: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: assets } = await supabase.from("trading_assets").select("asset_name, symbol, coincap_id, entry_price").eq("status", "active");
      const list = (assets || []).slice(0, 8);
      const scored: { name: string; score: number }[] = [];
      for (const a of list) {
        try {
          const id = a.coincap_id || a.symbol?.toLowerCase();
          if (!id) continue;
          const h = await getAssetHistory(id, "d1");
          const p = h.map((x) => Number(x.priceUsd));
          if (p.length < 30) continue;
          scored.push({ name: a.symbol, score: hadScore(p, Number(a.entry_price)) });
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
        <input type="number" value={fund} onChange={(e) => setFund(Number(e.target.value) || 0)}
          className="rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold w-48" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-4">
          {data.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={data} dataKey="pct" nameKey="name" outerRadius={110} label={(d) => `${d.name} ${d.pct.toFixed(0)}%`}>
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

// ---- Projection ----
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
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold w-48" />
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
      <div className="mt-4 overflow-x-auto rounded-xl border border-gold/20">
        <table className="w-full text-sm">
          <thead className="bg-navy-light/60 text-white/70"><tr><th className="text-left p-2">Month</th>{plans.map((p) => <th key={p.name} className="text-right p-2">{p.name}</th>)}</tr></thead>
          <tbody>
            {data.filter((_, i) => i % 3 === 0).map((row) => (
              <tr key={row.month} className="border-t border-gold/10"><td className="p-2">{row.month}</td>{plans.map((p) => <td key={p.name} className="p-2 text-right">₹{row[p.name].toLocaleString("en-IN")}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
