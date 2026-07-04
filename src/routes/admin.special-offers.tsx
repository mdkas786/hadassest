import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/special-offers")({
  head: () => ({ meta: [{ title: "Special Offers — Admin" }] }),
  component: AdminSpecialOffers,
});

function AdminSpecialOffers() {
  const [offers, setOffers] = useState<any[]>([]);
  const [slabs, setSlabs] = useState<Record<string, any[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  // new offer form
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const okTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!okTypes.includes(file.type)) { toast.error("Only PNG, JPG, WEBP allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("special-offers").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("special-offers").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed?.signedUrl) throw sErr ?? new Error("Failed to sign URL");
      setImage(signed.signedUrl);
      toast.success("Banner uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function load() {
    const { data: o } = await (supabase as any).from("special_offers").select("*").order("created_at", { ascending: false });
    setOffers(o ?? []);
    if (o && o.length) {
      const { data: s } = await (supabase as any).from("special_offer_slabs").select("*").in("offer_id", o.map((x: any) => x.id)).order("sort_order");
      const grouped: Record<string, any[]> = {};
      (s ?? []).forEach((row: any) => { (grouped[row.offer_id] ||= []).push(row); });
      setSlabs(grouped);
    }
  }
  useEffect(() => { load(); }, []);

  async function createOffer() {
    if (!title.trim()) return toast.error("Title required");
    if (!description.trim()) return toast.error("Description required");
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) return toast.error("End date cannot be before start date");
    const { error } = await (supabase as any).from("special_offers").insert({
      title: title.trim(), name: name.trim() || null, description: description.trim() || null,
      image: image.trim() || null, start_date: startDate || null, end_date: endDate || null,
      status: "draft", published: false, created_by: "admin",
    });
    if (error) return toast.error(error.message);
    setTitle(""); setName(""); setDescription(""); setImage(""); setStartDate(""); setEndDate("");
    toast.success("Offer created (Draft)"); load();
  }

  async function setStatus(o: any, status: string) {
    await (supabase as any).from("special_offers").update({ status, updated_at: new Date().toISOString() }).eq("id", o.id);
    load();
  }

  async function togglePublish(o: any) {
    const next = !o.published;
    await (supabase as any).from("special_offers").update({ published: next, status: next ? "active" : o.status, updated_at: new Date().toISOString() }).eq("id", o.id);
    if (next) {
      // broadcast notification to all users
      const { data: users } = await supabase.from("users").select("had_id");
      if (users && users.length) {
        const rows = users.map((u: any) => ({
          had_id: u.had_id,
          title: `🔥 Special Offer: ${o.title}`,
          body: o.description || "Tap to view the limited-time special offer.",
          type: "special_offer",
        }));
        await supabase.from("notifications").insert(rows);
      }
      toast.success("Pushed to all users");
    } else {
      toast.success("Unpublished");
    }
    load();
  }

  async function deleteOffer(o: any) {
    if (!confirm(`Delete offer "${o.title}"? This removes all its slabs.`)) return;
    await (supabase as any).from("special_offers").delete().eq("id", o.id);
    load();
  }

  return (
    <AdminShell title="Special Offers">
      <div className="bg-card border border-[var(--gold)]/40 rounded-lg p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-[var(--gold)]">Create Special Offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Offer Title *" className="bg-input border border-border rounded px-3 py-2 text-sm" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Offer Name (short code)" className="bg-input border border-border rounded px-3 py-2 text-sm" />
          <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Banner / Image URL" className="bg-input border border-border rounded px-3 py-2 text-sm md:col-span-2" />
          <div className="md:col-span-2 flex flex-col gap-2 bg-secondary/30 border border-dashed border-border rounded p-3">
            <label className="text-xs text-muted-foreground">Or upload banner (PNG/JPG/WEBP, max 5MB)</label>
            <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleUpload} disabled={uploading} className="text-xs" />
            {uploading && <p className="text-xs text-[var(--gold)]">Uploading…</p>}
            {image && <img src={image} alt="Banner preview" className="mt-1 max-h-40 rounded border border-border object-cover" />}
          </div>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-input border border-border rounded px-3 py-2 text-sm" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-input border border-border rounded px-3 py-2 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description / terms" rows={3} className="bg-input border border-border rounded px-3 py-2 text-sm md:col-span-2" />
        </div>
        <button onClick={createOffer} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-4 py-2 rounded font-semibold text-sm">Create Offer</button>
      </div>

      <div className="space-y-4">
        {offers.length === 0 && <p className="text-sm text-muted-foreground">No special offers yet.</p>}
        {offers.map((o) => {
          const now = new Date();
          const expired = o.end_date && new Date(o.end_date) < now;
          return (
            <div key={o.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start gap-4">
                {o.image && <img src={o.image} alt="" className="w-24 h-24 object-cover rounded border border-border" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[var(--gold)]">{o.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${o.published ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-secondary text-muted-foreground"}`}>
                      {expired ? "expired" : o.published ? "published" : o.status}
                    </span>
                  </div>
                  {o.name && <p className="text-xs text-muted-foreground">{o.name}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{o.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {o.start_date || "—"} → {o.end_date || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <button onClick={() => togglePublish(o)} className={`text-xs px-3 py-1 rounded font-semibold ${o.published ? "bg-secondary text-foreground" : "bg-[var(--gold)] text-[var(--primary-foreground)]"}`}>
                    {o.published ? "Unpublish" : "🚀 Push to Users"}
                  </button>
                  <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} className="bg-input border border-border rounded px-2 py-1 text-xs">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                  <button onClick={() => setOpenId(openId === o.id ? null : o.id)} className="text-xs text-[var(--gold)]">{openId === o.id ? "Hide" : "Manage"} Slabs</button>
                  <button onClick={() => deleteOffer(o)} className="text-xs text-destructive">Delete</button>
                </div>
              </div>
              {openId === o.id && (
                <SlabManager offerId={o.id} rows={slabs[o.id] ?? []} onChange={load} />
              )}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}

function SlabManager({ offerId, rows, onChange }: { offerId: string; rows: any[]; onChange: () => void }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(100000);
  const [monthly, setMonthly] = useState(8333);
  const [duration, setDuration] = useState(24);
  const [total, setTotal] = useState(200000);
  const [benefits, setBenefits] = useState("");

  async function add() {
    const { error } = await (supabase as any).from("special_offer_slabs").insert({
      offer_id: offerId, slab_label: label.trim() || null, investment_amount: amount,
      monthly_profit: monthly, duration_months: duration, total_return: total,
      benefits: benefits.trim() || null, sort_order: rows.length,
    });
    if (error) return toast.error(error.message);
    setLabel(""); onChange();
  }
  async function del(s: any) {
    if (!confirm("Delete slab?")) return;
    await (supabase as any).from("special_offer_slabs").delete().eq("id", s.id);
    onChange();
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <h4 className="text-sm font-semibold mb-2">Slabs</h4>
      <div className="space-y-2 mb-3">
        {rows.map((s) => (
          <div key={s.id} className="bg-secondary/40 border border-border rounded p-2 flex items-center gap-3 text-xs">
            <span className="font-semibold flex-1">{s.slab_label || "Plan"}: {formatINR(s.investment_amount)} → {formatINR(s.monthly_profit)}/mo × {s.duration_months}m = {formatINR(s.total_return)}</span>
            {s.benefits && <span className="text-muted-foreground">{s.benefits}</span>}
            <button onClick={() => del(s)} className="text-destructive">Delete</button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground">No slabs yet.</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (Plan A)" className="bg-input border border-border rounded px-2 py-1" />
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Investment" className="bg-input border border-border rounded px-2 py-1" />
        <input type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} placeholder="Monthly" className="bg-input border border-border rounded px-2 py-1" />
        <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="Months" className="bg-input border border-border rounded px-2 py-1" />
        <input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} placeholder="Total return" className="bg-input border border-border rounded px-2 py-1" />
        <input value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder="Benefits" className="bg-input border border-border rounded px-2 py-1" />
      </div>
      <button onClick={add} className="mt-2 bg-[var(--gold)] text-[var(--primary-foreground)] px-3 py-1 rounded text-xs font-semibold">+ Add Slab</button>
    </div>
  );
}