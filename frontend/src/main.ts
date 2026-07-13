import { createApp } from "vue";
import { createPinia } from "pinia";
import ui from "@nuxt/ui/vue-plugin";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "@/stores/auth";
import "./assets/main.css";

const app = createApp(App);
app.use(createPinia());
app.use(ui);

// Восстанавливаем сессию до монтирования, чтобы гвард роутера
// сразу знал актуального пользователя.
const auth = useAuthStore();
void auth.init().finally(() => {
  app.use(router);
  app.mount("#app");
});
