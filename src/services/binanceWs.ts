// Binance public WebSocket — free, no key required.
// Hybrid model: prefer Binance for live ticks; falls back to CoinCap REST if WS fails.

const isBrowser = typeof window !== "undefined";

export type TickerData = { symbol: string; price: number; changePct: number; volume: number };

// CoinCap id → Binance pair (USDT)
export const COINCAP_TO_BINANCE: Record<string, string> = {
  bitcoin: "btcusdt", ethereum: "ethusdt", "binance-coin": "bnbusdt", binancecoin: "bnbusdt",
  solana: "solusdt", xrp: "xrpusdt", ripple: "xrpusdt", cardano: "adausdt",
  dogecoin: "dogeusdt", tron: "trxusdt", litecoin: "ltcusdt", polkadot: "dotusdt",
  avalanche: "avaxusdt", "matic-network": "maticusdt", polygon: "maticusdt",
  chainlink: "linkusdt", "shiba-inu": "shibusdt", uniswap: "uniusdt",
};

export function coincapToBinance(coincapId?: string | null, symbol?: string): string | null {
  if (coincapId && COINCAP_TO_BINANCE[coincapId.toLowerCase()]) return COINCAP_TO_BINANCE[coincapId.toLowerCase()];
  if (symbol) return `${symbol.toLowerCase()}usdt`;
  return null;
}

export type ConnState = "connecting" | "live" | "reconnecting" | "offline";

export function subscribeBinanceMulti(
  pairs: string[],
  onTick: (t: TickerData) => void,
  onState?: (s: ConnState) => void,
): () => void {
  if (!isBrowser || pairs.length === 0) return () => {};
  const streams = pairs.map((p) => `${p}@ticker`).join("/");
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
  let ws: WebSocket | null = null;
  let closed = false;
  let retries = 0;

  function open() {
    if (closed) return;
    onState?.(retries === 0 ? "connecting" : "reconnecting");
    try {
      ws = new WebSocket(url);
      ws.onopen = () => { retries = 0; onState?.("live"); };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const d = msg.data || msg;
          if (!d?.s) return;
          onTick({
            symbol: String(d.s).toLowerCase(),
            price: Number(d.c),
            changePct: Number(d.P),
            volume: Number(d.v),
          });
        } catch {}
      };
      ws.onerror = () => { try { ws?.close(); } catch {} };
      ws.onclose = () => {
        if (closed) return;
        onState?.("reconnecting");
        if (retries >= 8) { onState?.("offline"); return; }
        const delay = Math.min(15000, 1000 * 2 ** retries++);
        setTimeout(open, delay);
      };
    } catch { onState?.("offline"); }
  }
  open();
  return () => { closed = true; try { ws?.close(); } catch {} };
}

export function subscribeBinanceSingle(pair: string, onTick: (t: TickerData) => void, onState?: (s: ConnState) => void) {
  return subscribeBinanceMulti([pair], onTick, onState);
}

// All-market mini ticker
export function subscribeBinanceAll(onTicks: (ticks: TickerData[]) => void, onState?: (s: ConnState) => void) {
  if (!isBrowser) return () => {};
  const url = `wss://stream.binance.com:9443/ws/!miniTicker@arr`;
  let ws: WebSocket | null = null;
  let closed = false;
  let retries = 0;
  function open() {
    if (closed) return;
    onState?.(retries === 0 ? "connecting" : "reconnecting");
    try {
      ws = new WebSocket(url);
      ws.onopen = () => { retries = 0; onState?.("live"); };
      ws.onmessage = (e) => {
        try {
          const arr = JSON.parse(e.data) as any[];
          onTicks(arr.map((d) => ({
            symbol: String(d.s).toLowerCase(),
            price: Number(d.c),
            changePct: ((Number(d.c) - Number(d.o)) / Number(d.o)) * 100,
            volume: Number(d.v),
          })));
        } catch {}
      };
      ws.onerror = () => { try { ws?.close(); } catch {} };
      ws.onclose = () => {
        if (closed) return;
        if (retries >= 8) { onState?.("offline"); return; }
        const delay = Math.min(15000, 1000 * 2 ** retries++);
        setTimeout(open, delay);
      };
    } catch { onState?.("offline"); }
  }
  open();
  return () => { closed = true; try { ws?.close(); } catch {} };
}
