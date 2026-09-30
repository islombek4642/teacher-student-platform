/// <reference types="vitest/config" />
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT || env.PORT || 5173);
  const host = env.VITE_HOST === 'localhost' ? '0.0.0.0' : (env.VITE_HOST || '0.0.0.0');
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'recharts',
        'zod',
        'lucide-react',
        '@iconify/react',
        '@tanstack/react-query',
        'axios',
        'i18next',
        'react-i18next',
      ],
    },
    server: {
      host,
      port,
      allowedHosts: true,
      proxy: {
        '/auth': { target: backendUrl, changeOrigin: true },
        '/teachers': { target: backendUrl, changeOrigin: true },
        '/groups': { target: backendUrl, changeOrigin: true },
        '/students': { target: backendUrl, changeOrigin: true },
        '/ielts': { target: backendUrl, changeOrigin: true },
        '/health': { target: backendUrl, changeOrigin: true },
        '/api': { target: backendUrl, changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test-setup.ts',
    },
  };
});
