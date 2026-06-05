import { supabase } from "@/integrations/supabase/client";

export async function checkAdminRole(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!error) {
    return !!data;
  }

  const { data: viaRpc, error: rpcError } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (rpcError) {
    return false;
  }

  return !!viaRpc;
}

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}