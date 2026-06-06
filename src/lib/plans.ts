// Plan tiers shared across user pay, admin verify, and projections.
// Approved business model (final):
//   STARTER  ₹50,000 – ₹10,00,000        @ 5% monthly
//   GROWTH   ₹10,00,001 – ₹30,00,000     @ 6% monthly
//   FORTUNE  ₹30,00,001 – ₹50,00,000     @ 7% monthly
//   Maximum single/total investment: ₹50,00,000
export type PlanKey = "starter" | "growth" | "fortune";

export const MIN_INVESTMENT = 50_000;
export const MAX_INVESTMENT = 5_000_000;

export const PLANS: Record<PlanKey, {
  key: PlanKey; label: string; rate: number; min: number; max: number;
  color: string; emoji: string; features: string[];
}> = {
  starter: {
    key: "starter", label: "Starter", rate: 5, min: 50_000, max: 1_000_000,
    color: "border-gold/60", emoji: "⭐",
    features: ["5% monthly payout", "₹50,000 – ₹10,00,000 slab", "2X target tracking"],
  },
  growth: {
    key: "growth", label: "Growth", rate: 6, min: 1_000_001, max: 3_000_000,
    color: "border-sky-400/60", emoji: "📈",
    features: ["6% monthly payout", "₹10,00,001 – ₹30,00,000 slab", "Priority verification"],
  },
  fortune: {
    key: "fortune", label: "Fortune", rate: 7, min: 3_000_001, max: 5_000_000,
    color: "border-fuchsia-400/60", emoji: "👑",
    features: ["7% monthly payout", "₹30,00,001 – ₹50,00,000 slab", "Premium handling"],
  },
};

export function planForAmount(amount: number): PlanKey {
  if (amount >= 3_000_001) return "fortune";
  if (amount >= 1_000_001) return "growth";
  return "starter";
}

export function planRate(key: PlanKey | string | null | undefined): number {
  const k = (key || "starter") as PlanKey;
  return PLANS[k]?.rate ?? 5;
}

export function fmtInr(n: number): string {
  return `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
}
