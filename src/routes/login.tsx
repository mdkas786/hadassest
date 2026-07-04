import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — H.A.D. Asset Management" }] }),
  component: Login,
});

function Login() {
  const [hadId, setHadId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = hadId.trim().toUpperCase();
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("users").select("had_id, name, status").eq("had_id", id).maybeSingle();
      if (error) throw error;
      if (!data) return toast.error("HAD ID nahi mila. Pehle register karein.");
      if (data.status === "blocked") return toast.error("Account suspended. Admin se contact karein.");
      setUser({ had_id: data.had_id, name: data.name });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-lg p-8 max-w-sm w-full space-y-4">
        <div className="text-center"><Logo className="justify-center" /></div>
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <div>
          <label className="text-xs text-muted-foreground">HAD ID</label>
          <input value={hadId} onChange={(e) => setHadId(e.target.value)} placeholder="HAD12345" className="w-full bg-input border border-border rounded px-3 py-2 mt-1 text-sm uppercase" />
        </div>
        <button disabled={loading} className="w-full bg-[var(--gold)] text-[var(--primary-foreground)] py-2 rounded font-semibold disabled:opacity-50">
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          New user? <Link to="/register" className="text-[var(--gold)]">Register karein →</Link>
        </p>
      </form>
    </div>
  );
}