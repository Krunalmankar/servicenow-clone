/** A scrollable list of checkboxes for many-to-many fields (roles, groups, members). */
export function CheckList({ name, options, selected }: { name: string; options: { id: string; label: string; hint?: string }[]; selected: string[] }) {
  return (
    <div className="max-h-56 overflow-y-auto rounded border border-gray-300 bg-white p-2 text-sm">
      {options.map((o) => (
        <label key={o.id} className="flex items-start gap-2 py-0.5">
          <input type="checkbox" name={name} value={o.id} defaultChecked={selected.includes(o.id)} className="mt-1" />
          <span>{o.label}{o.hint && <span className="ml-1 text-xs text-gray-500">{o.hint}</span>}</span>
        </label>
      ))}
    </div>
  );
}
