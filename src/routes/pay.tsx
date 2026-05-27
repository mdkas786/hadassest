import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/pay")({
  head: () => ({ meta: [{ title: "Pay — H.A.D." }] }),
  component: PayPage,
});

function PayPage() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ had_id: string; id: string } | null>(null);
  const [wallets, setWallets] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [txnRef, setTxnRef] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data: p } = await supabase.from("profiles").select("id, had_id").eq("id", user.id).maybeSingle();
      setProfile(p as any);
      const { data: s } = await supabase.from("app_settings").select("key, value");
      const map: Record<string, string> = {};
      (s || []).forEach((r: any) => { map[r.key] = r.value; });
      setWallets(map);
    })();
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !amount) return;
    setSubmitting(true);
    try {
      let screenshot_url: string | null = null;
      if (screenshot) {
        const path = `${profile.id}/${Date.now()}_${screenshot.name}`;
        const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, screenshot);
        if (upErr) throw upErr;
        screenshot_url = path;
      }
      const { error } = await supabase.from("transactions").insert({
        user_id: profile.id, had_id: profile.had_id,
        amount: Number(amount), type: "investment", method,
        txn_ref: txnRef || null, screenshot_url, status: "pending",
      });
      if (error) throw error;
      toast.success("Payment submitted. Admin verify karega.");
      setAmount(""); setTxnRef(""); setScreenshot(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-white/70 hover:text-gold">← Dashboard</Link>
          <Link to="/" className="font-serif text-xl text-gold">H.A.D.</Link>
          <span />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Pay</p>
          <h1 className="font-serif text-3xl mt-1">Send your investment</h1>
        </div>

        <section className="grid sm:grid-cols-2 gap-4">
          <WalletCard label="UPI ID" value={wallets.upi_id || "Not configured"} />
          <WalletCard label="Bitcoin (BTC)" value={wallets.wallet_btc || "Not configured"} />
          <WalletCard label="Ethereum (ETH)" value={wallets.wallet_eth || "Not configured"} />
          <WalletCard label="USDT TRC20" value={wallets.wallet_usdt_trc20 || "Not configured"} />
        </section>

        <form onSubmit={submit} className="rounded-xl border border-gold/30 bg-navy-light/40 p-6 space-y-4">
          <h2 className="font-serif text-xl">Submit payment proof</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Amount (₹)">
              <input type="number" required min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
            </Field>
            <Field label="Method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
                <option value="upi">UPI</option>
                <option value="btc">BTC</option>
                <option value="eth">ETH</option>
                <option value="usdt">USDT</option>
              </select>
            </Field>
            <Field label="Transaction ID / TxHash">
              <input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} className="input" />
            </Field>
            <Field label="Screenshot (optional)">
              <input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} className="input" />
            </Field>
          </div>
          <button disabled={submitting} className="w-full bg-gold text-navy rounded-md py-2.5 font-medium disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit for verification"}
          </button>
          <style>{`.input{width:100%;background:#0A1628;border:1px solid rgba(201,168,76,.25);border-radius:.5rem;padding:.55rem .75rem;color:white;outline:none}.input:focus{border-color:#C9A84C}`}</style>
        </form>
      </main>
    </div>
  );
}
function WalletCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-4">
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className="mt-1 break-all text-sm">{value}</div>
      <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="mt-2 text-xs text-gold hover:underline">Copy</button>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="text-xs text-white/60">{label}</span><div className="mt-1">{children}</div></label>;
}
