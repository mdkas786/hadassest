// Plan tiers shared across user pay, admin verify, and projections.
export type PlanKey = "starter" | "growth" | "fortune";

export const PLANS: Record<PlanKey, {
  key: PlanKey; label: string; rate: number; min: number; max: number;
  color: string; emoji: string; features: string[];
}> = {
  starter: {
    key: "starter", label: "Starter", rate: 5, min: 50_000, max: 499_999,
    color: "border-gold/60", emoji: "⭐",
    features: ["Monthly regular payouts", "2X overall target tracking", "Free crypto/UPI withdrawals"],
  },
  growth: {
    key: "growth", label: "Growth", rate: 6, min: 500_000, max: 999_999,
    color: "border-sky-400/60", emoji: "📈",
    features: ["Higher monthly return rate", "Priority account verification", "Dedicated personal support"],
  },
  fortune: {
    key: "fortune", label: "Fortune", rate: 7, min: 1_000_000, max: Number.POSITIVE_INFINITY,
    color: "border-fuchsia-400/60", emoji: "👑",
    features: ["Maximum corporate yields", "AI-powered portfolio insights", "Instant concierge withdrawals"],
  },
};

export function planForAmount(amount: number): PlanKey {
  if (amount >= 1_000_000) return "fortune";
  if (amount >= 500_000) return "growth";
  return "starter";
}

export function planRate(key: PlanKey | string | null | undefined): number {
  const k = (key || "starter") as PlanKey;
  return PLANS[k]?.rate ?? 5;
}

export function fmtInr(n: number): string {
  return `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
}
