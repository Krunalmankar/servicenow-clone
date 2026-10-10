import { db } from "./db";

const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`;

export async function userOptions() {
  const users = await db.user.findMany({ where: { active: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] });
  return users.map((u) => ({ id: u.id, label: fullName(u) }));
}

/** Users who hold a fulfiller role directly or through a group. */
export async function agentOptions() {
  const users = await db.user.findMany({
    where: {
      active: true,
      OR: [
        { roles: { some: { role: { name: { in: ["itil", "admin"] } } } } },
        { memberships: { some: { group: { roles: { some: { role: { name: { in: ["itil", "admin"] } } } } } } } },
      ],
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return users.map((u) => ({ id: u.id, label: fullName(u) }));
}

export async function groupOptions() {
  const groups = await db.group.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return groups.map((g) => ({ id: g.id, label: g.name }));
}

export async function ciOptions() {
  const cis = await db.configurationItem.findMany({ where: { status: { not: "retired" } }, orderBy: { name: "asc" } });
  return cis.map((c) => ({ id: c.id, label: c.name }));
}

export async function problemOptions() {
  const rows = await db.problem.findMany({ where: { state: { notIn: ["closed"] } }, orderBy: { number: "desc" } });
  return rows.map((p) => ({ id: p.id, label: `${p.number} – ${p.shortDescription}` }));
}

export async function changeOptions() {
  const rows = await db.changeRequest.findMany({ orderBy: { number: "desc" }, take: 200 });
  return rows.map((c) => ({ id: c.id, label: `${c.number} – ${c.shortDescription}` }));
}

export { fullName };
