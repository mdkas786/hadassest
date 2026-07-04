import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/investments")({
  head: () => ({ meta: [{ title: "Investments — Admin" }] }),
  component: AdminInv,
});

function AdminInv() {
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase.from("investments").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
    const { data: us } = await supabase.from("users").select("*");
    setUsers(Object.fromEntries((us ?? []).map((u: any) => [u.had_id, u])));
  }
  useEffect(() => { load(); }, []);

  const totals = rows.reduce((a, r) => ({
    invested: a.invested + Number(r.amount_invested),
    received: a.received + Number(r.total_income_received),
  }), { invested: 0, received: 0 });
  const target2x = totals.invested * 2;

  // Aggregate investments by had_id into one row per user
  const grouped: Record<string, any> = {};
  rows.forEach((r) => {
    const g = grouped[r.had_id] || (grouped[r.had_id] = {
      had_id: r.had_id, items: [], invested: 0, received: 0, cap: 0, monthly: 0, anyActive: false, start_date: r.start_date,
    });
    g.items.push(r);
    g.invested += Number(r.amount_invested);
    g.received += Number(r.total_income_received);
    g.cap += r.is_special && r.total_return ? Number(r.total_return) : Number(r.amount_invested) * 2;
    g.monthly += r.is_special && r.monthly_roi ? Number(r.monthly_roi) : (Number(r.amount_invested) * Number(r.plan_rate)) / 100;
    if (r.status === "active") g.anyActive = true;
    if (new Date(r.start_date) < new Date(g.start_date)) g.start_date = r.start_date;
  });
  const groupedRows = Object.values(grouped).sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  const filtered = groupedRows.filter((g: any) => !q || g.had_id.toLowerCase().includes(q.toLowerCase()) || (users[g.had_id]?.name ?? "").toLowerCase().includes(q.toLowerCase()));

  async function markPaid(inv: any, amount: number) {
    if (!amount || amount <= 0) return;
    const cap = inv.is_special && inv.total_return ? Number(inv.total_return) : Number(inv.amount_invested) * 2;
    const remaining = cap - Number(inv.total_income_received);
    const pay = Math.min(amount, remaining);
    await supabase.from("sponsor_income").insert({
      earner_had_id: inv.had_id, type: "roi", percentage: inv.plan_rate,
      base_amount: inv.amount_invested, income_amount: pay, status: "paid",
      paid_at: new Date().toISOString(), investment_id: inv.id,
    });
    const newReceived = Number(inv.total_income_received) + pay;
    await supabase.from("investments").update({
      amount_received: Number(inv.amount_received) + pay,
      total_income_received: newReceived,
      status: newReceived >= cap ? "completed" : "active",
    }).eq("id", inv.id);
    const { data: u } = await supabase.from("users").select("referred_by").eq("had_id", inv.had_id).single();
    if (u?.referred_by) {
      const { count } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("referred_by", u.referred_by);
      if ((count ?? 0) >= 2) {
        const level = pay * 0.1;
        await supabase.from("sponsor_income").insert({
          earner_had_id: u.referred_by, source_had_id: inv.had_id, type: "level",
          percentage: 10, base_amount: pay, income_amount: level, status: "pending",
        });
      }
    }
    await supabase.from("notifications").insert({ had_id: inv.had_id, title: "Return Received 💰", body: `${formatINR(pay)} aapke account mein credit ho gaya.`, type: "success" });
    toast.success("Payment recorded");
    load();
    setSelected(null);
  }

  return (
    <AdminShell title="Investments">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card label="Total Invested" value={formatINR(totals.invested)} />
        <Card label="Total Received" value={formatINR(totals.received)} />
        <Card label="2X Target" value={formatINR(target2x)} />
        <Card label="Remaining" value={formatINR(target2x - totals.received)} highlight />
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search HAD ID or name..." className="w-full bg-input border border-border rounded px-3 py-2 text-sm mb-3" />
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-secondary/50 text-xs text-muted-foreground"><tr><th className="text-left p-3">HAD ID</th><th className="text-left p-3">Name</th><th className="text-left p-3">Plans</th><th className="text-right p-3">Invested</th><th className="text-right p-3">Monthly</th><th className="text-right p-3">Received</th><th className="text-right p-3">2X Target</th><th className="text-right p-3">Remaining</th><th className="text-left p-3">Status</th></tr></thead>
          <tbody>
            {filtered.map((g: any) => {
              const planLabel = g.items.length === 1 ? `${g.items[0].plan_name} (${Number(g.items[0].plan_rate)}%)` : `${g.items.length} Active Plans`;
              return (
                <tr key={g.had_id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setSelected(g)}>
                  <td className="p-3 text-[var(--gold)] underline">{g.had_id}</td>
                  <td className="p-3">{users[g.had_id]?.name ?? "—"}</td>
                  <td className="p-3">{planLabel}</td>
                  <td className="p-3 text-right">{formatINR(g.invested)}</td>
                  <td className="p-3 text-right">{formatINR(g.monthly)}</td>
                  <td className="p-3 text-right">{formatINR(g.received)}</td>
                  <td className="p-3 text-right">{formatINR(g.cap)}</td>
                  <td className="p-3 text-right text-[var(--gold)]">{formatINR(g.cap - g.received)}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-1 rounded ${g.anyActive ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-secondary"}`}>{g.anyActive ? "active" : "completed"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected && <UserDetailModal group={selected} user={users[selected.had_id]} onClose={() => setSelected(null)} onPay={markPaid} />}
    </AdminShell>
  );
}

function Card({ label, value, highlight }: any) {
  return <div className={`bg-card border ${highlight ? "border-[var(--gold)]/40" : "border-border"} rounded p-4`}><p className="text-xs uppercase text-muted-foreground tracking-wider">{label}</p><p className={`text-xl font-bold mt-1 ${highlight ? "text-[var(--gold)]" : ""}`}>{value}</p></div>;
}

function UserDetailModal({ group, user, onClose, onPay }: any) {
  const had = group.had_id;
  const items = group.items as any[];
  const [payTarget, setPayTarget] = useState<string>(items[0]?.id ?? "");
  const targetInv = items.find((i) => i.id === payTarget) ?? items[0];
  const targetMonthly = targetInv
    ? (targetInv.is_special && targetInv.monthly_roi
        ? Number(targetInv.monthly_roi)
        : Math.round(Number(targetInv.amount_invested) * Number(targetInv.plan_rate) / 100))
    : 0;
  const [amt, setAmt] = useState<number>(targetMonthly);
  useEffect(() => { setAmt(targetMonthly); }, [payTarget]);
  const [tx, setTx] = useState<any[]>([]);
  const [directs, setDirects] = useState<any[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [income, setIncome] = useState({ ref: 0, level: 0, roi: 0, pending: 0 });
  const [sponsor, setSponsor] = useState<any>(null);
  const [signedShot, setSignedShot] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const [{ data: txs }, { data: refs }, { data: si }, teamRes, sp] = await Promise.all([
        supabase.from("transactions").select("*").eq("had_id", had).order("created_at", { ascending: false }),
        supabase.from("users").select("had_id, name, created_at").eq("referred_by", had),
        supabase.from("sponsor_income").select("*").eq("earner_had_id", had),
        supabase.rpc("get_team_count", { root_had_id: had }),
        user?.referred_by
          ? supabase.from("users").select("had_id, name").eq("had_id", user.referred_by).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setTx(txs ?? []);
      setDirects(refs ?? []);
      setTeamCount((teamRes as any)?.data ?? 0);
      setSponsor((sp as any)?.data ?? null);
      const ic = { ref: 0, level: 0, roi: 0, pending: 0 };
      (si ?? []).forEach((s: any) => {
        const amt = Number(s.income_amount);
        if (s.status === "pending") ic.pending += amt;
        else if (s.type === "referral") ic.ref += amt;
        else if (s.type === "level") ic.level += amt;
        else if (s.type === "roi") ic.roi += amt;
      });
      setIncome(ic);
      // signed urls for screenshots
      const paths = (txs ?? []).map((t: any) => t.screenshot_url).filter(Boolean);
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("payment-screenshots").createSignedUrls(paths, 3600);
        const m: Record<string, string> = {};
        (signed ?? []).forEach((s: any) => { if (s.signedUrl) m[s.path] = s.signedUrl; });
        setSignedShot(m);
      }
    }
    load();
  }, [had, user?.referred_by]);

  const totalEarned = income.roi + income.ref + income.level;
  const totalRemaining = Math.max(0, group.cap - totalEarned);

  const upi = user?.upi_id;
  const trc = user?.trc20_wallet;
  const bep = user?.bep20_wallet;

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-lg max-w-4xl w-full p-6 my-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-[var(--gold)]">{had}</p>
            <h2 className="text-2xl font-bold">{user?.name ?? "—"}</h2>
            <p className="text-xs text-muted-foreground">{user?.email} · {user?.mobile} · {user?.city}</p>
            <p className="text-xs text-muted-foreground">Sponsor: {sponsor ? `${sponsor.name} (${sponsor.had_id})` : "Direct"} · Joined: {user?.created_at ? formatDate(user.created_at) : "—"}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-[var(--gold)]/20 text-[var(--gold)] px-2 py-0.5 rounded">{items.length} Plan{items.length > 1 ? "s" : ""}</span>
              <span className="text-xs bg-secondary px-2 py-0.5 rounded">{group.anyActive ? "active" : "completed"}</span>
              <span className="text-xs bg-secondary px-2 py-0.5 rounded">{user?.status ?? "active"}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl px-2">×</button>
        </div>

        <Section title="📦 Active Slabs">
          <div className="space-y-2">
            {items.map((it: any, i: number) => {
              const m = it.is_special && it.monthly_roi ? Number(it.monthly_roi) : Math.round(Number(it.amount_invested) * Number(it.plan_rate) / 100);
              const c = it.is_special && it.total_return ? Number(it.total_return) : Number(it.amount_invested) * 2;
              return (
                <div key={it.id} className="bg-secondary/30 rounded p-3 text-xs grid grid-cols-2 md:grid-cols-6 gap-2">
                  <div><p className="text-muted-foreground">Plan {i + 1}</p><p className="font-semibold text-[var(--gold)]">{it.plan_name}</p></div>
                  <div><p className="text-muted-foreground">Rate</p><p className="font-semibold">{it.plan_rate}%</p></div>
                  <div><p className="text-muted-foreground">Amount</p><p className="font-semibold">{formatINR(it.amount_invested)}</p></div>
                  <div><p className="text-muted-foreground">Monthly</p><p className="font-semibold">{formatINR(m)}</p></div>
                  <div><p className="text-muted-foreground">2X Cap</p><p className="font-semibold">{formatINR(c)}</p></div>
                  <div><p className="text-muted-foreground">Status</p><p className="font-semibold">{it.status}</p></div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="💰 Total Portfolio">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card label="Total Invested" value={formatINR(group.invested)} />
            <Card label="Total Monthly ROI" value={formatINR(group.monthly)} />
            <Card label="2X Target" value={formatINR(group.cap)} />
            <Card label="Remaining" value={formatINR(totalRemaining)} highlight />
            <Card label="ROI Income" value={formatINR(income.roi)} />
            <Card label="Sponsor Income" value={formatINR(income.ref)} />
            <Card label="Partner Income" value={formatINR(income.level)} />
            <Card label="Total Earned" value={formatINR(totalEarned)} />
          </div>
          {income.pending > 0 && <p className="text-xs text-[var(--warning)] mt-2">Pending: {formatINR(income.pending)}</p>}
        </Section>

        <Section title="👥 Flat Sponsor Network">
          <p className="text-sm text-muted-foreground mb-2">Direct referrals: <b>{directs.length}</b> · Total team (entire downline, flat): <b className="text-[var(--gold)]">{teamCount}</b> · Partner eligibility: {directs.length >= 2 ? <span className="text-[var(--success)]">✅ Active</span> : <span className="text-destructive">Needs {2 - directs.length} more</span>}</p>
          <div className="bg-secondary/30 rounded p-2 max-h-32 overflow-y-auto">
            {directs.length === 0 && <p className="text-xs text-muted-foreground">No direct referrals yet.</p>}
            <div className="flex flex-wrap gap-2">
              {directs.map((d: any) => (
                <span key={d.had_id} className="text-xs bg-card border border-border px-2 py-1 rounded">{d.name} <span className="text-[var(--gold)]">{d.had_id}</span></span>
              ))}
            </div>
          </div>
        </Section>

        <Section title="🏦 Payout Addresses (where user receives returns)">
          <div className="grid md:grid-cols-3 gap-3">
            {upi && <PayoutAddr type="UPI" addr={upi} qrData={`upi://pay?pa=${upi}&pn=${encodeURIComponent(user?.name ?? "")}`} />}
            {trc && <PayoutAddr type="TRC20" addr={trc} qrData={trc} />}
            {bep && <PayoutAddr type="BEP20" addr={bep} qrData={bep} />}
            {!upi && !trc && !bep && <p className="text-xs text-muted-foreground">User has not saved any payout address.</p>}
          </div>
        </Section>

        <Section title="📜 Deposit History">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tx.length === 0 && <p className="text-xs text-muted-foreground">No transactions.</p>}
            {tx.map((t: any) => (
              <div key={t.id} className="bg-secondary/30 rounded p-3 text-xs flex flex-wrap items-center gap-2">
                <span className="bg-card px-2 py-0.5 rounded">{t.payment_method}</span>
                <span className="font-semibold text-[var(--gold)]">{formatINR(t.amount)}</span>
                <span className="font-mono">UTR: {t.utr_number}</span>
                <span className={`px-2 py-0.5 rounded ${t.status === "verified" ? "bg-[var(--success)]/20 text-[var(--success)]" : t.status === "pending" ? "bg-[var(--warning)]/20 text-[var(--warning)]" : "bg-destructive/20 text-destructive"}`}>{t.status}</span>
                <span className="text-muted-foreground ml-auto">{new Date(t.created_at).toLocaleString()}</span>
                {t.screenshot_url && signedShot[t.screenshot_url] && (
                  <a href={signedShot[t.screenshot_url]} target="_blank" rel="noreferrer" className="text-[var(--gold)] underline">View screenshot</a>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section title="✅ Mark Return Paid">
          <div className="space-y-2">
            <select value={payTarget} onChange={(e) => setPayTarget(e.target.value)} className="w-full bg-input border border-border rounded px-3 py-2 text-sm">
              {items.map((it: any) => (
                <option key={it.id} value={it.id}>{it.plan_name} ({it.plan_rate}%) · Invested {formatINR(it.amount_invested)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input type="number" value={amt} onChange={(e) => setAmt(Number(e.target.value))} className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm" />
              <button onClick={() => onPay(targetInv, amt)} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-4 py-2 rounded font-semibold text-sm">Confirm Payment</button>
            </div>
            <p className="text-xs text-muted-foreground">Default = selected slab monthly ROI. Auto-capped at 2X remaining of that slab.</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-[var(--gold)] mb-2">{title}</h3>
      {children}
    </div>
  );
}

function PayoutAddr({ type, addr, qrData }: { type: string; addr: string; qrData: string }) {
  return (
    <div className="border border-border rounded p-3 bg-secondary/30">
      <span className="text-xs bg-card px-2 py-0.5 rounded">{type}</span>
      <p className="font-mono text-xs mt-2 break-all">{addr}</p>
      <img alt={type + " QR"} className="w-32 h-32 mt-2 bg-white p-1 rounded" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`} />
      <button onClick={() => { navigator.clipboard.writeText(addr); }} className="text-xs text-[var(--gold)] mt-1 block">Copy</button>
    </div>
  );
}