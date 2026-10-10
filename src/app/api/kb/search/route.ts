import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchArticles } from "@/lib/rules/knowledge";

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  // Match on any of the significant words so partial descriptions still find articles.
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3).slice(0, 5);
  const seen = new Map<string, { id: string; number: string; title: string }>();
  for (const w of words) {
    for (const a of await searchArticles(w, 5)) seen.set(a.id, { id: a.id, number: a.number, title: a.title });
  }
  return NextResponse.json([...seen.values()].slice(0, 5));
}
