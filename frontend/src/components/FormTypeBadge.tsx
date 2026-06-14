import type { OrderFormType } from "../types";
import { FORM_TYPE_LABELS } from "../lib/orderFormType";

export function FormTypeBadge({ type }: { type: OrderFormType }) {
  const isSulfag = type === "SULFAG";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isSulfag ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"
      }`}
    >
      {FORM_TYPE_LABELS[type]}
    </span>
  );
}
