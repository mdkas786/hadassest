import { useEffect, useState } from "react";
import logo from "@/assets/had-logo.jpg";

export function Splash() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 3000);
    return () => clearTimeout(t);
  }, []);
  if (done) return null;
  return (
    <div className="had-splash fixed inset-0 z-[100] flex items-center justify-center bg-navy">
      <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_50%_50%,rgba(201,168,76,.25),transparent_60%)]" />
      <div className="relative">
        <span className="absolute inset-0 -m-8 rounded-full border border-gold/40 had-splash-ring" />
        <span className="absolute inset-0 -m-16 rounded-full border border-gold/20 had-splash-ring" style={{ animationDelay: ".4s" }} />
        <div className="had-splash-logo relative">
          <img src={logo} alt="H.A.D. Asset Management" className="relative w-[min(80vw,520px)] rounded-lg shadow-2xl shadow-black/50" />
          <div className="pointer-events-none absolute inset-0 had-splash-shimmer rounded-lg" />
        </div>
        <p className="mt-6 text-center text-xs tracking-[0.4em] text-gold/80 font-sans uppercase">
          Est. 2026 · Asset Management
        </p>
      </div>
    </div>
  );
}
