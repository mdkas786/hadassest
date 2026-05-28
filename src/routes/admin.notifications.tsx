import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Admin" }] }),
  component: AdminNotifications,
});

type N = { id: string; had_id: string; title: string; body: string; notif_type: string; created_at: string };

function AdminNotifications() {
  const [rows, setRows] = useState<N[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState("ALL");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setRows((data as N[]) || []);
  }
  useEffect(() => { load(); }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setMsg(null);
    const { data: { user } } = await supabase.auth.getUser();

    let hadIds: string[] = [];
    if (target.trim().toUpperCase() === "ALL") {
      hadIds = ["ALL"];
    } else {
      hadIds = target.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const payload = hadIds.map((had_id) => ({
      had_id, title, body, notif_type: type, created_by: user?.id || null,
    }));
    const { error } = await supabase.from("notifications").insert(payload);
    setSending(false);
    if (error) { setMsg("Failed: " + error.message); return; }
    setMsg(`Sent to ${hadIds.includes("ALL") ? "all users" : hadIds.length + " user(s)"}.`);
    setTitle(""); setBody("");
    load();
  }

  return (
    <AdminShell title="Notifications">
      <div className="grid lg:grid-cols-[1fr,1.2fr] gap-6">
        <form onSubmit={send} className="rounded-xl border border-gold/20 bg-navy-light/40 p-5 space-y-3">
          <h3 className="font-serif text-lg text-gold">Broadcast</h3>
          <div>
            <label className="text-xs text-white/70">Target (HAD IDs, comma separated, or ALL)</label>
            <input value={target} onChange={(e) => setTarget(e.target.value)} required
              className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
          </div>
          <div className="grid grid-cols-[1fr,150px] gap-3">
            <div>
              <label className="text-xs text-white/70">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required
                className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-xs text-white/70">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold">
                <option value="info">Info</option><option value="success">Success</option>
                <option value="warning">Warning</option><option value="alert">Alert</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/70">Body</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={5}
              className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
          </div>
          {msg && <p className="text-sm text-gold">{msg}</p>}
          <button disabled={sending} className="w-full rounded bg-gold text-navy py-2.5 font-medium disabled:opacity-60">
            {sending ? "Sending…" : "Send"}
          </button>
        </form>

        <div>
          <h3 className="font-serif text-lg text-gold mb-3">Recent</h3>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-gold/20 bg-navy-light/30 p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-gold/15 text-gold font-mono">{r.had_id}</span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 capitalize">{r.notif_type}</span>
                  <span className="text-white/50 ml-auto">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-2 font-medium">{r.title}</div>
                <p className="text-sm text-white/70 mt-1">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
