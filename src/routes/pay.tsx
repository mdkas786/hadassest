import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { extractPaymentInfo } from "@/lib/ocr.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/pay")({
  head: () => ({ meta: [{ title: "Pay — H.A.D." }] }),
  component: PayPage,
});

function PayPage() {
  const nav = useNavigate();
  const ocr = useServerFn(extractPaymentInfo);
  const [profile, setProfile] = useState<{ had_id: string; id: string } | null>(null);
  const [wallets, setWallets] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"upi" | "btc" | "eth" | "usdt">("upi");
  const [txnRef, setTxnRef] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

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

  const upiId = wallets.upi_id || "";
  const payeeName = wallets.upi_name || "H.A.D. Asset Management";
  const upiLink = useMemo(() => {
    if (!upiId) return "";
    const params = new URLSearchParams({ pa: upiId, pn: payeeName, cu: "INR" });
    if (amount) params.set("am", String(Number(amount)));
    if (profile?.had_id) params.set("tn", `HAD-${profile.had_id}`);
    return `upi://pay?${params.toString()}`;
  }, [upiId, payeeName, amount, profile?.had_id]);

  function openUpiApp(scheme?: string) {
    if (!upiLink) { toast.error("UPI not configured"); return; }
    const url = scheme ? upiLink.replace("upi://", scheme) : upiLink;
    window.location.href = url;
  }

  async function handleFile(file: File | null) {
    setScreenshot(file);
    if (!file) return;
    setScanning(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await ocr({ data: { imageBase64: base64, mimeType: file.type || "image/png" } });
      let filled = 0;
      if (result.amount) { setAmount(String(result.amount)); filled++; }
      if (result.txn_ref) { setTxnRef(result.txn_ref); filled++; }
      if (result.method && ["upi","btc","eth","usdt"].includes(result.method)) { setMethod(result.method as any); filled++; }
      if (filled) toast.success(`Auto-filled ${filled} field${filled > 1 ? "s" : ""} from screenshot`);
      else toast.message("Could not auto-detect — please fill manually");
    } catch (err: any) {
      toast.error(err.message || "OCR failed — fill manually");
    } finally { setScanning(false); }
  }

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
          {profile && <p className="text-xs text-white/50 mt-1">Note will include your HAD ID: <span className="text-gold">HAD-{profile.had_id}</span></p>}
        </div>

        {method === "upi" && upiId && (
          <section className="rounded-xl border border-gold/30 bg-navy-light/40 p-6 grid sm:grid-cols-[auto,1fr] gap-6 items-center">
            <div className="bg-white p-3 rounded-lg w-fit">
              <QRCodeCanvas value={upiLink} size={160} />
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/50">UPI ID</div>
                <div className="text-sm break-all">{upiId}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openUpiApp("gpay://upi/")} className="px-3 py-1.5 text-xs rounded-md bg-gold text-navy font-medium">GPay</button>
                <button onClick={() => openUpiApp("phonepe://pay?")} className="px-3 py-1.5 text-xs rounded-md bg-gold text-navy font-medium">PhonePe</button>
                <button onClick={() => openUpiApp("paytmmp://pay?")} className="px-3 py-1.5 text-xs rounded-md bg-gold text-navy font-medium">Paytm</button>
                <button onClick={() => openUpiApp()} className="px-3 py-1.5 text-xs rounded-md border border-gold/40 text-gold">Any UPI</button>
              </div>
              <p className="text-[11px] text-white/50">Enter amount above first, then tap an app to pre-fill payment.</p>
            </div>
          </section>
        )}

        <section className="grid sm:grid-cols-2 gap-4">
          <WalletCard label="UPI ID" value={upiId || "Not configured"} />
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
              <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="input">
                <option value="upi">UPI</option>
                <option value="btc">BTC</option>
                <option value="eth">ETH</option>
                <option value="usdt">USDT</option>
              </select>
            </Field>
            <Field label="Transaction ID / TxHash">
              <input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} className="input" />
            </Field>
            <Field label={`Screenshot ${scanning ? "(scanning…)" : "(AI auto-fill)"}`}>
              <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} className="input" />
            </Field>
          </div>
          <button disabled={submitting || scanning} className="w-full bg-gold text-navy rounded-md py-2.5 font-medium disabled:opacity-60">
            {submitting ? "Submitting…" : scanning ? "Reading screenshot…" : "Submit for verification"}
          </button>
          <style>{`.input{width:100%;background:#0A1628;border:1px solid rgba(201,168,76,.25);border-radius:.5rem;padding:.55rem .75rem;color:white;outline:none}.input:focus{border-color:#C9A84C}`}</style>
        </form>
      </main>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
