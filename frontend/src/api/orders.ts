import { apiClient } from "./client";
import type { DashboardKPI, OrderDetail, OrderFormType, OrderStatus, OrderSummary } from "../types";

export interface ItemInput {
  product_id: number;
  size_label: string;
  qty: number;
}

export interface FactoryItemInput {
  product_id: number;
  size_label: string;
  available: boolean;
  note?: string | null;
}

export interface ProductRemarkInput {
  product_id: number;
  remarks?: string | null;
}

export const ordersApi = {
  list: (filters?: { status?: OrderStatus; branch_id?: number; customer_id?: number }) =>
    apiClient
      .get<OrderSummary[]>("/orders", { params: filters })
      .then((r) => r.data),
  kpis: () => apiClient.get<DashboardKPI>("/orders/kpis").then((r) => r.data),
  get: (id: number) => apiClient.get<OrderDetail>(`/orders/${id}`).then((r) => r.data),
  create: (body: {
    items: ItemInput[];
    customer_note?: string | null;
    product_remarks?: ProductRemarkInput[];
    order_form_type?: OrderFormType;
  }) =>
    apiClient.post<OrderDetail>("/orders", body).then((r) => r.data),
  updateDraft: (
    id: number,
    body: { items?: ItemInput[]; customer_note?: string | null; product_remarks?: ProductRemarkInput[] },
  ) => apiClient.patch<OrderDetail>(`/orders/${id}`, body).then((r) => r.data),
  submit: (id: number) => apiClient.post<OrderDetail>(`/orders/${id}/submit`).then((r) => r.data),
  hoEdit: (id: number, body: { items?: ItemInput[]; ho_note?: string | null; product_remarks?: ProductRemarkInput[] }) =>
    apiClient.patch<OrderDetail>(`/orders/${id}/ho`, body).then((r) => r.data),
  forward: (id: number) =>
    apiClient.post<OrderDetail>(`/orders/${id}/forward`).then((r) => r.data),
  reject: (id: number, reason?: string | null) =>
    apiClient.post<OrderDetail>(`/orders/${id}/reject`, { reason }).then((r) => r.data),
  factoryRespond: (
    id: number,
    body: { items: FactoryItemInput[]; factory_note?: string | null },
  ) => apiClient.post<OrderDetail>(`/orders/${id}/respond`, body).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/orders/${id}`).then((r) => r.data),
};
