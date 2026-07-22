import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false,
    // Split vendor chunks so the browser can cache them independently and
    // the initial JS parse time is reduced on first load.
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime — changes rarely, cached longest
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Icon library — large, changes rarely
          'vendor-icons': ['lucide-react'],
          // Signature canvas — only needed on contract pages
          'vendor-signature': ['react-signature-canvas'],
        },
      },
    },
    // Raise the warning threshold slightly (lucide-react is intentionally large)
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
