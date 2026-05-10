import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { catalogApi } from "../../api/catalog";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../components/Toast";
import type { PackingGroup, Product } from "../../types";

export default function HoCatalog() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data: catalog } = useCatalog();

  const createCategory = useMutation({
    mutationFn: (name: string) => catalogApi.createCategory({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      showToast("Category created successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to create category", "error"),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => catalogApi.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      showToast("Category deleted successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to delete category", "error"),
  });

  const createGroup = useMutation({
    mutationFn: (body: { category_id: number; label: string; column_headers: string[] }) =>
      catalogApi.createPackingGroup(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      showToast("Packing group created successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to create group", "error"),
  });

  const deleteGroup = useMutation({
    mutationFn: (id: number) => catalogApi.deletePackingGroup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      showToast("Packing group deleted successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to delete group", "error"),
  });

  const createProduct = useMutation({
    mutationFn: (body: {
      packing_group_id: number;
      s_no: number;
      name: string;
      packing_type?: string | null;
      available_sizes: string[];
    }) => catalogApi.createProduct(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
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
      qc.invalidateQueries({ queryKey: ["catalog"] });
      showToast("Product updated successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to update product", "error"),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => catalogApi.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      showToast("Product deleted successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to delete product", "error"),
  });

  const [newCat, setNewCat] = useState("");

  if (!catalog) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4 md:space-y-6 px-3 md:px-0">
      <h1 className="text-xl md:text-2xl font-semibold">Catalog Management</h1>

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
            <h2 className="text-base md:text-lg font-semibold text-brand-700">{cat.name}</h2>
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
  onAddProduct: (body: {
    packing_group_id: number;
    s_no: number;
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
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: GroupEditorProps) {
  const [pName, setPName] = useState("");
  const [pType, setPType] = useState("");
  const [pSno, setPSno] = useState("");
  const [pSizes, setPSizes] = useState<Set<string>>(new Set());
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const toggleSize = (size: string, current: Product) => {
    const set = new Set(current.packings.filter((x) => x.available).map((x) => x.size_label));
    if (set.has(size)) set.delete(size);
    else set.add(size);
    onUpdateProduct(current.id, { available_sizes: Array.from(set) });
  };

  return (
    <div className="border border-slate-200 rounded-md p-3 space-y-2">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div className="font-medium text-sm">{group.label}</div>
        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
          <span>{group.column_headers.join(" · ")}</span>
          <button className="text-rose-600 hover:underline" onClick={onDelete}>
            delete group
          </button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-xs">
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
            {group.products.map((p) => {
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
          if (!pName.trim() || !pSno) return;
          onAddProduct({
            packing_group_id: group.id,
            s_no: Number(pSno),
            name: pName.trim(),
            packing_type: pType.trim() || null,
            available_sizes: Array.from(pSizes),
          });
          setPName("");
          setPType("");
          setPSno("");
          setPSizes(new Set());
        }}
      >
        <input
          className="input text-sm w-20"
          type="number"
          placeholder="S.No"
          value={pSno}
          onChange={(e) => setPSno(e.target.value)}
        />
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
