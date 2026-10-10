import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, isAgent } from "@/lib/auth";
import { fmtDate } from "@/lib/list";
import { label } from "@/lib/choices";
import { parseVariables } from "@/lib/rules/catalog";
import { StateBadge } from "@/components/Badges";
import { NoImplicitSubmit } from "@/components/Form";
import { ErrorBanner, InfoBanner } from "@/components/ErrorBanner";
import { commentAction, resolutionResponseAction } from "../../../actions";

export default async function Ticket({ params, searchParams }: { params: Promise<{ table: string; id: string }>; searchParams: Promise<{ created?: string; error?: string }> }) {
  const user = await requireUser();
  const { table, id } = await params;
  const { created, error } = await searchParams;

  let header: { number: string; title: string; badge: React.ReactNode; details: [string, React.ReactNode][]; description?: string | null };
  let resolved = false;
  if (table === "incident") {
    const inc = await db.incident.findUnique({ where: { id }, include: { assignmentGroup: true, assignedTo: true } });
    if (!inc || (inc.callerId !== user.id && !isAgent(user))) notFound();
    resolved = inc.state === "resolved";
    header = {
      number: inc.number, title: inc.shortDescription, badge: <StateBadge list="incidentState" value={inc.state} />, description: inc.description,
      details: [
        ["Opened", fmtDate(inc.openedAt)], ["Priority", label("priority", inc.priority)],
        ["Assigned to", inc.assignedTo ? `${inc.assignedTo.firstName} ${inc.assignedTo.lastName}` : inc.assignmentGroup?.name ?? "Service Desk"],
        ...(inc.resolutionNotes ? [["Resolution", inc.resolutionNotes] as [string, string]] : []),
      ],
    };
  } else if (table === "sc_req_item") {
    const r = await db.requestItem.findUnique({ where: { id }, include: { item: true, request: { include: { requestedFor: true } }, tasks: true } });
    if (!r || (![r.request.requestedForId, r.request.requestedById].includes(user.id) && !isAgent(user))) notFound();
    const values = JSON.parse(r.variables || "{}") as Record<string, string>;
    header = {
      number: r.number, title: r.item.name, badge: <StateBadge list="ritmStage" value={r.stage} />,
      details: [
        ["Request", r.request.number], ["Requested for", `${r.request.requestedFor.firstName} ${r.request.requestedFor.lastName}`],
        ["Opened", fmtDate(r.openedAt)], ["Approval", label("approval", r.approval)], ["Quantity", r.quantity],
        ...parseVariables(r.item.variables).map((v) => [v.label, v.type === "checkbox" ? (values[v.name] ? "Yes" : "No") : values[v.name]] as [string, string]),
        ["Progress", `${r.tasks.filter((t) => t.state.startsWith("closed")).length} of ${r.tasks.length} tasks complete`],
      ],
    };
  } else notFound();

  const comments = await db.journalEntry.findMany({ where: { table, recordId: id, type: "comments" }, include: { author: true }, orderBy: { createdAt: "asc" } });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portal/requests" className="link text-sm">← My Requests</Link>
      {created && <div className="mt-3"><InfoBanner>Submitted. Your reference is <b>{header.number}</b>.</InfoBanner></div>}
      <ErrorBanner error={error} />
      <div className="card mt-3 p-6">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500">{header.number}</div>
            <h1 className="text-xl font-semibold text-sn-dark">{header.title}</h1>
          </div>
          {header.badge}
        </div>
        {header.description && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{header.description}</p>}
        <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-y-1 text-sm">
          {header.details.map(([k, v]) => <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {resolved && (
          <div className="mt-5 rounded border border-emerald-300 bg-emerald-50 p-4 text-sm">
            <p className="mb-3 font-medium text-emerald-900">This incident has been resolved. Is your issue fixed?</p>
            <form className="flex flex-wrap gap-2">
              <NoImplicitSubmit />
              <input type="hidden" name="id" value={id} />
              <button formAction={resolutionResponseAction.bind(null, "accept")} className="btn-success">Yes, close it</button>
              <input name="reason" placeholder="If not, tell us why" className="input w-64" />
              <button formAction={resolutionResponseAction.bind(null, "reopen")} className="btn-secondary">No, reopen</button>
            </form>
          </div>
        )}
      </div>
      <div className="card mt-4 p-6">
        <h2 className="mb-3 font-semibold text-sn-dark">Conversation</h2>
        <ol className="mb-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className={`rounded-lg px-4 py-2 text-sm ${c.authorId === user.id ? "ml-12 bg-sky-50" : "mr-12 bg-gray-100"}`}>
              <div className="mb-0.5 text-xs text-gray-500"><b>{c.author.firstName} {c.author.lastName}</b> · {fmtDate(c.createdAt)}</div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
          {comments.length === 0 && <li className="text-sm text-gray-500">No messages yet.</li>}
        </ol>
        <form action={commentAction} className="flex gap-2">
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="id" value={id} />
          <input name="body" placeholder="Add a comment" className="input" required />
          <button className="btn-primary">Send</button>
        </form>
      </div>
    </div>
  );
}
