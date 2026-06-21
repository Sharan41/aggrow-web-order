import { useMemo } from "react";
import type { Catalog, OrderItem, PackingGroup, Product } from "../types";

export type FormMode =
  | "customer-edit"
  | "ho-edit"
  | "ho-view"
  | "factory-respond"
  | "customer-view-response"
  | "customer-view-ordered"
  | "factory-view"
  | "view";

interface CellState {
  customerQty: number;
  hoQty: number;
  factoryAvailable: boolean | null;
  factoryNote: string | null;
  available: boolean;
}

export type CellMap = Record<string, CellState>;

export type RemarksMap = Record<number, string>;

export const cellKey = (productId: number, size: string) => `${productId}::${size}`;

export function buildCellMap(catalog: Catalog | null, items: OrderItem[]): CellMap {
  const map: CellMap = {};
  if (catalog) {
    for (const cat of catalog.categories) {
      for (const pg of cat.packing_groups) {
        for (const p of pg.products) {
          for (const pk of p.packings) {
            map[cellKey(p.id, pk.size_label)] = {
              customerQty: 0,
              hoQty: 0,
              factoryAvailable: null,
              factoryNote: null,
              available: !!pk.available,
            };
          }
        }
      }
    }
  }
  for (const it of items) {
    const k = cellKey(it.product_id, it.size_label);
    const existing = map[k] ?? {
      customerQty: 0,
      hoQty: 0,
      factoryAvailable: null,
      factoryNote: null,
      available: true,
    };
    map[k] = {
      ...existing,
      customerQty: it.customer_qty,
      hoQty: it.ho_qty,
      factoryAvailable: it.factory_available,
      factoryNote: it.factory_item_note,
    };
  }
  return map;
}

export function buildRemarksMap(
  catalog: Catalog | null,
  remarks: { product_id: number; remarks: string | null }[],
): RemarksMap {
  const map: RemarksMap = {};
  if (catalog) {
    for (const cat of catalog.categories) {
      for (const pg of cat.packing_groups) {
        for (const p of pg.products) {
          map[p.id] = "";
        }
      }
    }
  }
  for (const r of remarks) {
    map[r.product_id] = r.remarks ?? "";
  }
  return map;
}

export function remarksMapToInput(
  map: RemarksMap,
  existing: { product_id: number }[] = [],
): { product_id: number; remarks: string | null }[] {
  const existingIds = new Set(existing.map((r) => r.product_id));
  const out: { product_id: number; remarks: string | null }[] = [];
  for (const [pid, remarks] of Object.entries(map)) {
    const trimmed = remarks.trim();
    const productId = Number(pid);
    if (trimmed || existingIds.has(productId)) {
      out.push({ product_id: productId, remarks: trimmed || null });
    }
  }
  return out;
}

export function cellsToItems(map: CellMap, which: "customer" | "ho"): { product_id: number; size_label: string; qty: number }[] {
  const out: { product_id: number; size_label: string; qty: number }[] = [];
  for (const [key, v] of Object.entries(map)) {
    const qty = which === "customer" ? v.customerQty : v.hoQty;
    if (qty > 0) {
      const [pid, size] = key.split("::");
      out.push({ product_id: Number(pid), size_label: size, qty });
    }
  }
  return out;
}

interface Props {
  catalog: Catalog;
  cells: CellMap;
  remarks?: RemarksMap;
  onRemarksChange?: (next: RemarksMap) => void;
  onChange?: (next: CellMap) => void;
  mode: FormMode;
  hideRemarks?: boolean;
  showPrint?: boolean;
}

export function OrderFormTable({
  catalog,
  cells,
  remarks = {},
  onRemarksChange,
  onChange,
  mode,
  hideRemarks = false,
  showPrint = false,
}: Props) {
  const readOnly =
    mode === "view" ||
    mode === "ho-view" ||
    mode === "customer-view-response" ||
    mode === "customer-view-ordered" ||
    mode === "factory-view" ||
    !onChange;
  const showRemarks = !hideRemarks && mode !== "factory-respond";
  const remarksEditable =
    (mode === "customer-edit" || mode === "ho-edit") && !!onRemarksChange;

  // Determine which products to show (row filtering) based on mode
  const visibleProducts = useMemo(() => {
    if (mode === "customer-edit") return null;
    const set = new Set<number>();
    for (const [key, v] of Object.entries(cells)) {
      let include = false;
      if (mode === "ho-edit" || mode === "ho-view") {
        include = v.customerQty > 0;
      } else if (mode === "factory-respond") {
        include = v.hoQty > 0;
      } else if (mode === "customer-view-response") {
        include = v.factoryAvailable !== null || !!(v.factoryNote?.trim());
      } else if (mode === "customer-view-ordered") {
        include = v.customerQty > 0;
      } else if (mode === "factory-view") {
        include =
          v.hoQty > 0 &&
          (v.factoryAvailable !== null || !!(v.factoryNote?.trim()));
      }
      if (include) {
        const pid = Number(key.split("::")[0]);
        set.add(pid);
      }
    }
    return set;
  }, [cells, mode]);

  // Column filtering ONLY for factory-respond (compact view of HO-selected sizes)
  const visibleSizes = useMemo(() => {
    if (mode !== "factory-respond") return null;
    const perGroup = new Map<number, Set<string>>();
    for (const cat of catalog.categories) {
      for (const pg of cat.packing_groups) {
        const set = new Set<string>();
        for (const p of pg.products) {
          for (const pk of p.packings) {
            if ((cells[cellKey(p.id, pk.size_label)]?.hoQty ?? 0) > 0) {
              set.add(pk.size_label);
            }
          }
        }
        perGroup.set(pg.id, set);
      }
    }
    return perGroup;
  }, [catalog, cells, mode]);

  const update = (product_id: number, size: string, patch: Partial<CellState>) => {
    if (!onChange) return;
    const k = cellKey(product_id, size);
    const prev = cells[k] ?? {
      customerQty: 0,
      hoQty: 0,
      factoryAvailable: null,
      factoryNote: null,
      available: false,
    };
    onChange({ ...cells, [k]: { ...prev, ...patch } });
  };

  const updateRemarks = (productId: number, value: string) => {
    if (!onRemarksChange) return;
    onRemarksChange({ ...remarks, [productId]: value });
  };

  return (
    <div className="space-y-4">
      {showPrint && (
        <div className="flex justify-end print:hidden">
          <button type="button" className="btn-secondary text-sm" onClick={() => window.print()}>
            Print table
          </button>
        </div>
      )}
      <div id="order-form-print-area" className="space-y-8">
      {catalog.categories.map((cat) => {
        const groups = cat.packing_groups.filter((pg) => {
          // For factory-respond, only show groups with at least one visible column
          if (mode === "factory-respond") {
            const sizes = visibleSizes?.get(pg.id);
            return sizes && sizes.size > 0;
          }
          // For row-filtered modes, only show groups with at least one visible product
          if (
            mode === "ho-edit" ||
            mode === "ho-view" ||
            mode === "customer-view-response" ||
            mode === "customer-view-ordered" ||
            mode === "factory-view"
          ) {
            return pg.products.some((p) => visibleProducts?.has(p.id));
          }
          return true;
        });
        if (groups.length === 0) return null;
        return (
          <section key={cat.id} className="card p-3 md:p-4">
            <h2 className="text-base md:text-lg font-semibold text-brand-700 mb-3">{cat.name}</h2>
            <div className="space-y-6">
              {groups.map((pg) => (
                <GroupTable
                  key={pg.id}
                  group={pg}
                  cells={cells}
                  remarks={remarks}
                  mode={mode}
                  readOnly={readOnly}
                  showRemarks={showRemarks}
                  remarksEditable={remarksEditable}
                  onUpdate={update}
                  onRemarksUpdate={updateRemarks}
                  visibleProducts={visibleProducts}
                  visibleSizes={visibleSizes?.get(pg.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}

interface GroupProps {
  group: PackingGroup;
  cells: CellMap;
  remarks: RemarksMap;
  mode: FormMode;
  readOnly: boolean;
  showRemarks: boolean;
  remarksEditable: boolean;
  onUpdate: (productId: number, size: string, patch: Partial<CellState>) => void;
  onRemarksUpdate: (productId: number, value: string) => void;
  visibleProducts: Set<number> | null;
  visibleSizes: Set<string> | undefined;
}

function GroupTable({
  group,
  cells,
  remarks,
  mode,
  readOnly,
  showRemarks,
  remarksEditable,
  onUpdate,
  onRemarksUpdate,
  visibleProducts,
  visibleSizes,
}: GroupProps) {
  // Column filtering only for factory-respond mode
  const headers = group.column_headers.filter((h) => {
    if (mode === "factory-respond") {
      return visibleSizes?.has(h);
    }
    return true;
  });
  // Row filtering for HO modes, factory mode, and customer response mode
  const products = group.products.filter((p) => {
    if (
      mode === "ho-edit" ||
      mode === "ho-view" ||
      mode === "factory-respond" ||
      mode === "customer-view-response" ||
      mode === "customer-view-ordered" ||
      mode === "factory-view"
    ) {
      return visibleProducts?.has(p.id);
    }
    return true;
  });
  if (products.length === 0 || headers.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs md:text-sm font-medium text-slate-600 mb-2">
        {group.label} (All in cases)
      </h3>
      <div className="overflow-auto">
        <table className="min-w-full border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border px-1 md:px-2 py-1 text-left min-w-[180px] md:min-w-[220px]">Product</th>
              <th className="border px-1 md:px-2 py-1 text-left w-20 md:w-24">Packing</th>
              {headers.map((h) => (
                <th key={h} className="border px-1 md:px-2 py-1 text-center whitespace-nowrap">
                  {h}
                </th>
              ))}
              {showRemarks && (
                <th className="border px-1 md:px-2 py-1 text-left min-w-[200px] md:min-w-[280px]">
                  Remarks
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                headers={headers}
                cells={cells}
                remarks={remarks[p.id] ?? ""}
                mode={mode}
                readOnly={readOnly}
                showRemarks={showRemarks}
                remarksEditable={remarksEditable}
                onUpdate={onUpdate}
                onRemarksUpdate={onRemarksUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RowProps {
  product: Product;
  headers: string[];
  cells: CellMap;
  remarks: string;
  mode: FormMode;
  readOnly: boolean;
  showRemarks: boolean;
  remarksEditable: boolean;
  onUpdate: (productId: number, size: string, patch: Partial<CellState>) => void;
  onRemarksUpdate: (productId: number, value: string) => void;
}

function ProductRow({
  product,
  headers,
  cells,
  remarks,
  mode,
  readOnly,
  showRemarks,
  remarksEditable,
  onUpdate,
  onRemarksUpdate,
}: RowProps) {
  const availableSet = new Set(product.packings.filter((p) => p.available).map((p) => p.size_label));

  return (
    <tr className="even:bg-slate-50">
      <td className="border px-1 md:px-2 py-1 align-top font-medium text-xs md:text-sm">{product.name}</td>
      <td className="border px-1 md:px-2 py-1 align-top text-slate-500 text-xs md:text-sm">
        {product.packing_type ?? "—"}
      </td>
      {headers.map((size) => {
        const state = cells[cellKey(product.id, size)];
        const isAvailable = availableSet.has(size);
        return (
          <td key={size} className="border px-1 py-1 text-center align-top min-w-[60px] md:min-w-[72px]">
            <CellEditor
              state={state}
              isAvailable={isAvailable}
              mode={mode}
              readOnly={readOnly}
              onChange={(patch) => onUpdate(product.id, size, patch)}
            />
          </td>
        );
      })}
      {showRemarks && (
        <td className="border px-1 md:px-2 py-1 align-top">
          {remarksEditable ? (
            <input
              type="text"
              maxLength={255}
              className="w-full min-w-[200px] rounded border border-slate-300 bg-white px-2 py-1 text-xs md:text-sm focus:ring-1 focus:ring-brand-500"
              value={remarks}
              onChange={(e) => onRemarksUpdate(product.id, e.target.value)}
              placeholder="Remarks (up to 255 chars)"
            />
          ) : remarks ? (
            <div className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap break-words">{remarks}</div>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
      )}
    </tr>
  );
}

interface CellEditorProps {
  state: CellState | undefined;
  isAvailable: boolean;
  mode: FormMode;
  readOnly: boolean;
  onChange: (patch: Partial<CellState>) => void;
}

function CellEditor({ state, isAvailable, mode, readOnly, onChange }: CellEditorProps) {
  if (mode === "customer-edit") {
    if (!isAvailable) {
      return <span className="text-slate-300">—</span>;
    }
    return (
      <input
        type="number"
        min={0}
        className="w-14 md:w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-center text-xs md:text-sm focus:ring-1 focus:ring-brand-500"
        value={state?.customerQty || ""}
        onChange={(e) => onChange({ customerQty: Number(e.target.value || 0) })}
        disabled={readOnly}
        placeholder="0"
      />
    );
  }
  if (mode === "ho-edit" || mode === "ho-view") {
    if (!isAvailable && (state?.customerQty ?? 0) === 0) {
      return <span className="text-slate-300">—</span>;
    }
    return (
      <div className="flex flex-col items-center gap-0.5">
        {state && state.customerQty > 0 && (
          <div className="text-[10px] text-slate-500">req: {state.customerQty}</div>
        )}
        {mode === "ho-edit" ? (
          <input
            type="number"
            min={0}
            className="w-14 md:w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-center text-xs md:text-sm focus:ring-1 focus:ring-brand-500"
            value={state?.hoQty || ""}
            onChange={(e) => onChange({ hoQty: Number(e.target.value || 0) })}
            disabled={readOnly}
            placeholder="0"
          />
        ) : (
          <div className="text-xs md:text-sm font-medium">{state?.hoQty || 0}</div>
        )}
      </div>
    );
  }
  if (mode === "factory-respond") {
    const hoQty = state?.hoQty ?? 0;
    if (hoQty <= 0) return <span className="text-slate-300">—</span>;
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-[10px] text-slate-500">qty: {hoQty}</div>
        <input
          type="text"
          placeholder="Enter value"
          value={state?.factoryNote ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            onChange({
              factoryNote: value,
              factoryAvailable: value.trim() !== "" ? true : null,
            });
          }}
          disabled={readOnly}
          className="w-16 md:w-20 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs md:text-sm text-center focus:ring-1 focus:ring-brand-500"
        />
      </div>
    );
  }
  if (mode === "customer-view-response" || mode === "factory-view") {
    if (!state || (!state.factoryNote?.trim() && state.factoryAvailable === null)) {
      return <span className="text-slate-300">—</span>;
    }
    return (
      <div className="flex flex-col items-center gap-1 text-xs">
        {mode === "customer-view-response" && (
          <div className="text-[10px] text-slate-400">ordered: {state.customerQty}</div>
        )}
        {mode === "factory-view" && (
          <div className="text-[10px] text-slate-400">qty: {state.hoQty}</div>
        )}
        <div className="font-medium text-slate-800">{state.factoryNote?.trim() || "—"}</div>
      </div>
    );
  }
  // view mode
  if (!state) return <span className="text-slate-300">—</span>;
  const parts: string[] = [];
  if (state.customerQty > 0) parts.push(`req ${state.customerQty}`);
  if (state.hoQty > 0) parts.push(`ho ${state.hoQty}`);
  if (state.factoryAvailable === true || state.factoryNote?.trim()) {
    parts.push(state.factoryNote?.trim() || "filled");
  }
  return parts.length > 0 ? (
    <div className="text-xs leading-tight">{parts.join(" · ")}</div>
  ) : (
    <span className="text-slate-300">—</span>
  );
}
