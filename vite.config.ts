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
      // Keep local development compatible with projects stored on
      // external volumes, which Vite's strict allow-list can reject.
      strict: false,
    },
  },
});
