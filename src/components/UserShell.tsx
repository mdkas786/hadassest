import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { CryptoTicker } from "./CryptoTicker";
import { clearUser, getUser, touchUser } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function UserShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const [user, setLocalUser] = useState<{ had_id: string; name: string } | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setLocalUser(u);
    // activity tracking
    const onActivity = () => touchUser();
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    const tick = setInterval(() => {
      const cur = getUser();
      if (!cur) return;
      if (Date.now() - cur.last_activity > 10 * 60 * 1000) {
        clearUser();
        toast.error("Session expired");
        navigate({ to: "/login" });
      }
    }, 30000);
    return () => {
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
      clearInterval(tick);
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadUnread() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("had_id", user!.had_id)
        .eq("is_read", false);
      if (!cancelled) setUnread(count ?? 0);
    }
    loadUnread();
    const channel = supabase
      .channel("notif-" + user.had_id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `had_id=eq.${user.had_id}` },
        (payload: any) => {
          toast.success(payload.new.title, { description: payload.new.body });
          setUnread((u) => u + 1);
          setItems((arr) => [payload.new, ...arr].slice(0, 30));
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function openPanel() {
    if (!user) return;
    setOpen((v) => !v);
    if (open) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("had_id", user.had_id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data ?? []);
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("had_id", user.had_id).eq("is_read", false);
    setUnread(0);
    setItems((arr) => arr.map((n) => ({ ...n, is_read: true })));
  }

  async function markOne(n: any) {
    if (n.is_read) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    setUnread((u) => Math.max(0, u - 1));
    setItems((arr) => arr.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
  }

  if (!user) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/dashboard"><Logo /></Link>
          <div className="hidden md:block flex-1"><CryptoTicker /></div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="relative" ref={popRef}>
              <button onClick={openPanel} className="relative" title="Notifications" aria-label="Notifications">
                <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>
                )}
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-[min(92vw,360px)] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-lg shadow-2xl z-50 animate-fade-in">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 bg-card">
                    <span className="text-sm font-semibold text-[var(--gold)]">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-[var(--gold)] hover:underline">Mark all read</button>
                    )}
                  </div>
                  {items.length === 0 ? (
                    <p className="p-6 text-xs text-center text-muted-foreground">No notifications yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {items.map((n) => (
                        <li key={n.id} onClick={() => markOne(n)} className={`p-3 text-xs cursor-pointer hover:bg-secondary/40 ${!n.is_read ? "bg-[var(--gold)]/5" : ""}`}>
                          <div className="flex items-start gap-2">
                            {!n.is_read && <span className="mt-1 w-2 h-2 rounded-full bg-[var(--gold)] shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground">{n.title}</p>
                              {n.body && <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</p>}
                              <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs bg-secondary px-2 py-1 rounded text-[var(--gold)]">{user.had_id}</span>
            <button
              onClick={() => { clearUser(); router.invalidate(); navigate({ to: "/login" }); }}
              className="text-muted-foreground hover:text-foreground"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 pb-2 flex gap-4 text-sm overflow-x-auto">
          {[
            { to: "/dashboard", label: "Dashboard" },
            { to: "/pay", label: "Pay" },
            { to: "/special-offers", label: "🔥 Offers" },
            { to: "/referral", label: "Referral" },
            { to: "/income", label: "Income" },
            { to: "/profile", label: "Profile" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground hover:text-[var(--gold)] [&.active]:text-[var(--gold)] [&.active]:font-semibold"
              activeProps={{ className: "active" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}