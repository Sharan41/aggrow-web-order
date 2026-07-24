import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

/** Dev: `/api` (Vite proxy → backend). Prod: `VITE_API_URL` from Render build env, no trailing slash. */
export function getApiBaseURL(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "/api";
}

const ACCESS_KEY = "aggrow_access_token";
const REFRESH_KEY = "aggrow_refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh?: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const apiClient = axios.create({
  baseURL: getApiBaseURL(),
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pending: Array<(t: string | null) => void> = [];

async function tryRefresh(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${getApiBaseURL()}/auth/refresh`, { refresh_token: refresh });
    tokenStore.setTokens(data.access_token);
    return data.access_token as string;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || !original || original._retry) {
      throw error;
    }
    if (original.url?.includes("/auth/")) {
      throw error;
    }
    original._retry = true;
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pending.push((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }
    isRefreshing = true;
    const newToken = await tryRefresh();
    isRefreshing = false;
    pending.forEach((cb) => cb(newToken));
    pending = [];
    if (!newToken) {
      tokenStore.clear();
      throw error;
    }
    original.headers.Authorization = `Bearer ${newToken}`;
    return apiClient(original);
  },
);
