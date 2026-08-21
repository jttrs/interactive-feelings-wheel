import { defineConfig, devices } from '@playwright/test';

// Serves whichever directory SERVE_DIR points at (repo root by default). The same
// snapshots must pass against both the current source and the built dist/, which is
// how we prove the refactor preserves appearance + behavior.
const PORT = 4321;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: [['list']],
    // Slightly higher pixel tolerance absorbs sub-pixel AA differences that are not
    // meaningful behavior changes; large structural changes still fail loudly.
    expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
    },
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
        },
    ],
    webServer: {
        command: 'node tests/static-server.js',
        url: `http://localhost:${PORT}/index.html`,
        reuseExistingServer: !process.env.CI,
        env: { PORT: String(PORT), SERVE_DIR: process.env.SERVE_DIR || process.cwd() },
    },
});
