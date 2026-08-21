import { test, expect } from '@playwright/test';

// Behavioral assertions driven entirely through the DOM (no reliance on any global),
// so they stay valid after the module conversion removes the `app` global. These lock
// the interaction contract: selection, tiles, deselection, reset, and mode switching.

async function settle(page) {
    await page.waitForSelector('#wheel-container svg .wedge');
    await page.waitForTimeout(200);
}

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/index.html');
    await settle(page);
});

test('renders the full three-ring wheel', async ({ page }) => {
    const wedges = page.locator('#wheel-container svg .wedge:not(.shadow-wedge)');
    await expect(wedges).toHaveCount(130);
    const core = page.locator('.core-wedge');
    await expect(core).toHaveCount(7);
});

test('clicking a core wedge selects it and creates a tile', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await expect(page.locator('.wedge.selected')).toHaveCount(1);
    const tile = page.locator('.emotion-tile');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.tile-emotion-name')).toHaveText('Angry');
    // definition loads from the data file, not a placeholder
    await expect(tile.locator('.tile-definition')).not.toHaveClass(/loading/);
    await expect(tile.locator('.tile-definition')).not.toHaveText('');
});

test('deselecting via the tile remove button clears wedge and tile', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Sad"]').click();
    await expect(page.locator('.emotion-tile')).toHaveCount(1);
    await page.locator('.emotion-tile .tile-remove').click();
    await expect(page.locator('.emotion-tile')).toHaveCount(0);
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
});

test('multiple selections accumulate multiple tiles', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();
    await expect(page.locator('.wedge.selected')).toHaveCount(3);
    await expect(page.locator('.emotion-tile')).toHaveCount(3);
});

test('reset clears all selections and tiles', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.core-wedge[data-emotion="Fearful"]').click();
    await expect(page.locator('.emotion-tile')).toHaveCount(2);
    await page.locator('#reset-btn-panel').click();
    await expect(page.locator('.emotion-tile')).toHaveCount(0);
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
});

test('animated reset (rotated + multiple tiles) fully clears state', async ({ page }) => {
    // Runs with real motion so the staggered tile-unwind + rotation animation path
    // (engine.animateResetRotation + clearSelection) actually executes.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();
    // Rotate so the unwind has real work to do.
    await page.mouse.wheel(0, 200);
    await expect(page.locator('.emotion-tile')).toHaveCount(3);
    await page.locator('#reset-btn-panel').click();
    // Wait out the ~1s animation.
    await expect(page.locator('.emotion-tile')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
    // Wheel should be interactive again (isAnimating cleared) and instructions back.
    await expect(page.locator('#panel-instructions')).toBeVisible();
    await page.locator('.core-wedge[data-emotion="Sad"]').click();
    await expect(page.locator('.emotion-tile')).toHaveCount(1);
});

test('simplified mode removes the tertiary ring', async ({ page }) => {
    await expect(page.locator('.tertiary-wedge').first()).toBeAttached();
    // The checkbox itself is display:none; users toggle it via its label.
    await page.locator('label[for="simplified-mode-panel"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.tertiary-wedge')).toHaveCount(0);
    await expect(page.locator('.core-wedge')).toHaveCount(7);
});

test('instructions show when empty and hide when a tile exists', async ({ page }) => {
    const instructions = page.locator('#panel-instructions');
    await expect(instructions).toBeVisible();
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await expect(instructions).toBeHidden();
    await page.locator('.emotion-tile .tile-remove').click();
    await expect(instructions).toBeVisible();
});
