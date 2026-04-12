import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Cor da marca (alinhada a --primary em index.css, ~hsl(201 96% 32%)). */
const THEME_COLOR = '#036496';

const shortcutIcon = [{ src: '/icon.png', sizes: '192x192', type: 'image/png' as const }];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'lex-logo.png',
          'favicon.png',
          'apple-touch-icon.png',
          'logo.png',
          'icon.png',
          'pwa-screenshot-narrow.png',
          'pwa-screenshot-wide.png',
        ],
        manifest: {
          name: 'LeX Finance',
          short_name: 'LeX',
          description: 'Controle financeiro pessoal e empresarial (PF + PJ)',
          theme_color: THEME_COLOR,
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/',
          lang: 'pt-BR',
          categories: ['finance', 'business', 'productivity'],
          icons: [
            {
              src: '/icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Dashboard',
              short_name: 'Início',
              description: 'Resumo e indicadores',
              url: '/',
              icons: shortcutIcon,
            },
            {
              name: 'Receitas',
              short_name: 'Receitas',
              description: 'Lista e nova receita',
              url: '/movimentos/receitas',
              icons: shortcutIcon,
            },
            {
              name: 'Despesas',
              short_name: 'Despesas',
              description: 'Lista e nova despesa',
              url: '/movimentos/despesas',
              icons: shortcutIcon,
            },
          ],
          screenshots: [
            {
              src: '/pwa-screenshot-narrow.png',
              sizes: '390x844',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'LeX Finance no telemóvel',
            },
            {
              src: '/pwa-screenshot-wide.png',
              sizes: '1376x768',
              type: 'image/png',
              form_factor: 'wide',
              label: 'LeX Finance no computador',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/health$/],
        },
        devOptions: {
          enabled: env.VITE_PWA_DEV === 'true',
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
