// Client-side session helpers (localStorage based per spec)
export type UserSession = { had_id: string; name: string; login_time: number; last_activity: number };

const USER_KEY = "had_user";
const ADMIN_KEY = "had_admin";

export function getUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function setUser(s: { had_id: string; name: string }) {
  if (typeof window === "undefined") return;
  const session: UserSession = { ...s, login_time: Date.now(), last_activity: Date.now() };
  localStorage.setItem(USER_KEY, JSON.stringify(session));
}

export function touchUser() {
  if (typeof window === "undefined") return;
  const u = getUser();
  if (!u) return;
  u.last_activity = Date.now();
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

export function clearUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.isAdmin === true;
  } catch {
    return false;
  }
}

export function setAdmin() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_KEY, JSON.stringify({ isAdmin: true, loginTime: Date.now() }));
}

export function clearAdmin() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_KEY);
}

export const ADMIN_EMAIL = "hadasset2021@gmail.com";
export const ADMIN_PASSWORD = "Khan@$8665";