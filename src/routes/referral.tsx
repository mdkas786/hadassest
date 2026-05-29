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
  const [hadId, setHadId] = useState<string>("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data: p } = await supabase.from("profiles").select("had_id").eq("id", user.id).maybeSingle();
      const id = (p as any)?.had_id || "";
      setHadId(id);
      if (id) {
        const { count: c } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("referred_by", id);
        setCount(c || 0);
      }
    })();
  }, [nav]);

  const link = typeof window !== "undefined" && hadId ? `${window.location.origin}/register?ref=${hadId}` : "";
  const shareText = `${hadId} code se register karein — H.A.D. Asset Management. ${link}`;

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
          <h1 className="font-serif text-3xl mt-1">Apna HAD ID share karein</h1>
          <p className="text-white/60 text-sm mt-1">Aapka HAD ID hi aapka referral code hai.</p>
        </div>
        <div className="rounded-xl border-2 border-gold/40 bg-navy-light/40 p-8 text-center">
          <p className="text-white/60 text-sm">Your referral code</p>
          <p className="font-mono text-5xl text-gold mt-2 tracking-[0.3em]">{hadId || "—"}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(hadId); toast.success("HAD ID copied"); }} className="px-5 py-2 bg-gold text-navy rounded-md text-sm font-medium">Copy HAD ID</button>
            <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }} className="px-5 py-2 border border-gold/40 rounded-md text-sm">Copy invite link</button>
            <button onClick={() => { navigator.clipboard.writeText(shareText); toast.success("Share text copied"); }} className="px-5 py-2 border border-gold/40 rounded-md text-sm">Copy share text</button>
          </div>
          <p className="text-xs text-white/50 mt-4 break-all">{link}</p>
        </div>
        <div className="rounded-xl border border-gold/20 bg-navy-light/30 p-6">
          <p className="text-white/70 text-sm">Aapke code se joined</p>
          <p className="font-serif text-4xl text-gold mt-1">{count}</p>
        </div>
      </main>
    </div>
  );
}
