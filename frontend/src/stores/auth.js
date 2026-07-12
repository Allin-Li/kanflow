import { defineStore } from "pinia";
import http, { tokens } from "@/api/http";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    ready: false, // стартовая проверка сессии завершена
  }),
  getters: {
    isAuthenticated: () => !!tokens.access,
  },
  actions: {
    async login(username, password) {
      const { data } = await http.post("/auth/login/", { username, password });
      tokens.set(data);
      await this.fetchMe();
    },
    async register(username, email, password) {
      await http.post("/auth/register/", { username, email, password });
      await this.login(username, password);
    },
    async fetchMe() {
      const { data } = await http.get("/auth/me/");
      this.user = data;
      return data;
    },
    async init() {
      if (tokens.access) {
        try {
          await this.fetchMe();
        } catch {
          this.logout();
        }
      }
      this.ready = true;
    },
    logout() {
      tokens.clear();
      this.user = null;
    },
  },
});
