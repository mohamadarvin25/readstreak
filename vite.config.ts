/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      workbox: {
        // Adds the push and notification-click handlers for reading reminders.
        importScripts: ['push-sw.js'],
      },
      manifest: {
        name: 'ReadStreak',
        short_name: 'ReadStreak',
        description: 'Log your reading. Keep the streak alive.',
        theme_color: '#0f0f10',
        background_color: '#0f0f10',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 600 },
  test: {
    environment: 'node',
  },
})
