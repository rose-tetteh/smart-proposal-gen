import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { amaliaiProxy } from './server/amaliai';

export default defineConfig({
  plugins: [react(), tailwindcss(), amaliaiProxy()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: { port: 5180 },
});
