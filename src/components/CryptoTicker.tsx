import { useEffect, useState } from "react";

type Coin = { symbol: string; price: number; change: number };
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT"];

export function CryptoTicker() {
  const [coins, setCoins] = useState<Coin[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const q = encodeURIComponent(JSON.stringify(SYMBOLS));
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${q}`);
        const json = await res.json();
        if (cancelled || !Array.isArray(json)) return;
        setCoins(
          json.map((d: any) => ({
            symbol: String(d.symbol).replace("USDT", ""),
            price: Number(d.lastPrice),
            change: Number(d.priceChangePercent),
          }))
        );
      } catch {}
    }
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  if (!coins.length) return <div className="h-6" />;
  return (
    <div className="overflow-hidden flex-1 max-w-md">
      <div className="flex gap-6 animate-[ticker_40s_linear_infinite] whitespace-nowrap text-xs">
        {[...coins, ...coins].map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-muted-foreground">{c.symbol}</span>
            <span className="font-medium">${c.price.toFixed(c.price > 100 ? 0 : 2)}</span>
            <span className={c.change >= 0 ? "text-[var(--success)]" : "text-destructive"}>
              {c.change >= 0 ? "+" : ""}{c.change.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
}