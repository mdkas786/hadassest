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
  const [err, setErr] = useState<string | null>(null);

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

  function validate(): string | null {
    const trc = (p.trc20_wallet || "").trim();
    const bep = (p.bep20_wallet || "").trim();
    if (trc && !(trc.startsWith("T") && trc.length === 34)) return "TRC20 wallet 'T' se start hona chahiye aur 34 character ka.";
    if (bep && !(bep.startsWith("0x") && bep.length === 42)) return "BEP20 wallet '0x' se start hona chahiye aur 42 character ka.";
    return null;
  }

  async function save() {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr(null); setSaving(true);
    const { error } = await supabase.from("profiles").update({
      upi_id: p.upi_id, mobile: p.mobile, city: p.city,
      trc20_wallet: p.trc20_wallet || null,
      bep20_wallet: p.bep20_wallet || null,
    } as any).eq("id", p.id);
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

        <section className="rounded-xl border border-gold/30 bg-navy-light/40 p-6 space-y-4">
          <h2 className="font-serif text-lg">Contact</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Mobile" value={p.mobile || ""} onChange={(v) => setP({ ...p, mobile: v })} />
            <Field label="City" value={p.city || ""} onChange={(v) => setP({ ...p, city: v })} />
          </div>
        </section>

        <section className="rounded-xl border border-gold/30 bg-navy-light/40 p-6 space-y-4">
          <h2 className="font-serif text-lg">Mera UPI (receive returns)</h2>
          <Field label="UPI ID" value={p.upi_id || ""} onChange={(v) => setP({ ...p, upi_id: v })} placeholder="yourname@bank" />
        </section>

        <section className="rounded-xl border border-gold/30 bg-navy-light/40 p-6 space-y-4">
          <h2 className="font-serif text-lg">Mere Crypto Wallets</h2>
          <p className="text-xs text-white/50">Yeh wallets admin ko dikhenge taaki returns aapko crypto mein bheja jaa sake.</p>
          <Field label="Mera TRC20 Wallet" value={p.trc20_wallet || ""}
            onChange={(v) => setP({ ...p, trc20_wallet: v.trim() })}
            placeholder="TRC20 wallet address (T...)" mono />
          <Field label="Mera BEP20 Wallet" value={p.bep20_wallet || ""}
            onChange={(v) => setP({ ...p, bep20_wallet: v.trim() })}
            placeholder="BEP20 wallet address (0x...)" mono />
          {err && <p className="text-sm text-red-300">{err}</p>}
        </section>

        <button onClick={save} disabled={saving} className="bg-gold text-navy rounded-md px-6 py-2.5 text-sm font-medium disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>

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

function Field({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-white/60 uppercase tracking-widest">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full bg-navy border border-gold/25 rounded-md px-3 py-2 outline-none focus:border-gold ${mono ? "font-mono text-sm" : ""}`} />
    </label>
  );
}
