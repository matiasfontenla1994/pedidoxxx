import { db, newId, nowIso } from "@/lib/db";

const LOCKOUT_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  await db.prepare(
    "INSERT INTO login_attempts (id, email, success, created_at) VALUES (?, ?, ?, ?)"
  ).run(newId(), email.trim().toLowerCase(), success ? 1 : 0, nowIso());
}

export async function isLoginLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60_000).toISOString();
  const row = (await db
    .prepare(
      "SELECT COUNT(*)::int as count FROM login_attempts WHERE email = ? AND success = 0 AND created_at > ?"
    )
    .get(email.trim().toLowerCase(), since)) as { count: number };
  return row.count >= MAX_FAILED_ATTEMPTS;
}

export const LOGIN_LOCKOUT_MESSAGE = `Demasiados intentos fallidos. Esperá ${LOCKOUT_WINDOW_MINUTES} minutos e intentá de nuevo.`;
