import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: AdminSettings,
});

const KEYS = [
  "maintenance_mode", "maintenance_message", "announcement_banner",
  "min_investment", "support_email", "support_whatsapp",
  "starter_rate", "growth_rate", "fortune_rate", "referral_percent", "level_percent",
  "payment_verification_mode",
];

function AdminSettings() {
  const [cfg, setCfg] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("config").select("*").then(({ data }) => {
      setCfg(Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value ?? ""])));
    });
  }, []);
  async function save() {
    const rows = KEYS.map((k) => ({ key: k, value: cfg[k] ?? "" }));
    await supabase.from("config").upsert(rows);
    toast.success("Saved");
  }
  return (
    <AdminShell title="App Settings">
      <div className="max-w-2xl space-y-3">
        {KEYS.map((k) => (
          <div key={k}>
            <label className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</label>
            <input value={cfg[k] ?? ""} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} className="w-full bg-input border border-border rounded px-3 py-2 mt-1 text-sm" />
          </div>
        ))}
        <button onClick={save} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-5 py-2 rounded font-semibold text-sm">Save settings</button>
      </div>
    </AdminShell>
  );
}