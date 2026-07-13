import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import type { Tokens } from "@/types";

// Помечаем повторную попытку запроса после refresh, чтобы не зациклиться.
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// Уникальный id вкладки. Уходит в каждый мутирующий запрос заголовком
// X-Client-Id; сервер кладёт его в WS-broadcast (origin). По нему клиент
// отличает собственное эхо и не применяет optimistic-апдейт повторно.
export const CLIENT_ID: string = (globalThis.crypto?.randomUUID?.() ?? String(Math.random())).slice(
  0,
  12,
);

export const tokens = {
  get access(): string | null {
    return localStorage.getItem("access");
  },
  get refresh(): string | null {
    return localStorage.getItem("refresh");
  },
  set({ access, refresh }: Tokens): void {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  },
  clear(): void {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },
};

const http = axios.create({ baseURL: `${API_BASE}/api` });

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (tokens.access) config.headers.set("Authorization", `Bearer ${tokens.access}`);
  config.headers.set("X-Client-Id", CLIENT_ID);
  return config;
});

// Прозрачный refresh access-токена по 401 (одна общая попытка на все запросы).
let refreshing: Promise<AxiosResponse<Tokens>> | null = null;
http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const { response, config } = error;
    if (response?.status === 401 && config && !config._retry && tokens.refresh) {
      config._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post<Tokens>(`${API_BASE}/api/auth/refresh/`, { refresh: tokens.refresh });
        const { data } = await refreshing;
        refreshing = null;
        tokens.set({ access: data.access, refresh: data.refresh });
        config.headers.set("Authorization", `Bearer ${data.access}`);
        return http(config);
      } catch {
        refreshing = null;
        tokens.clear();
        if (location.pathname !== "/login") location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default http;
