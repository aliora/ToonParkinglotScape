import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLibraryBuild = mode === 'library';

  return {
    plugins: [react()],

    // Library build configuration
    build: isLibraryBuild ? {
      lib: {
        entry: resolve(__dirname, 'src/main-library.tsx'),
        name: 'ToonParkingLot',
        formats: ['iife'],
        fileName: () => 'toon-parking-lot.iife.js',
      },
      rollupOptions: {
        // Don't externalize anything for IIFE build - bundle everything
        external: [],
        output: {
          // Global variable for external libraries
          globals: {},
          // Ensure CSS is extracted
          assetFileNames: 'toon-parking-lot.[ext]',
        },
      },
      // Output to dist/lib for library build
      outDir: 'dist/lib',
      // Generate source maps for debugging
      sourcemap: true,
      // Minify for production
      minify: 'esbuild',
    } : {
      // Regular app build (default)
      outDir: 'dist',
    },

    // Define public path for assets
    base: isLibraryBuild ? './' : '/',
  };
});

