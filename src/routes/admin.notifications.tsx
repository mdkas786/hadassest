import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Admin" }] }),
  component: AdminNotif,
});

function AdminNotif() {
  const [target, setTarget] = useState("ALL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [recent, setRecent] = useState<any[]>([]);
  async function load() { const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50); setRecent(data ?? []); }
  useEffect(() => { load(); }, []);
  async function send() {
    if (!title.trim() || !body.trim()) return toast.error("Title and body required");
    let targets: string[] = [];
    if (target.trim().toUpperCase() === "ALL") {
      const { data } = await supabase.from("users").select("had_id");
      targets = (data ?? []).map((u: any) => u.had_id);
    } else {
      targets = target.split(",").map((t) => t.trim()).filter(Boolean);
    }
    const rows = targets.map((had_id) => ({ had_id, title, body, type }));
    await supabase.from("notifications").insert(rows);
    toast.success(`Sent to ${targets.length}`); setTitle(""); setBody(""); load();
  }
  return (
    <AdminShell title="Notifications">
      <div className="bg-card border border-border rounded-lg p-5 space-y-3 mb-4">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="HAD IDs comma-separated or ALL" className="w-full bg-input border border-border rounded px-3 py-2 text-sm" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full bg-input border border-border rounded px-3 py-2 text-sm" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-input border border-border rounded px-3 py-2 text-sm"><option>info</option><option>success</option><option>warning</option><option>error</option></select>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body" className="w-full bg-input border border-border rounded px-3 py-2 text-sm min-h-24" />
        <button onClick={send} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-4 py-2 rounded font-semibold text-sm">Send</button>
      </div>
      <h2 className="font-semibold mb-2">Recent</h2>
      <div className="space-y-2">
        {recent.map((n) => (
          <div key={n.id} className="bg-card border border-border rounded p-3">
            <div className="flex gap-2 items-center text-xs"><span className="text-[var(--gold)]">{n.had_id}</span><span className="bg-secondary px-2 py-0.5 rounded">{n.type}</span><span className="text-muted-foreground ml-auto">{new Date(n.created_at).toLocaleString()}</span></div>
            <p className="font-semibold mt-1 text-sm">{n.title}</p>
            <p className="text-xs text-muted-foreground">{n.body}</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}