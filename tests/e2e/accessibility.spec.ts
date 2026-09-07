import { test, expect } from '@playwright/test';

// Verifies the additive accessibility layer: wheel exposes a single tab-stop,
// wedges are toggle buttons with correct roles/labels/state, keyboard alone can
// select and reset, and selection changes are announced via the live region.

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('#wheel-container svg .wedge');
    await page.waitForTimeout(200);
});

test('wedges expose button semantics and labels', async ({ page }) => {
    const angry = page.locator('.core-wedge[data-emotion="Angry"]');
    await expect(angry).toHaveAttribute('role', 'button');
    await expect(angry).toHaveAttribute('aria-pressed', 'false');
    await expect(angry).toHaveAttribute('aria-label', 'Angry, a core emotion');

    const playful = page.locator('.secondary-wedge[data-emotion="Playful"]');
    await expect(playful).toHaveAttribute('aria-label', 'Playful, a secondary emotion under Happy');
});

test('the wheel is a single tab-stop (one wedge tabindex=0)', async ({ page }) => {
    const focusable = page.locator('.wedge[tabindex="0"]');
    await expect(focusable).toHaveCount(1);
});

test('aria-pressed reflects selection state', async ({ page }) => {
    const happy = page.locator('.core-wedge[data-emotion="Happy"]');
    await happy.click();
    await expect(happy).toHaveAttribute('aria-pressed', 'true');
    // Deselect on the wheel (the sidebar is informational only, no remove control).
    await happy.click();
    await expect(happy).toHaveAttribute('aria-pressed', 'false');
});

test('keyboard alone can focus, select, and the choice is announced', async ({ page }) => {
    // Focus the roving tab-stop wedge and select it with the keyboard.
    await page.locator('.wedge[tabindex="0"]').focus();
    const focusedEmotion = await page.evaluate(() =>
        document.activeElement!.getAttribute('data-emotion')
    );
    await page.keyboard.press('Enter');

    await expect(page.locator('.wedge.selected')).toHaveCount(1);
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(1);
    await expect(page.locator('#sr-announcer')).toHaveText(`Selected ${focusedEmotion}.`);
});

test('arrow keys move focus between wedges without selecting', async ({ page }) => {
    await page.locator('.wedge[tabindex="0"]').focus();
    const first = await page.evaluate(() => document.activeElement!.getAttribute('data-wedge-id'));
    await page.keyboard.press('ArrowRight');
    const second = await page.evaluate(() => document.activeElement!.getAttribute('data-wedge-id'));
    expect(second).not.toBe(first);
    // Moving focus must not select anything.
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
    // The newly focused wedge is now the single tab-stop.
    await expect(page.locator('.wedge[tabindex="0"]')).toHaveCount(1);
});

test('arrow focus order is stable after a selection (nav-index, not DOM order)', async ({
    page,
}) => {
    // Regression: selecting a wedge moves its <path> to the top layer, which used to
    // reshuffle the live-DOM focus order. Focus now follows a stable data-nav-index.
    // Record the neighbour arrow-right lands on from the first wedge with nothing
    // selected, then repeat after selecting that first wedge — it must be identical.
    const firstSel = '.wedge[tabindex="0"]';

    await page.locator(firstSel).focus();
    await page.keyboard.press('ArrowRight');
    const neighbourBefore = await page.evaluate(() =>
        document.activeElement!.getAttribute('data-wedge-id')
    );

    // Reset focus to the first wedge, select it (moves it to the top layer), arrow again.
    await page.locator('.wedge[data-nav-index="0"]').focus();
    await page.keyboard.press('Enter'); // selects the focused wedge
    await page.locator('.wedge[data-nav-index="0"]').focus();
    await page.keyboard.press('ArrowRight');
    const neighbourAfter = await page.evaluate(() =>
        document.activeElement!.getAttribute('data-wedge-id')
    );

    expect(neighbourAfter).toBe(neighbourBefore);
});

test('reset is announced to screen readers', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Sad"]').click();
    await page.locator('#reset-btn-panel').click();
    await expect(page.locator('#sr-announcer')).toHaveText('Cleared all selected emotions.');
});

test('control buttons have accessible names', async ({ page }) => {
    await expect(page.locator('#reset-btn-panel')).toHaveAttribute('aria-label', 'Reset the wheel');
    await expect(page.locator('#fullscreen-btn-panel')).toHaveAttribute(
        'aria-label',
        'Toggle fullscreen'
    );
    await expect(page.locator('#help-btn-panel')).toHaveAttribute(
        'aria-label',
        'How to use the wheel'
    );
    await expect(page.locator('#about-btn-panel')).toHaveAttribute('aria-label', 'About');
    await expect(page.locator('#kofi-btn-panel')).toHaveAttribute(
        'aria-label',
        'Support this project'
    );
});

test('help opens as an in-panel view that fills the sidebar and Escape returns to explore', async ({
    page,
}) => {
    const helpView = page.locator('#view-help');
    const exploreView = page.locator('#view-explore');
    // Default is the explore view; help is hidden until asked.
    await expect(exploreView).toBeVisible();
    await expect(helpView).toBeHidden();

    await page.locator('#help-btn-panel').click();
    await expect(helpView).toBeVisible();
    await expect(exploreView).toBeHidden(); // it replaces, not floats over
    await expect(helpView).toContainText('How to use the wheel');

    // Escape closes the secondary view back to explore.
    await page.keyboard.press('Escape');
    await expect(helpView).toBeHidden();
    await expect(exploreView).toBeVisible();
});

test('the back button returns an in-panel view to explore and it owns focus', async ({ page }) => {
    await page.locator('#help-btn-panel').click();
    const back = page.locator('#view-help [data-view-back]');
    await expect(back).toBeFocused(); // focus moves into the opened view
    await back.click();
    await expect(page.locator('#view-help')).toBeHidden();
    await expect(page.locator('#view-explore')).toBeVisible();
});

test('about opens in-panel (attribution not full-time) with the credits', async ({ page }) => {
    const about = page.locator('#view-about');
    await expect(about).toBeHidden();
    await page.locator('#about-btn-panel').click();
    await expect(about).toBeVisible();
    await expect(about).toContainText('Geoffrey Roberts');
    await expect(about).toContainText('feelingswheel.com');
});

test('support view embeds the Ko-fi tip jar in-page with a safe fallback link', async ({
    page,
}) => {
    const support = page.locator('#view-support');
    await expect(support).toBeHidden();
    await page.locator('#kofi-btn-panel').click();
    await expect(support).toBeVisible();

    // The iframe is lazily pointed at Ko-fi's documented embed endpoint.
    const frame = page.locator('#kofi-frame');
    await expect(frame).toHaveAttribute(
        'src',
        'https://ko-fi.com/jttrs/?hidefeed=true&widget=true&embed=true'
    );
    // A fallback link always works even if the frame can't load.
    const fallback = page.locator('.kofi-fallback a');
    await expect(fallback).toHaveAttribute('href', 'https://ko-fi.com/jttrs');
    await expect(fallback).toHaveAttribute('target', '_blank');
    await expect(fallback).toHaveAttribute('rel', /noopener/);
});

test('selecting an emotion returns from a secondary view to explore', async ({ page }) => {
    await page.locator('#help-btn-panel').click();
    await expect(page.locator('#view-help')).toBeVisible();
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await expect(page.locator('#view-help')).toBeHidden();
    await expect(page.locator('#view-explore')).toBeVisible();
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(1);
});

test('collapsing the panel keeps the expand tab reachable on screen', async ({ page }) => {
    const tab = page.locator('#panel-minimize-tab');
    await tab.click(); // collapse
    await expect(page.locator('.info-panel')).toHaveClass(/minimized/);
    // The tab must remain within the viewport (regression: it was pushed off-screen
    // by the panel's transform when it was a descendant).
    const box = await tab.boundingBox();
    const width = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await tab.click(); // expand again
    await expect(page.locator('.info-panel')).not.toHaveClass(/minimized/);
});

test('the empty-state invitation shows when empty and hides once a tile exists', async ({
    page,
}) => {
    const empty = page.locator('#panel-instructions');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('Tap or spin');
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await expect(empty).toBeHidden();
});
