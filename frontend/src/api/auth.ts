import { apiClient } from "./client";
import type { User } from "../types";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<TokenPair>("/auth/login", { email, password }).then((r) => r.data),
  me: () => apiClient.get<User>("/auth/me").then((r) => r.data),
};
