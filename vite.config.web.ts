import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite configuration for web browser deployment
 *
 * Build with: npm run build:web
 * Preview with: npm run preview:web
 */
export default defineConfig({
  plugins: [react()],
  base: '/', // Use absolute paths for web deployment
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    // Use web-specific index.html
    rollupOptions: {
      input: resolve(__dirname, 'index.web.html'),
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/database', 'firebase/storage'],
          'peer-vendor': ['peerjs'],
        }
      }
    },
    // Generate source maps for debugging (optional - remove for production)
    sourcemap: false,
  },
  // Define environment-specific replacements
  define: {
    // Ensure process.env is available for compatibility
    'process.env': {}
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'peerjs', 'firebase/app', 'firebase/database'],
    // Exclude Capacitor packages for web build (they're dynamically imported anyway)
    exclude: [
      '@capacitor/core',
      '@capacitor/clipboard',
      '@capacitor/haptics',
      '@capacitor/app',
      '@capacitor/status-bar',
      '@capacitor-community/safe-area'
    ]
  }
});
