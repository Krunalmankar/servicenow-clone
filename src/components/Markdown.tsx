// Minimal, safe markdown renderer for KB articles: headings, lists, bold, italics, inline code, paragraphs.
function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded bg-gray-100 px-1 text-[0.9em]">{p.slice(1, -1)}</code>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      const size = ["text-xl", "text-lg", "text-base"][h[1].length - 1];
      blocks.push(<p key={i} className={`mb-2 mt-4 font-semibold ${size}`}>{inline(h[2])}</p>);
      i++;
      continue;
    }
    if (/^(\d+\.|[-*])\s/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(\d+\.|[-*])\s/.test(lines[i])) items.push(lines[i++].replace(/^(\d+\.|[-*])\s/, ""));
      const cls = `mb-3 ml-6 space-y-1 ${ordered ? "list-decimal" : "list-disc"}`;
      blocks.push(ordered
        ? <ol key={i} className={cls}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>
        : <ul key={i} className={cls}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\d+\.\s|[-*]\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={i} className="mb-3">{inline(para.join(" "))}</p>);
  }
  return <div className="text-sm leading-relaxed text-gray-800">{blocks}</div>;
}
