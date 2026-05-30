import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(8000).optional(),
});

export const askAdminAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles || []).some((r: any) => r.role === "admin")) {
      throw new Error("Forbidden: admin only");
    }
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are H.A.D.'s professional crypto trading advisor. Respond in concise Hinglish (mix of Hindi + English). Cover: current price view, RSI/MACD/trend interpretation, HAD score (0-100), risk level, and an actionable recommendation. Add disclaimer: 'Yeh prediction nahi hai, technical view hai.'" },
          { role: "user", content: data.context ? `${data.context}\n\nQuestion: ${data.question}` : data.question },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || "(no response)";
    return { text };
  });
