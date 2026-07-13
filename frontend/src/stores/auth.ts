import { defineStore } from "pinia";
import http, { tokens } from "@/api/http";
import type { Tokens, User } from "@/types";

interface AuthState {
  user: User | null;
  ready: boolean; // стартовая проверка сессии завершена
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (): boolean => !!tokens.access,
  },
  actions: {
    async login(username: string, password: string): Promise<void> {
      const { data } = await http.post<Tokens>("/auth/login/", { username, password });
      tokens.set(data);
      await this.fetchMe();
    },
    async register(username: string, email: string, password: string): Promise<void> {
      await http.post("/auth/register/", { username, email, password });
      await this.login(username, password);
    },
    async fetchMe(): Promise<User> {
      const { data } = await http.get<User>("/auth/me/");
      this.user = data;
      return data;
    },
    async init(): Promise<void> {
      if (tokens.access) {
        try {
          await this.fetchMe();
        } catch {
          this.logout();
        }
      }
      this.ready = true;
    },
    logout(): void {
      tokens.clear();
      this.user = null;
    },
  },
});
