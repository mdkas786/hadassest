import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/had-logo.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — H.A.D. Asset Management" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    nav({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-navy text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <img src={logo} className="h-10 w-10 rounded object-cover" alt="" />
          <span className="font-serif text-xl text-gold">H.A.D.</span>
        </Link>
        <div className="rounded-xl border border-gold/20 bg-navy-light/60 p-8">
          <h1 className="font-serif text-3xl">Welcome back</h1>
          <p className="text-white/60 mt-1 text-sm">Sign in to your investor dashboard.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs text-white/70">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-xs text-white/70">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <button disabled={loading} className="w-full rounded-md bg-gold py-2.5 text-navy font-medium hover:brightness-110 disabled:opacity-60">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="text-sm text-white/60 mt-6 text-center">
            New here? <Link to="/register" className="text-gold">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
