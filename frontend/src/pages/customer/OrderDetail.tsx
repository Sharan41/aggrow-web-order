import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ordersApi } from "../../api/orders";
import { useCatalog } from "../../hooks/useCatalog";
import {
  buildCellMap,
  cellsToItems,
  OrderFormTable,
  type CellMap,
} from "../../components/OrderFormTable";
import { StatusBadge } from "../../components/StatusBadge";

export default function CustomerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const qc = useQueryClient();
  const { data: catalog } = useCatalog();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: !!orderId,
  });

  const [cells, setCells] = useState<CellMap>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (order && catalog) {
      setCells(buildCellMap(catalog, order.items));
      setNote(order.customer_note ?? "");
    }
  }, [order, catalog]);

  const save = useMutation({
    mutationFn: () =>
      ordersApi.updateDraft(orderId, {
        items: cellsToItems(cells, "customer"),
        customer_note: note || null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", orderId] }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      await ordersApi.updateDraft(orderId, {
        items: cellsToItems(cells, "customer"),
        customer_note: note || null,
      });
      return ordersApi.submit(orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  if (isLoading || !order || !catalog) return <div className="text-slate-500">Loading…</div>;

  const isDraft = order.status === "DRAFT";
  const mode = isDraft ? "customer-edit" : "view";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order #{order.id}</h1>
          <div className="mt-1">
            <StatusBadge status={order.status} />
          </div>
        </div>
        {isDraft && (
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              Save Draft
            </button>
            <button
              className="btn-primary"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
            >
              Submit to Head Office
            </button>
          </div>
        )}
      </div>

      <div className="card p-4 space-y-2">
        <label className="block text-sm font-medium text-slate-700">Description / Note</label>
        {isDraft ? (
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.customer_note || "—"}</p>
        )}
        {order.ho_note && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs uppercase text-sky-700 font-medium">Head Office note</div>
            <p className="text-sm whitespace-pre-wrap">{order.ho_note}</p>
          </div>
        )}
        {order.factory_note && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs uppercase text-violet-700 font-medium">Factory note</div>
            <p className="text-sm whitespace-pre-wrap">{order.factory_note}</p>
          </div>
        )}
      </div>

      <OrderFormTable
        catalog={catalog}
        cells={cells}
        onChange={isDraft ? setCells : undefined}
        mode={mode}
      />
    </div>
  );
}
