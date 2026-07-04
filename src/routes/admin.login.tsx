import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ADMIN_EMAIL, ADMIN_PASSWORD, setAdmin } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const navigate = useNavigate();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim() === ADMIN_EMAIL && pwd === ADMIN_PASSWORD) {
      setAdmin();
      navigate({ to: "/admin" });
    } else {
      toast.error("Invalid credentials");
    }
  }
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-card border border-border rounded-lg p-8 max-w-sm w-full space-y-4">
        <div className="text-center"><Logo className="justify-center" /></div>
        <h1 className="text-xl font-bold text-center">Admin Login</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-input border border-border rounded px-3 py-2 text-sm" />
        <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Password" className="w-full bg-input border border-border rounded px-3 py-2 text-sm" />
        <button className="w-full bg-[var(--gold)] text-[var(--primary-foreground)] py-2 rounded font-semibold">Sign in</button>
      </form>
    </div>
  );
}