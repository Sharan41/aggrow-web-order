import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { catalogApi } from "../../api/catalog";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../components/Toast";
import { FormTypeBadge } from "../../components/FormTypeBadge";
import { FORM_TYPE_LABELS } from "../../lib/orderFormType";
import type { OrderFormType, PackingGroup, Product } from "../../types";

const FORM_TYPES: OrderFormType[] = ["AG_GROW", "SULFAG"];

export default function HoCatalog() {
  const [formType, setFormType] = useState<OrderFormType>("AG_GROW");
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data: catalog } = useCatalog(formType);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["catalog", formType] });

  const createCategory = useMutation({
    mutationFn: (name: string) => catalogApi.createCategory({ name, catalog_type: formType }),
    onSuccess: () => {
      invalidate();
      showToast("Category created successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to create category", "error"),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      catalogApi.updateCategory(id, { name }),
    onSuccess: () => {
      invalidate();
      showToast("Category renamed successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to rename category", "error"),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => catalogApi.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      showToast("Category deleted successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to delete category", "error"),
  });

  const createGroup = useMutation({
    mutationFn: (body: { category_id: number; label: string; column_headers: string[] }) =>
      catalogApi.createPackingGroup(body),
    onSuccess: () => {
      invalidate();
      showToast("Packing group created successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to create group", "error"),
  });

  const updateGroup = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: { label?: string; column_headers?: string[]; add_column?: string; remove_column?: string };
    }) => catalogApi.updatePackingGroup(id, body),
    onSuccess: () => {
      invalidate();
      showToast("Columns updated successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to update columns", "error"),
  });

  const renameColumn = useMutation({
    mutationFn: ({ id, oldHeader, newHeader }: { id: number; oldHeader: string; newHeader: string }) =>
      catalogApi.renamePackingGroupColumn(id, oldHeader, newHeader),
    onSuccess: () => {
      invalidate();
      showToast("Column renamed successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to rename column", "error"),
  });

  const deleteGroup = useMutation({
    mutationFn: (id: number) => catalogApi.deletePackingGroup(id),
    onSuccess: () => {
      invalidate();
      showToast("Packing group deleted successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to delete group", "error"),
  });

  const createProduct = useMutation({
    mutationFn: (body: {
      packing_group_id: number;
      name: string;
      packing_type?: string | null;
      available_sizes: string[];
    }) => catalogApi.createProduct(body),
    onSuccess: () => {
      invalidate();
      showToast("Product added successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to add product", "error"),
  });

  const updateProduct = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: { available_sizes?: string[]; name?: string; packing_type?: string | null };
    }) => catalogApi.updateProduct(id, body),
    onSuccess: () => {
      invalidate();
      showToast("Product updated successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to update product", "error"),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => catalogApi.deleteProduct(id),
    onSuccess: () => {
      invalidate();
      showToast("Product deleted successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to delete product", "error"),
  });

  const [newCat, setNewCat] = useState("");

  if (!catalog) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4 md:space-y-6 px-3 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-semibold">Catalog Management</h1>
        <div className="flex gap-2">
          {FORM_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormType(type)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                formType === type
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {FORM_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>Managing catalog for</span>
        <FormTypeBadge type={formType} />
      </div>

      {catalog.categories.length === 0 ? (
        <div className="card p-6 text-center text-slate-500">
          No categories in the {FORM_TYPE_LABELS[formType]} catalog yet. Add one below or re-import from Excel.
        </div>
      ) : null}

      <div className="card p-3 md:p-4 flex flex-col md:flex-row gap-2">
        <input
          className="input text-sm max-w-xs flex-1"
          placeholder="New category name"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
        />
        <button
          className="btn-primary text-sm"
          onClick={() => {
            if (newCat.trim()) {
              createCategory.mutate(newCat.trim());
              setNewCat("");
            }
          }}
          disabled={createCategory.isPending}
        >
          {createCategory.isPending ? "Adding…" : "Add category"}
        </button>
      </div>

      {catalog.categories.map((cat) => (
        <section key={cat.id} className="card p-3 md:p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <CategoryHeader
              name={cat.name}
              onRename={(name) => updateCategory.mutate({ id: cat.id, name })}
            />
            <button
              className="text-xs text-rose-600 hover:underline self-start md:self-auto"
              onClick={() => {
                if (confirm(`Delete category "${cat.name}" and all its products?`)) {
                  deleteCategory.mutate(cat.id);
                }
              }}
            >
              Delete category
            </button>
          </div>

          <NewGroupForm categoryId={cat.id} onCreate={(b) => createGroup.mutate(b)} />

          {cat.packing_groups.map((pg) => (
            <GroupEditor
              key={pg.id}
              group={pg}
              onDelete={() => deleteGroup.mutate(pg.id)}
              onUpdateGroup={(body) => updateGroup.mutate({ id: pg.id, body })}
              onRenameColumn={(oldHeader, newHeader) =>
                renameColumn.mutate({ id: pg.id, oldHeader, newHeader })
              }
              onAddProduct={(body) => createProduct.mutate(body)}
              onUpdateProduct={(id, body) => updateProduct.mutate({ id, body })}
              onDeleteProduct={(id) => deleteProduct.mutate(id)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function CategoryHeader({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== name) onRename(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="input text-base md:text-lg font-semibold text-brand-700 flex-1 md:max-w-md"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="text-base md:text-lg font-semibold text-brand-700 text-left hover:underline"
      title="Edit category name"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
    >
      {name}
    </button>
  );
}

function NewGroupForm({
  categoryId,
  onCreate,
}: {
  categoryId: number;
  onCreate: (b: { category_id: number; label: string; column_headers: string[] }) => void;
}) {
  const [label, setLabel] = useState("");
  const [headers, setHeaders] = useState("");
  return (
    <form
      className="flex flex-col md:flex-row flex-wrap gap-2 border-t border-slate-100 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        const heads = headers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!label.trim() || heads.length === 0) return;
        onCreate({ category_id: categoryId, label: label.trim(), column_headers: heads });
        setLabel("");
        setHeaders("");
      }}
    >
      <input
        className="input text-sm max-w-xs flex-1"
        placeholder="Group label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        className="input text-sm max-w-md flex-1"
        placeholder="Sizes comma-separated e.g. 30ml,50ml,100ml"
        value={headers}
        onChange={(e) => setHeaders(e.target.value)}
      />
      <button className="btn-secondary text-sm" type="submit">
        Add group
      </button>
    </form>
  );
}

interface GroupEditorProps {
  group: PackingGroup;
  onDelete: () => void;
  onUpdateGroup: (body: { label?: string; column_headers?: string[]; add_column?: string; remove_column?: string }) => void;
  onRenameColumn: (oldHeader: string, newHeader: string) => void;
  onAddProduct: (body: {
    packing_group_id: number;
    name: string;
    packing_type?: string | null;
    available_sizes: string[];
  }) => void;
  onUpdateProduct: (
    id: number,
    body: { available_sizes?: string[]; name?: string; packing_type?: string | null },
  ) => void;
  onDeleteProduct: (id: number) => void;
}

function GroupEditor({
  group,
  onDelete,
  onUpdateGroup,
  onRenameColumn,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: GroupEditorProps) {
  const [pName, setPName] = useState("");
  const [pType, setPType] = useState("");
  const [pSizes, setPSizes] = useState<Set<string>>(new Set());
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newColumn, setNewColumn] = useState("");
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [columnDraft, setColumnDraft] = useState("");
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(group.label);

  const startEditLabel = () => {
    setLabelDraft(group.label);
    setEditingLabel(true);
  };

  const commitEditLabel = () => {
    const next = labelDraft.trim();
    if (next && next !== group.label) {
      onUpdateGroup({ label: next });
    }
    setEditingLabel(false);
  };

  const startEditColumn = (header: string) => {
    setEditingColumn(header);
    setColumnDraft(header);
  };

  const commitEditColumn = () => {
    if (editingColumn === null) return;
    const next = columnDraft.trim();
    if (next && next !== editingColumn) {
      onRenameColumn(editingColumn, next);
    }
    setEditingColumn(null);
    setColumnDraft("");
  };

  const addColumn = () => {
    const col = newColumn.trim();
    if (!col) return;
    const exists = group.column_headers.some(
      (h) => h.toLowerCase() === col.toLowerCase(),
    );
    if (exists) return;
    // Send an atomic add-column op (server appends to its own current column_headers)
    // instead of a full-array replace derived from this possibly-stale `group` prop —
    // otherwise two rapid adds both read the same pre-update array and the second
    // PATCH silently overwrites the first (last-write-wins).
    onUpdateGroup({ add_column: col });
    setNewColumn("");
  };

  const removeColumn = (header: string) => {
    if (!confirm(`Remove the "${header}" column from "${group.label}"?`)) return;
    onUpdateGroup({ remove_column: header });
  };

  const sortedProducts = [...group.products].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  const toggleSize = (size: string, current: Product) => {
    const set = new Set(current.packings.filter((x) => x.available).map((x) => x.size_label));
    if (set.has(size)) set.delete(size);
    else set.add(size);
    onUpdateProduct(current.id, { available_sizes: Array.from(set) });
  };

  return (
    <div className="border border-slate-200 rounded-md p-3 space-y-2">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
        {editingLabel ? (
          <input
            autoFocus
            className="input text-sm font-medium flex-1 md:max-w-md"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitEditLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitEditLabel();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditingLabel(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="font-medium text-sm text-left hover:text-brand-700 hover:underline"
            title="Edit group label"
            onClick={startEditLabel}
          >
            {group.label}
          </button>
        )}
        <button
          className="text-xs text-rose-600 hover:underline self-start md:order-2"
          onClick={onDelete}
        >
          delete group
        </button>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 md:order-1">
          {group.column_headers.map((h) => (
            <span
              key={h}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5"
            >
              {editingColumn === h ? (
                <input
                  autoFocus
                  className="input h-5 w-20 px-1 py-0 text-xs"
                  value={columnDraft}
                  onChange={(e) => setColumnDraft(e.target.value)}
                  onBlur={commitEditColumn}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEditColumn();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingColumn(null);
                      setColumnDraft("");
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="hover:text-brand-700 hover:underline"
                  title={`Rename ${h} column`}
                  onClick={() => startEditColumn(h)}
                >
                  {h}
                </button>
              )}
              <button
                type="button"
                className="text-rose-500 hover:text-rose-700 leading-none"
                title={`Remove ${h} column`}
                onClick={() => removeColumn(h)}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="input h-6 w-24 px-1.5 py-0 text-xs"
            placeholder="New column"
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColumn();
              }
            }}
          />
          <button
            type="button"
            className="text-brand-600 hover:underline"
            onClick={addColumn}
          >
            add column
          </button>
        </div>
      </div>
      <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
        <table className="w-full min-w-max text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="border px-2 py-1">S.No</th>
              <th className="border px-2 py-1 text-left min-w-[150px]">Product</th>
              <th className="border px-2 py-1">Packing</th>
              {group.column_headers.map((h) => (
                <th key={h} className="border px-2 py-1">
                  {h}
                </th>
              ))}
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((p) => {
              const avail = new Set(p.packings.filter((x) => x.available).map((x) => x.size_label));
              return (
                <tr key={p.id} className="even:bg-slate-50">
                  <td className="border px-2 py-1 text-center">{p.s_no}</td>
                  <td className="border px-2 py-1">{p.name}</td>
                  <td className="border px-2 py-1 text-center">{p.packing_type ?? "—"}</td>
                  {group.column_headers.map((h) => (
                    <td key={h} className="border px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={avail.has(h)}
                        onChange={() => toggleSize(h, p)}
                      />
                    </td>
                  ))}
                  <td className="border px-2 py-1 text-center">
                    <button
                      className="text-blue-600 hover:underline mr-2"
                      onClick={() => setEditingProduct(p)}
                    >
                      edit
                    </button>
                    <button
                      className="text-rose-600 hover:underline"
                      onClick={() => {
                        if (confirm(`Delete ${p.name}?`)) onDeleteProduct(p.id);
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <form
        className="flex flex-col md:flex-row flex-wrap gap-2 items-start md:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pName.trim()) return;
          onAddProduct({
            packing_group_id: group.id,
            name: pName.trim(),
            packing_type: pType.trim() || null,
            available_sizes: Array.from(pSizes),
          });
          setPName("");
          setPType("");
          setPSizes(new Set());
        }}
      >
        <input
          className="input text-sm max-w-xs flex-1"
          placeholder="Product name"
          value={pName}
          onChange={(e) => setPName(e.target.value)}
        />
        <input
          className="input text-sm w-32"
          placeholder="Packing"
          value={pType}
          onChange={(e) => setPType(e.target.value)}
        />
        <div className="flex flex-wrap gap-1 text-xs">
          {group.column_headers.map((h) => (
            <label key={h} className="inline-flex items-center gap-1 border border-slate-300 rounded px-1.5 py-0.5">
              <input
                type="checkbox"
                checked={pSizes.has(h)}
                onChange={(e) => {
                  const copy = new Set(pSizes);
                  if (e.target.checked) copy.add(h);
                  else copy.delete(h);
                  setPSizes(copy);
                }}
              />
              {h}
            </label>
          ))}
        </div>
        <button className="btn-primary text-sm" type="submit">
          Add product
        </button>
      </form>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(name, packing_type) => {
            onUpdateProduct(editingProduct.id, { name, packing_type });
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

function EditProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product;
  onClose: () => void;
  onSave: (name: string, packing_type: string | null) => void;
}) {
  const [name, setName] = useState(product.name);
  const [packingType, setPackingType] = useState(product.packing_type || "");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">Edit Product</h3>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave(name.trim(), packingType.trim() || null);
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
            <input
              className="input text-sm w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Packing Type</label>
            <input
              className="input text-sm w-full"
              placeholder="Optional"
              value={packingType}
              onChange={(e) => setPackingType(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" className="btn-secondary flex-1 text-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 text-sm">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
