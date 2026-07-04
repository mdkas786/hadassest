import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Extracts payment fields from an uploaded screenshot using the Lovable AI Gateway (Gemini vision).
export const extractPaymentFromImage = createServerFn({ method: "POST" })
  .inputValidator((data: { imageBase64: string; mimeType?: string }) =>
    z.object({ imageBase64: z.string().min(50), mimeType: z.string().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Lovable AI key missing on server" } as const;
    }
    const dataUrl = `data:${data.mimeType || "image/png"};base64,${data.imageBase64}`;
    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an OCR assistant for Indian payment app screenshots (PhonePe, GPay, Paytm, BHIM, bank apps, USDT crypto explorers). Read the image and return ONLY a strict JSON object with these keys: utr (string transaction/UTR/UPI ref number or empty), amount (number, INR or USD as a plain number with no currency symbol), date (string YYYY-MM-DD if visible else empty), time (string HH:MM if visible else empty), upi_id (the receiver UPI id if visible else empty), method (UPI | USDT TRC20 | USDT BEP20 | BTC | ETH | OTHER), app (PhonePe | GPay | Paytm | BHIM | Bank | Crypto | Other). Do not include any text outside the JSON.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the payment details from this screenshot." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `AI gateway error ${res.status}: ${text.slice(0, 200)}` } as const;
      }
      const json = (await res.json()) as any;
      const raw: string = json?.choices?.[0]?.message?.content ?? "";
      // strip code fences if present
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      let parsed: any = {};
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            parsed = JSON.parse(m[0]);
          } catch {}
        }
      }
      return {
        ok: true,
        utr: String(parsed.utr ?? ""),
        amount: Number(parsed.amount) || 0,
        date: String(parsed.date ?? ""),
        time: String(parsed.time ?? ""),
        upi_id: String(parsed.upi_id ?? ""),
        method: String(parsed.method ?? ""),
        app: String(parsed.app ?? ""),
      } as const;
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "OCR failed" } as const;
    }
  });