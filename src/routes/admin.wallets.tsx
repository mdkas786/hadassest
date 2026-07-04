import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wallets")({
  head: () => ({ meta: [{ title: "Wallets — Admin" }] }),
  component: AdminWallets,
});

function AdminWallets() {
  const [rows, setRows] = useState<any[]>([]);
  const [type, setType] = useState("UPI");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  async function load() { const { data } = await supabase.from("wallets").select("*").order("created_at"); setRows(data ?? []); }
  useEffect(() => { load(); }, []);
  async function add() {
    if (!address.trim()) return;
    await supabase.from("wallets").insert({ type, address: address.trim(), label: label.trim() || null });
    setAddress(""); setLabel(""); load();
  }
  async function toggle(w: any) { await supabase.from("wallets").update({ is_active: !w.is_active }).eq("id", w.id); load(); }
  async function del(w: any) { await supabase.from("wallets").delete().eq("id", w.id); load(); }
  return (
    <AdminShell title="Wallets">
      <div className="bg-card border border-border rounded-lg p-5 mb-4 space-y-3">
        <h2 className="font-semibold">Add Wallet</h2>
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-input border border-border rounded px-3 py-2 text-sm">
          <option>UPI</option><option>TRC20</option><option>BEP20</option><option>BTC</option><option>ETH</option>
        </select>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address / UPI ID" className="w-full bg-input border border-border rounded px-3 py-2 text-sm" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (holder name)" className="w-full bg-input border border-border rounded px-3 py-2 text-sm" />
        <button onClick={add} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-4 py-2 rounded font-semibold text-sm">Add</button>
      </div>
      <div className="space-y-2">
        {rows.map((w) => (
          <div key={w.id} className="bg-card border border-border rounded p-3 flex items-center gap-3">
            <span className="text-xs bg-secondary px-2 py-1 rounded">{w.type}</span>
            <span className="text-sm font-mono flex-1 break-all">{w.address}</span>
            <span className="text-xs text-muted-foreground">{w.label}</span>
            <button onClick={() => toggle(w)} className="text-xs text-[var(--gold)]">{w.is_active ? "Active" : "Inactive"}</button>
            <button onClick={() => { if (confirm("Delete?")) del(w); }} className="text-xs text-destructive">Delete</button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}