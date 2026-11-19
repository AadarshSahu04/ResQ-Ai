import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = process.env.VITE_BACKEND_PORT || process.env.PORT || 5001;
const backendTarget = process.env.VITE_API_URL || `http://localhost:${backendPort}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backendTarget,
        ws: true,
      },
    },
  },
});
