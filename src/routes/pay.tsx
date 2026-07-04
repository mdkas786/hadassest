import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { UserShell } from "@/components/UserShell";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/session";
import { formatINR, getPlan } from "@/lib/format";
import { extractPaymentFromImage } from "@/lib/ocr.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { approveTransaction, getVerificationMode } from "@/lib/approve";

export const Route = createFileRoute("/pay")({
  head: () => ({ meta: [{ title: "Pay — H.A.D." }] }),
  component: Pay,
});

function fileToBase64(file: File): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result);
      const [meta, b64] = result.split(",");
      const mime = (meta.match(/data:(.*?);base64/) || [])[1] || file.type || "image/png";
      resolve({ b64, mime });
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function Pay() {
  const u = typeof window !== "undefined" ? getUser() : null;
  const [amount, setAmount] = useState<number>(50000);
  const [method, setMethod] = useState("UPI");
  const [utr, setUtr] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ocr = useServerFn(extractPaymentFromImage);
  const [specialOffer, setSpecialOffer] = useState<any>(null);
  const [specialSlab, setSpecialSlab] = useState<any>(null);

  useEffect(() => {
    supabase.from("wallets").select("*").eq("is_active", true).then(({ data }) => setWallets(data ?? []));
  }, []);

  // Detect special offer mode from ?offer=&slab=
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const offerId = sp.get("offer");
    const slabId = sp.get("slab");
    if (!offerId || !slabId) return;
    (async () => {
      const { data: o } = await (supabase as any).from("special_offers").select("*").eq("id", offerId).maybeSingle();
      const { data: s } = await (supabase as any).from("special_offer_slabs").select("*").eq("id", slabId).maybeSingle();
      if (o && s && o.published) {
        setSpecialOffer(o);
        setSpecialSlab(s);
        setAmount(Number(s.investment_amount));
      }
    })();
  }, []);

  const plan = getPlan(amount);

  async function onScreenshot(file: File) {
    if (!u) return;
    setScanning(true);
    try {
      // 1. upload to storage (private bucket; admin will sign URL when viewing)
      const path = `${u.had_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      setScreenshotPath(path);
      setScreenshotUrl(URL.createObjectURL(file));
      // 2. OCR via Lovable AI
      const { b64, mime } = await fileToBase64(file);
      const result = await ocr({ data: { imageBase64: b64, mimeType: mime } });
      if (!result.ok) {
        toast.error(result.error || "OCR failed — please fill manually");
        return;
      }
      if (result.utr) setUtr(result.utr);
      if (result.amount && result.amount >= 1000) setAmount(Math.round(result.amount));
      if (result.method) {
        const m = result.method.toUpperCase();
        if (m.includes("TRC")) setMethod("USDT TRC20");
        else if (m.includes("BEP")) setMethod("USDT BEP20");
        else if (m.includes("BTC")) setMethod("BTC");
        else if (m.includes("ETH")) setMethod("ETH");
        else setMethod("UPI");
      }
      toast.success(`Detected: ${result.utr ? "UTR " + result.utr : "details"} from ${result.app || "screenshot"} — verify & submit`);
    } catch (e: any) {
      toast.error(e?.message || "Screenshot processing failed");
    } finally {
      setScanning(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!u) return;
    if (!utr.trim()) return toast.error("UTR / Transaction ID required");
    setSubmitting(true);
    const txnPlanName = specialSlab ? `SPECIAL:${specialOffer?.title ?? "OFFER"}` : plan.name;
    const { data: txn, error } = await supabase.from("transactions").insert({
      had_id: u.had_id,
      type: specialSlab ? "special_investment" : "investment",
      amount,
      payment_method: method,
      utr_number: utr.trim(),
      plan_name: txnPlanName,
      status: "pending",
      screenshot_url: screenshotPath,
      offer_id: specialOffer?.id ?? null,
      slab_id: specialSlab?.id ?? null,
    }).select().maybeSingle();
    if (error) { setSubmitting(false); return toast.error(error.message); }
    if (specialSlab && specialOffer && txn) {
      await (supabase as any).from("user_special_investments").insert({
        had_id: u.had_id,
        offer_id: specialOffer.id,
        slab_id: specialSlab.id,
        amount: Number(specialSlab.investment_amount),
        monthly_profit: Number(specialSlab.monthly_profit),
        duration_months: Number(specialSlab.duration_months),
        total_return: Number(specialSlab.total_return),
        transaction_id: txn.id,
        status: "pending",
      });
    }
    // Auto-verify if global mode is set to automatic
    let autoApproved = false;
    if (txn) {
      const mode = await getVerificationMode();
      if (mode === "automatic") {
        const res = await approveTransaction(txn.id);
        autoApproved = !!res.ok;
      }
    }
    setSubmitting(false);
    toast.success(autoApproved
      ? "Payment auto-verified ✅ Your investment is now active."
      : "Payment proof submitted! Admin will verify within 24 hours.");
    setUtr("");
    setScreenshotUrl(null);
    setScreenshotPath(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <UserShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <p className="text-xs text-[var(--gold)] tracking-widest">PAY</p>
          <h1 className="text-2xl font-bold">Send your investment</h1>
          <p className="text-xs text-muted-foreground">HAD ID: {u?.had_id}</p>
        </div>

        {specialSlab && specialOffer && (
          <div className="rounded-xl border-2 border-[var(--gold)] bg-gradient-to-r from-[var(--gold)]/15 to-card p-4 animate-fade-in">
            <p className="text-[10px] uppercase tracking-widest text-[var(--gold)] font-bold">🔥 Special Offer Investment</p>
            <p className="font-bold text-[var(--gold)] mt-1">{specialOffer.title} · {specialSlab.slab_label || "Plan"}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
              <div><p className="text-muted-foreground">Investment</p><p className="font-semibold">{formatINR(specialSlab.investment_amount)}</p></div>
              <div><p className="text-muted-foreground">Monthly</p><p className="font-semibold text-[var(--success)]">{formatINR(specialSlab.monthly_profit)}</p></div>
              <div><p className="text-muted-foreground">Duration</p><p className="font-semibold">{specialSlab.duration_months} months</p></div>
              <div><p className="text-muted-foreground">Total Return</p><p className="font-semibold text-[var(--gold)]">{formatINR(specialSlab.total_return)}</p></div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Amount is locked to this slab. Existing referral & sponsor rules continue to apply.</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-5">
          <label className="text-xs text-muted-foreground">INVESTMENT AMOUNT (₹50,000 – ₹50,00,000)</label>
          <input type="number" min={50000} max={5000000} value={amount} disabled={!!specialSlab} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-input border border-border rounded px-3 py-2 mt-1 text-lg disabled:opacity-60" />
          {specialSlab ? (
            <p className="text-xs text-[var(--gold)] mt-2">Special Offer · {formatINR(amount)} locked</p>
          ) : (
            <p className="text-xs text-[var(--gold)] mt-2">{formatINR(amount)} → {plan.name} ({plan.rate}% monthly) · 2X = {formatINR(amount * 2)}</p>
          )}
        </div>

        {wallets.filter((w) => w.type === "UPI").length > 0 && (
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="font-semibold mb-3">UPI Payment</h2>
            {wallets.filter((w) => w.type === "UPI").map((w) => (
              <div key={w.id} className="border border-border rounded p-4 mb-3">
                <p className="text-xs text-muted-foreground">{w.label}</p>
                <p className="font-mono text-sm">{w.address}</p>
                <img alt="QR" className="w-32 h-32 mt-2 bg-white p-1 rounded" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${w.address}&pn=HAD&am=${amount}&cu=INR`)}`} />
                <button type="button" onClick={() => { navigator.clipboard.writeText(w.address); toast.success("Copied"); }} className="text-xs text-[var(--gold)] mt-2">Copy UPI ID</button>
              </div>
            ))}
          </div>
        )}

        {wallets.filter((w) => w.type === "TRC20" || w.type === "BEP20").length > 0 && (
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="font-semibold mb-3">Crypto Payment (USDT)</h2>
            {wallets.filter((w) => ["TRC20", "BEP20"].includes(w.type)).map((w) => (
              <div key={w.id} className="border border-border rounded p-4 mb-3">
                <span className="text-xs bg-secondary px-2 py-1 rounded">{w.type}</span>
                <p className="font-mono text-xs mt-2 break-all">{w.address}</p>
                <button type="button" onClick={() => { navigator.clipboard.writeText(w.address); toast.success("Copied"); }} className="text-xs text-[var(--gold)] mt-2">Copy address</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="bg-card border border-[var(--gold)]/40 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold">Submit Payment Proof</h2>

          <div className="border border-dashed border-[var(--gold)]/60 rounded p-4 bg-secondary/30">
            <p className="text-xs text-[var(--gold)] mb-2">📷 AUTO-FILL: Upload screenshot — system will read UTR, amount & method</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              disabled={scanning}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onScreenshot(f);
              }}
              className="w-full text-xs"
            />
            {scanning && <p className="text-xs text-[var(--gold)] mt-2 animate-pulse">Scanning screenshot...</p>}
            {screenshotUrl && (
              <div className="mt-3">
                <img src={screenshotUrl} alt="screenshot" className="max-h-40 rounded border border-border" />
                <p className="text-xs text-[var(--success)] mt-1">✅ Screenshot uploaded — verify the auto-filled fields below.</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Payment Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full bg-input border border-border rounded px-3 py-2 mt-1 text-sm">
              <option>UPI</option><option>USDT TRC20</option><option>USDT BEP20</option><option>BTC</option><option>ETH</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">UTR / Transaction ID *</label>
            <input value={utr} onChange={(e) => setUtr(e.target.value)} className="w-full bg-input border border-border rounded px-3 py-2 mt-1 text-sm" />
          </div>
          <button disabled={submitting || scanning} className="w-full bg-[var(--gold)] text-[var(--primary-foreground)] py-2 rounded font-semibold disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit for verification"}
          </button>
        </form>
      </div>
    </UserShell>
  );
}