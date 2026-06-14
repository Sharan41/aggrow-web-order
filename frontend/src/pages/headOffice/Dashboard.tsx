import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { StatusBadge } from "../../components/StatusBadge";
import { FormTypeBadge } from "../../components/FormTypeBadge";
import { useToast } from "../../components/Toast";
import type { OrderSummary } from "../../types";

function KpiCard({ label, value, to }: { label: string; value: number; to?: string }) {
  const inner = (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-semibold text-brand-700 mt-1">{value}</div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function HoDashboard() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data: kpis } = useQuery({ queryKey: ["kpis"], queryFn: () => ordersApi.kpis() });
  const { data: recent } = useQuery({ queryKey: ["orders", "recent"], queryFn: () => ordersApi.list() });

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Head Office Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Total" value={kpis?.total ?? 0} to="/ho/orders" />
        <KpiCard label="Draft" value={kpis?.draft ?? 0} />
        <KpiCard label="Pending approval" value={kpis?.submitted_to_ho ?? 0} to="/ho/pending" />
        <KpiCard label="In factory" value={kpis?.ho_forwarded ?? 0} />
        <KpiCard label="Factory responded" value={kpis?.factory_responded ?? 0} to="/ho/factory" />
        <KpiCard label="Completed" value={kpis?.completed ?? 0} />
        <KpiCard label="Rejected" value={kpis?.rejected ?? 0} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-medium">Recent orders</h2>
          <Link to="/ho/orders" className="text-sm text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
          <table className="w-full min-w-max text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Customer</th>
              <th className="text-left px-3 py-2">Branch</th>
              <th className="text-left px-3 py-2">Order form</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Items</th>
              <th className="text-left px-3 py-2">Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(recent ?? []).slice(0, 10).map((o) => (
              <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">#{o.id}</td>
                <td className="px-3 py-2">{o.customer_name}</td>
                <td className="px-3 py-2">{o.branch_name ?? "—"}</td>
                <td className="px-3 py-2">
                  <FormTypeBadge type={o.order_form_type} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-3 py-2">{o.item_count}</td>
                <td className="px-3 py-2">{new Date(o.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex gap-2 justify-end items-center">
                    <Link to={`/ho/orders/${o.id}`} className="text-brand-700 hover:underline">
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
    </div>
  );
}
