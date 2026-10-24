import { defineConfig } from 'vite';

export default defineConfig({
  // caminhos relativos: funciona na subpasta do GitHub Pages e no zip do itch.io
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
