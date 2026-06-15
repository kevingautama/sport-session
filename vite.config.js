import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// sql.js is a CommonJS/emscripten module; Vite pre-bundles it so the default
// export resolves to the factory function. The .wasm is served from /public and
// located via import.meta.env.BASE_URL in db.js.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { host: true },
});
