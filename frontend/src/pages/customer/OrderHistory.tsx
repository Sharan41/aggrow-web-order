import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { StatusBadge } from "../../components/StatusBadge";

export default function OrderHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: () => ordersApi.list(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <Link to="/customer/new" className="btn-primary">
          + New Order
        </Link>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No orders yet. Start by creating one.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-max text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Items</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-left px-3 py-2">Submitted</th>
                <th className="text-left px-3 py-2">HO Forwarded</th>
                <th className="text-left px-3 py-2">Factory Responded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">#{o.id}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-3 py-2">{o.item_count}</td>
                  <td className="px-3 py-2">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{o.submitted_at ? new Date(o.submitted_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2">{o.ho_forwarded_at ? new Date(o.ho_forwarded_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2">
                    {o.factory_responded_at ? new Date(o.factory_responded_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link to={`/customer/orders/${o.id}`} className="text-brand-700 hover:underline">
                      View
                    </Link>
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
