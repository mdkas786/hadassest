import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanKey, fmtInr } from "@/lib/plans";
import logo from "@/assets/had-logo.jpg";

export const Route = createFileRoute("/plan")({
  head: () => ({ meta: [{ title: "Apna Plan Chunein — H.A.D." }] }),
  component: PlanPage,
});

function PlanPage() {
  const nav = useNavigate();
  const [saving, setSaving] = useState<PlanKey | null>(null);
  const [hadId, setHadId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data } = await supabase.from("profiles").select("had_id").eq("id", user.id).maybeSingle();
      setHadId((data as any)?.had_id || null);
    })();
  }, [nav]);

  async function choose(key: PlanKey) {
    setSaving(key);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ selected_plan: key }).eq("id", user.id);
    nav({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-navy text-white px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 justify-center mb-8">
          <img src={logo} className="h-10 w-10 rounded object-cover" alt="" />
          <span className="font-serif text-xl text-gold">H.A.D.</span>
        </div>
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] text-gold uppercase">{hadId || ""}</p>
          <h1 className="font-serif text-3xl mt-2">Apna Investment Plan Chunein</h1>
          <p className="text-white/60 mt-1 text-sm">Yeh baad mein bhi change ho sakta hai.</p>
        </div>

        <div className="space-y-4">
          {(["starter", "growth", "fortune"] as PlanKey[]).map((k) => {
            const p = PLANS[k];
            const range = p.max === Number.POSITIVE_INFINITY
              ? `${fmtInr(p.min)} and above`
              : `${fmtInr(p.min)} – ${fmtInr(p.max)}`;
            return (
              <div key={k} className={`rounded-xl border-2 bg-navy-light/40 p-6 ${p.color}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{p.emoji}</span>
                      <h2 className="font-serif text-2xl">{p.label} Plan</h2>
                    </div>
                    <p className="text-gold text-lg mt-1">{p.rate}% Monthly Return</p>
                    <p className="text-white/60 text-xs mt-1">Investment Range: {range}</p>
                    <ul className="mt-3 space-y-1 text-sm text-white/80">
                      {p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-gold">✓</span>{f}</li>)}
                    </ul>
                  </div>
                  <button disabled={!!saving} onClick={() => choose(k)}
                    className="shrink-0 rounded-md bg-gold text-navy px-4 py-2 text-sm font-medium disabled:opacity-50">
                    {saving === k ? "Saving…" : `Choose ${p.label}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <Link to="/dashboard" className="text-sm text-white/50 hover:text-gold underline">Skip for now</Link>
        </div>
      </div>
    </div>
  );
}
