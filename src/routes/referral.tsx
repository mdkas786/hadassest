import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserShell } from "@/components/UserShell";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/session";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/referral")({
  head: () => ({ meta: [{ title: "Referral — H.A.D." }] }),
  component: Referral,
});

function Referral() {
  const u = typeof window !== "undefined" ? getUser() : null;
  const [referred, setReferred] = useState(0);
  const [team, setTeam] = useState(0);
  const [income, setIncome] = useState(0);
  const url = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${u?.had_id}` : "";
  useEffect(() => {
    if (!u) return;
    supabase.from("users").select("*", { count: "exact", head: true }).eq("referred_by", u.had_id).then(({ count }) => setReferred(count ?? 0));
    (supabase.rpc as any)("get_team_count", { root_had_id: u.had_id }).then(({ data }: any) => setTeam(Number(data) || 0));
    supabase.from("sponsor_income").select("income_amount").eq("earner_had_id", u.had_id).eq("type", "referral").eq("status", "paid").then(({ data }) => setIncome((data ?? []).reduce((a, b) => a + Number(b.income_amount), 0)));
  }, [u?.had_id]);
  return (
    <UserShell>
      <h1 className="text-2xl font-bold mb-2">Apna HAD ID share karein</h1>
      <p className="text-sm text-muted-foreground mb-6">Aapka HAD ID hi aapka referral code hai.</p>
      <div className="bg-card border border-[var(--gold)]/40 rounded-lg p-6">
        <p className="text-3xl font-bold text-[var(--gold)] tracking-widest text-center">{u?.had_id}</p>
        <p className="text-xs text-muted-foreground text-center mt-2 break-all">{url}</p>
        <div className="flex gap-2 justify-center mt-4">
          <button onClick={() => { navigator.clipboard.writeText(u!.had_id); toast.success("Copied"); }} className="bg-secondary px-3 py-1 rounded text-xs">Copy HAD ID</button>
          <button onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }} className="bg-secondary px-3 py-1 rounded text-xs">Copy link</button>
        </div>
      </div>
      <div className="grid md:grid-cols-4 gap-3 mt-6">
        <div className="bg-card border border-border rounded p-4"><p className="text-xs text-muted-foreground">TOTAL REFERRED</p><p className="text-2xl font-bold mt-1">{referred}</p></div>
        <div className="bg-card border border-[var(--gold)]/40 rounded p-4"><p className="text-xs text-muted-foreground">TOTAL TEAM (FLAT)</p><p className="text-2xl font-bold mt-1 text-[var(--gold)]">{team}</p></div>
        <div className="bg-card border border-border rounded p-4"><p className="text-xs text-muted-foreground">SPONSOR INCOME</p><p className="text-2xl font-bold mt-1 text-[var(--gold)]">{formatINR(income)}</p></div>
        <div className="bg-card border border-border rounded p-4"><p className="text-xs text-muted-foreground">PARTNER STATUS</p><p className="text-sm mt-1">{referred >= 2 ? "Active ✅" : `Need ${2 - referred} more`}</p></div>
      </div>
      <p className="text-xs text-muted-foreground mt-4">Aapka full network flat structure mein dikhata hai — direct + indirect, sab ek hi team mein. Income calculation sponsor chain ke according hoti hai (5% one-time on invest + 10% on monthly ROI when you have 2+ direct).</p>
    </UserShell>
  );
}