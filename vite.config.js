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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Measure the app logic only; exclude glue/config/test scaffolding.
      include: ['feelings-wheel-engine.js', 'src/**', 'feelings-data.js', 'app.js'],
      exclude: ['tests/**', 'dist/**', '*.config.js'],
      // Honest floors set just below what the current suite achieves (see below).
      // app.js is DOM/browser glue exercised by Playwright e2e, not unit tests, so
      // global line coverage is intentionally modest; the logic-heavy engine/data
      // modules carry the real coverage weight.
      thresholds: {
        lines: 45,
        functions: 55,
        statements: 45,
        branches: 70,
      },
    },
  },
});
