import { apiClient } from "./client";
import type { Notification } from "../types";

export const notificationsApi = {
  list: (unread_only = false) =>
    apiClient
      .get<Notification[]>("/notifications", { params: { unread_only } })
      .then((r) => r.data),
  unreadCount: () =>
    apiClient.get<{ unread: number }>("/notifications/unread-count").then((r) => r.data),
  markRead: (id: number) => apiClient.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.post(`/notifications/read-all`),
};
