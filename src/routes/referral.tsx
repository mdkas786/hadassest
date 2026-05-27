import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/referral")({
  head: () => ({ meta: [{ title: "Referral — H.A.D." }] }),
  component: Referral,
});

function Referral() {
  const nav = useNavigate();
  const [code, setCode] = useState<string>("");
  const [count, setCount] = useState(0);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data: p } = await supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle();
      const ref = (p as any)?.referral_code || "";
      setCode(ref);
      if (ref) {
        const { count: c } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", ref);
        setCount(c || 0);
      }
    })();
  }, [nav]);
  const link = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${code}` : "";
  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-white/70 hover:text-gold">← Dashboard</Link>
          <Link to="/" className="font-serif text-xl text-gold">H.A.D.</Link><span />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Referral</p>
          <h1 className="font-serif text-3xl mt-1">Apna code share karein</h1>
        </div>
        <div className="rounded-xl border border-gold/30 bg-navy-light/40 p-8 text-center">
          <p className="text-white/60 text-sm">Your code</p>
          <p className="font-serif text-5xl text-gold mt-2 tracking-widest">{code || "—"}</p>
          <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }} className="mt-6 px-5 py-2 bg-gold text-navy rounded-md text-sm font-medium">Copy invite link</button>
          <p className="text-xs text-white/50 mt-4 break-all">{link}</p>
        </div>
        <div className="rounded-xl border border-gold/20 bg-navy-light/30 p-6">
          <p className="text-white/70 text-sm">People joined with your code</p>
          <p className="font-serif text-4xl text-gold mt-1">{count}</p>
        </div>
      </main>
    </div>
  );
}
