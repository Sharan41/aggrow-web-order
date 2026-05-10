import { useMemo } from "react";
import type { Catalog, OrderItem, PackingGroup, Product } from "../types";

export type FormMode = "customer-edit" | "ho-edit" | "ho-view" | "factory-respond" | "customer-view-response" | "view";

interface CellState {
  customerQty: number;
  hoQty: number;
  factoryAvailable: boolean | null;
  factoryNote: string | null;
  available: boolean;
}

export type CellMap = Record<string, CellState>;

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
  onChange?: (next: CellMap) => void;
  mode: FormMode;
}

export function OrderFormTable({ catalog, cells, onChange, mode }: Props) {
  const readOnly = mode === "view" || mode === "ho-view" || mode === "customer-view-response" || !onChange;

  // For ho-view: show only rows where customer has placed an order
  const visibleProductsHoView = useMemo(() => {
    if (mode !== "ho-view") return null;
    const set = new Set<number>();
    for (const [key, v] of Object.entries(cells)) {
      if (v.customerQty > 0) {
        const pid = Number(key.split("::")[0]);
        set.add(pid);
      }
    }
    return set;
  }, [cells, mode]);

  const visibleSizesHoView = useMemo(() => {
    if (mode !== "ho-view") return null;
    const perGroup = new Map<number, Set<string>>();
    for (const cat of catalog.categories) {
      for (const pg of cat.packing_groups) {
        const set = new Set<string>();
        for (const p of pg.products) {
          for (const pk of p.packings) {
            if ((cells[cellKey(p.id, pk.size_label)]?.customerQty ?? 0) > 0) {
              set.add(pk.size_label);
            }
          }
        }
        perGroup.set(pg.id, set);
      }
    }
    return perGroup;
  }, [catalog, cells, mode]);

  // For factory-respond: show only rows where HO has placed an order
  const visibleProductsFactory = useMemo(() => {
    if (mode !== "factory-respond") return null;
    const set = new Set<number>();
    for (const [key, v] of Object.entries(cells)) {
      if (v.hoQty > 0) {
        const pid = Number(key.split("::")[0]);
        set.add(pid);
      }
    }
    return set;
  }, [cells, mode]);

  const visibleSizesFactory = useMemo(() => {
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

  // For customer-view-response: show only rows where factory responded
  const visibleProductsCustomerResponse = useMemo(() => {
    if (mode !== "customer-view-response") return null;
    const set = new Set<number>();
    for (const [key, v] of Object.entries(cells)) {
      if (v.factoryAvailable !== null) {
        const pid = Number(key.split("::")[0]);
        set.add(pid);
      }
    }
    return set;
  }, [cells, mode]);

  const visibleSizesCustomerResponse = useMemo(() => {
    if (mode !== "customer-view-response") return null;
    const perGroup = new Map<number, Set<string>>();
    for (const cat of catalog.categories) {
      for (const pg of cat.packing_groups) {
        const set = new Set<string>();
        for (const p of pg.products) {
          for (const pk of p.packings) {
            if ((cells[cellKey(p.id, pk.size_label)]?.factoryAvailable) !== null) {
              set.add(pk.size_label);
            }
          }
        }
        perGroup.set(pg.id, set);
      }
    }
    return perGroup;
  }, [catalog, cells, mode]);

  const visibleProducts =
    mode === "ho-view"
      ? visibleProductsHoView
      : mode === "factory-respond"
      ? visibleProductsFactory
      : mode === "customer-view-response"
      ? visibleProductsCustomerResponse
      : null;

  const visibleSizes =
    mode === "ho-view"
      ? visibleSizesHoView
      : mode === "factory-respond"
      ? visibleSizesFactory
      : mode === "customer-view-response"
      ? visibleSizesCustomerResponse
      : null;

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

  return (
    <div className="space-y-8">
      {catalog.categories.map((cat) => {
        const groups = cat.packing_groups.filter((pg) => {
          if (
            mode === "factory-respond" ||
            mode === "ho-view" ||
            mode === "customer-view-response"
          ) {
            const sizes = visibleSizes?.get(pg.id);
            return sizes && sizes.size > 0;
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
                  mode={mode}
                  readOnly={readOnly}
                  onUpdate={update}
                  visibleProducts={visibleProducts}
                  visibleSizes={visibleSizes?.get(pg.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

interface GroupProps {
  group: PackingGroup;
  cells: CellMap;
  mode: FormMode;
  readOnly: boolean;
  onUpdate: (productId: number, size: string, patch: Partial<CellState>) => void;
  visibleProducts: Set<number> | null;
  visibleSizes: Set<string> | undefined;
}

function GroupTable({ group, cells, mode, readOnly, onUpdate, visibleProducts, visibleSizes }: GroupProps) {
  const headers = group.column_headers.filter((h) => {
    if (
      mode === "factory-respond" ||
      mode === "ho-view" ||
      mode === "customer-view-response"
    ) {
      return visibleSizes?.has(h);
    }
    return true;
  });
  const products = group.products.filter((p) => {
    if (
      mode === "factory-respond" ||
      mode === "ho-view" ||
      mode === "customer-view-response"
    ) {
      return visibleProducts?.has(p.id);
    }
    return true;
  });
  if (products.length === 0 || headers.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs md:text-sm font-medium text-slate-600 mb-2">{group.label}</h3>
      <div className="overflow-auto">
        <table className="min-w-full border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border px-1 md:px-2 py-1 text-left w-10 md:w-12">S.No</th>
              <th className="border px-1 md:px-2 py-1 text-left min-w-[180px] md:min-w-[220px]">Product</th>
              <th className="border px-1 md:px-2 py-1 text-left w-20 md:w-24">Packing</th>
              {headers.map((h) => (
                <th key={h} className="border px-1 md:px-2 py-1 text-center whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                headers={headers}
                cells={cells}
                mode={mode}
                readOnly={readOnly}
                onUpdate={onUpdate}
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
  mode: FormMode;
  readOnly: boolean;
  onUpdate: (productId: number, size: string, patch: Partial<CellState>) => void;
}

function ProductRow({ product, headers, cells, mode, readOnly, onUpdate }: RowProps) {
  const availableSet = new Set(product.packings.filter((p) => p.available).map((p) => p.size_label));

  return (
    <tr className="even:bg-slate-50">
      <td className="border px-1 md:px-2 py-1 align-top text-xs md:text-sm">{product.s_no}</td>
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
    const avail = state?.factoryAvailable;
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-[10px] text-slate-500">qty: {hoQty}</div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ factoryAvailable: true, factoryNote: null })}
            disabled={readOnly}
            className={`px-1.5 py-0.5 text-xs rounded border ${
              avail === true ? "bg-emerald-500 text-white border-emerald-600" : "bg-white border-slate-300"
            }`}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => onChange({ factoryAvailable: false })}
            disabled={readOnly}
            className={`px-1.5 py-0.5 text-xs rounded border ${
              avail === false ? "bg-rose-500 text-white border-rose-600" : "bg-white border-slate-300"
            }`}
          >
            ✗
          </button>
        </div>
        {avail === false && (
          <input
            type="text"
            placeholder="reason"
            value={state?.factoryNote ?? ""}
            onChange={(e) => onChange({ factoryNote: e.target.value })}
            disabled={readOnly}
            className="w-20 rounded border border-slate-300 bg-white px-1 py-0.5 text-[11px] text-center"
          />
        )}
      </div>
    );
  }
  if (mode === "customer-view-response") {
    // Show factory response with original customer count
    if (!state || state.factoryAvailable === null) return <span className="text-slate-300">—</span>;
    return (
      <div className="flex flex-col items-center gap-1 text-xs">
        <div className="text-[10px] text-slate-400">ordered: {state.customerQty}</div>
        <div className={`font-medium ${state.factoryAvailable ? "text-emerald-600" : "text-rose-600"}`}>
          {state.factoryAvailable ? `✓ ${state.hoQty}` : "✗"}
        </div>
        {!state.factoryAvailable && state.factoryNote && (
          <div className="text-[10px] text-slate-500 max-w-[80px] truncate" title={state.factoryNote}>
            {state.factoryNote}
          </div>
        )}
      </div>
    );
  }
  // view mode
  if (!state) return <span className="text-slate-300">—</span>;
  const parts: string[] = [];
  if (state.customerQty > 0) parts.push(`req ${state.customerQty}`);
  if (state.hoQty > 0) parts.push(`ho ${state.hoQty}`);
  if (state.factoryAvailable === true) parts.push("✓");
  if (state.factoryAvailable === false) parts.push(`✗${state.factoryNote ? ` (${state.factoryNote})` : ""}`);
  return parts.length > 0 ? (
    <div className="text-xs leading-tight">{parts.join(" · ")}</div>
  ) : (
    <span className="text-slate-300">—</span>
  );
}
