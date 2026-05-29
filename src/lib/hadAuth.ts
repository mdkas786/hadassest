// Passwordless HAD ID auth helpers.
// Each HAD ID gets a deterministic synthetic email + password under the hood.
// User only ever types/sees their HAD ID.
export const HAD_ID_RE = /^HAD\d{4,5}$/;
export function normalizeHadId(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
export function hadEmail(hadId: string) {
  return `${hadId.toLowerCase()}@had.local`;
}
export function hadPassword(hadId: string) {
  // deterministic, never shown to user
  return `HADPW_${hadId.toUpperCase()}_v1_8546`;
}
