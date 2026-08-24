# Tests

Three layers, run locally and in CI (`.github/workflows/ci.yml`):

| Layer | Location | Runner | Env | Purpose |
| --- | --- | --- | --- | --- |
| Unit | `tests/unit/` | Vitest | jsdom | Pin pure logic (geometry, sizing, color, easing, data integrity) + jsdom DOM behavior |
| Behavioral e2e | `tests/e2e/behavior.spec.js` | Playwright | Chromium | Selection, tiles, reset, mode switch — OS-independent |
| Accessibility e2e | `tests/e2e/accessibility.spec.js` | Playwright | Chromium | Keyboard nav, ARIA, live announcements — OS-independent |
| Visual e2e | `tests/e2e/visual.spec.js` | Playwright | Chromium | Pixel snapshots of canonical states — **OS-specific** |

## Commands

```bash
npm test              # unit (Vitest)
npm run test:coverage # unit + coverage report (coverage/)
npm run test:e2e      # all Playwright specs
npm run test:e2e:update  # regenerate snapshots for the CURRENT OS
```

The unit + behavioral + accessibility layers are the required gate. A `createTestWheel()`
fixture in `tests/helpers/wheel.js` stubs `getBoundingClientRect` so `generate()` runs
under jsdom without a browser — use it for any new DOM-level unit test.

## Visual snapshots are OS-specific

Playwright names snapshots per-platform: the committed baselines are macOS
(`*-chromium-darwin.png`). On Linux CI, Playwright looks for `*-chromium-linux.png` and
fails as "missing" until those exist. The `visual` step in CI is therefore
`continue-on-error` and uploads the actual images + diff as the `playwright-report`
artifact.

### Seeding the Linux baseline (one-time)

Because snapshots must be byte-generated on the target OS, do one of:

1. **From CI artifacts** — download the `playwright-report` / `test-results` artifact from
   a CI run, confirm the `*-actual.png` images look correct, rename them to
   `*-chromium-linux.png`, drop them next to the darwin baselines in
   `tests/e2e/visual.spec.js-snapshots/`, and commit. The `visual` CI step then passes.
2. **In the official Playwright container** (if you have Docker):
   ```bash
   docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.62.1-noble \
     bash -c "npm ci && npx playwright test tests/e2e/visual.spec.js --update-snapshots"
   git add tests/e2e/**/**-linux.png && git commit -m "test: add Linux visual baselines"
   ```

Once Linux baselines are committed you may flip the CI `visual` step to a hard gate
(remove `continue-on-error`).
