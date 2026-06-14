export type OrderFormType = "AG_GROW" | "SULFAG";

export const FORM_TYPE_LABELS: Record<OrderFormType, string> = {
  AG_GROW: "AG GROW",
  SULFAG: "Sulfag",
};

export function parseFormTypeParam(param: string | undefined): OrderFormType | null {
  if (param === "ag-grow") return "AG_GROW";
  if (param === "sulfag") return "SULFAG";
  return null;
}

export function formTypeToParam(type: OrderFormType): string {
  return type === "AG_GROW" ? "ag-grow" : "sulfag";
}
