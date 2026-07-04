import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { genHadId } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
  head: () => ({ meta: [{ title: "Register — H.A.D. Asset Management" }] }),
  component: Register,
});

function Register() {
  const { ref } = useSearch({ from: "/register" });
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", mobile: "", city: "", email: "", referred_by: ref ?? "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (ref) setForm((f) => ({ ...f, referred_by: ref })); }, [ref]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name required");
    setLoading(true);
    try {
      let hadId = genHadId();
      // ensure unique (best effort)
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.from("users").select("had_id").eq("had_id", hadId).maybeSingle();
        if (!data) break;
        hadId = genHadId();
      }
      const payload: any = {
        had_id: hadId,
        name: form.name.trim(),
        mobile: form.mobile.trim() || null,
        city: form.city.trim() || null,
        email: form.email.trim() || null,
        referred_by: form.referred_by.trim() || null,
      };
      const { error } = await supabase.from("users").insert(payload);
      if (error) throw error;
      setSuccess(hadId);
    } catch (err: any) {
      toast.error(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
          <Logo className="justify-center" />
          <p className="text-xs text-muted-foreground mt-4">Your HAD ID</p>
          <h1 className="text-4xl font-bold text-[var(--gold)] mt-2 tracking-wider">{success}</h1>
          <p className="text-destructive text-sm mt-4">⚠ Screenshot lein! Yeh HAD ID aapka login credential hai.</p>
          <button onClick={() => navigate({ to: "/login" })} className="mt-6 w-full bg-[var(--gold)] text-[var(--primary-foreground)] py-2 rounded font-semibold">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-lg p-8 max-w-md w-full space-y-4">
        <div className="text-center"><Logo className="justify-center" /></div>
        <h1 className="text-2xl font-bold text-center">Create your account</h1>
        {[
          { k: "name", l: "Full Name *", t: "text" },
          { k: "mobile", l: "Mobile Number", t: "tel" },
          { k: "city", l: "City", t: "text" },
          { k: "email", l: "Email (optional)", t: "email" },
          { k: "referred_by", l: "Referral Code (optional)", t: "text" },
        ].map((f) => (
          <div key={f.k}>
            <label className="text-xs text-muted-foreground">{f.l}</label>
            <input
              type={f.t}
              value={(form as any)[f.k]}
              onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              className="w-full bg-input border border-border rounded px-3 py-2 mt-1 text-sm"
            />
          </div>
        ))}
        <button disabled={loading} className="w-full bg-[var(--gold)] text-[var(--primary-foreground)] py-2 rounded font-semibold disabled:opacity-50">
          {loading ? "Creating..." : "Create Account"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Already have an account? <Link to="/login" className="text-[var(--gold)]">Login</Link>
        </p>
      </form>
    </div>
  );
}