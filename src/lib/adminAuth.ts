import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "cbfc_admin_session";
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password123";
const SESSION_SECRET = process.env.ADMIN_SECRET || "cbfc-hyderabad-secret-key-2026";

// Simple robust token generation: base64(timestamp:hmac-like)
export function generateSessionToken(): string {
  const ts = Date.now().toString();
  const hash = Buffer.from(`${ts}:${SESSION_SECRET}`).toString("base64");
  return `${ts}.${hash}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const [ts, hash] = token.split(".");
    if (!ts || !hash) return false;
    const expectedHash = Buffer.from(`${ts}:${SESSION_SECRET}`).toString("base64");
    if (hash !== expectedHash) return false;

    // Optional 7-day expiry check
    const tokenTime = parseInt(ts, 10);
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - tokenTime > maxAgeMs) return false;

    return true;
  } catch {
    return false;
  }
}

export function verifyAdminCredentials(inputUsername: string, inputPassword: string): boolean {
  if (!inputPassword) return false;
  const usernameValid = !inputUsername || inputUsername.trim().toLowerCase() === DEFAULT_ADMIN_USERNAME.trim().toLowerCase();
  const passwordValid = inputPassword.trim() === DEFAULT_ADMIN_PASSWORD.trim();
  return usernameValid && passwordValid;
}

export function verifyAdminPassword(inputPassword: string): boolean {
  return verifyAdminCredentials("admin", inputPassword);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

export { ADMIN_COOKIE_NAME, DEFAULT_ADMIN_USERNAME };
