import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, isAgent } from "@/lib/auth";
import { label } from "@/lib/choices";
import { fmtDate } from "@/lib/list";
import { Markdown } from "@/components/Markdown";
import { kbFeedbackAction } from "../../actions";

export default async function PortalArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ thanks?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { thanks } = await searchParams;
  const a = await db.knowledgeArticle.findUnique({ where: { id }, include: { author: true } });
  if (!a || (a.state !== "published" && !isAgent(user))) notFound();
  if (!thanks) await db.knowledgeArticle.update({ where: { id }, data: { views: { increment: 1 } } });
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portal/kb" className="link text-sm">← Knowledge</Link>
      <article className="card mt-3 p-8">
        <div className="text-xs text-gray-500">{a.number} · {label("kbCategory", a.category)} · Updated {fmtDate(a.updatedAt)} · {a.author.firstName} {a.author.lastName}</div>
        <h1 className="mb-4 mt-1 text-2xl font-semibold text-sn-dark">{a.title}</h1>
        <Markdown source={a.body} />
        <div className="mt-8 border-t border-gray-200 pt-4 text-sm">
          {thanks ? <p className="text-emerald-700">Thanks for your feedback!</p> : (
            <form className="flex items-center gap-3">
              <input type="hidden" name="id" value={a.id} />
              <span>Was this article helpful?</span>
              <button formAction={kbFeedbackAction.bind(null, true)} className="btn-secondary">Yes</button>
              <button formAction={kbFeedbackAction.bind(null, false)} className="btn-secondary">No</button>
              <Link href="/portal/issue" className="link ml-auto">Still need help? Report an issue</Link>
            </form>
          )}
        </div>
      </article>
    </div>
  );
}
