import { apiClient } from "./client";
import type { Catalog, OrderFormType } from "../types";

export const catalogApi = {
  get: (formType: OrderFormType = "AG_GROW") =>
    apiClient.get<Catalog>("/catalog", { params: { form_type: formType } }).then((r) => r.data),
  createCategory: (body: { name: string; catalog_type?: OrderFormType; display_order?: number }) =>
    apiClient.post("/catalog/categories", body).then((r) => r.data),
  updateCategory: (id: number, body: { name?: string; display_order?: number }) =>
    apiClient.patch(`/catalog/categories/${id}`, body).then((r) => r.data),
  deleteCategory: (id: number) => apiClient.delete(`/catalog/categories/${id}`),
  createPackingGroup: (body: {
    category_id: number;
    label: string;
    column_headers: string[];
    display_order?: number;
  }) => apiClient.post("/catalog/packing-groups", body).then((r) => r.data),
  updatePackingGroup: (
    id: number,
    body: {
      label?: string;
      column_headers?: string[];
      add_column?: string;
      remove_column?: string;
      display_order?: number;
    },
  ) => apiClient.patch(`/catalog/packing-groups/${id}`, body).then((r) => r.data),
  renamePackingGroupColumn: (id: number, old_header: string, new_header: string) =>
    apiClient
      .patch(`/catalog/packing-groups/${id}/rename-column`, { old_header, new_header })
      .then((r) => r.data),
  deletePackingGroup: (id: number) => apiClient.delete(`/catalog/packing-groups/${id}`),
  createProduct: (body: {
    packing_group_id: number;
    name: string;
    packing_type?: string | null;
    available_sizes: string[];
    display_order?: number;
    active?: boolean;
  }) => apiClient.post("/catalog/products", body).then((r) => r.data),
  updateProduct: (
    id: number,
    body: {
      s_no?: number;
      name?: string;
      packing_type?: string | null;
      available_sizes?: string[];
      display_order?: number;
      active?: boolean;
    },
  ) => apiClient.patch(`/catalog/products/${id}`, body).then((r) => r.data),
  deleteProduct: (id: number) => apiClient.delete(`/catalog/products/${id}`),
};
