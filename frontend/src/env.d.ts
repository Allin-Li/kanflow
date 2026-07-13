/// <reference types="vite/client" />

// Переменные окружения Vite, зашиваемые в бандл на этапе сборки.
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_WS_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// SFC-компоненты.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

// vuedraggable@4 не поставляет собственных типов — объявляем его как
// компонент с произвольными пропсами/событиями.
declare module "vuedraggable" {
  import type { DefineComponent } from "vue";
  const draggable: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
  export default draggable;
}
