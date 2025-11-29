import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      strict: false
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    sourcemap: true // Enable source maps for debugging
  }
});