// CoinCap API service with localStorage TTL cache + WebSocket live prices.
// API key is a public-tier rate-limit key (safe to ship in client bundle).
const COINCAP_KEY = (import.meta as any).env?.VITE_COINCAP_API_KEY
  || "5ed305725bd48e89b74dc16aaf7edcfcd50536f622ab441e4391e2b5293a92c3";

// CoinCap migrated to v3 with API key. v3 base host:
const BASE = "https://rest.coincap.io/v3";
const WS_BASE = "wss://wss.coincap.io/prices";

const HEADERS = {
  Authorization: `Bearer ${COINCAP_KEY}`,
} as Record<string, string>;

// ---------- cache ----------
type Cached<T> = { t: number; v: T };
const isBrowser = typeof window !== "undefined";
const TTL = {
  list: 60_000,
  detail: 30_000,
  history: 10 * 60_000,
  rates: 5 * 60_000,
};
function cacheGet<T>(k: string, ttl: number): T | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const p = JSON.parse(raw) as Cached<T>;
    if (Date.now() - p.t > ttl) return null;
    return p.v;
  } catch { return null; }
}
function cacheSet<T>(k: string, v: T) {
  if (!isBrowser) return;
  try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), v })); } catch {}
}

async function get<T>(path: string, ttl: number, cacheKey?: string): Promise<T> {
  const key = `coincap_${cacheKey ?? path}`;
  const hit = cacheGet<T>(key, ttl);
  if (hit) return hit;
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 429) throw new Error("rate_limited");
    // fall back to stale cache if any
    if (isBrowser) {
      const raw = localStorage.getItem(key);
      if (raw) return (JSON.parse(raw) as Cached<T>).v;
    }
    throw new Error(`coincap_error_${res.status}`);
  }
  const json = (await res.json()) as { data: T };
  cacheSet(key, json.data);
  return json.data;
}

// ---------- types ----------
export interface CoinAsset {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  priceUsd: string;
  changePercent24Hr: string;
  marketCapUsd: string;
  volumeUsd24Hr: string;
  supply: string;
}
export interface HistoryPoint { priceUsd: string; time: number; date: string }
export interface Rate { id: string; symbol: string; currencySymbol?: string; rateUsd: string; type: string }

// ---------- API ----------
export async function getAllAssets(limit = 50, offset = 0, search = "") {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) qs.set("search", search);
  return get<CoinAsset[]>(`/assets?${qs}`, TTL.list, `assets_${qs}`);
}
export async function getAssetById(id: string) {
  return get<CoinAsset>(`/assets/${id}`, TTL.detail, `asset_${id}`);
}
export async function getAssetHistory(id: string, interval = "d1") {
  return get<HistoryPoint[]>(`/assets/${id}/history?interval=${interval}`, TTL.history, `hist_${id}_${interval}`);
}
export async function getAssetMarkets(id: string) {
  return get<any[]>(`/assets/${id}/markets`, TTL.list, `markets_${id}`);
}
export async function getMultipleAssets(ids: string[]) {
  return Promise.all(ids.map((id) => getAssetById(id).catch(() => null)));
}
export async function searchAssets(query: string) {
  if (!query) return [];
  return get<CoinAsset[]>(`/assets?search=${encodeURIComponent(query)}&limit=20`, TTL.list, `search_${query}`);
}
export async function getTopAssets(limit = 20) {
  return getAllAssets(limit, 0, "");
}
export async function getExchangeRates() {
  return get<Rate[]>(`/rates`, TTL.rates, `rates`);
}
export async function getInrRate(): Promise<number> {
  try {
    const r = await getExchangeRates();
    const inr = r.find((x) => x.symbol === "INR");
    return inr ? 1 / Number(inr.rateUsd) : 83;
  } catch { return 83; }
}
export async function getMarkets() {
  return get<any[]>(`/markets?limit=20`, TTL.list, `markets_top`);
}

// ---------- realtime ----------
export function subscribeRealTimePrice(assetIds: string[], onTick: (prices: Record<string, string>) => void) {
  if (!isBrowser || assetIds.length === 0) return () => {};
  const url = `${WS_BASE}?assets=${assetIds.join(",")}&apiKey=${COINCAP_KEY}`;
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  function open() {
    if (closed) return;
    try {
      ws = new WebSocket(url);
      ws.onmessage = (e) => { try { onTick(JSON.parse(e.data)); retry = 0; } catch {} };
      ws.onerror = () => { try { ws?.close(); } catch {} };
      ws.onclose = () => {
        if (closed) return;
        const delay = Math.min(30000, 1000 * 2 ** retry++);
        setTimeout(open, delay);
      };
    } catch {}
  }
  open();
  return () => { closed = true; try { ws?.close(); } catch {} };
}

export function fmtUsd(v: number | string, digits = 2) {
  const n = typeof v === "string" ? Number(v) : v;
  if (!isFinite(n)) return "$0";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
  return `$${n.toFixed(6)}`;
}
export function fmtInr(usd: number | string, rate: number) {
  const n = typeof usd === "string" ? Number(usd) : usd;
  const inr = n * rate;
  return `₹${inr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
export function fmtPct(v: number | string) {
  const n = typeof v === "string" ? Number(v) : v;
  if (!isFinite(n)) return "0.00%";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
