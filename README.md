# nowdesk: a ServiceNow-style ITSM platform

A self-hostable IT Service Management app modelled on ServiceNow ITSM. It has an
**agent workspace** for IT staff, a **self-service portal** for employees, and
**admin** screens for platform configuration, all backed by real business rules
(numbering, priority matrix, state models, approvals, SLAs, audit history).

Built with Next.js 15 (App Router, server actions), TypeScript, Prisma and Tailwind.

## Quick start

```bash
npm install
cp .env.example .env        # SQLite by default, no database server needed
npm run setup               # create the schema and load demo data
npm run dev                 # http://localhost:3000
```

Demo accounts (password `password` for all):

| User | Persona | What to try |
|------|---------|-------------|
| `admin` | System administrator | Everything, including users, groups, roles and SLA definitions |
| `beth.anglin` | Service Desk agent (itil) | Work incidents, fulfil catalog tasks |
| `fred.luddy` | Engineer + knowledge admin | Changes, problems, publish KB articles |
| `david.loo` | Change manager (CAB) | Approve changes in **My Approvals** |
| `don.goodliffe` | DBA (itil) | Database incidents/problems |
| `abel.tuter` | End user | Portal: report an issue, order a laptop, read KB |
| `ava.chen` | Abel's manager (approver) | Approve Abel's catalog requests in the portal |

`npm test` runs the business-rule test suite against a throwaway database.

## Modules

| Module | Highlights |
|--------|-----------|
| **Incident** | INC numbering, Impact × Urgency → Priority, New / In Progress / On Hold / Resolved / Closed / Canceled, on-hold reasons, mandatory resolution code + notes, reassignment and reopen counts, work notes vs. customer comments, field audit history, "Assign to me", "Create Problem", auto-close of resolved incidents after 7 days |
| **SLA** | SLA definitions per table with priority conditions, response and resolution SLAs, pause on On Hold, breach time pushed out by paused time, cancel + re-attach on priority change, resume on reopen, live % elapsed bars, breach tracking |
| **Problem** | PRB records, Assess → Root Cause Analysis → Fix in Progress → Resolved, workaround / cause / fix notes, Known Error flag, link incidents, linked incidents notified on resolution |
| **Change** | Normal, Standard (pre-approved) and Emergency changes, risk, implementation / backout / test plans, approval gate before scheduling, CAB approvals, actual start/end timestamps, close codes, schedule-conflict detection on the same CI, 14-day change schedule |
| **Service Catalog** | Categories, items with configurable variables (text, textarea, select, checkbox, date), REQ → RITM → SCTASK, manager approval, fulfilment tasks from item templates, request closes when the last task closes |
| **Approvals** | One inbox for change and request approvals (agent view and portal), comments required to reject |
| **CMDB** | CI classes (business service, application, server, database, network, computer, storage), relationships (depends on, runs on, hosted on…), upstream impacted business services, open incidents/changes per CI |
| **Knowledge** | Draft → Review → Published → Retired lifecycle, only knowledge admins publish, Markdown articles, views and helpful votes, article suggestions while users type an issue in the portal |
| **Users, groups, roles** | Users with managers, groups with members, roles granted directly or inherited through groups (`admin`, `itil`, `catalog_admin`, `knowledge_admin`, `cmdb_admin`, `approver_user`, `change_manager`) |
| **Dashboard** | KPI tiles, open incidents by priority/state/group, 14-day volume, SLA compliance and MTTR for the last 30 days, upcoming changes, my work |
| **Portal** | Report an issue, order from the catalog, search knowledge, track my requests, chat-style comments, accept or reopen a resolved incident, approvals |
| **Global search** | Search box in the header: an exact number (INC…, CHG…, KB…) opens the record; text searches across tables |

## REST API (Table API)

Modelled on ServiceNow's Table API. Authenticate with HTTP Basic (user name + password) or a browser session.

```bash
# List / search (incident, problem, change_request, sc_req_item, sc_task, cmdb_ci, kb_knowledge, sys_user, sys_user_group)
curl -u beth.anglin:password "http://localhost:3000/api/now/table/incident?sysparm_query=SAP&sysparm_limit=10&sysparm_offset=0"

# Get one record by id or number
curl -u beth.anglin:password http://localhost:3000/api/now/table/incident/INC0010001

# Create an incident (runs the same business rules as the UI: numbering, priority, SLAs, audit)
curl -u beth.anglin:password -X POST -H 'content-type: application/json' \
  -d '{"shortDescription":"Printer offline","impact":2,"urgency":2}' \
  http://localhost:3000/api/now/table/incident

# Update an incident by id
curl -u beth.anglin:password -X PATCH -H 'content-type: application/json' \
  -d '{"state":"resolved","resolutionCode":"solved_remotely","resolutionNotes":"Rebooted"}' \
  http://localhost:3000/api/now/table/incident/<id>
```

## Project layout

```
prisma/schema.prisma     data model (users, groups, roles, task tables, CMDB, KB, SLAs, audit)
prisma/seed.ts           demo data
src/lib/rules/           business rules: incident, problem, change, approval, catalog, knowledge
src/lib/sla.ts           SLA engine
src/lib/auth.ts          session auth; src/lib/roles.ts role helpers
src/app/(agent)/         agent workspace (lists, forms, dashboard, admin)
src/app/portal/          self-service portal
src/app/api/now/table/   REST Table API
tests/                   business-rule tests (node:test)
docs/PLAN.md             module plan and architecture
```

## Using PostgreSQL

The schema keeps choice fields as strings so it is portable. To move to Postgres, set
`provider = "postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at your database
and run `npm run setup`.

## Not built yet

Email notifications and inbound email, business calendars for SLAs (SLAs run 24×7 today),
on-call scheduling, a visual workflow designer, Major Incident management, file attachments,
and a CMDB discovery integration. The rule layer in `src/lib/rules` is where these plug in.
