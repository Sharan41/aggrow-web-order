import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  buildCellMap,
  buildRemarksMap,
  cellsToItems,
  remarksMapToInput,
  OrderFormTable,
  type CellMap,
  type RemarksMap,
} from "../../components/OrderFormTable";
import { useCatalog } from "../../hooks/useCatalog";
import { ordersApi } from "../../api/orders";

export default function NewOrder() {
  const { data: catalog, isLoading } = useCatalog();
  const [cells, setCells] = useState<CellMap>({});
  const [remarks, setRemarks] = useState<RemarksMap>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (catalog) {
      setCells(buildCellMap(catalog, []));
      setRemarks(buildRemarksMap(catalog, []));
    }
  }, [catalog]);

  const totalQty = Object.values(cells).reduce((s, c) => s + (c.customerQty || 0), 0);

  const saveDraft = async () => {
    setError(null);
    setSaving(true);
    try {
      const items = cellsToItems(cells, "customer");
      const order = await ordersApi.create({
        items,
        customer_note: note || null,
        product_remarks: remarksMapToInput(remarks),
      });
      navigate(`/customer/orders/${order.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const items = cellsToItems(cells, "customer");
      if (items.length === 0) throw new Error("Add at least one quantity");
      const order = await ordersApi.create({
        items,
        customer_note: note || null,
        product_remarks: remarksMapToInput(remarks),
      });
      await ordersApi.submit(order.id);
      navigate(`/customer/orders/${order.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !catalog) return <div className="text-slate-500">Loading catalog…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">New Order</h1>
          <p className="text-slate-500 text-sm">
            Fill quantities only in cells marked as available. Total items selected: <b>{totalQty}</b>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={saving} onClick={saveDraft}>
            Save Draft
          </button>
          <button className="btn-primary" disabled={saving || totalQty === 0} onClick={submit}>
            {saving ? "Sending…" : "Save & Send to Head Office"}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}

      <div className="card p-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Description / Note</label>
        <textarea
          className="input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any special instructions for the head office…"
        />
      </div>

      <OrderFormTable
        catalog={catalog}
        cells={cells}
        remarks={remarks}
        onChange={setCells}
        onRemarksChange={setRemarks}
        mode="customer-edit"
      />
    </div>
  );
}
