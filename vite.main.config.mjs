import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      // Modul native dimuat oleh Electron saat aplikasi berjalan.
      external: ['better-sqlite3'],
    },
  },
});
