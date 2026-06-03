import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LineChart, CreditCard, Users, User } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/markets", label: "Markets", icon: LineChart },
  { to: "/pay", label: "Pay", icon: CreditCard },
  { to: "/referral", label: "Refer", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/admin") || path === "/" || path === "/login" || path === "/register") return null;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-light/95 backdrop-blur border-t border-gold/20">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] ${active ? "text-gold" : "text-white/60"}`}>
              <Icon className="h-5 w-5" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
