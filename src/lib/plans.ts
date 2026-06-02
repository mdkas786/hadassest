// Plan tiers shared across user pay, admin verify, and projections.
export type PlanKey = "starter" | "growth" | "fortune";

export const PLANS: Record<PlanKey, {
  key: PlanKey; label: string; rate: number; min: number; max: number;
  color: string; emoji: string; features: string[];
}> = {
  starter: {
    key: "starter", label: "Starter", rate: 5, min: 50_000, max: 1_000_000,
    color: "border-gold/60", emoji: "⭐",
    features: ["5% monthly payout model", "50,000 se 10 lakh tak slab", "2X target tracking with payout visibility"],
  },
  growth: {
    key: "growth", label: "Growth", rate: 6, min: 1_100_000, max: 3_000_000,
    color: "border-sky-400/60", emoji: "📈",
    features: ["6% monthly payout model", "11 lakh se 30 lakh tak slab", "Priority verification and portfolio handling"],
  },
  fortune: {
    key: "fortune", label: "Fortune", rate: 7, min: 3_100_000, max: 5_000_000,
    color: "border-fuchsia-400/60", emoji: "👑",
    features: ["7% monthly payout model", "31 lakh se 50 lakh tak slab", "Premium account handling and 2X tracking"],
  },
};

export function planForAmount(amount: number): PlanKey {
  if (amount >= 3_100_000) return "fortune";
  if (amount >= 1_100_000) return "growth";
  return "starter";
}

export function planRate(key: PlanKey | string | null | undefined): number {
  const k = (key || "starter") as PlanKey;
  return PLANS[k]?.rate ?? 5;
}

export function fmtInr(n: number): string {
  return `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
}
