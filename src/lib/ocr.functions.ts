import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OcrInput = z.object({
  imageBase64: z.string().min(10).max(20_000_000),
  mimeType: z.string().min(3).max(64),
});

export const extractPaymentInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OcrInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const prompt = `You are an OCR extractor for Indian payment screenshots (UPI, GPay, PhonePe, Paytm, bank apps, crypto wallets). Extract the transaction info from this image and return ONLY a JSON object with this exact shape (no markdown, no commentary):
{"amount": number_or_null, "txn_ref": string_or_null, "method": "upi"|"btc"|"eth"|"usdt"|null, "status": "success"|"pending"|"failed"|null}
Use null when a field is not clearly visible.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/```json|```/g, "").trim();
    let parsed: { amount: number | null; txn_ref: string | null; method: string | null; status: string | null };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { amount: null, txn_ref: null, method: null, status: null };
    }
    return parsed;
  });
