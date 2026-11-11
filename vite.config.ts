import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Base relatif agar bisa dibuka dari subfolder GitHub Pages maupun domain sendiri.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Survival Sains',
        short_name: 'Survival Sains',
        description:
          'Survival Sains - game petualangan IPA kelas 5 SD/MI: terdampar di Pulau Wonorejo, pelajari 9 bab IPA bersama 9 penjaga, lalu nyalakan Mercusuar Tua.',
        theme_color: '#1f6f4a',
        background_color: '#fff7e6',
        // Dipasang di layar utama: tampil penuh tanpa bilah status/navigasi.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        // Bebas: bisa dimainkan tegak (portrait) maupun mendatar (landscape).
        orientation: 'any',
        start_url: './',
        scope: './',
        lang: 'id',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}', 'assets/gambar-hp/*.webp', 'assets/sampul-*.webp'],
        // Decoder DRACO/KTX2 dan model 3D tidak diprecache (berat, jarang dipakai
        // saat kunjungan pertama) — cukup di-cache saat benar-benar diminta.
        globIgnores: ['assets/libs/**', 'assets/models/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /assets\/(libs|models)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'aset-3d-v3', // v3: semua GLB dikompres (KTX2 + Meshopt) dengan nama berkas yang sama
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
