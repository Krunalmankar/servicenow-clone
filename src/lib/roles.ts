// Pure role helpers, importable from business rules, tests and scripts.

export type SessionUser = {
  id: string;
  userName: string;
  name: string;
  email: string;
  roles: string[];
  groupIds: string[];
};

export function hasRole(user: SessionUser | null, ...roles: string[]) {
  if (!user) return false;
  if (user.roles.includes("admin")) return true;
  return roles.some((r) => user.roles.includes(r));
}

/** Agents are users with any fulfiller role. */
export function isAgent(user: SessionUser | null) {
  return hasRole(user, "itil", "catalog_admin", "knowledge_admin", "cmdb_admin");
}
