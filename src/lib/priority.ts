// Impact x Urgency -> Priority lookup (dl_u_priority equivalent).
const MATRIX: Record<string, number> = {
  "1-1": 1, "1-2": 2, "1-3": 3,
  "2-1": 2, "2-2": 3, "2-3": 4,
  "3-1": 3, "3-2": 4, "3-3": 5,
};

export function calcPriority(impact: number, urgency: number): number {
  return MATRIX[`${impact}-${urgency}`] ?? 5;
}
