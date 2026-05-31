import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  question: z.string().min(1).max(4000),
  context: z.string().max(12000).optional(),
  model: z.enum(["google/gemini-2.5-pro", "google/gemini-2.5-flash"]).optional(),
  system: z.string().max(4000).optional(),
});

export const askAdminAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles || []).some((r: any) => r.role === "admin")) throw new Error("Forbidden: admin only");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const system = data.system || "You are H.A.D.'s professional crypto trading advisor. Respond in concise Hinglish (mix of Hindi + English). Add disclaimer: 'Yeh technical view hai, guaranteed prediction nahi.'";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: data.model || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.context ? `${data.context}\n\nQuestion: ${data.question}` : data.question },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    return { text: json?.choices?.[0]?.message?.content || "(no response)" };
  });
