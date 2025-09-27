import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    // Use the new, correct package name here
    include: ['@shiguredo/rnnoise-wasm'],
  },
});