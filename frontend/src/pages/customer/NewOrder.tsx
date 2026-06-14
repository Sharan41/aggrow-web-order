import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  buildCellMap,
  buildRemarksMap,
  cellsToItems,
  remarksMapToInput,
  OrderFormTable,
  type CellMap,
  type RemarksMap,
} from "../../components/OrderFormTable";
import { FormTypeBadge } from "../../components/FormTypeBadge";
import { useCatalog } from "../../hooks/useCatalog";
import { ordersApi } from "../../api/orders";
import { FORM_TYPE_LABELS, parseFormTypeParam } from "../../lib/orderFormType";

export default function NewOrder() {
  const { formType: formTypeParam } = useParams<{ formType: string }>();
  const orderFormType = parseFormTypeParam(formTypeParam);
  const { data: catalog, isLoading } = useCatalog(orderFormType ?? "AG_GROW");
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

  if (!orderFormType) return <Navigate to="/customer/new" replace />;

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
        order_form_type: orderFormType,
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
        order_form_type: orderFormType,
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">New Order</h1>
            <FormTypeBadge type={orderFormType} />
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {FORM_TYPE_LABELS[orderFormType]} sheet — fill quantities only in available cells. Total selected:{" "}
            <b>{totalQty}</b>
          </p>
          <Link to="/customer/new" className="text-xs text-brand-700 hover:underline">
            Change order form
          </Link>
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
