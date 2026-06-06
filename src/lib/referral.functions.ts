import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyReferralRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabase
      .from("profiles")
      .select("had_id")
      .eq("id", userId)
      .maybeSingle();

    const hadId = profile?.had_id;
    if (!hadId) return { rows: [] };

    const { data: referred } = await supabaseAdmin
      .from("profiles")
      .select("id, had_id, full_name, created_at")
      .eq("referred_by", hadId)
      .order("created_at", { ascending: false });

    const referredRows = referred || [];
    const userIds = referredRows.map((row) => row.id);
    const hadIds = referredRows.map((row) => row.had_id);

    const [{ data: investments }, { data: sponsorIncome }] = await Promise.all([
      userIds.length
        ? supabaseAdmin
            .from("investments")
            .select("user_id, amount_invested")
            .in("user_id", userIds)
        : Promise.resolve({ data: [] as { user_id: string; amount_invested: number }[] }),
      hadIds.length
        ? supabaseAdmin
            .from("sponsor_income")
            .select("referred_had_id, sponsor_amount")
            .eq("earner_user_id", userId)
            .in("referred_had_id", hadIds)
        : Promise.resolve({ data: [] as { referred_had_id: string; sponsor_amount: number }[] }),
    ]);

    const investmentByUser = new Map(
      (investments || []).map((row) => [row.user_id, Number(row.amount_invested || 0)]),
    );
    const incomeByHad = new Map<string, number>();
    for (const row of sponsorIncome || []) {
      incomeByHad.set(
        row.referred_had_id,
        Number(incomeByHad.get(row.referred_had_id) || 0) + Number(row.sponsor_amount || 0),
      );
    }

    return {
      rows: referredRows.map((row) => ({
        id: row.id,
        had_id: row.had_id,
        full_name: row.full_name,
        created_at: row.created_at,
        investment_amount: Number(investmentByUser.get(row.id) || 0),
        referral_income_received: Number(incomeByHad.get(row.had_id) || 0),
      })),
    };
  });