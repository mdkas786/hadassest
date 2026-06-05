import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/had-logo.jpg";
import { checkAdminRole, normalizeAdminEmail } from "@/lib/adminAuth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin — H.A.D." }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    const safeEmail = normalizeAdminEmail(email);

    // Rate limit
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("login_attempts")
      .select("id, success")
      .eq("identifier", safeEmail)
      .gte("attempted_at", since)
      .order("attempted_at", { ascending: false })
      .limit(5);
    const fails = (recent || []).filter((r) => !r.success).length;
    if (fails >= 3) {
      setLoading(false);
      setErr("Too many failed attempts. Locked for 10 minutes.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: safeEmail, password });
    if (error || !data.user) {
      await supabase.from("login_attempts").insert({ identifier: safeEmail, success: false });
      setLoading(false);
      setErr("Access Denied. Unauthorized.");
      return;
    }
    const isAdmin = await checkAdminRole(data.user.id);
    if (!isAdmin) {
      await supabase.auth.signOut();
      await supabase.from("login_attempts").insert({ identifier: safeEmail, success: false });
      setLoading(false);
      setErr("Access Denied. Unauthorized.");
      return;
    }
    await supabase.from("login_attempts").insert({ identifier: safeEmail, success: true });
    setLoading(false);
    nav({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-navy text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <img src={logo} className="h-10 w-10 rounded object-cover" alt="" />
          <span className="font-serif text-xl text-gold">H.A.D. Admin</span>
        </Link>
        <div className="rounded-xl border border-gold/30 bg-navy-light/60 p-8">
          <h1 className="font-serif text-2xl">Restricted access</h1>
          <p className="text-white/60 mt-1 text-sm">Administrator credentials only.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs text-white/70">Admin email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-xs text-white/70">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <button disabled={loading} className="w-full rounded-md bg-gold py-2.5 text-navy font-medium disabled:opacity-60">
              {loading ? "Verifying…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
