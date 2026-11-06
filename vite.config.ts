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
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Petualangan di Pasar',
        short_name: 'Petualangan Pasar',
        description:
          'Game edukasi matematika kelas 6 SD/MI: jelajahi 16 noktah materi TKA (Bilangan, Geometri, Data) di peta 3D dan taklukkan babak puncak Pasar Ramai.',
        theme_color: '#1f6f4a',
        background_color: '#fff7e6',
        display: 'standalone',
        orientation: 'portrait',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        // Decoder DRACO/KTX2 dan model 3D tidak diprecache (berat, jarang dipakai
        // saat kunjungan pertama) — cukup di-cache saat benar-benar diminta.
        globIgnores: ['assets/libs/**', 'assets/models/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /assets\/(libs|models)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'aset-3d',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 },
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
