import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Mengaktifkan PWA di mode localhost untuk dites
      },
      manifest: {
        name: 'Liturgi Converter Pro',
        short_name: 'LiturgiPro',
        description: 'Aplikasi Konversi Tata Ibadah Word ke PPTX',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Membuatnya terbuka seperti aplikasi mandiri
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});