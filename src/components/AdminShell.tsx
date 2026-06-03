import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/investments", label: "Investments" },
  { to: "/admin/payments", label: "Payment Verification" },
  { to: "/admin/income", label: "Income Management" },
  { to: "/admin/trading", label: "Trading Control" },
  { to: "/admin/notifications", label: "Notifications" },
  { to: "/admin/wallets", label: "Wallets" },
  { to: "/admin/settings", label: "App Settings" },
  { to: "/admin/ai", label: "🤖 Premium AI Tools" },
];

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/admin/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!(roles || []).some((r) => r.role === "admin")) { navigate({ to: "/admin/login" }); return; }
      setOk(true);
    })();
  }, [navigate]);

  if (!ok) return <div className="min-h-screen bg-navy text-white grid place-items-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-navy text-white flex">
      <aside className="w-60 shrink-0 border-r border-gold/20 bg-navy-light/40 p-4 hidden md:block">
        <div className="font-serif text-lg text-gold mb-6">H.A.D. Admin</div>
        <nav className="space-y-1">
          {nav.map((n) => {
            const active = path === n.to || (n.to !== "/admin" && path.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to} className={`block rounded px-3 py-2 text-sm ${active ? "bg-gold/10 text-gold" : "text-white/70 hover:bg-white/5"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/admin/login" }); }}
          className="mt-8 w-full text-left text-xs text-white/50 hover:text-gold px-3 py-2"
        >Logout</button>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-gold/20 flex items-center px-6 justify-between">
          <h1 className="font-serif text-xl text-gold">{title}</h1>
          <Link to="/" className="text-xs text-white/60 hover:text-gold">View site →</Link>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
