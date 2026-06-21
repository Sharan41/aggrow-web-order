import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { FormTypeBadge } from "../../components/FormTypeBadge";

export default function HoOrderEdit() {
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
  const [remarks, setRemarks] = useState<RemarksMap>({});
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
      setRemarks(buildRemarksMap(catalog, order.product_remarks ?? []));
      setNote(order.ho_note ?? "");
    }
  }, [order, catalog]);

  const save = useMutation({
    mutationFn: () =>
      ordersApi.hoEdit(orderId, {
        items: cellsToItems(cells, "ho"),
        ho_note: note || null,
        product_remarks: remarksMapToInput(remarks, order?.product_remarks),
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
        product_remarks: remarksMapToInput(remarks, order?.product_remarks),
      });
      return ordersApi.forward(orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      showToast("Order forwarded to admin successfully");
      navigate("/ho/orders");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to forward", "error"),
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
            <FormTypeBadge type={order.order_form_type} />
            {order.branch_name && <span>Location: {order.branch_name}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {editable && (
            <>
              <button className="btn-secondary text-sm" disabled={save.isPending} onClick={() => save.mutate()}>
                Save Edits
              </button>
              <button
                className="btn-primary text-sm"
                disabled={forward.isPending}
                onClick={() => forward.mutate()}
              >
                Save & Forward to Admin
              </button>
            </>
          )}
        </div>
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

      {order.admin_note && order.status !== "SUBMITTED_TO_HO" && (
        <div className="card p-3 md:p-4 border-l-4 border-orange-400">
          <div className="text-xs uppercase text-orange-700 font-medium mb-1">Admin note</div>
          <p className="text-xs md:text-sm whitespace-pre-wrap">{order.admin_note}</p>
        </div>
      )}

      {(order.status === "COMPLETED" || order.status === "FACTORY_RESPONDED") && (
        <div className="card p-3 md:p-4 border-l-4 border-emerald-500">
          <div className="text-xs uppercase text-emerald-700 font-medium mb-1">Factory note</div>
          <p className="text-xs md:text-sm whitespace-pre-wrap">{order.factory_note || "—"}</p>
        </div>
      )}

      <OrderFormTable
        catalog={catalog}
        cells={cells}
        remarks={remarks}
        onChange={editable ? setCells : undefined}
        onRemarksChange={editable ? setRemarks : undefined}
        mode={editable ? "ho-edit" : "ho-view"}
        showPrint={!editable}
      />
    </div>
  );
}
