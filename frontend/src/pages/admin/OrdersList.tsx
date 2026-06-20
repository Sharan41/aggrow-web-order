import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { ordersApi } from "../../api/orders";
import { StatusBadge } from "../../components/StatusBadge";
import { FormTypeBadge } from "../../components/FormTypeBadge";
import { useToast } from "../../components/Toast";
import type { OrderStatus, OrderSummary } from "../../types";

interface Props {
  defaultStatus?: OrderStatus;
  title: string;
  filter?: (o: OrderSummary) => boolean;
}

const STATUS_OPTIONS: (OrderStatus | "")[] = [
  "",
  "SUBMITTED_TO_HO",
  "SUBMITTED_TO_ADMIN",
  "HO_FORWARDED",
  "FACTORY_RESPONDED",
  "COMPLETED",
  "REJECTED",
];

export function OrdersList({ defaultStatus, title, filter }: Props) {
  const [status, setStatus] = useState<OrderStatus | "">(defaultStatus ?? "");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "admin", status],
    queryFn: () => ordersApi.list(status ? { status: status as OrderStatus } : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId: number) => ordersApi.delete(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
      showToast("Order deleted successfully");
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || "Failed to delete order", "error"),
  });

  const handleDelete = (order: OrderSummary) => {
    if (window.confirm(`Are you sure you want to delete order #${order.id}? This action cannot be undone.`)) {
      deleteMutation.mutate(order.id);
    }
  };

  const rows = (data ?? []).filter((o) => {
    if (filter && !filter(o)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(o.id).includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      (o.branch_name ?? "").toLowerCase().includes(q) ||
      (o.ho_reviewer_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="input max-w-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          className="input max-w-xs"
          placeholder="Search by id / customer / branch / HO"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No orders match.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-max text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Branch</th>
                <th className="text-left px-3 py-2">Head Office</th>
                <th className="text-left px-3 py-2">Order form</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Items</th>
                <th className="text-left px-3 py-2">Submitted</th>
                <th className="text-left px-3 py-2">HO forwarded</th>
                <th className="text-left px-3 py-2">Admin forwarded</th>
                <th className="text-left px-3 py-2">Responded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">#{o.id}</td>
                  <td className="px-3 py-2">{o.customer_name}</td>
                  <td className="px-3 py-2">{o.branch_name ?? "—"}</td>
                  <td className="px-3 py-2">{o.ho_reviewer_name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <FormTypeBadge type={o.order_form_type} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-3 py-2">{o.item_count}</td>
                  <td className="px-3 py-2">{o.submitted_at ? new Date(o.submitted_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2">
                    {o.ho_forwarded_at ? new Date(o.ho_forwarded_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {o.admin_forwarded_at ? new Date(o.admin_forwarded_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {o.factory_responded_at ? new Date(o.factory_responded_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      <Link to={`/admin/orders/${o.id}`} className="text-brand-700 hover:underline">
                        Open
                      </Link>
                      {o.status === "COMPLETED" && (
                        <button
                          onClick={() => handleDelete(o)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete order"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminPending() {
  return <OrdersList defaultStatus="SUBMITTED_TO_ADMIN" title="Pending Approvals" />;
}

export function AdminAllOrders() {
  return <OrdersList title="All Orders" />;
}

export function AdminFactoryResponses() {
  return (
    <OrdersList
      title="Factory Responses"
      filter={(o) => ["FACTORY_RESPONDED", "COMPLETED"].includes(o.status)}
    />
  );
}
