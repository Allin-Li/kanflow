import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { tokens } from "@/api/http";

declare module "vue-router" {
  interface RouteMeta {
    public?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
    meta: { public: true },
  },
  {
    path: "/",
    name: "boards",
    component: () => import("@/views/BoardsListView.vue"),
  },
  {
    path: "/boards/:id",
    name: "board",
    component: () => import("@/views/BoardView.vue"),
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (!to.meta.public && !tokens.access) {
    return { name: "login", query: { next: to.fullPath } };
  }
  if (to.name === "login" && tokens.access) {
    return { name: "boards" };
  }
});

export default router;
