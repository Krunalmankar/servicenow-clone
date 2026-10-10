import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { hasRole, type SessionUser } from "./roles";

export { hasRole, isAgent, type SessionUser } from "./roles";

const COOKIE = "sn_session";
const MAX_AGE = 60 * 60 * 12; // 12h

function secret() {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.uid !== "string" || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, createToken(userId), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Current user with effective roles (direct + inherited from groups). Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const uid = verifyToken((await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  const user = await db.user.findUnique({
    where: { id: uid },
    include: {
      roles: { include: { role: true } },
      memberships: { include: { group: { include: { roles: { include: { role: true } } } } } },
    },
  });
  if (!user || !user.active) return null;
  const roles = new Set(user.roles.map((r) => r.role.name));
  for (const m of user.memberships) for (const gr of m.group.roles) roles.add(gr.role.name);
  return {
    id: user.id,
    userName: user.userName,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    roles: [...roles],
    groupIds: user.memberships.map((m) => m.groupId),
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user, ...roles)) redirect("/forbidden");
  return user;
}
