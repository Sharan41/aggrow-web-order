import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { StatusBadge } from "../../components/StatusBadge";
import type { OrderStatus } from "../../types";

function List({ title, statuses }: { title: string; statuses: OrderStatus[] }) {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "factory", statuses.join(",")],
    queryFn: async () => {
      const all: Awaited<ReturnType<typeof ordersApi.list>> = [];
      for (const s of statuses) {
        all.push(...(await ordersApi.list({ status: s })));
      }
      return all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    },
  });

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No orders.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-max text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Location</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Items</th>
                <th className="text-left px-3 py-2">Admin</th>
                <th className="text-left px-3 py-2">Forwarded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">#{o.id}</td>
                  <td className="px-3 py-2">{o.customer_name}</td>
                  <td className="px-3 py-2">{o.branch_name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-3 py-2">{o.item_count}</td>
                  <td className="px-3 py-2">{o.admin_reviewer_name ?? "—"}</td>
                  <td className="px-3 py-2">
                    {o.ho_forwarded_at ? new Date(o.ho_forwarded_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link to={`/factory/orders/${o.id}`} className="text-brand-700 hover:underline">
                      Open
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

export function FactoryPending() {
  return <List title="Pending Orders" statuses={["HO_FORWARDED"]} />;
}

export function FactoryHistory() {
  return <List title="Factory History" statuses={["COMPLETED", "FACTORY_RESPONDED"]} />;
}
