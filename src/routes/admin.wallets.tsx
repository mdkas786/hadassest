import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wallets")({
  head: () => ({ meta: [{ title: "Wallets — Admin" }] }),
  component: AdminWallets,
});

type Wallet = {
  id?: string; wallet_type: "upi" | "usdt_trc20" | "usdt_bep20";
  wallet_address: string; wallet_label: string; display_order: number; is_active: boolean;
};

const SECTIONS: { type: Wallet["wallet_type"]; title: string; hint: string; placeholder: string; labelPh: string }[] = [
  { type: "upi", title: "Company UPI IDs", hint: "Add up to 3 UPI IDs. All active ones show to users.", placeholder: "yourname@bank", labelPh: "Display name (e.g. Faizan Khan)" },
  { type: "usdt_trc20", title: "USDT TRC20 Addresses", hint: "Only TRC20 addresses here. Up to 3.", placeholder: "T...", labelPh: "Label (e.g. Main USDT Wallet)" },
  { type: "usdt_bep20", title: "USDT BEP20 (BSC) Addresses", hint: "Only BEP20/BSC addresses. Up to 3.", placeholder: "0x...", labelPh: "Label" },
];

function AdminWallets() {
  const [all, setAll] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("app_wallets").select("*").order("wallet_type").order("display_order");
    setAll(((data as any) || []) as Wallet[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function byType(t: Wallet["wallet_type"]) { return all.filter((w) => w.wallet_type === t); }

  function add(t: Wallet["wallet_type"]) {
    const existing = byType(t);
    if (existing.length >= 3) return toast.error("Max 3 entries");
    setAll([...all, { wallet_type: t, wallet_address: "", wallet_label: "", display_order: existing.length + 1, is_active: true }]);
  }

  function update(idx: number, patch: Partial<Wallet>) {
    setAll(all.map((w, i) => i === idx ? { ...w, ...patch } : w));
  }

  async function remove(idx: number) {
    const w = all[idx];
    if (w.id) {
      if (!confirm("Delete this wallet?")) return;
      await supabase.from("app_wallets").delete().eq("id", w.id);
    }
    setAll(all.filter((_, i) => i !== idx));
    toast.success("Removed");
  }

  async function saveAll() {
    let ok = 0, err = 0;
    for (const w of all) {
      if (!w.wallet_address.trim()) continue;
      const payload: any = {
        wallet_type: w.wallet_type, wallet_address: w.wallet_address.trim(),
        wallet_label: w.wallet_label || "", display_order: w.display_order, is_active: w.is_active,
      };
      const res = w.id
        ? await supabase.from("app_wallets").update(payload).eq("id", w.id)
        : await supabase.from("app_wallets").insert(payload);
      if (res.error) err++; else ok++;
    }
    toast.success(`Saved ${ok}${err ? `, ${err} failed` : ""}`);
    load();
  }

  return (
    <AdminShell title="Wallets & UPI">
      {loading ? <div className="text-white/60">Loading…</div> : (
        <div className="space-y-8 max-w-4xl">
          {SECTIONS.map((s) => {
            const items = byType(s.type);
            return (
              <section key={s.type} className="rounded-xl border border-gold/20 bg-navy-light/40 p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-serif text-xl text-gold">{s.title}</h2>
                  {items.length < 3 && (
                    <button onClick={() => add(s.type)} className="text-xs px-3 py-1.5 rounded border border-gold/40 text-gold hover:bg-gold/10">+ Add</button>
                  )}
                </div>
                <p className="text-xs text-white/60 mb-4">{s.hint}</p>
                {items.length === 0 && <div className="text-sm text-white/50 italic">No entries yet.</div>}
                <div className="space-y-3">
                  {all.map((w, i) => w.wallet_type !== s.type ? null : (
                    <div key={i} className="grid md:grid-cols-[1fr,1fr,auto,auto] gap-2 items-center">
                      <input value={w.wallet_address} onChange={(e) => update(i, { wallet_address: e.target.value })}
                        placeholder={s.placeholder} className="rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold font-mono text-sm" />
                      <input value={w.wallet_label} onChange={(e) => update(i, { wallet_label: e.target.value })}
                        placeholder={s.labelPh} className="rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold text-sm" />
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={w.is_active} onChange={(e) => update(i, { is_active: e.target.checked })} />
                        Active
                      </label>
                      <button onClick={() => remove(i)} className="text-red-300 hover:text-red-200 text-xs px-2">Delete</button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
          <button onClick={saveAll} className="px-6 py-2.5 rounded bg-gold text-navy font-medium">Save All Changes</button>
        </div>
      )}
    </AdminShell>
  );
}
