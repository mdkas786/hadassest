import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payment Verification — Admin" }] }),
  component: AdminPayments,
});

type Txn = {
  id: string; had_id: string; user_id: string; amount: number; type: string;
  method: string | null; status: string; txn_ref: string | null; screenshot_url: string | null;
  notes: string | null; created_at: string; rejection_reason: string | null;
};

function planFor(amount: number): { plan: "starter" | "growth" | "fortune"; rate: number } {
  if (amount >= 100000) return { plan: "fortune", rate: 7 };
  if (amount >= 25000) return { plan: "growth", rate: 6 };
  return { plan: "starter", rate: 5 };
}

function AdminPayments() {
  const [rows, setRows] = useState<Txn[]>([]);
  const [tab, setTab] = useState<"pending" | "verified" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [reject, setReject] = useState<{ id: string; reason: string } | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("transactions").select("*").eq("status", tab).order("created_at", { ascending: false }).limit(200);
    setRows((data as Txn[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tab]);

  async function approve(t: Txn) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("transactions").update({
      status: "verified", verified_at: new Date().toISOString(), verified_by: user?.id || null,
    }).eq("id", t.id);

    if (t.type === "investment") {
      const p = planFor(Number(t.amount));
      await supabase.from("investments").insert({
        user_id: t.user_id, had_id: t.had_id, amount_invested: t.amount,
        plan_name: p.plan, plan_rate: p.rate, expected_2x: Number(t.amount) * 2, status: "active",
      });
      await supabase.from("notifications").insert({
        had_id: t.had_id, title: "Investment confirmed",
        body: `Your investment of ₹${Number(t.amount).toLocaleString("en-IN")} on the ${p.plan} plan is now active.`,
        notif_type: "success",
      });
    }
    load();
  }

  async function doReject(id: string, reason: string) {
    const t = rows.find((r) => r.id === id);
    await supabase.from("transactions").update({
      status: "rejected", rejection_reason: reason, verified_at: new Date().toISOString(),
    }).eq("id", id);
    if (t) {
      await supabase.from("notifications").insert({
        had_id: t.had_id, title: "Payment rejected", body: reason || "Your payment proof could not be verified.", notif_type: "warning",
      });
    }
    setReject(null);
    load();
  }

  async function screenshotUrl(path: string | null) {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = await supabase.storage.from("payment-screenshots").createSignedUrl(path, 600);
    return data?.signedUrl || null;
  }

  return (
    <AdminShell title="Payment Verification">
      <div className="flex gap-2 mb-4">
        {(["pending", "verified", "rejected"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm capitalize ${tab === t ? "bg-gold text-navy" : "bg-navy-light text-white/70 hover:text-gold"}`}>
            {t}
          </button>
        ))}
      </div>
      {loading ? <div className="text-white/60">Loading…</div> :
        rows.length === 0 ? <div className="text-white/60">No {tab} transactions.</div> :
        <div className="grid gap-3">
          {rows.map((t) => (
            <PaymentCard key={t.id} t={t} onApprove={() => approve(t)} onReject={() => setReject({ id: t.id, reason: "" })} screenshotUrl={screenshotUrl} />
          ))}
        </div>
      }

      {reject && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4" onClick={() => setReject(null)}>
          <div className="bg-navy-light border border-gold/30 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg text-gold mb-2">Reject payment</h3>
            <textarea autoFocus value={reject.reason} onChange={(e) => setReject({ ...reject, reason: e.target.value })} rows={3}
              placeholder="Reason shown to user…" className="w-full rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setReject(null)} className="px-3 py-2 text-sm text-white/70">Cancel</button>
              <button onClick={() => doReject(reject.id, reject.reason)} className="px-3 py-2 text-sm rounded bg-red-500/80 text-white">Reject</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function PaymentCard({ t, onApprove, onReject, screenshotUrl }:
  { t: Txn; onApprove: () => void; onReject: () => void; screenshotUrl: (p: string | null) => Promise<string | null> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { screenshotUrl(t.screenshot_url).then(setUrl); }, [t.screenshot_url]);

  return (
    <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-5 grid md:grid-cols-[1fr,200px] gap-5">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-gold">{t.had_id}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 capitalize">{t.type}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">{t.method || "—"}</span>
          <span className="text-xs text-white/50">{new Date(t.created_at).toLocaleString()}</span>
        </div>
        <div className="mt-2 font-serif text-2xl text-gold">₹{Number(t.amount).toLocaleString("en-IN")}</div>
        {t.txn_ref && <div className="text-xs text-white/60 mt-1">Ref: <span className="font-mono">{t.txn_ref}</span></div>}
        {t.notes && <div className="text-sm text-white/70 mt-2">{t.notes}</div>}
        {t.rejection_reason && <div className="text-sm text-red-300 mt-2">Rejected: {t.rejection_reason}</div>}
        {t.status === "pending" && (
          <div className="flex gap-2 mt-4">
            <button onClick={onApprove} className="px-4 py-2 text-sm rounded bg-emerald-500/80 text-white hover:bg-emerald-500">Approve</button>
            <button onClick={onReject} className="px-4 py-2 text-sm rounded border border-red-400/40 text-red-300 hover:bg-red-500/10">Reject</button>
          </div>
        )}
      </div>
      <div>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="block">
            <img src={url} alt="proof" className="rounded-lg border border-gold/20 object-cover w-full h-48" />
          </a>
        ) : <div className="rounded-lg border border-dashed border-gold/20 h-48 grid place-items-center text-xs text-white/50">No screenshot</div>}
      </div>
    </div>
  );
}
