import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HAD_ID_RE, hadEmail, hadPassword, normalizeHadId } from "@/lib/hadAuth";
import logo from "@/assets/had-logo.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — H.A.D. Asset Management" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [hadId, setHadId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const id = normalizeHadId(hadId);
    if (!HAD_ID_RE.test(id)) {
      setErr("HAD ID format: HAD ke baad 4-5 digits (e.g. HAD22949)");
      return;
    }
    setLoading(true);
    // Quick existence check (gives nicer error than generic auth failure)
    const { data: chk } = await supabase.rpc("check_had_id", { p_had_id: id });
    const exists = Array.isArray(chk) ? chk[0]?.exists_active : (chk as any)?.exists_active;
    if (!exists) {
      setLoading(false);
      setErr("Yeh HAD ID register nahi hai ya block hai.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: hadEmail(id),
      password: hadPassword(id),
    });
    setLoading(false);
    if (error) { setErr("Login fail — admin se contact karein."); return; }
    nav({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-navy text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 justify-center mb-8">
          <img src={logo} className="h-16 w-16 rounded object-cover ring-2 ring-gold/40" alt="" />
          <span className="font-serif text-xl text-gold">H.A.D.</span>
        </Link>
        <div className="rounded-xl border border-gold/30 bg-navy-light/60 p-8">
          <h1 className="font-serif text-3xl text-gold text-center">Apna HAD ID Enter Karein</h1>
          <p className="text-white/60 text-sm text-center mt-2">Sirf HAD ID — koi password nahi.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              autoFocus
              required
              value={hadId}
              onChange={(e) => setHadId(e.target.value.toUpperCase())}
              placeholder="HAD22949"
              maxLength={8}
              className="w-full text-center tracking-[0.4em] font-mono text-2xl rounded-md bg-navy border-2 border-gold/30 px-3 py-4 outline-none focus:border-gold uppercase"
            />
            {err && <p className="text-sm text-red-400 text-center">{err}</p>}
            <button disabled={loading} className="w-full rounded-md bg-gold py-3 text-navy font-semibold hover:brightness-110 disabled:opacity-60">
              {loading ? "Verify ho raha hai…" : "Login Karein"}
            </button>
          </form>
          <p className="text-sm text-white/60 mt-6 text-center">
            Pehli baar? <Link to="/register" className="text-gold underline">Register karein</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
