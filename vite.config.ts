import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Lets the dev server proxy API calls to the Node/Express backend
    // that also powers the mobile app, so both clients hit one API.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    fs: {
      // The repo folder name contains a colon ("school-dropoff:pickup"),
      // which trips up Vite's strict fs allow-list path matching and
      // 403s every request in dev. Safe to relax locally.
      strict: false,
    },
  },
});
