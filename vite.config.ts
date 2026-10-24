import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // caminhos relativos: funciona na subpasta do GitHub Pages e no zip do itch.io
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MataBarata Remastered',
        short_name: 'MataBarata',
        lang: 'pt-BR',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#000000',
        theme_color: '#000000',
        // ponytail: só SVG; PNGs (exigidos por alguns Androids) entram com o ícone do Google Flow
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5_000_000,
      },
    }),
  ],
});
