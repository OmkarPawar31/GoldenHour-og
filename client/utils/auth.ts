/**
 * Auth helpers — keep localStorage (client-side reads) and
 * HTTP cookies (edge middleware reads) in sync.
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/** Call this after a successful login/register to persist auth state. */
export function saveAuth(token: string, role: string) {
  // localStorage — readable by client components
  localStorage.setItem("gh_token", token);
  localStorage.setItem("gh_role", role);
  // Cookies — readable by Next.js edge middleware
  setCookie("gh_token", token);
  setCookie("gh_role", role);
}

/** Call this on logout. */
export function clearAuth() {
  localStorage.removeItem("gh_token");
  localStorage.removeItem("gh_role");
  localStorage.removeItem("gh_user");
  clearCookie("gh_token");
  clearCookie("gh_role");
}
