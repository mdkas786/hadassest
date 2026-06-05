import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { extractPaymentInfo } from "@/lib/ocr.functions";
import { PLANS, planForAmount, fmtInr } from "@/lib/plans";
import { toast } from "sonner";

export const Route = createFileRoute("/pay")({
  head: () => ({ meta: [{ title: "Pay — H.A.D." }] }),
  component: PayPage,
});

type Wallet = { id: string; wallet_type: string; wallet_address: string; wallet_label: string | null };

function PayPage() {
  const nav = useNavigate();
  const ocr = useServerFn(extractPaymentInfo);
  const [profile, setProfile] = useState<{ had_id: string; id: string } | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "TRC20" | "BEP20">("UPI");
  const [utr, setUtr] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data: p } = await supabase.from("profiles").select("id, had_id").eq("id", user.id).maybeSingle();
      setProfile(p as any);
      const { data: w } = await supabase.from("app_wallets").select("*").eq("is_active", true).order("display_order");
      setWallets((w as any) || []);
    })();

    const ch = supabase.channel("pay_wallets").on(
      "postgres_changes", { event: "*", schema: "public", table: "app_wallets" },
      async () => {
        const { data: w } = await supabase.from("app_wallets").select("*").eq("is_active", true).order("display_order");
        setWallets((w as any) || []);
      },
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [nav]);

  const upiList = wallets.filter((w) => w.wallet_type === "upi");
  const trc20List = wallets.filter((w) => w.wallet_type === "usdt_trc20");
  const bep20List = wallets.filter((w) => w.wallet_type === "usdt_bep20");

  const amt = Number(amount) || 0;
  const plan = useMemo(() => planForAmount(amt), [amt]);
  const planInfo = PLANS[plan];

  async function handleFile(file: File | null) {
    setScreenshot(file);
    if (!file) return;
    setScanning(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await ocr({ data: { imageBase64: base64, mimeType: file.type || "image/png" } });
      let filled = 0;
      if (result.amount) { setAmount(String(result.amount)); filled++; }
      if (result.txn_ref) { setUtr(result.txn_ref); filled++; }
      if (filled) toast.success(`Auto-filled ${filled} field${filled > 1 ? "s" : ""}`);
      else toast.message("Could not auto-detect — please fill manually");
    } catch (err: any) {
      toast.error(err.message || "OCR failed — fill manually");
    } finally { setScanning(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !amt) return;
    setSubmitting(true);
    try {
      let screenshot_url: string | null = null;
      if (screenshot) {
        const path = `${profile.id}/${Date.now()}_${screenshot.name}`;
        const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, screenshot);
        if (upErr) throw upErr;
        screenshot_url = path;
      }
      const method = paymentMethod === "UPI" ? "upi" : paymentMethod === "TRC20" ? "usdt" : "usdt";
      const { error } = await supabase.from("transactions").insert({
        user_id: profile.id, had_id: profile.had_id,
        amount: amt, type: "investment", method,
        payment_method: paymentMethod,
        plan_name: plan, slab_amount: amt,
        utr_number: utr || null, txn_ref: utr || null,
        screenshot_url, status: "pending",
      } as any);
      if (error) throw error;
      toast.success("Payment submitted! Admin verify karega.");
      setAmount(""); setUtr(""); setScreenshot(null);
      setTimeout(() => nav({ to: "/dashboard" }), 800);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-white/70 hover:text-gold">← Dashboard</Link>
          <Link to="/" className="font-serif text-xl text-gold">H.A.D.</Link>
          <span />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Pay</p>
          <h1 className="font-serif text-3xl mt-1">Send your investment</h1>
          {profile && <p className="text-xs text-white/50 mt-1">Note: HAD-{profile.had_id}</p>}
        </div>

        {/* Amount input + plan auto-detect */}
        <section className="rounded-xl border border-gold/30 bg-navy-light/40 p-6">
          <label className="text-xs text-white/70 uppercase tracking-widest">Investment Amount (₹)</label>
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="50000" className="w-full mt-2 bg-navy border border-gold/25 rounded-md px-4 py-3 text-2xl font-serif outline-none focus:border-gold" />
          {amt > 0 && (
            <div className={`mt-4 rounded-lg border-2 ${planInfo.color} bg-navy/60 p-4`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Auto-detected plan</div>
                  <div className="font-serif text-2xl text-gold">{planInfo.emoji} {planInfo.label} Plan</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Monthly rate</div>
                  <div className="font-serif text-2xl text-emerald-300">{planInfo.rate}%</div>
                </div>
              </div>
              <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                <Stat label="Monthly Payout" value={fmtInr(amt * planInfo.rate / 100)} />
                <Stat label="In 12 Months" value={fmtInr(amt * planInfo.rate * 12 / 100)} />
                <Stat label="2X Target" value={fmtInr(amt * 2)} accent />
              </div>
              <ul className="mt-3 text-xs text-white/70 list-disc pl-5 space-y-1">
                {planInfo.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          )}
        </section>


        {/* UPI section */}
        {upiList.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl mb-3">UPI Payment</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {upiList.map((u) => <UpiCard key={u.id} w={u} amount={amt} hadId={profile?.had_id} />)}
            </div>
          </section>
        )}

        {/* Crypto section */}
        {(trc20List.length + bep20List.length) > 0 && (
          <section>
            <h2 className="font-serif text-2xl mb-3">Crypto Payment (USDT)</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {trc20List.map((w) => <CryptoCard key={w.id} w={w} network="TRC20" />)}
              {bep20List.map((w) => <CryptoCard key={w.id} w={w} network="BEP20" />)}
            </div>
          </section>
        )}

        {/* Submit proof */}
        <form onSubmit={submit} className="rounded-xl border border-gold/30 bg-navy-light/40 p-6 space-y-4">
          <h2 className="font-serif text-xl">Submit payment proof</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Payment Method">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="input">
                <option value="UPI">UPI</option>
                <option value="TRC20">USDT TRC20</option>
                <option value="BEP20">USDT BEP20</option>
              </select>
            </Field>
            <Field label="UTR / Transaction ID">
              <input value={utr} onChange={(e) => setUtr(e.target.value)} className="input" />
            </Field>
            <div className="sm:col-span-2">
              <Field label={`Screenshot ${scanning ? "(scanning…)" : "(AI auto-fill)"}`}>
                <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} className="input" />
              </Field>
            </div>
          </div>
          <button disabled={submitting || scanning || !amt} className="w-full bg-gold text-navy rounded-md py-3 font-medium disabled:opacity-60">
            {submitting ? "Submitting…" : scanning ? "Reading screenshot…" : "Submit for verification"}
          </button>
          <style>{`.input{width:100%;background:#0A1628;border:1px solid rgba(201,168,76,.25);border-radius:.5rem;padding:.6rem .75rem;color:white;outline:none}.input:focus{border-color:#C9A84C}`}</style>
        </form>
      </main>
    </div>
  );
}

function UpiCard({ w, amount, hadId }: { w: Wallet; amount: number; hadId: string | undefined }) {
  const name = w.wallet_label || "H.A.D.";
  const params = new URLSearchParams({ pa: w.wallet_address, pn: name, cu: "INR" });
  if (amount) params.set("am", String(amount));
  if (hadId) params.set("tn", `HAD-${hadId}`);
  const upiLink = `upi://pay?${params.toString()}`;
  const open = (scheme: string) => { window.location.href = upiLink.replace("upi://", scheme); };
  return (
    <div className="rounded-xl border border-gold/30 bg-navy-light/50 p-5">
      <div className="text-gold font-medium">{name}</div>
      <div className="text-xs text-white/70 break-all mt-1 font-mono">{w.wallet_address}</div>
      <div className="mt-3 bg-white p-2 rounded-lg w-fit mx-auto">
        <QRCodeCanvas value={upiLink} size={140} />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        <PayBtn label="GPay" onClick={() => open("gpay://upi/")} />
        <PayBtn label="PhonePe" onClick={() => open("phonepe://pay?")} />
        <PayBtn label="Paytm" onClick={() => open("paytmmp://pay?")} />
        <PayBtn label="Any" onClick={() => open("upi://")} />
      </div>
      <button onClick={() => { navigator.clipboard.writeText(w.wallet_address); toast.success("UPI copied"); }}
        className="mt-3 w-full text-xs text-gold hover:underline">Copy UPI ID</button>
    </div>
  );
}

function CryptoCard({ w, network }: { w: Wallet; network: "TRC20" | "BEP20" }) {
  return (
    <div className="rounded-xl border border-gold/30 bg-navy-light/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-gold font-medium">{w.wallet_label || "Wallet"}</span>
        <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-gold/15 text-gold tracking-widest">{network}</span>
      </div>
      <div className="text-xs text-white/70 break-all mt-2 font-mono">{w.wallet_address}</div>
      <div className="mt-3 bg-white p-2 rounded-lg w-fit mx-auto">
        <QRCodeCanvas value={w.wallet_address} size={140} />
      </div>
      <button onClick={() => { navigator.clipboard.writeText(w.wallet_address); toast.success("Address copied"); }}
        className="mt-3 w-full text-xs text-gold hover:underline">Copy address</button>
    </div>
  );
}

function PayBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="px-2 py-1.5 text-xs rounded bg-gold text-navy font-medium">{label}</button>;
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-gold/20 bg-navy p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className={`mt-1 font-serif text-xl ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="text-xs text-white/60">{label}</span><div className="mt-1">{children}</div></label>;
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
