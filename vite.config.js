import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// sql.js is a CommonJS/emscripten module; let Vite pre-bundle it so the default
// export resolves to the factory function. The .wasm is served from /public and
// located via import.meta.env.BASE_URL in db.js.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true },
});
