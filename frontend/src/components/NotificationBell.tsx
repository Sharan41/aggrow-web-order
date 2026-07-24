import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { notificationsApi } from "../api/notifications";

export function NotificationBell() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 20000,
  });
  const unread = data?.unread ?? 0;

  return (
    <Link
      to="/notifications"
      onClick={() => qc.invalidateQueries({ queryKey: ["notifications"] })}
      className="relative inline-flex items-center rounded-full p-2 text-slate-600 hover:bg-slate-100"
      aria-label="Notifications"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6z" />
        <path d="M8 16a2 2 0 1 0 4 0H8z" />
      </svg>
      {unread > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
