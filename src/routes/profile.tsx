import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — H.A.D." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const nav = useNavigate();
  const [p, setP] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setP(prof);
      const { data: t } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setTxns(t || []);
    })();
  }, [nav]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      upi_id: p.upi_id, wallet_address: p.wallet_address, mobile: p.mobile, city: p.city,
    }).eq("id", p.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  }

  if (!p) return <div className="min-h-screen bg-navy text-white grid place-items-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-white/70 hover:text-gold">← Dashboard</Link>
          <Link to="/" className="font-serif text-xl text-gold">H.A.D.</Link><span />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Profile</p>
          <h1 className="font-serif text-3xl mt-1">{p.full_name}</h1>
          <p className="text-white/60 text-sm">HAD ID: <span className="text-gold">{p.had_id}</span></p>
        </div>

        <section className="rounded-xl border border-gold/30 bg-navy-light/40 p-6 space-y-3">
          {(["mobile","city","upi_id","wallet_address"] as const).map((k) => (
            <label key={k} className="block text-sm">
              <span className="text-xs text-white/60 uppercase tracking-widest">{k.replace("_"," ")}</span>
              <input value={p[k] || ""} onChange={(e) => setP({ ...p, [k]: e.target.value })}
                className="mt-1 w-full bg-navy border border-gold/25 rounded-md px-3 py-2 outline-none focus:border-gold" />
            </label>
          ))}
          <button onClick={save} disabled={saving} className="bg-gold text-navy rounded-md px-5 py-2 text-sm font-medium disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </section>

        <section>
          <h2 className="font-serif text-xl mb-3">Recent transactions</h2>
          <div className="rounded-xl border border-gold/20 bg-navy-light/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-navy-light/70 text-white/60 text-xs uppercase">
                <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Status</th></tr>
              </thead>
              <tbody>
                {txns.length === 0 && <tr><td className="px-3 py-6 text-center text-white/50" colSpan={4}>No transactions yet.</td></tr>}
                {txns.map((t) => (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="px-3 py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{t.type}</td>
                    <td className="px-3 py-2 text-right tabular-nums">₹{Number(t.amount).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${t.status==="verified"||t.status==="completed"?"bg-emerald-500/15 text-emerald-400":t.status==="rejected"?"bg-red-500/15 text-red-400":"bg-amber-500/15 text-amber-300"}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
