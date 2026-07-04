import { useEffect, useState } from "react";
import { getVerificationMode, setVerificationMode } from "@/lib/approve";
import { toast } from "sonner";

export function VerificationModeToggle() {
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { getVerificationMode().then((m) => { setMode(m); setLoaded(true); }); }, []);
  async function update(next: "manual" | "automatic") {
    setMode(next);
    await setVerificationMode(next);
    toast.success(`Verification mode: ${next}`);
  }
  if (!loaded) return null;
  return (
    <div className="flex items-center gap-3 bg-card border border-[var(--gold)]/40 rounded-lg p-3 mb-4">
      <span className="text-xs uppercase tracking-wider text-[var(--gold)] font-semibold">Verification Mode</span>
      <div className="flex bg-secondary rounded overflow-hidden">
        {(["manual", "automatic"] as const).map((m) => (
          <button key={m} onClick={() => update(m)}
            className={`px-3 py-1 text-xs font-semibold capitalize transition ${mode === m ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : "text-muted-foreground hover:text-foreground"}`}>
            {m}
          </button>
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground ml-2">
        {mode === "automatic"
          ? "🚀 New payments auto-approve immediately."
          : "🛡 Admin must approve each payment."}
      </span>
    </div>
  );
}