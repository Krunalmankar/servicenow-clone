import Link from "next/link";
import { hasRole, type SessionUser } from "@/lib/auth";

type NavLink = { href: string; label: string };
type NavApp = { title: string; links: NavLink[]; roles?: string[] };

const APPS: NavApp[] = [
  { title: "Self-Service", links: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/approvals", label: "My Approvals" },
    { href: "/portal", label: "Service Portal" },
  ] },
  { title: "Incident", roles: ["itil"], links: [
    { href: "/incident/new", label: "Create New" },
    { href: "/incident?filter=mine", label: "Assigned to me" },
    { href: "/incident?filter=my_groups", label: "Assigned to my groups" },
    { href: "/incident?filter=open", label: "Open" },
    { href: "/incident?filter=unassigned", label: "Open - Unassigned" },
    { href: "/incident?filter=all", label: "All" },
  ] },
  { title: "Problem", roles: ["itil"], links: [
    { href: "/problem/new", label: "Create New" },
    { href: "/problem?filter=open", label: "Open" },
    { href: "/problem?filter=known_error", label: "Known Errors" },
    { href: "/problem?filter=all", label: "All" },
  ] },
  { title: "Change", roles: ["itil"], links: [
    { href: "/change/new", label: "Create New" },
    { href: "/change?filter=open", label: "Open" },
    { href: "/change?filter=authorize", label: "Awaiting Authorization" },
    { href: "/change/schedule", label: "Change Schedule" },
    { href: "/change?filter=all", label: "All" },
  ] },
  { title: "Service Catalog", roles: ["itil", "catalog_admin"], links: [
    { href: "/sc/request", label: "Requests" },
    { href: "/sc/ritm", label: "Requested Items" },
    { href: "/sc/task", label: "Catalog Tasks" },
    { href: "/sc/item", label: "Maintain Items" },
    { href: "/sc/category", label: "Categories" },
  ] },
  { title: "Configuration (CMDB)", roles: ["itil", "cmdb_admin"], links: [
    { href: "/cmdb", label: "All CIs" },
    { href: "/cmdb?filter=business_service", label: "Business Services" },
    { href: "/cmdb?filter=server", label: "Servers" },
    { href: "/cmdb?filter=application", label: "Applications" },
    { href: "/cmdb/new", label: "Create CI" },
  ] },
  { title: "Knowledge", roles: ["itil", "knowledge_admin"], links: [
    { href: "/kb?filter=published", label: "Published" },
    { href: "/kb?filter=mine", label: "My Articles" },
    { href: "/kb?filter=review", label: "Pending Review" },
    { href: "/kb/new", label: "Create Article" },
  ] },
  { title: "Service Level Management", roles: ["itil"], links: [
    { href: "/sla/task", label: "Task SLAs" },
    { href: "/sla?filter=all", label: "SLA Definitions" },
  ] },
  { title: "User Administration", roles: ["admin"], links: [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/groups", label: "Groups" },
    { href: "/admin/roles", label: "Roles" },
  ] },
];

export function Navigator({ user }: { user: SessionUser }) {
  const apps = APPS.filter((a) => !a.roles || hasRole(user, ...a.roles));
  return (
    <nav className="h-full w-60 shrink-0 overflow-y-auto bg-sn-darker text-sm text-gray-200">
      {apps.map((app) => (
        <details key={app.title} open className="border-b border-white/5">
          <summary className="cursor-pointer select-none px-4 py-2 font-semibold text-white hover:bg-white/5">{app.title}</summary>
          <ul className="pb-2">
            {app.links.map((l) => (
              <li key={l.href}><Link href={l.href} className="block px-7 py-1 text-gray-300 hover:bg-white/10 hover:text-white">{l.label}</Link></li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  );
}
