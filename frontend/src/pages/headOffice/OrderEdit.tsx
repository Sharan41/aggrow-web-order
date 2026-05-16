import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../components/Toast";
import {
  buildCellMap,
  cellsToItems,
  OrderFormTable,
  type CellMap,
} from "../../components/OrderFormTable";
import { StatusBadge } from "../../components/StatusBadge";

export default function HoOrderEdit() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: catalog } = useCatalog();
  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: !!orderId,
  });
  const [cells, setCells] = useState<CellMap>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (order && catalog) {
      setCells(
        buildCellMap(
          catalog,
          order.items.map((i) => ({
            ...i,
            ho_qty: i.ho_qty || i.customer_qty,
          })),
        ),
      );
      setNote(order.ho_note ?? "");
    }
  }, [order, catalog]);

  const save = useMutation({
    mutationFn: () =>
      ordersApi.hoEdit(orderId, {
        items: cellsToItems(cells, "ho"),
        ho_note: note || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      showToast("Order saved successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to save", "error"),
  });

  const forward = useMutation({
    mutationFn: async () => {
      await ordersApi.hoEdit(orderId, {
        items: cellsToItems(cells, "ho"),
        ho_note: note || null,
      });
      return ordersApi.forward(orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      showToast("Order forwarded to factory successfully");
      navigate("/ho/orders");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to forward", "error"),
  });

  const reject = useMutation({
    mutationFn: (reason: string) => ordersApi.reject(orderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      showToast("Order rejected successfully");
      navigate("/ho/orders");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to reject", "error"),
  });

  if (!order || !catalog) return <div className="text-slate-500">Loading…</div>;

  const editable = order.status === "SUBMITTED_TO_HO";

  return (
    <div className="space-y-3 md:space-y-4 px-3 md:px-0">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            Order #{order.id} — {order.customer_name}
          </h1>
          <div className="mt-1 text-slate-500 text-xs md:text-sm flex gap-2 items-center flex-wrap">
            <StatusBadge status={order.status} />
            {order.branch_name && <span>Branch: {order.branch_name}</span>}
          </div>
        </div>
        {editable && (
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn-danger text-sm"
              disabled={reject.isPending}
              onClick={() => {
                const reason = window.prompt("Rejection reason (optional):") ?? "";
                if (reason !== null) reject.mutate(reason);
              }}
            >
              Reject
            </button>
            <button className="btn-secondary text-sm" disabled={save.isPending} onClick={() => save.mutate()}>
              Save Edits
            </button>
            <button
              className="btn-primary text-sm"
              disabled={forward.isPending}
              onClick={() => forward.mutate()}
            >
              Save & Forward to Factory
            </button>
          </div>
        )}
      </div>

      {order.customer_note && (
        <div className="card p-3 md:p-4">
          <div className="text-xs uppercase text-slate-500 mb-1">Customer note</div>
          <p className="text-xs md:text-sm whitespace-pre-wrap">{order.customer_note}</p>
        </div>
      )}

      <div className="card p-3 md:p-4">
        <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1">Head office note</label>
        {editable ? (
          <textarea className="input text-sm" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        ) : (
          <p className="text-xs md:text-sm whitespace-pre-wrap">{order.ho_note || "—"}</p>
        )}
      </div>

      {order.factory_note && (
        <div className="card p-3 md:p-4 border-l-4 border-emerald-500">
          <div className="text-xs uppercase text-emerald-700 font-medium mb-1">Factory note</div>
          <p className="text-xs md:text-sm whitespace-pre-wrap">{order.factory_note}</p>
        </div>
      )}

      <OrderFormTable
        catalog={catalog}
        cells={cells}
        onChange={editable ? setCells : undefined}
        mode={editable ? "ho-edit" : "ho-view"}
      />
    </div>
  );
}
