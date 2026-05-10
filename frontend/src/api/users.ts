import { apiClient } from "./client";
import type { Branch, User, UserRole } from "../types";

export const usersApi = {
  listBranches: () => apiClient.get<Branch[]>("/branches").then((r) => r.data),
  createBranch: (body: { name: string; code: string; address?: string | null }) =>
    apiClient.post<Branch>("/branches", body).then((r) => r.data),
  updateBranch: (id: number, body: Partial<Branch>) =>
    apiClient.patch<Branch>(`/branches/${id}`, body).then((r) => r.data),
  listUsers: () => apiClient.get<User[]>("/users").then((r) => r.data),
  createUser: (body: {
    email: string;
    password: string;
    name: string;
    mobile_number?: string | null;
    role: UserRole;
    branch_id?: number | null;
  }) => apiClient.post<User>("/users", body).then((r) => r.data),
  updateUser: (
    id: number,
    body: {
      email?: string;
      password?: string | null;
      name?: string;
      mobile_number?: string | null;
      active?: boolean;
      role?: UserRole;
      branch_id?: number | null;
    },
  ) => apiClient.patch<User>(`/users/${id}`, body).then((r) => r.data),
};
