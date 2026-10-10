"use client";

import { useEffect, useState } from "react";

type Hit = { id: string; number: string; title: string };

/** Deflection: suggests knowledge articles while the user describes their issue. */
export function KbSuggest({ inputName }: { inputName: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(`input[name="${inputName}"]`);
    if (!input) return;
    const onInput = () => setQ(input.value);
    input.addEventListener("input", onInput);
    return () => input.removeEventListener("input", onInput);
  }, [inputName]);

  useEffect(() => {
    if (q.trim().length < 3) { setHits([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/kb/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setHits(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  if (!hits.length) return null;
  return (
    <div className="rounded border border-sky-200 bg-sky-50 p-3 text-sm">
      <div className="mb-1 font-medium text-sky-900">These articles might help:</div>
      <ul className="list-disc pl-5">
        {hits.map((h) => <li key={h.id}><a className="link" href={`/portal/kb/${h.id}`} target="_blank" rel="noreferrer">{h.title}</a></li>)}
      </ul>
    </div>
  );
}
