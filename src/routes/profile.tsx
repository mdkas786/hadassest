import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserShell } from "@/components/UserShell";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — H.A.D." }] }),
  component: Profile,
});

function Profile() {
  const u = typeof window !== "undefined" ? getUser() : null;
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!u) return;
    supabase.from("users").select("*").eq("had_id", u.had_id).single().then(({ data }) => setForm(data ?? {}));
  }, [u?.had_id]);
  async function save() {
    const { error } = await supabase.from("users").update({
      mobile: form.mobile, city: form.city, upi_id: form.upi_id, trc20_wallet: form.trc20_wallet, bep20_wallet: form.bep20_wallet,
    }).eq("had_id", u!.had_id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }
  return (
    <UserShell>
      <h1 className="text-2xl font-bold mb-1">{form?.name}</h1>
      <p className="text-xs text-muted-foreground mb-6">HAD ID: {u?.had_id}</p>
      <div className="space-y-4 max-w-xl">
        {[
          { k: "mobile", l: "Mobile" }, { k: "city", l: "City" },
          { k: "upi_id", l: "Mera UPI (receive returns)" },
          { k: "trc20_wallet", l: "TRC20 wallet" }, { k: "bep20_wallet", l: "BEP20 wallet" },
        ].map((f) => (
          <div key={f.k}>
            <label className="text-xs text-muted-foreground">{f.l}</label>
            <input value={form?.[f.k] ?? ""} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className="w-full bg-input border border-border rounded px-3 py-2 mt-1 text-sm" />
          </div>
        ))}
        <button onClick={save} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-5 py-2 rounded font-semibold text-sm">Save changes</button>
      </div>
    </UserShell>
  );
}