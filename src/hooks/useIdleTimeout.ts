import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sign the user out after `minutes` of mouse/keyboard/touch inactivity.
 * Pass `redirectTo` to navigate after sign-out.
 */
export function useIdleTimeout(minutes: number, redirectTo: string = "/login") {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: number | undefined;
    const ms = minutes * 60 * 1000;
    const reset = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await supabase.auth.signOut();
        try { window.location.href = redirectTo; } catch {}
      }, ms);
    };
    const evts: Array<keyof WindowEventMap> = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer) window.clearTimeout(timer);
      evts.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes, redirectTo]);
}
