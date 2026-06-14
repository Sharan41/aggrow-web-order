import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ordersApi } from "../../api/orders";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../components/Toast";
import {
  buildCellMap,
  buildRemarksMap,
  cellsToItems,
  remarksMapToInput,
  OrderFormTable,
  type CellMap,
  type RemarksMap,
} from "../../components/OrderFormTable";
import { StatusBadge } from "../../components/StatusBadge";

export default function CustomerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data: catalog } = useCatalog();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: !!orderId,
  });

  const [cells, setCells] = useState<CellMap>({});
  const [remarks, setRemarks] = useState<RemarksMap>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (order && catalog) {
      setCells(buildCellMap(catalog, order.items));
      setRemarks(buildRemarksMap(catalog, order.product_remarks ?? []));
      setNote(order.customer_note ?? "");
    }
  }, [order, catalog]);

  const save = useMutation({
    mutationFn: () =>
      ordersApi.updateDraft(orderId, {
        items: cellsToItems(cells, "customer"),
        customer_note: note || null,
        product_remarks: remarksMapToInput(remarks, order?.product_remarks),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      showToast("Draft saved successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to save", "error"),
  });

  const submit = useMutation({
    mutationFn: async () => {
      await ordersApi.updateDraft(orderId, {
        items: cellsToItems(cells, "customer"),
        customer_note: note || null,
        product_remarks: remarksMapToInput(remarks, order?.product_remarks),
      });
      return ordersApi.submit(orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      showToast("Order submitted to Head Office successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to submit", "error"),
  });

  if (isLoading || !order || !catalog) return <div className="text-slate-500">Loading…</div>;

  const isDraft = order.status === "DRAFT";
  const hasFactoryResponse = order.status === "FACTORY_RESPONDED" || order.status === "COMPLETED";
  const mode = isDraft ? "customer-edit" : hasFactoryResponse ? "customer-view-response" : "view";

  return (
    <div className="space-y-3 md:space-y-4 px-3 md:px-0">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Order #{order.id}</h1>
          <div className="mt-1">
            <StatusBadge status={order.status} />
          </div>
        </div>
        {isDraft && (
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn-secondary text-sm"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              Save Draft
            </button>
            <button
              className="btn-primary text-sm"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
            >
              Submit to Head Office
            </button>
          </div>
        )}
      </div>

      <div className="card p-3 md:p-4 space-y-2">
        <label className="block text-xs md:text-sm font-medium text-slate-700">Description / Note</label>
        {isDraft ? (
          <textarea
            className="input text-sm"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        ) : (
          <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap">{order.customer_note || "—"}</p>
        )}
        {order.ho_note && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs uppercase text-sky-700 font-medium">Head Office note</div>
            <p className="text-xs md:text-sm whitespace-pre-wrap">{order.ho_note}</p>
          </div>
        )}
      </div>

      <OrderFormTable
        catalog={catalog}
        cells={cells}
        remarks={remarks}
        onChange={isDraft ? setCells : undefined}
        onRemarksChange={isDraft ? setRemarks : undefined}
        mode={mode}
      />
    </div>
  );
}
