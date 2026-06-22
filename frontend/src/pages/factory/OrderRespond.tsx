import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../components/Toast";
import {
  buildCellMap,
  cellKey,
  OrderFormTable,
  type CellMap,
} from "../../components/OrderFormTable";
import { StatusBadge } from "../../components/StatusBadge";

export default function FactoryOrderRespond() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: !!orderId,
  });
  const { data: catalog } = useCatalog(order?.order_form_type ?? "AG_GROW");

  const [cells, setCells] = useState<CellMap>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (order && catalog) {
      setCells(buildCellMap(catalog, order.items));
      setNote(order.factory_note ?? "");
    }
  }, [order, catalog]);

  const respond = useMutation({
    mutationFn: () => {
      const items = order!.items
        .filter((i) => i.ho_qty > 0)
        .map((i) => {
          const s = cells[cellKey(i.product_id, i.size_label)];
          return {
            product_id: i.product_id,
            size_label: i.size_label,
            available: !!s?.factoryNote?.trim(),
            note: s?.factoryNote?.trim() || null,
          };
        });
      return ordersApi.factoryRespond(orderId, { items, factory_note: note || null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      showToast("Response sent successfully");
      navigate("/factory/orders");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to send response", "error"),
  });

  if (!order || !catalog) return <div className="text-slate-500">Loading…</div>;

  const editable = order.status === "HO_FORWARDED";
  const needsResponse = order.items.filter((i) => i.ho_qty > 0);
  const allAnswered = needsResponse.every((i) => {
    const note = cells[cellKey(i.product_id, i.size_label)]?.factoryNote?.trim();
    return !!note;
  });

  return (
    <div className="space-y-3 md:space-y-4 px-3 md:px-0">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            Factory response · Order #{order.id}
          </h1>
          <div className="mt-1 text-slate-500 text-xs md:text-sm flex items-center gap-2 flex-wrap">
            <StatusBadge status={order.status} />
            <span>Customer: {order.customer_name}</span>
            {order.branch_name && <span>· Location: {order.branch_name}</span>}
            {order.admin_reviewer_name && <span>· Admin: {order.admin_reviewer_name}</span>}
          </div>
        </div>
        {editable && (
          <button
            className="btn-primary text-sm"
            disabled={!allAnswered || respond.isPending}
            onClick={() => respond.mutate()}
          >
            {respond.isPending ? "Sending…" : "Send response"}
          </button>
        )}
      </div>

      {order.ho_note && (
        <div className="card p-3 md:p-4 border-l-4 border-amber-400">
          <div className="text-xs uppercase text-amber-700 font-medium mb-1">Head office note</div>
          <p className="text-xs md:text-sm whitespace-pre-wrap">{order.ho_note}</p>
        </div>
      )}

      {order.admin_note && (
        <div className="card p-3 md:p-4 border-l-4 border-orange-400">
          <div className="text-xs uppercase text-orange-700 font-medium mb-1">Admin note</div>
          <p className="text-xs md:text-sm whitespace-pre-wrap">{order.admin_note}</p>
        </div>
      )}

      <div className="card p-3 md:p-4">
        <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1">Factory note (overall)</label>
        {editable ? (
          <textarea className="input text-sm" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        ) : (
          <p className="text-xs md:text-sm whitespace-pre-wrap">{order.factory_note || "—"}</p>
        )}
      </div>

      <div className="text-xs md:text-sm text-slate-500">
        {editable
          ? `Enter a value for each highlighted item. ${needsResponse.length - needsResponse.filter((i) => {
              const note = cells[cellKey(i.product_id, i.size_label)]?.factoryNote?.trim();
              return !!note;
            }).length} remaining.`
          : "This order has been responded to. Summary below."}
      </div>

      <OrderFormTable
        catalog={catalog}
        cells={cells}
        onChange={editable ? setCells : undefined}
        mode={editable ? "factory-respond" : "factory-view"}
        hideRemarks
        showPrint={!editable}
      />
    </div>
  );
}
