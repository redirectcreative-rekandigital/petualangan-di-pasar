/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Basis URL server online (mis. 'https://contoh.server'). Kosong = offline. */
  readonly VITE_PASAR_SERVER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
