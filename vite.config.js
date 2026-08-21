import { defineConfig } from 'vite';

// The shipped artifact must remain openable directly from disk (file://) with no server,
// preserving the project's original "just open index.html" property. Native ES modules
// cannot load over file://, so we author in modules and let Vite bundle + inline into a
// single self-contained output. `base: './'` keeps asset URLs relative for file:// use.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 100000000, // inline everything so dist/index.html is self-contained
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
  },
});
