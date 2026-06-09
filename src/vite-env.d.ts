/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YANDEX_API_KEY?: string;
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
