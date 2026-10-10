import bcrypt from "bcryptjs";
import { db } from "./db";
import { getCurrentUser, type SessionUser } from "./auth";

/** REST auth: HTTP Basic (user name + password) or the browser session cookie. */
export async function apiUser(req: Request): Promise<SessionUser | null> {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const [userName, ...rest] = Buffer.from(header.slice(6), "base64").toString().split(":");
    const password = rest.join(":");
    const user = await db.user.findUnique({
      where: { userName },
      include: { roles: { include: { role: true } }, memberships: { include: { group: { include: { roles: { include: { role: true } } } } } } },
    });
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) return null;
    const roles = new Set(user.roles.map((r) => r.role.name));
    for (const m of user.memberships) for (const gr of m.group.roles) roles.add(gr.role.name);
    return { id: user.id, userName: user.userName, name: `${user.firstName} ${user.lastName}`, email: user.email, roles: [...roles], groupIds: user.memberships.map((m) => m.groupId) };
  }
  return getCurrentUser();
}
