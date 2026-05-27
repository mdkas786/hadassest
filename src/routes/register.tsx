import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/had-logo.jpg";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — H.A.D. Asset Management" }] }),
  component: RegisterPage,
});

type Form = {
  full_name: string; mobile: string; city: string; email: string; password: string;
  wallet_address: string; upi_id: string; referred_by: string;
};

function RegisterPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>({
    full_name: "", mobile: "", city: "", email: "", password: "",
    wallet_address: "", upi_id: "", referred_by: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ had_id?: string } | null>(null);

  const update = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    setErr(null); setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: form.full_name,
          mobile: form.mobile,
          city: form.city,
          upi_id: form.upi_id,
          wallet_address: form.wallet_address,
          referred_by: form.referred_by || null,
        },
      },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    // Try to fetch HAD ID
    if (data.user) {
      const { data: p } = await supabase.from("profiles").select("had_id").eq("id", data.user.id).maybeSingle();
      setDone({ had_id: p?.had_id });
    } else {
      setDone({});
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-navy text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-xl border border-gold/30 bg-navy-light/60 p-8 text-center">
          <img src={logo} className="h-14 w-14 mx-auto rounded object-cover" alt="" />
          <h1 className="font-serif text-3xl mt-4">Welcome to H.A.D.</h1>
          {done.had_id && (
            <>
              <p className="text-white/70 mt-2 text-sm">Your investor ID</p>
              <p className="font-serif text-4xl text-gold mt-1">{done.had_id}</p>
            </>
          )}
          <p className="text-white/60 text-sm mt-4">
            Check your email to verify your account, then sign in.
          </p>
          <button onClick={() => nav({ to: "/login" })} className="mt-6 w-full rounded-md bg-gold py-2.5 text-navy font-medium">Go to Login</button>
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
          <h1 className="font-serif text-2xl">{["Your details", "Payment info", "Review"][step - 1]}</h1>

          {step === 1 && (
            <div className="mt-5 space-y-4">
              <Field label="Full name" value={form.full_name} onChange={update("full_name")} />
              <Field label="Mobile" value={form.mobile} onChange={update("mobile")} />
              <Field label="City" value={form.city} onChange={update("city")} />
              <Field label="Email" type="email" value={form.email} onChange={update("email")} />
              <Field label="Password (min 8)" type="password" value={form.password} onChange={update("password")} />
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 space-y-4">
              <Field label="UPI ID" value={form.upi_id} onChange={update("upi_id")} placeholder="yourname@bank" />
              <Field label="Blockchain wallet (USDT TRC20)" value={form.wallet_address} onChange={update("wallet_address")} placeholder="T..." />
              <Field label="Referral code (optional)" value={form.referred_by} onChange={update("referred_by")} />
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 space-y-3 text-sm">
              <Row k="Name" v={form.full_name} />
              <Row k="Mobile" v={form.mobile} />
              <Row k="City" v={form.city} />
              <Row k="Email" v={form.email} />
              <Row k="UPI" v={form.upi_id || "—"} />
              <Row k="Wallet" v={form.wallet_address || "—"} />
              <Row k="Referrer" v={form.referred_by || "—"} />
            </div>
          )}

          {err && <p className="text-sm text-red-400 mt-4">{err}</p>}

          <div className="mt-6 flex gap-3">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 rounded-md border border-gold/30 py-2.5">Back</button>}
            {step < 3 && <button onClick={() => setStep(step + 1)} className="flex-1 rounded-md bg-gold py-2.5 text-navy font-medium">Continue</button>}
            {step === 3 && <button disabled={loading} onClick={submit} className="flex-1 rounded-md bg-gold py-2.5 text-navy font-medium disabled:opacity-60">{loading ? "Creating…" : "Create account"}</button>}
          </div>
          <p className="text-center text-sm text-white/60 mt-4">
            Already registered? <Link to="/login" className="text-gold">Sign in</Link>
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
