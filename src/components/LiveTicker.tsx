import { useEffect, useRef, useState } from "react";
import { subscribeBinanceMulti, type ConnState, type TickerData } from "@/services/binanceWs";

const DEFAULT_PAIRS = ["btcusdt", "ethusdt", "bnbusdt", "solusdt", "xrpusdt", "adausdt", "dogeusdt", "trxusdt", "ltcusdt", "maticusdt"];
const LABELS: Record<string, string> = {
  btcusdt: "BTC", ethusdt: "ETH", bnbusdt: "BNB", solusdt: "SOL", xrpusdt: "XRP",
  adausdt: "ADA", dogeusdt: "DOGE", trxusdt: "TRX", ltcusdt: "LTC", maticusdt: "MATIC",
};

export function LiveTicker({ pairs = DEFAULT_PAIRS }: { pairs?: string[] }) {
  const [prices, setPrices] = useState<Record<string, TickerData>>({});
  const [state, setState] = useState<ConnState>("connecting");
  const seen = useRef(false);

  useEffect(() => {
    return subscribeBinanceMulti(pairs, (t) => {
      seen.current = true;
      setPrices((p) => ({ ...p, [t.symbol]: t }));
    }, setState);
  }, [pairs.join(",")]);

  const dot = state === "live" ? "bg-emerald-400" : state === "reconnecting" ? "bg-amber-400" : state === "offline" ? "bg-red-400" : "bg-white/40";

  return (
    <div className="w-full border-y border-gold/20 bg-navy-light/40 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/60 shrink-0">
          <span className={`h-1.5 w-1.5 rounded-full ${dot} ${state === "live" ? "animate-pulse" : ""}`} />
          {state === "live" ? "Live" : state === "reconnecting" ? "Reconnecting" : state}
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-6 whitespace-nowrap animate-[ticker_60s_linear_infinite]">
            {[...pairs, ...pairs].map((p, i) => {
              const t = prices[p];
              const up = t ? t.changePct >= 0 : true;
              return (
                <span key={`${p}-${i}`} className="text-xs">
                  <span className="text-white/80 font-medium">{LABELS[p] || p.replace("usdt", "").toUpperCase()}</span>
                  <span className="text-white/90 ml-1.5">{t ? `$${t.price.toLocaleString("en-US", { maximumFractionDigits: t.price < 1 ? 6 : 2 })}` : "—"}</span>
                  <span className={`ml-1.5 ${up ? "text-emerald-300" : "text-red-300"}`}>{t ? `${up ? "+" : ""}${t.changePct.toFixed(2)}%` : ""}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
