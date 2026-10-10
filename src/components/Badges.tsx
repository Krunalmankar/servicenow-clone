import { label, type ChoiceList } from "@/lib/choices";

const PRIORITY_STYLE: Record<number, string> = {
  1: "bg-red-100 text-red-800 border-red-300",
  2: "bg-orange-100 text-orange-800 border-orange-300",
  3: "bg-yellow-100 text-yellow-800 border-yellow-300",
  4: "bg-sky-100 text-sky-800 border-sky-300",
  5: "bg-gray-100 text-gray-700 border-gray-300",
};

export function PriorityBadge({ value }: { value: number }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLE[value] ?? PRIORITY_STYLE[5]}`}>
      {label("priority", value)}
    </span>
  );
}

const STATE_TONE: Record<string, string> = {
  new: "bg-sky-50 text-sky-800", open: "bg-sky-50 text-sky-800", draft: "bg-gray-100 text-gray-700",
  in_progress: "bg-indigo-50 text-indigo-800", work_in_progress: "bg-indigo-50 text-indigo-800",
  assess: "bg-indigo-50 text-indigo-800", rca: "bg-indigo-50 text-indigo-800", fix_in_progress: "bg-indigo-50 text-indigo-800",
  authorize: "bg-amber-50 text-amber-800", review: "bg-amber-50 text-amber-800", scheduled: "bg-violet-50 text-violet-800",
  implement: "bg-indigo-50 text-indigo-800", on_hold: "bg-amber-50 text-amber-800", paused: "bg-amber-50 text-amber-800",
  requested: "bg-amber-50 text-amber-800", waiting_for_approval: "bg-amber-50 text-amber-800",
  resolved: "bg-emerald-50 text-emerald-800", published: "bg-emerald-50 text-emerald-800", approved: "bg-emerald-50 text-emerald-800",
  completed: "bg-emerald-50 text-emerald-800", delivered: "bg-emerald-50 text-emerald-800", operational: "bg-emerald-50 text-emerald-800",
  closed: "bg-gray-100 text-gray-700", closed_complete: "bg-gray-100 text-gray-700", retired: "bg-gray-100 text-gray-700",
  canceled: "bg-gray-100 text-gray-500", cancelled: "bg-gray-100 text-gray-500", closed_incomplete: "bg-gray-100 text-gray-500",
  rejected: "bg-red-50 text-red-700", non_operational: "bg-red-50 text-red-700", repair: "bg-amber-50 text-amber-800",
};

export function StateBadge({ list, value }: { list: ChoiceList; value: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${STATE_TONE[value] ?? "bg-gray-100 text-gray-700"}`}>
      {label(list, value)}
    </span>
  );
}
