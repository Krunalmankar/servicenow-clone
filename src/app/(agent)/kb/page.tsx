import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { label } from "@/lib/choices";
import { listParams, fmtDate, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";
import { StateBadge } from "@/components/Badges";

export default async function KbList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRole("itil", "knowledge_admin");
  const params = await searchParams;
  const lp = listParams(params);
  const filter = lp.filter || "published";
  const where: Prisma.KnowledgeArticleWhereInput = {};
  if (["published", "review", "draft", "retired"].includes(filter)) where.state = filter;
  if (filter === "mine") where.authorId = user.id;
  if (lp.q) where.OR = [{ number: { contains: lp.q } }, { title: { contains: lp.q } }, { body: { contains: lp.q } }];
  const sort = ["number", "title", "views", "updatedAt"].includes(lp.sort) ? lp.sort : "number";
  const [rows, total] = await Promise.all([
    db.knowledgeArticle.findMany({ where, orderBy: { [sort]: lp.dir }, skip: lp.skip, take: lp.take, include: { author: true } }),
    db.knowledgeArticle.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "number", label: "Number", sortable: true, render: (r) => r.number },
    { key: "title", label: "Title", sortable: true, render: (r) => r.title },
    { key: "category", label: "Category", render: (r) => label("kbCategory", r.category) },
    { key: "state", label: "Workflow", render: (r) => <StateBadge list="kbState" value={r.state} /> },
    { key: "author", label: "Author", render: (r) => `${r.author.firstName} ${r.author.lastName}` },
    { key: "views", label: "Views", sortable: true, render: (r) => r.views },
    { key: "helpful", label: "Helpful", render: (r) => (r.helpfulYes + r.helpfulNo ? `${Math.round((r.helpfulYes / (r.helpfulYes + r.helpfulNo)) * 100)}%` : "") },
    { key: "updatedAt", label: "Updated", sortable: true, render: (r) => fmtDate(r.updatedAt) },
  ];
  return <ListView title="Knowledge" basePath="/kb" newHref="/kb/new" rows={rows} total={total} columns={columns} rowHref={(r) => `/kb/${r.id}`}
    params={params} page={lp.page} sort={sort} dir={lp.dir} activeFilter={filter}
    filters={[{ value: "published", label: "Published" }, { value: "review", label: "In review" }, { value: "draft", label: "Draft" }, { value: "mine", label: "My articles" }, { value: "retired", label: "Retired" }, { value: "all", label: "All" }]} />;
}
