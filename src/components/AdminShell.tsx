import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearAdmin, isAdmin } from "@/lib/session";

const NAV = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/investments", label: "Investments" },
  { to: "/admin/payment-verification", label: "Payment Verification" },
  { to: "/admin/income", label: "Income Management" },
  { to: "/admin/trading", label: "Trading Control" },
  { to: "/admin/special-offers", label: "Special Offers" },
  { to: "/admin/notifications", label: "Notifications" },
  { to: "/admin/wallets", label: "Wallets" },
  { to: "/admin/settings", label: "App Settings" },
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAdmin()) navigate({ to: "/admin/login" });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 bg-card/60 border-r border-border min-h-screen p-4 flex flex-col">
        <div className="text-[var(--gold)] font-semibold mb-6">H.A.D. Admin</div>
        <nav className="flex flex-col gap-1 text-sm flex-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/admin" }}
              className="px-3 py-2 rounded text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-[var(--gold)]"
              activeProps={{ className: "active" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          className="text-left text-sm text-muted-foreground hover:text-destructive px-3 py-2"
          onClick={() => { clearAdmin(); navigate({ to: "/admin/login" }); }}
        >Logout</button>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/40">
          <h1 className="text-[var(--gold)] text-lg font-semibold">{title}</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">View site →</Link>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}