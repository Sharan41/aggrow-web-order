import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { notificationsApi } from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { homeForRole } from "../routes-helper";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(false),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead().then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const orderPrefix = user?.role === "HEAD_OFFICE"
    ? "/ho/orders"
    : user?.role === "FACTORY"
    ? "/factory/orders"
    : "/customer/orders";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => markAll.mutate()}>
            Mark all read
          </button>
          <Link className="btn-secondary" to={homeForRole(user!.role)}>
            Back
          </Link>
        </div>
      </div>

      {!data || data.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No notifications.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {data.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start gap-3 ${n.read_at ? "opacity-70" : "bg-brand-50/50"}`}
            >
              <div className="flex-1">
                <div className="text-sm">
                  {n.order_id ? (
                    <Link className="text-brand-700 hover:underline" to={`${orderPrefix}/${n.order_id}`}>
                      {n.message}
                    </Link>
                  ) : (
                    n.message
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {new Date(n.created_at).toLocaleString()} · {n.type.replace("_", " ")}
                </div>
              </div>
              {!n.read_at && (
                <button
                  className="text-xs text-brand-700 hover:underline"
                  onClick={() => markRead.mutate(n.id)}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
