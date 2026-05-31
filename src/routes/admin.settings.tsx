import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "App Settings — Admin" }] }),
  component: AdminSettings,
});

const FIELDS: { key: string; label: string; help?: string; type?: "text" | "textarea" | "toggle" }[] = [
  { key: "maintenance_mode", label: "Maintenance mode", type: "toggle", help: "When ON, web + Android show a maintenance screen." },
  { key: "maintenance_message", label: "Maintenance message", type: "textarea" },
  { key: "announcement_banner", label: "Announcement banner", type: "textarea", help: "Amber banner shown on both platforms." },
  { key: "min_investment", label: "Minimum investment (₹)" },
  { key: "support_email", label: "Support email" },
  { key: "support_whatsapp", label: "Support WhatsApp (with country code)" },
  { key: "admin_upi", label: "Admin UPI ID (for receiving payments)" },
  { key: "company_btc_wallet", label: "Company BTC wallet" },
  { key: "company_eth_wallet", label: "Company ETH wallet" },
  { key: "company_usdt_trc20", label: "Company USDT (TRC20)" },
  { key: "company_usdt_erc20", label: "Company USDT (ERC20)" },
  { key: "company_bnb_wallet", label: "Company BNB wallet" },
  { key: "starter_rate", label: "Starter plan rate %", help: "Default 5" },
  { key: "growth_rate", label: "Growth plan rate %", help: "Default 6" },
  { key: "fortune_rate", label: "Fortune plan rate %", help: "Default 7" },
  { key: "starter_max_amount", label: "Starter max amount ₹", help: "Default 499999" },
  { key: "growth_max_amount", label: "Growth max amount ₹", help: "Default 999999" },
  { key: "referral_bonus_percent", label: "Referral bonus %" },
  { key: "android_min_version", label: "Android min version", help: "Force-upgrade older app builds." },
];

function AdminSettings() {
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
    const rows = FIELDS.map((f) => ({ key: f.key, value: vals[f.key] ?? "", updated_by: user?.id || null, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    setMsg(error ? "Failed: " + error.message : "Settings saved.");
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <AdminShell title="App Settings">
      <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-6 max-w-3xl">
        {loading ? <div className="text-white/60">Loading…</div> :
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm text-white/80 flex items-center gap-3">
                  {f.type === "toggle" ? (
                    <>
                      <input type="checkbox" checked={vals[f.key] === "true"}
                        onChange={(e) => setVals({ ...vals, [f.key]: e.target.checked ? "true" : "false" })} />
                      <span>{f.label}</span>
                    </>
                  ) : <span>{f.label}</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea rows={3} value={vals[f.key] || ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                    className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
                ) : f.type === "toggle" ? null : (
                  <input value={vals[f.key] || ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                    className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
                )}
                {f.help && <p className="text-xs text-white/50 mt-1">{f.help}</p>}
              </div>
            ))}
          </div>
        }
        <div className="flex items-center gap-3 mt-6">
          <button onClick={save} className="px-5 py-2 rounded bg-gold text-navy font-medium">Save settings</button>
          {msg && <span className="text-sm text-gold">{msg}</span>}
        </div>
      </div>
    </AdminShell>
  );
}
