import type { OrderStatus } from "../types";

const LABELS: Record<OrderStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-slate-200 text-slate-700" },
  SUBMITTED_TO_HO: { label: "Submitted → HO", cls: "bg-amber-100 text-amber-800" },
  SUBMITTED_TO_ADMIN: { label: "HO → Admin", cls: "bg-orange-100 text-orange-800" },
  HO_FORWARDED: { label: "Admin → Factory", cls: "bg-sky-100 text-sky-800" },
  FACTORY_RESPONDED: { label: "Factory responded", cls: "bg-violet-100 text-violet-800" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", cls: "bg-rose-100 text-rose-800" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = LABELS[status];
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}
