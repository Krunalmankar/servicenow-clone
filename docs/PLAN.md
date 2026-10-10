# ServiceNow-style ITSM Clone: Plan

## Goal
A self-hostable IT Service Management platform modelled on ServiceNow ITSM:
an agent workspace for IT staff, a self-service portal for employees, and an
admin area for platform configuration.

## Modules
| # | Module | Key records | Highlights |
|---|--------|-------------|------------|
| 1 | Platform / Users | User, Group, Role | Roles granted directly or via groups, group membership, managers |
| 2 | Incident | INC | Impact x Urgency = Priority matrix, state model (New, In Progress, On Hold, Resolved, Closed, Canceled), work notes vs. customer comments, field audit history |
| 3 | SLA | SLA Definition, Task SLA | Response/Resolution SLAs by condition, pause on On Hold, breach tracking, % elapsed |
| 4 | Problem | PRB | Link incidents, root cause, workaround, Known Error |
| 5 | Change | CHG | Normal / Standard / Emergency, risk, plans, CAB approvals, schedule |
| 6 | Service Catalog & Requests | Category, Item, REQ, RITM, SCTASK | Item variables, cart-less ordering, manager approval, fulfilment tasks |
| 7 | CMDB | CI, CI Relationship | CI classes, environments, upstream/downstream relationships, impacted records |
| 8 | Knowledge | KB article | Draft, Review, Published, Retired lifecycle, search, helpful votes |
| 9 | Dashboards & Reports | n/a | Open by priority/state, SLA breaches, MTTR, aging |
| 10 | Self-service Portal | n/a | Report an issue, order items, search KB, track my tickets, approvals |

## Architecture
* **Next.js 15 (App Router) + TypeScript**, server components for reads and
  server actions for writes; no separate API server needed. REST endpoints
  under `/api` for integrations.
* **Prisma ORM.** SQLite by default for zero-setup dev; switch the datasource
  provider to `postgresql` for production (schema avoids SQLite-only features).
* **Auth:** username/password (bcrypt), HMAC-signed session cookie, role checks
  in server actions (`requireRole`). Roles: `admin`, `itil`, `catalog_admin`,
  `knowledge_admin`, `cmdb_admin`, `approver_user`; plain users get the portal.
* **Business rules** live in `src/lib/rules/*` and run on every write:
  numbering (INC0010001...), priority calc, state timestamps, audit history,
  SLA processing.
* **UI:** Tailwind. Agent workspace with an application navigator, list views
  (search, filter, sort, paging) and form views with activity stream.

## Build order
1. Platform: auth, users/groups/roles, navigator, list/form framework
2. Incident + SLA engine + activity/audit
3. Problem, Change (+ approvals)
4. Service Catalog, Requests, fulfilment tasks
5. CMDB, Knowledge
6. Dashboards, portal polish, REST API
