import type { PackingGroup, Product } from "../types";

type GroupLike = Pick<PackingGroup, "column_headers"> & { products: Pick<Product, "s_no">[] };

/** S.NO ranges from the AG GROW / Sulfag Excel order forms (fallback when headers are ambiguous). */
function unitSuffixFromSNo(sNo: number): string | null {
  if (sNo >= 1 && sNo <= 24) return "All in Litres";
  if (sNo >= 25 && sNo <= 37) return "All in kgs";
  if (sNo >= 38 && sNo <= 44) return "All in Litres";
  if (sNo === 45) return "All in kgs";
  if (sNo === 47) return "All in Litres";
  if (sNo === 51) return "All in kgs";
  return null;
}

function headerUnitSuffix(headers: string[]): "litres" | "kgs" | null {
  let hasMl = false;
  let hasKg = false;

  for (const header of headers) {
    const h = header.toLowerCase();
    // ml, ltr, litre — liquid columns (e.g. 50ml, 1ltr)
    if (/ml|ltr|litre|liter/.test(h)) {
      hasMl = true;
    }
    // kg, gm, or gram columns (e.g. 1kg, 50g, 120g — not \bkg\b which misses "1kg")
    if (/kg|gm/.test(h)) {
      hasKg = true;
    }
    if (/\d+g(?!m)/.test(h)) {
      hasKg = true;
    }
  }

  if (hasMl && !hasKg) return "litres";
  if (hasKg && !hasMl) return "kgs";
  if (hasMl) return "litres";
  if (hasKg) return "kgs";
  return null;
}

/** Section subtitle suffix: column headers first, then S.NO fallback. */
export function packingGroupUnitSuffix(group: GroupLike): string | null {
  const fromHeaders = headerUnitSuffix(group.column_headers);
  if (fromHeaders === "litres") return "All in Litres";
  if (fromHeaders === "kgs") return "All in kgs";

  const sNos = group.products.map((p) => p.s_no);
  if (sNos.length > 0) {
    const fromSNo = unitSuffixFromSNo(Math.min(...sNos));
    if (fromSNo) return fromSNo;
  }

  return null;
}
