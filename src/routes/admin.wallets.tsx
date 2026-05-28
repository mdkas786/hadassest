import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/wallets")({
  head: () => ({ meta: [{ title: "Wallets — Admin" }] }),
  component: AdminWallets,
});

// Stored in app_settings as keys
const FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "upi_id", label: "UPI ID", placeholder: "hadinvest@upi" },
  { key: "upi_name", label: "UPI Display name", placeholder: "H.A.D. Asset Management" },
  { key: "wallet_btc", label: "BTC address", placeholder: "bc1q…" },
  { key: "wallet_usdt_trc20", label: "USDT (TRC20)", placeholder: "T…" },
  { key: "wallet_usdt_erc20", label: "USDT (ERC20)", placeholder: "0x…" },
  { key: "wallet_eth", label: "ETH address", placeholder: "0x…" },
];

function AdminWallets() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("key,value").in("key", FIELDS.map((f) => f.key));
    const v: Record<string, string> = {};
    (data || []).forEach((r) => { v[r.key] = r.value || ""; });
    setVals(v);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    const rows = FIELDS.map((f) => ({ key: f.key, value: vals[f.key] || "", updated_by: user?.id || null, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    setMsg(error ? "Failed: " + error.message : "Saved.");
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <AdminShell title="Wallets & UPI">
      <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-6 max-w-3xl">
        <p className="text-sm text-white/70 mb-5">These addresses appear on the user Pay page (QR codes + copy buttons).</p>
        {loading ? <div className="text-white/60">Loading…</div> :
          <div className="grid md:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.key === "upi_id" || f.key === "upi_name" ? "" : "md:col-span-2"}>
                <label className="text-xs text-white/70">{f.label}</label>
                <input value={vals[f.key] || ""} placeholder={f.placeholder} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                  className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold font-mono text-sm" />
              </div>
            ))}
          </div>
        }
        <div className="flex items-center gap-3 mt-6">
          <button onClick={save} className="px-5 py-2 rounded bg-gold text-navy font-medium">Save changes</button>
          {msg && <span className="text-sm text-gold">{msg}</span>}
        </div>
      </div>
    </AdminShell>
  );
}
