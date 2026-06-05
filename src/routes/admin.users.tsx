import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

type Profile = {
  id: string; had_id: string; full_name: string; email: string | null;
  mobile: string | null; city: string | null; is_active: boolean; created_at: string;
};

function AdminUsers() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState<Profile | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data as Profile[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(p: Profile) {
    await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  }

  async function doDelete(p: Profile) {
    const { error } = await supabase.rpc("admin_delete_user" as any, { _user_id: p.id });
    if (error) { toast.error(error.message); return; }
    toast.success(`User ${p.had_id} fully deleted from all areas`);
    setDel(null);
    load();
  }

  const filtered = rows.filter((r) =>
    !q || r.had_id.toLowerCase().includes(q.toLowerCase()) ||
    (r.full_name || "").toLowerCase().includes(q.toLowerCase()) ||
    (r.email || "").toLowerCase().includes(q.toLowerCase()) ||
    (r.mobile || "").includes(q)
  );

  return (
    <AdminShell title="Users">
      <div className="flex gap-3 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by HAD ID, name, email, mobile…"
          className="w-full md:w-96 rounded-md bg-navy-light border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
        <div className="text-sm text-white/60 self-center">{filtered.length} / {rows.length}</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="w-full text-sm">
          <thead className="bg-navy-light/60 text-white/70">
            <tr>
              <th className="text-left p-3">HAD ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Mobile</th>
              <th className="text-left p-3">City</th>
              <th className="text-left p-3">Joined</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="p-6 text-center text-white/60">Loading…</td></tr> :
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-gold/10">
                  <td className="p-3 font-mono text-gold">{r.had_id}</td>
                  <td className="p-3">{r.full_name || "—"}</td>
                  <td className="p-3 text-white/70">{r.mobile || "—"}</td>
                  <td className="p-3 text-white/70">{r.city || "—"}</td>
                  <td className="p-3 text-white/60">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${r.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                      {r.is_active ? "Active" : "Blocked"}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-3">
                    <button onClick={() => toggleActive(r)} className="text-xs text-gold hover:underline">
                      {r.is_active ? "Block" : "Unblock"}
                    </button>
                    <button onClick={() => setDel(r)} className="text-xs text-red-300 hover:text-red-200">Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {del && (
        <div className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-4" onClick={() => setDel(null)}>
          <div className="bg-navy-light border border-red-400/40 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl text-red-300">Permanently delete user?</h3>
            <p className="text-sm text-white/80 mt-3">
              Are you sure you want to permanently delete <span className="font-mono text-gold">{del.had_id}</span> ({del.full_name})?
            </p>
            <p className="text-xs text-white/60 mt-2">
              This removes all their investments, transactions, returns, and notifications. This action <b>cannot be undone</b>.
            </p>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setDel(null)} className="px-4 py-2 text-sm text-white/70">Cancel</button>
              <button onClick={() => doDelete(del)} className="px-4 py-2 text-sm rounded bg-red-500/80 text-white hover:bg-red-500">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
