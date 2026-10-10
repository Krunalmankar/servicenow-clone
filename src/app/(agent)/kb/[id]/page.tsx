import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/list";
import { ChoiceField, DefaultSubmit, FormHeader, Grid, ReadOnly, Section, TextArea, TextField } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StateBadge } from "@/components/Badges";
import { Markdown } from "@/components/Markdown";
import { Activity } from "@/components/Activity";
import { saveArticleAction, transitionArticleAction } from "../actions";

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireRole("itil", "knowledge_admin");
  const { id } = await params;
  const { error } = await searchParams;
  const a = id === "new" ? null : await db.knowledgeArticle.findUnique({ where: { id }, include: { author: true } });
  if (id !== "new" && !a) notFound();
  const admin = hasRole(user, "knowledge_admin");
  const state = a?.state ?? "draft";
  return (
    <div className="card">
      <form action={saveArticleAction}>
        <input type="hidden" name="id" value={a?.id ?? ""} />
        <DefaultSubmit />
        <FormHeader title="Knowledge Article" number={a?.number}>
          {a && <StateBadge list="kbState" value={a.state} />}
          {state === "draft" && <button formAction={transitionArticleAction.bind(null, "review")} className="btn-secondary">Submit for review</button>}
          {state === "review" && admin && <button formAction={transitionArticleAction.bind(null, "published")} className="btn-success">Publish</button>}
          {state === "review" && <button formAction={transitionArticleAction.bind(null, "draft")} className="btn-secondary">Back to draft</button>}
          {state === "published" && admin && <button formAction={transitionArticleAction.bind(null, "retired")} className="btn-secondary">Retire</button>}
          {state !== "draft" && state !== "review" && <button formAction={transitionArticleAction.bind(null, "draft")} className="btn-secondary">Checkout (new draft)</button>}
          <button className="btn-primary">Save</button>
        </FormHeader>
        <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
        <Grid>
          <TextField label="Title" name="title" defaultValue={a?.title} required full />
          <ChoiceField label="Category" name="category" list="kbCategory" value={a?.category ?? "general"} />
          <TextField label="Knowledge base" name="knowledgeBase" defaultValue={a?.knowledgeBase ?? "IT"} />
          <TextField label="Keywords" name="keywords" defaultValue={a?.keywords ?? ""} full />
          {a && <ReadOnly label="Author" value={`${a.author.firstName} ${a.author.lastName}`} />}
          {a && <ReadOnly label="Published" value={fmtDate(a.publishedAt)} />}
          {a && <ReadOnly label="Views / helpful" value={`${a.views} views · ${a.helpfulYes} 👍 · ${a.helpfulNo} 👎`} />}
          <TextArea label="Article body (Markdown)" name="body" rows={12} defaultValue={a?.body ?? ""} required className="input font-mono text-xs" />
        </Grid>
      </form>
      {a && (
        <>
          <Section title="Preview"><div className="p-6"><Markdown source={a.body} /></div></Section>
          <Activity table="kb_knowledge" recordId={a.id} path={`/kb/${a.id}`} agent />
        </>
      )}
    </div>
  );
}
