import { db } from "./db";

/** Tables exposed through the Table API (read). Writes are limited to incident. */
export const API_TABLES = {
  incident: { model: () => db.incident, search: ["number", "shortDescription"] },
  problem: { model: () => db.problem, search: ["number", "shortDescription"] },
  change_request: { model: () => db.changeRequest, search: ["number", "shortDescription"] },
  sc_req_item: { model: () => db.requestItem, search: ["number"] },
  sc_task: { model: () => db.catalogTask, search: ["number", "shortDescription"] },
  cmdb_ci: { model: () => db.configurationItem, search: ["name"] },
  kb_knowledge: { model: () => db.knowledgeArticle, search: ["number", "title"] },
  sys_user: { model: () => db.user, search: ["userName", "email"] },
  sys_user_group: { model: () => db.group, search: ["name"] },
} as const;

export type ApiTable = keyof typeof API_TABLES;

export function isApiTable(t: string): t is ApiTable {
  return t in API_TABLES;
}

/** Strips secrets before returning a record. */
export function clean<T extends Record<string, unknown>>(row: T) {
  const { passwordHash: _omit, ...rest } = row as T & { passwordHash?: string };
  return rest;
}
