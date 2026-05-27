import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — H.A.D." }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/login" }); return; }
      const { data: p } = await supabase.from("profiles").select("had_id").eq("id", user.id).maybeSingle();
      const hadId = (p as any)?.had_id;
      if (!hadId) return;
      const { data } = await supabase.from("notifications").select("*")
        .or(`had_id.eq.${hadId},had_id.eq.ALL`).order("created_at", { ascending: false }).limit(50);
      setItems(data || []);
      // mark unread as read
      const unreadIds = (data || []).filter((n: any) => !n.read_at).map((n: any) => n.id);
      if (unreadIds.length) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    })();
  }, [nav]);

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gold/20 bg-navy-light/40">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-white/70 hover:text-gold">← Dashboard</Link>
          <Link to="/" className="font-serif text-xl text-gold">H.A.D.</Link><span />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-serif text-3xl mb-6">Notifications</h1>
        <div className="space-y-3">
          {items.length === 0 && <p className="text-white/60 text-sm">No notifications yet.</p>}
          {items.map((n) => (
            <div key={n.id} className="rounded-xl border border-gold/20 bg-navy-light/30 p-5">
              <div className="flex items-center justify-between">
                <p className="font-serif text-lg text-gold">{n.title}</p>
                <span className="text-xs text-white/50">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-white/80 mt-1">{n.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
