import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { searchAssets, type CoinAsset } from "@/services/coinCapService";

export const Route = createFileRoute("/admin/trading")({
  head: () => ({ meta: [{ title: "Trading Control — Admin" }] }),
  component: AdminTrading,
});

type Asset = {
  id: string; asset_name: string; symbol: string; coincap_id: string | null; asset_category: string;
  entry_price: number; current_price: number; custom_current_price: number | null; use_manual_price: boolean;
  allocation_percent: number; profit_target_percent: number; expected_duration_days: number;
  risk_level: "low" | "medium" | "high"; admin_note: string | null; status: "active" | "paused" | "completed";
};

const empty: Partial<Asset> = {
  asset_name: "", symbol: "", coincap_id: null, asset_category: "crypto",
  entry_price: 0, current_price: 0, use_manual_price: false,
  allocation_percent: 0, profit_target_percent: 10, expected_duration_days: 30,
  risk_level: "medium", admin_note: "", status: "active",
};

function AdminTrading() {
  const [rows, setRows] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Asset> | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CoinAsset[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("get_trading_assets_admin");
    setRows((data as Asset[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function doSearch(q: string) {
    setSearch(q);
    if (!q || q.length < 2) { setResults([]); return; }
    try { setResults((await searchAssets(q)).slice(0, 8)); } catch { setResults([]); }
  }

  function fromCoin(c: CoinAsset) {
    setEditing({
      ...empty, asset_name: c.name, symbol: c.symbol.toUpperCase(), coincap_id: c.id,
      entry_price: Number(c.priceUsd), current_price: Number(c.priceUsd),
    });
    setResults([]); setSearch("");
  }

  async function save() {
    if (!editing) return;
    const payload: any = { ...editing };
    if (payload.id) {
      const { id, ...rest } = payload;
      await supabase.from("trading_assets").update(rest).eq("id", id);
    } else {
      await supabase.from("trading_assets").insert(payload);
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this asset?")) return;
    await supabase.from("trading_assets").delete().eq("id", id);
    load();
  }

  return (
    <AdminShell title="Trading Control">
      <div className="rounded-xl border border-gold/20 bg-navy-light/40 p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input value={search} onChange={(e) => doSearch(e.target.value)} placeholder="Search CoinCap (BTC, ETH, …)"
            className="flex-1 min-w-[240px] rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
          <button onClick={() => setEditing({ ...empty })} className="px-4 py-2 rounded bg-gold text-navy text-sm font-medium">+ Manual asset</button>
        </div>
        {results.length > 0 && (
          <div className="mt-3 grid gap-1">
            {results.map((c) => (
              <button key={c.id} onClick={() => fromCoin(c)}
                className="text-left rounded px-3 py-2 hover:bg-gold/10 flex justify-between text-sm">
                <span>{c.rank}. {c.name} <span className="text-white/50">({c.symbol})</span></span>
                <span className="text-gold">${Number(c.priceUsd).toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="w-full text-sm">
          <thead className="bg-navy-light/60 text-white/70">
            <tr>
              <th className="text-left p-3">Asset</th><th className="text-right p-3">Entry</th>
              <th className="text-right p-3">Current</th><th className="text-right p-3">Alloc %</th>
              <th className="text-right p-3">Target %</th><th className="text-left p-3">Risk</th>
              <th className="text-left p-3">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="p-6 text-center text-white/60">Loading…</td></tr> :
              rows.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-white/60">No assets yet — search above or add manual.</td></tr> :
              rows.map((r) => {
                const cur = r.use_manual_price ? Number(r.custom_current_price || 0) : Number(r.current_price);
                return (
                  <tr key={r.id} className="border-t border-gold/10">
                    <td className="p-3">{r.asset_name} <span className="text-white/50">({r.symbol})</span></td>
                    <td className="p-3 text-right">${Number(r.entry_price).toLocaleString()}</td>
                    <td className="p-3 text-right">${cur.toLocaleString()} {r.use_manual_price && <span className="text-xs text-gold ml-1">M</span>}</td>
                    <td className="p-3 text-right">{r.allocation_percent}%</td>
                    <td className="p-3 text-right text-emerald-300">{r.profit_target_percent}%</td>
                    <td className="p-3 capitalize">{r.risk_level}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${r.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/60"}`}>{r.status}</span>
                    </td>
                    <td className="p-3 space-x-2 text-xs">
                      <button onClick={() => setEditing(r)} className="text-gold">Edit</button>
                      <button onClick={() => remove(r.id)} className="text-red-300">Del</button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-navy-light border border-gold/30 rounded-xl p-6 w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl text-gold mb-4">{editing.id ? "Edit asset" : "Add asset"}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Name" value={editing.asset_name || ""} onChange={(v) => setEditing({ ...editing, asset_name: v })} />
              <Field label="Symbol" value={editing.symbol || ""} onChange={(v) => setEditing({ ...editing, symbol: v.toUpperCase() })} />
              <Field label="CoinCap ID" value={editing.coincap_id || ""} onChange={(v) => setEditing({ ...editing, coincap_id: v })} />
              <Field label="Category" value={editing.asset_category || "crypto"} onChange={(v) => setEditing({ ...editing, asset_category: v })} />
              <Field label="Entry price (USD)" type="number" value={String(editing.entry_price ?? 0)} onChange={(v) => setEditing({ ...editing, entry_price: Number(v) })} />
              <Field label="Current price (USD)" type="number" value={String(editing.current_price ?? 0)} onChange={(v) => setEditing({ ...editing, current_price: Number(v) })} />
              <Field label="Custom price (USD)" type="number" value={String(editing.custom_current_price ?? 0)} onChange={(v) => setEditing({ ...editing, custom_current_price: Number(v) })} />
              <Field label="Allocation %" type="number" value={String(editing.allocation_percent ?? 0)} onChange={(v) => setEditing({ ...editing, allocation_percent: Number(v) })} />
              <Field label="Profit target %" type="number" value={String(editing.profit_target_percent ?? 0)} onChange={(v) => setEditing({ ...editing, profit_target_percent: Number(v) })} />
              <Field label="Duration (days)" type="number" value={String(editing.expected_duration_days ?? 30)} onChange={(v) => setEditing({ ...editing, expected_duration_days: Number(v) })} />
              <Select label="Risk" value={editing.risk_level || "medium"} options={["low", "medium", "high"]} onChange={(v) => setEditing({ ...editing, risk_level: v as any })} />
              <Select label="Status" value={editing.status || "active"} options={["active", "paused", "completed"]} onChange={(v) => setEditing({ ...editing, status: v as any })} />
            </div>
            <label className="flex items-center gap-2 mt-3 text-sm">
              <input type="checkbox" checked={!!editing.use_manual_price} onChange={(e) => setEditing({ ...editing, use_manual_price: e.target.checked })} />
              Use manual price (override live feed)
            </label>
            <div className="mt-3">
              <label className="text-xs text-white/70">Admin note</label>
              <textarea value={editing.admin_note || ""} onChange={(e) => setEditing({ ...editing, admin_note: e.target.value })} rows={2}
                className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-white/70">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm rounded bg-gold text-navy font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-white/70">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold" />
    </div>
  );
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-white/70">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 rounded-md bg-navy border border-gold/20 px-3 py-2 outline-none focus:border-gold capitalize">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
