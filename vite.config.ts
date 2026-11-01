/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/riot-command/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
