import { test, expect } from '@playwright/test';

// Golden visual baseline. Captured against the CURRENT (pre-refactor) source, then
// every later refactor step must pixel-match. Reduced motion is emulated so
// transitions settle to a deterministic final frame without altering final appearance.
test.use({ colorScheme: 'light' });

async function settle(page) {
    await page.waitForSelector('#wheel-container svg', { state: 'attached' });
    await page.waitForFunction(
        () => document.querySelectorAll('#wheel-container svg .wedge').length > 0
    );
    await page.waitForTimeout(400); // allow fade-in / layout to settle
}

test.describe('visual baseline', () => {
    test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
    });

    test('desktop default', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/index.html');
        await settle(page);
        await expect(page).toHaveScreenshot('desktop-default.png', { fullPage: true });
    });

    test('mobile default', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/index.html');
        await settle(page);
        await expect(page).toHaveScreenshot('mobile-default.png', { fullPage: true });
    });

    test('tiny default', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 568 });
        await page.goto('/index.html');
        await settle(page);
        await expect(page).toHaveScreenshot('tiny-default.png', { fullPage: true });
    });

    test('simplified mode', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/index.html');
        await settle(page);
        await page.locator('label[for="simplified-mode-panel"]').click();
        await page.waitForTimeout(400);
        await expect(page).toHaveScreenshot('simplified-mode.png', { fullPage: true });
    });

    test('core + secondary selected with tiles', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/index.html');
        await settle(page);
        await page.locator('.core-wedge[data-emotion="Happy"]').click();
        await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
        await page.waitForTimeout(400);
        await expect(page).toHaveScreenshot('two-selected.png', { fullPage: true });
    });
});
