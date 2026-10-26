import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // Target modern browsers only — smaller output
    target: 'es2020',
    // Inline assets smaller than 4KB as base64 (saves HTTP requests for small icons/svgs)
    assetsInlineLimit: 4096,
    // Only generate source maps in development
    sourcemap: false,
    rollupOptions: {
      output: {
        // Manual chunk splitting — separates vendor libs from app code
        // so browser can cache them independently across deploys
        manualChunks: {
          // React core — changes rarely
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Icon library
          'vendor-icons': ['lucide-react'],
          // Charts library (recharts is large)
          'vendor-charts': ['recharts'],
          // i18n
          'vendor-i18n': ['react-i18next', 'i18next'],
          // Utils
          'vendor-utils': ['axios', 'dayjs'],
        },
        // Predictable asset file names for CDN caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})

