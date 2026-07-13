import { defineConfig, lazyPlugins } from "vite-plus";
import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [
    vue(),
    ui({
      ui: {
        colors: {
          primary: "blue",
          neutral: "slate",
        },
      },
    }),
  ]),
  resolve: {
    alias: {
      // import.meta.url + URL — без node:url, чтобы не тянуть типы Node.
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    // В Docker с bind-mount нужен polling, иначе HMR не видит изменения
    watch: { usePolling: true },
  },
});
