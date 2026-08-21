import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The shipped artifact must remain openable directly from disk (file://) with no server,
// preserving the project's original "just open index.html" property. Native ES modules
// and external <script>/<link> refs are blocked over file:// by CORS (opaque null origin),
// so we author in modules and inline EVERYTHING into a single self-contained index.html.
// The plugin is dev-only; the shipped output has zero runtime dependencies.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    cssCodeSplit: false,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
  },
});
