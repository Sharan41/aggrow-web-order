import type { PackingGroup } from "../types";

type GroupLike = Pick<PackingGroup, "column_headers">;

/** Section subtitle suffix from column headers: ml → Litres, kg/gm → kgs. */
export function packingGroupUnitSuffix(group: GroupLike): string | null {
  let hasMl = false;
  let hasKg = false;

  for (const header of group.column_headers) {
    const h = header.toLowerCase();
    if (/ml\b/.test(h)) {
      hasMl = true;
    }
    if (/\bkg\b/.test(h)) {
      hasKg = true;
    }
    if (/\bgm\b/.test(h)) {
      hasKg = true;
    }
  }

  if (hasMl && !hasKg) return "All in Litres";
  if (hasKg && !hasMl) return "All in kgs";
  if (hasMl) return "All in Litres";
  if (hasKg) return "All in kgs";
  return null;
}
