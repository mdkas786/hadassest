import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HAD_ID_RE, hadEmail, hadPassword, normalizeHadId } from "@/lib/hadAuth";
import logo from "@/assets/had-logo.jpg";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — H.A.D." }] }),
  component: RegisterPage,
});

type Form = {
  full_name: string; mobile: string; city: string;
  upi_id: string; wallet_address: string; referred_by: string;
};

function RegisterPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>({
    full_name: "", mobile: "", city: "", upi_id: "", wallet_address: "", referred_by: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hadId, setHadId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15);

  // Capture ?ref= query param as referrer
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const r = u.searchParams.get("ref");
    if (r) setForm((f) => ({ ...f, referred_by: normalizeHadId(r) }));
  }, []);

  // Countdown on success screen
  useEffect(() => {
    if (!hadId) return;
    if (countdown <= 0) { nav({ to: "/dashboard" }); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [hadId, countdown, nav]);

  const update = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: k === "referred_by" ? e.target.value.toUpperCase() : e.target.value });

  async function submit() {
    setErr(null);
    if (!form.full_name || !form.mobile || !form.city) { setErr("Sabhi zaroori fields bharein."); return; }
    if (form.referred_by && !HAD_ID_RE.test(normalizeHadId(form.referred_by))) {
      setErr("Referral code HAD format hona chahiye (e.g. HAD22949).");
      return;
    }
    setLoading(true);
    // 1) Reserve a fresh HAD ID server-side
    const { data: newId, error: rpcErr } = await supabase.rpc("register_had_user", {
      p_full_name: form.full_name,
      p_mobile: form.mobile,
      p_city: form.city,
      p_upi_id: form.upi_id || null,
      p_wallet_address: form.wallet_address || null,
      p_referred_by: form.referred_by ? normalizeHadId(form.referred_by) : null,
    });
    if (rpcErr || !newId) { setLoading(false); setErr(rpcErr?.message || "Registration fail"); return; }
    const reserved = String(newId);
    // 2) Create auth user with synthetic email/password derived from HAD ID
    const { error } = await supabase.auth.signUp({
      email: hadEmail(reserved),
      password: hadPassword(reserved),
      options: {
        data: {
          had_id: reserved,
          full_name: form.full_name,
          mobile: form.mobile,
          city: form.city,
          upi_id: form.upi_id || null,
          wallet_address: form.wallet_address || null,
          referred_by: form.referred_by ? normalizeHadId(form.referred_by) : null,
        },
      },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    // Auto sign-in
    await supabase.auth.signInWithPassword({ email: hadEmail(reserved), password: hadPassword(reserved) });
    setHadId(reserved);
  }

  if (hadId) {
    return (
      <div className="min-h-screen bg-navy text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-xl border-2 border-gold/50 bg-navy-light/70 p-8 text-center">
          <img src={logo} className="h-16 w-16 mx-auto rounded object-cover ring-2 ring-gold/40" alt="" />
          <h1 className="font-serif text-2xl mt-4 text-gold">Welcome to H.A.D.</h1>
          <p className="text-white/70 mt-4 text-sm">Yeh aapka login ID hai:</p>
          <p className="font-mono text-5xl text-gold mt-3 tracking-[0.3em]">{hadId}</p>
          <p className="text-white/80 mt-4 text-sm">Sirf yeh ID se login karein — koi password nahi.</p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(hadId);
            }}
            className="mt-5 w-full rounded-md bg-gold py-2.5 text-navy font-medium"
          >Copy HAD ID</button>
          <p className="mt-4 text-red-300 text-xs font-semibold">⚠ Screenshot le lein. Yeh screen dobara nahi aayegi.</p>
          <p className="mt-3 text-white/50 text-xs">{countdown}s mein dashboard…</p>
          <button onClick={() => nav({ to: "/dashboard" })} className="mt-3 text-gold text-sm underline">Abhi jao</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <img src={logo} className="h-10 w-10 rounded object-cover" alt="" />
          <span className="font-serif text-xl text-gold">H.A.D.</span>
        </Link>
        <div className="rounded-xl border border-gold/20 bg-navy-light/60 p-8">
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`h-1 flex-1 rounded ${n <= step ? "bg-gold" : "bg-white/10"}`} />
            ))}
          </div>
          <h1 className="font-serif text-2xl">{["Apke details", "Payment info", "Review"][step - 1]}</h1>

          {step === 1 && (
            <div className="mt-5 space-y-4">
              <Field label="Full name" value={form.full_name} onChange={update("full_name")} />
              <Field label="Mobile" value={form.mobile} onChange={update("mobile")} />
              <Field label="City" value={form.city} onChange={update("city")} />
            </div>
          )}
          {step === 2 && (
            <div className="mt-5 space-y-4">
              <Field label="UPI ID (optional)" value={form.upi_id} onChange={update("upi_id")} placeholder="yourname@bank" />
              <Field label="Wallet (USDT TRC20, optional)" value={form.wallet_address} onChange={update("wallet_address")} placeholder="T..." />
              <Field label="Referral HAD ID (optional)" value={form.referred_by} onChange={update("referred_by")} placeholder="HAD22949" />
            </div>
          )}
          {step === 3 && (
            <div className="mt-5 space-y-3 text-sm">
              <Row k="Name" v={form.full_name} />
              <Row k="Mobile" v={form.mobile} />
              <Row k="City" v={form.city} />
              <Row k="UPI" v={form.upi_id || "—"} />
              <Row k="Wallet" v={form.wallet_address || "—"} />
              <Row k="Referrer" v={form.referred_by || "—"} />
              <p className="text-gold/80 text-xs pt-2">Submit ke baad aapka HAD ID mil jayega — wahi aapka permanent login hai.</p>
            </div>
          )}

          {err && <p className="text-sm text-red-400 mt-4">{err}</p>}

          <div className="mt-6 flex gap-3">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 rounded-md border border-gold/30 py-2.5">Back</button>}
            {step < 3 && <button onClick={() => setStep(step + 1)} className="flex-1 rounded-md bg-gold py-2.5 text-navy font-medium">Continue</button>}
            {step === 3 && <button disabled={loading} onClick={submit} className="flex-1 rounded-md bg-gold py-2.5 text-navy font-medium disabled:opacity-60">{loading ? "Creating…" : "HAD ID generate karein"}</button>}
          </div>
          <p className="text-center text-sm text-white/60 mt-4">
            Already have HAD ID? <Link to="/login" className="text-gold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-white/70">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="mt-1 w-full rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-white/5 py-2"><span className="text-white/60">{k}</span><span>{v}</span></div>;
}
