// Binance public REST — free, no key.
const BASE = "https://api.binance.com/api/v3";

export type Kline = { openTime: number; open: number; high: number; low: number; close: number; volume: number; closeTime: number };
export type Ticker24h = { symbol: string; lastPrice: number; priceChangePercent: number; highPrice: number; lowPrice: number; volume: number; quoteVolume: number };

export async function getKlines(symbol: string, interval = "1d", limit = 200): Promise<Kline[]> {
  const r = await fetch(`${BASE}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`);
  if (!r.ok) throw new Error(`Binance klines ${r.status}`);
  const raw = await r.json();
  return (raw as any[]).map((k) => ({
    openTime: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5], closeTime: k[6],
  }));
}

export async function get24h(symbol: string): Promise<Ticker24h> {
  const r = await fetch(`${BASE}/ticker/24hr?symbol=${symbol.toUpperCase()}`);
  if (!r.ok) throw new Error(`Binance 24h ${r.status}`);
  const d = await r.json();
  return {
    symbol: d.symbol, lastPrice: +d.lastPrice, priceChangePercent: +d.priceChangePercent,
    highPrice: +d.highPrice, lowPrice: +d.lowPrice, volume: +d.volume, quoteVolume: +d.quoteVolume,
  };
}

export async function getAllTickers24h(): Promise<Ticker24h[]> {
  const r = await fetch(`${BASE}/ticker/24hr`);
  if (!r.ok) throw new Error(`Binance all 24h ${r.status}`);
  return (await r.json() as any[]).map((d) => ({
    symbol: d.symbol, lastPrice: +d.lastPrice, priceChangePercent: +d.priceChangePercent,
    highPrice: +d.highPrice, lowPrice: +d.lowPrice, volume: +d.volume, quoteVolume: +d.quoteVolume,
  }));
}

export async function getExchangeSymbols(): Promise<{ symbol: string; base: string; quote: string }[]> {
  const r = await fetch(`${BASE}/exchangeInfo`);
  if (!r.ok) throw new Error(`Binance exchangeInfo ${r.status}`);
  const d = await r.json();
  return (d.symbols as any[])
    .filter((s) => s.status === "TRADING" && s.quoteAsset === "USDT")
    .map((s) => ({ symbol: s.symbol, base: s.baseAsset, quote: s.quoteAsset }));
}

// ===== Indicators =====
export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1); const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(values[i]); continue; }
    let s = 0; for (let j = i - period + 1; j <= i; j++) s += values[j];
    out.push(s / period);
  }
  return out;
}

export function rsi(values: number[], period = 14): number[] {
  const out: number[] = new Array(values.length).fill(50);
  if (values.length < period + 1) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgG = gain / period, avgL = loss / period;
  out[period] = 100 - 100 / (1 + avgG / (avgL || 1e-9));
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0, l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    out[i] = 100 - 100 / (1 + avgG / (avgL || 1e-9));
  }
  return out;
}

export function macd(values: number[]) {
  const e12 = ema(values, 12), e26 = ema(values, 26);
  const line = values.map((_, i) => e12[i] - e26[i]);
  const signal = ema(line, 9);
  const hist = line.map((v, i) => v - signal[i]);
  return { line, signal, hist, last: { line: line.at(-1)!, signal: signal.at(-1)!, hist: hist.at(-1)! } };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper: number[] = []; const lower: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { upper.push(values[i]); lower.push(values[i]); continue; }
    let s = 0; for (let j = i - period + 1; j <= i; j++) s += (values[j] - mid[i]) ** 2;
    const sd = Math.sqrt(s / period);
    upper.push(mid[i] + mult * sd); lower.push(mid[i] - mult * sd);
  }
  return { mid, upper, lower };
}

export function stochRsi(values: number[], period = 14) {
  const r = rsi(values, period);
  const k: number[] = [];
  for (let i = 0; i < r.length; i++) {
    if (i < period * 2) { k.push(50); continue; }
    const slice = r.slice(i - period + 1, i + 1);
    const min = Math.min(...slice), max = Math.max(...slice);
    k.push(max === min ? 50 : ((r[i] - min) / (max - min)) * 100);
  }
  const d = sma(k, 3);
  return { k, d, last: { k: k.at(-1)!, d: d.at(-1)! } };
}

export function atr(klines: Kline[], period = 14): number {
  if (klines.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const h = klines[i].high, l = klines[i].low, pc = klines[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function supportResistance(klines: Kline[], lookback = 50) {
  const slice = klines.slice(-lookback);
  const last = slice.at(-1)!.close;
  const highs = slice.map((k) => k.high).sort((a, b) => b - a);
  const lows = slice.map((k) => k.low).sort((a, b) => a - b);
  const resistance = highs.find((h) => h > last) ?? highs[0];
  const support = lows.find((l) => l < last) ?? lows[0];
  return { support, resistance };
}
