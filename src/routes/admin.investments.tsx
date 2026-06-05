import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { PLANS, planRate, fmtInr } from "@/lib/plans";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/investments")({
  head: () => ({ meta: [{ title: "Investments — Admin" }] }),
  component: AdminInvestments,
});

type Inv = {
  id: string; had_id: string; user_id: string;
  amount_invested: number; amount_received: number;
  plan_name: string; plan_rate: number; expected_2x: number | null;
  status: string; start_date: string; created_at: string;
};
type Prof = { id: string; had_id: string; full_name: string; mobile: string | null; upi_id: string | null; trc20_wallet: string | null; bep20_wallet: string | null };

function AdminInvestments() {
  const [rows, setRows] = useState<Inv[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Prof>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Inv | null>(null);
  const [q, setQ] = useState("");
  const [roiMonth, setRoiMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [roiBusy, setRoiBusy] = useState(false);

  async function runBulkRoi() {
    if (!confirm(`Credit ${roiMonth} monthly ROI to ALL active investments? Already-processed ones will be skipped.`)) return;
    setRoiBusy(true);
    try {
      const { data, error } = await supabase.rpc("process_monthly_roi" as any, { _month: roiMonth });
      if (error) throw error;
      const row = (data as any)?.[0] || {};
      toast.success(`Credited ${row.processed || 0} investors · ${fmtInr(Number(row.total_amount || 0))} total`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setRoiBusy(false); }
  }


  async function load() {
    setLoading(true);
    const { data: inv } = await supabase.from("investments").select("*").order("created_at", { ascending: false }).limit(500);
    const list = (inv as Inv[]) || [];
    setRows(list);
    if (list.length > 0) {
      const ids = Array.from(new Set(list.map((r) => r.had_id)));
      const { data: prof } = await supabase.from("profiles").select("id,had_id,full_name,mobile,upi_id,trc20_wallet,bep20_wallet").in("had_id", ids);
      const map: Record<string, Prof> = {};
      (prof || []).forEach((p: any) => { map[p.had_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel("admin_inv")
      .on("postgres_changes", { event: "*", schema: "public", table: "investments" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "return_payments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const totals = useMemo(() => {
    const invested = rows.reduce((a, b) => a + Number(b.amount_invested), 0);
    const received = rows.reduce((a, b) => a + Number(b.amount_received), 0);
    return { invested, received, target: invested * 2, remaining: Math.max(invested * 2 - received, 0) };
  }, [rows]);

  const filtered = rows.filter((r) => !q ||
    r.had_id.toLowerCase().includes(q.toLowerCase()) ||
    (profiles[r.had_id]?.full_name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminShell title="Investments">
      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <Card label="Total Invested" value={fmtInr(totals.invested)} />
        <Card label="Total Received" value={fmtInr(totals.received)} />
        <Card label="2X Target" value={fmtInr(totals.target)} />
        <Card label="Remaining" value={fmtInr(totals.remaining)} accent />
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search HAD ID or name…"
        className="mb-4 w-full md:w-96 rounded-md bg-navy-light border border-gold/20 px-3 py-2 outline-none focus:border-gold" />

      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="w-full text-sm">
          <thead className="bg-navy-light/60 text-white/70">
            <tr>
              <th className="text-left p-3">HAD ID</th><th className="text-left p-3">Name</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-right p-3">Invested</th><th className="text-right p-3">Received</th>
              <th className="text-right p-3">2X Target</th><th className="text-right p-3">Remaining</th>
              <th className="text-left p-3">Start</th><th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="p-6 text-center text-white/60">Loading…</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={9} className="p-6 text-center text-white/60">No investments yet.</td></tr> :
              filtered.map((r) => {
                const remaining = Math.max(Number(r.expected_2x || r.amount_invested * 2) - Number(r.amount_received), 0);
                return (
                  <tr key={r.id} className="border-t border-gold/10 hover:bg-gold/5 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="p-3 font-mono text-gold">{r.had_id}</td>
                    <td className="p-3">{profiles[r.had_id]?.full_name || "—"}</td>
                    <td className="p-3 capitalize">{r.plan_name} ({r.plan_rate}%)</td>
                    <td className="p-3 text-right">{fmtInr(Number(r.amount_invested))}</td>
                    <td className="p-3 text-right">{fmtInr(Number(r.amount_received))}</td>
                    <td className="p-3 text-right text-white/70">{fmtInr(Number(r.expected_2x || r.amount_invested * 2))}</td>
                    <td className="p-3 text-right text-gold">{fmtInr(remaining)}</td>
                    <td className="p-3 text-white/70">{new Date(r.start_date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.status === "active" ? "bg-emerald-500/15 text-emerald-300" :
                        r.status === "completed" ? "bg-gold/15 text-gold" : "bg-white/10 text-white/60"}`}>{r.status}</span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {selected && <InvestmentModal inv={selected} prof={profiles[selected.had_id]} onClose={() => setSelected(null)} onChanged={load} />}
    </AdminShell>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-gold bg-gold/5" : "border-gold/20 bg-navy-light/40"}`}>
      <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
      <div className={`mt-1 font-serif text-2xl ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function InvestmentModal({ inv, prof, onClose, onChanged }: { inv: Inv; prof: Prof | undefined; onClose: () => void; onChanged: () => void }) {
  const rate = inv.plan_rate || planRate(inv.plan_name);
  const monthly = Number(inv.amount_invested) * (rate / 100);
  const received = Number(inv.amount_received);
  const target = Number(inv.expected_2x || inv.amount_invested * 2);
  const remaining = Math.max(target - received, 0);
  const pct = target > 0 ? Math.min(100, (received / target) * 100) : 0;

  const startDate = new Date(inv.start_date);
  const today = new Date();
  const days = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / 86400000));
  const monthsCompleted = Math.floor(days / 30);
  const eligibleTotal = monthsCompleted * monthly;
  const eligibleNow = Math.max(eligibleTotal - received, 0);

  const monthsTo2x = monthly > 0 ? Math.ceil(remaining / monthly) : 0;

  const [pay, setPay] = useState({ amount: "", method: "UPI", txn_ref: "", notes: "" });
  const [returns, setReturns] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("return_payments").select("*").eq("had_id", inv.had_id).order("created_at", { ascending: false })
      .then(({ data }) => setReturns(data || []));
    supabase.from("transactions").select("*").eq("had_id", inv.had_id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setTxns(data || []));
  }, [inv.had_id]);

  async function pay_return() {
    const amt = Number(pay.amount);
    if (!amt || amt <= 0) { toast.error("Amount required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("return_payments").insert({
      had_id: inv.had_id, user_id: inv.user_id, amount: amt,
      method: pay.method, txn_ref: pay.txn_ref || null, notes: pay.notes || null,
      paid_by: user?.id || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    const newReceived = received + amt;
    await supabase.from("investments").update({
      amount_received: newReceived,
      status: newReceived >= target ? "completed" : "active",
    }).eq("id", inv.id);
    await supabase.from("notifications").insert({
      had_id: inv.had_id, title: "Return Received! 💰",
      body: `${fmtInr(amt)} aapke account mein credit ho gayi via ${pay.method}.`,
      notif_type: "success",
    });
    toast.success("Return paid");
    setPay({ amount: "", method: "UPI", txn_ref: "", notes: "" });
    onChanged();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-navy-light border border-gold/30 rounded-xl p-6 w-full max-w-4xl my-8 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-gold text-sm">{inv.had_id}</p>
            <h2 className="font-serif text-2xl">{prof?.full_name || "—"}</h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded bg-gold/15 text-gold capitalize">{inv.plan_name} ({rate}%)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 capitalize">{inv.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!confirm(`Delete investment for ${inv.had_id}? This removes the investment record (transactions and returns are kept).`)) return;
                const { error } = await supabase.from("investments").delete().eq("id", inv.id);
                if (error) { toast.error(error.message); return; }
                toast.success("Investment deleted");
                onClose();
                onChanged();
              }}
              className="px-3 py-1.5 text-xs rounded border border-red-400/40 text-red-300 hover:bg-red-500/10"
            >Delete investment</button>
            <button onClick={onClose} className="text-white/60 hover:text-gold">✕</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <Card label="Invested" value={fmtInr(Number(inv.amount_invested))} />
          <Card label="Received" value={fmtInr(received)} />
          <Card label="2X Target" value={fmtInr(target)} />
          <Card label="Remaining" value={fmtInr(remaining)} accent />
        </div>
        <div>
          <div className="flex justify-between text-xs text-white/60 mb-1"><span>2X progress</span><span>{pct.toFixed(1)}%</span></div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold to-amber-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Projections */}
        <section className="rounded-xl border border-gold/20 bg-navy/40 p-5">
          <h3 className="font-serif text-lg mb-3">Return Projection (algorithm)</h3>
          <table className="w-full text-sm">
            <thead className="text-white/60 text-xs uppercase"><tr><th className="text-left py-1">Period</th><th className="text-right">Expected Return</th></tr></thead>
            <tbody>
              <Row label="1 Month" value={fmtInr(monthly)} />
              <Row label="3 Months" value={fmtInr(monthly * 3)} />
              <Row label="6 Months" value={fmtInr(monthly * 6)} />
              <Row label="1 Year" value={fmtInr(Math.min(monthly * 12, target))} />
              <Row label={`Until 2X (~${monthsTo2x} months)`} value={fmtInr(remaining)} />
            </tbody>
          </table>
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-gold/15 bg-navy/60 p-3">
              <div className="text-xs text-white/60">Days since start</div>
              <div className="font-serif text-lg">{days} ({monthsCompleted} months)</div>
            </div>
            <div className={`rounded-md border p-3 ${eligibleNow > 0 ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
              <div className="text-xs text-white/60">Eligible today</div>
              <div className={`font-serif text-lg ${eligibleNow > 0 ? "text-emerald-300" : ""}`}>{fmtInr(eligibleNow)}</div>
            </div>
          </div>
        </section>

        {/* User wallets */}
        <section className="rounded-xl border border-gold/20 bg-navy/40 p-5">
          <h3 className="font-serif text-lg mb-3">User Receiving Wallets</h3>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <WalletRow label="UPI" value={prof?.upi_id} qr />
            <WalletRow label="TRC20" value={prof?.trc20_wallet} qr />
            <WalletRow label="BEP20" value={prof?.bep20_wallet} qr />
          </div>
        </section>

        {/* Pay return */}
        <section className="rounded-xl border border-gold/20 bg-navy/40 p-5">
          <h3 className="font-serif text-lg mb-3">Mark Return Paid</h3>
          <div className="grid sm:grid-cols-4 gap-3">
            <input type="number" placeholder="Amount" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className="modal-input" />
            <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} className="modal-input">
              <option>UPI</option><option>TRC20</option><option>BEP20</option>
            </select>
            <input placeholder="Txn ref" value={pay.txn_ref} onChange={(e) => setPay({ ...pay, txn_ref: e.target.value })} className="modal-input" />
            <input placeholder="Notes" value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} className="modal-input" />
          </div>
          <button onClick={pay_return} className="mt-3 px-5 py-2 rounded bg-gold text-navy text-sm font-medium">Confirm Payment</button>
          <style>{`.modal-input{background:#0A1628;border:1px solid rgba(201,168,76,.25);border-radius:.5rem;padding:.5rem .75rem;color:white;outline:none;font-size:.875rem}`}</style>
        </section>

        {/* History */}
        <section className="grid md:grid-cols-2 gap-4">
          <HistoryBox title="Returns paid out" rows={returns.map((r: any) => ({ when: r.created_at, label: `${r.method} · ${r.txn_ref || "—"}`, amt: Number(r.amount), kind: "out" }))} />
          <HistoryBox title="Investment transactions" rows={txns.map((t: any) => ({ when: t.created_at, label: `${t.type} · ${t.status}`, amt: Number(t.amount), kind: t.status === "verified" ? "in" : "pending" }))} />
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <tr className="border-t border-white/5"><td className="py-1.5">{label}</td><td className="py-1.5 text-right tabular-nums">{value}</td></tr>;
}
function WalletRow({ label, value, qr }: { label: string; value?: string | null; qr?: boolean }) {
  if (!value) return <div className="rounded-md border border-dashed border-white/10 p-3 text-xs text-white/40">{label}: not set</div>;
  return (
    <div className="rounded-md border border-gold/15 bg-navy/60 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="font-mono text-xs break-all mt-1">{value}</div>
      {qr && <div className="bg-white p-1.5 rounded mt-2 w-fit"><QRCodeCanvas value={value} size={90} /></div>}
      <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="mt-2 text-xs text-gold hover:underline">Copy</button>
    </div>
  );
}
function HistoryBox({ title, rows }: { title: string; rows: { when: string; label: string; amt: number; kind: string }[] }) {
  return (
    <div className="rounded-xl border border-gold/20 bg-navy/40 p-4">
      <h4 className="font-serif text-sm text-gold mb-2">{title}</h4>
      {rows.length === 0 ? <div className="text-xs text-white/50">None.</div> : (
        <ul className="space-y-1 text-xs">
          {rows.slice(0, 10).map((r, i) => (
            <li key={i} className="flex justify-between border-b border-white/5 py-1">
              <span className="text-white/70">{new Date(r.when).toLocaleDateString()} · {r.label}</span>
              <span className={`tabular-nums ${r.kind === "in" ? "text-emerald-300" : r.kind === "out" ? "text-gold" : "text-amber-300"}`}>{fmtInr(r.amt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
