import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [showHist, setShowHist] = useState(false);
  async function load() { const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false }); setRows(data ?? []); }
  useEffect(() => { load(); }, []);
  const filtered = rows.filter((r) => !q || [r.had_id, r.name, r.email, r.mobile].some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase())));
  async function toggleBlock(u: any) {
    await supabase.from("users").update({ status: u.status === "active" ? "blocked" : "active" }).eq("had_id", u.had_id);
    load();
  }
  async function del(u: any) {
    if (!confirm(`Delete ${u.name} permanently?`)) return;
    await supabase.rpc("admin_delete_user", { target_had_id: u.had_id, admin_id: "admin" });
    toast.success("User deleted"); load();
  }
  return (
    <AdminShell title="Users">
      <div className="mb-4">
        <button onClick={() => setShowHist((v) => !v)} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-4 py-2 rounded text-sm font-semibold">
          {showHist ? "Hide" : "➕ Import Historical User"}
        </button>
        {showHist && <HistoricalUserForm onDone={load} />}
      </div>
      <div className="flex gap-3 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search HAD ID, name, mobile..." className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm" />
        <span className="text-xs text-muted-foreground self-center">{filtered.length} / {rows.length}</span>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-secondary/50 text-xs text-muted-foreground"><tr><th className="text-left p-3">HAD ID</th><th className="text-left p-3">Name</th><th className="text-left p-3">Mobile</th><th className="text-left p-3">City</th><th className="text-left p-3">Joined</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th></tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.had_id} className="border-t border-border">
                <td className="p-3 text-[var(--gold)]">{u.had_id}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.mobile}</td>
                <td className="p-3">{u.city}</td>
                <td className="p-3">{formatDate(u.created_at)}</td>
                <td className="p-3"><span className={`text-xs px-2 py-1 rounded ${u.status === "active" ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-destructive/20 text-destructive"}`}>{u.status}</span></td>
                <td className="p-3"><button onClick={() => toggleBlock(u)} className="text-xs text-[var(--gold)] mr-3">{u.status === "active" ? "Block" : "Unblock"}</button><button onClick={() => del(u)} className="text-xs text-destructive">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function HistoricalUserForm({ onDone }: { onDone: () => void }) {
  const [hadId, setHadId] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [offers, setOffers] = useState<any[]>([]);
  const [slabs, setSlabs] = useState<any[]>([]);
  const [offerId, setOfferId] = useState("");
  const [slabId, setSlabId] = useState("");
  const [amount, setAmount] = useState<number>(50000);
  const [investDate, setInvestDate] = useState("");
  const [roiEarned, setRoiEarned] = useState<number>(0);
  const [sponsorEarned, setSponsorEarned] = useState<number>(0);
  const [partnerEarned, setPartnerEarned] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (supabase as any).from("special_offers").select("id,title,name").order("created_at", { ascending: false }).then(({ data }: any) => setOffers(data ?? []));
  }, []);
  useEffect(() => {
    if (!offerId) { setSlabs([]); setSlabId(""); return; }
    (supabase as any).from("special_offer_slabs").select("*").eq("offer_id", offerId).order("sort_order").then(({ data }: any) => setSlabs(data ?? []));
  }, [offerId]);

  async function submit() {
    if (!hadId.trim() || !name.trim()) return toast.error("HAD ID and Name required");
    setBusy(true);
    try {
      // 1. Create or upsert user (preserve custom created_at)
      const userRow: any = {
        had_id: hadId.trim(), name: name.trim(),
        mobile: mobile.trim() || null, city: city.trim() || null, email: email.trim() || null,
        referred_by: sponsor.trim() || null, status: "active",
      };
      if (joinDate) userRow.created_at = new Date(joinDate).toISOString();
      const { error: uErr } = await supabase.from("users").upsert(userRow, { onConflict: "had_id" });
      if (uErr) throw uErr;

      // 2. Create historical investment if amount provided
      if (amount > 0) {
        const slab = slabs.find((s) => s.id === slabId);
        const offer = offers.find((o) => o.id === offerId);
        const baseInv: any = {
          had_id: hadId.trim(), amount_invested: amount,
          total_income_received: roiEarned || 0,
          status: "active",
        };
        if (investDate) {
          baseInv.start_date = investDate;
          baseInv.created_at = new Date(investDate).toISOString();
        }
        if (slab && offer) {
          const amt = Number(slab.investment_amount);
          const monthly = Number(slab.monthly_profit);
          const rate = amt > 0 ? Number(((monthly / amt) * 100).toFixed(4)) : 0;
          baseInv.plan_name = `${offer.title} · ${slab.slab_label ?? "Plan"}`;
          baseInv.plan_rate = rate;
          baseInv.is_special = true;
          baseInv.offer_id = offer.id;
          baseInv.slab_id = slab.id;
          baseInv.monthly_roi = monthly;
          baseInv.duration_months = Number(slab.duration_months);
          baseInv.total_return = Number(slab.total_return);
          baseInv.amount_invested = amt;
        } else {
          const { getPlan } = await import("@/lib/format");
          const plan = getPlan(amount);
          baseInv.plan_name = plan.name;
          baseInv.plan_rate = plan.rate;
          baseInv.is_special = false;
        }
        const { error: iErr } = await supabase.from("investments").insert(baseInv);
        if (iErr) throw iErr;
      }

      // 3. Optional historical sponsor / partner income lines (status=paid, preserves history)
      const incomeRows: any[] = [];
      if (sponsorEarned > 0) incomeRows.push({
        earner_had_id: hadId.trim(), type: "referral", percentage: 5,
        base_amount: sponsorEarned * 20, income_amount: sponsorEarned, status: "paid",
        paid_at: investDate ? new Date(investDate).toISOString() : new Date().toISOString(),
      });
      if (partnerEarned > 0) incomeRows.push({
        earner_had_id: hadId.trim(), type: "level", percentage: 10,
        base_amount: partnerEarned * 10, income_amount: partnerEarned, status: "paid",
        paid_at: investDate ? new Date(investDate).toISOString() : new Date().toISOString(),
      });
      if (incomeRows.length) await supabase.from("sponsor_income").insert(incomeRows);

      toast.success("Historical user imported");
      setHadId(""); setName(""); setMobile(""); setCity(""); setEmail(""); setSponsor("");
      setJoinDate(""); setInvestDate(""); setAmount(50000); setRoiEarned(0); setSponsorEarned(0); setPartnerEarned(0);
      setOfferId(""); setSlabId("");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 bg-card border border-[var(--gold)]/40 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--gold)]">Historical User Import</h3>
      <p className="text-[11px] text-muted-foreground">Use this to backfill old users with their original join date, investment, offer assignment, and pre-earned income. Imported values are preserved as-is.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <input value={hadId} onChange={(e) => setHadId(e.target.value)} placeholder="HAD ID *" className="bg-input border border-border rounded px-3 py-2" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name *" className="bg-input border border-border rounded px-3 py-2" />
        <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" className="bg-input border border-border rounded px-3 py-2" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-input border border-border rounded px-3 py-2" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="bg-input border border-border rounded px-3 py-2" />
        <input value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="Sponsor HAD ID (optional)" className="bg-input border border-border rounded px-3 py-2" />
        <label className="flex flex-col gap-1"><span className="text-muted-foreground">Join date</span>
          <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="bg-input border border-border rounded px-3 py-2" />
        </label>
      </div>
      <div className="border-t border-border pt-3">
        <h4 className="text-xs font-semibold mb-2 text-[var(--gold)]">Historical Investment (optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">Investment date</span>
            <input type="date" value={investDate} onChange={(e) => setInvestDate(e.target.value)} className="bg-input border border-border rounded px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">Amount (₹)</span>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="bg-input border border-border rounded px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">ROI already earned (₹)</span>
            <input type="number" value={roiEarned} onChange={(e) => setRoiEarned(Number(e.target.value))} className="bg-input border border-border rounded px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">Assign Special Offer (optional)</span>
            <select value={offerId} onChange={(e) => setOfferId(e.target.value)} className="bg-input border border-border rounded px-3 py-2">
              <option value="">— Regular slab (Starter/Growth/Fortune by amount) —</option>
              {offers.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
          {offerId && (
            <label className="flex flex-col gap-1"><span className="text-muted-foreground">Slab</span>
              <select value={slabId} onChange={(e) => setSlabId(e.target.value)} className="bg-input border border-border rounded px-3 py-2">
                <option value="">Select slab</option>
                {slabs.map((s) => <option key={s.id} value={s.id}>{s.slab_label || "Plan"} — ₹{Number(s.investment_amount).toLocaleString("en-IN")}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>
      <div className="border-t border-border pt-3">
        <h4 className="text-xs font-semibold mb-2 text-[var(--gold)]">Pre-earned Income (optional, marked PAID, not recalculated)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">Sponsor income already earned (₹)</span>
            <input type="number" value={sponsorEarned} onChange={(e) => setSponsorEarned(Number(e.target.value))} className="bg-input border border-border rounded px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">Partner income already earned (₹)</span>
            <input type="number" value={partnerEarned} onChange={(e) => setPartnerEarned(Number(e.target.value))} className="bg-input border border-border rounded px-3 py-2" />
          </label>
        </div>
      </div>
      <button disabled={busy} onClick={submit} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-4 py-2 rounded font-semibold text-sm disabled:opacity-50">
        {busy ? "Importing..." : "Import Historical Record"}
      </button>
    </div>
  );
}