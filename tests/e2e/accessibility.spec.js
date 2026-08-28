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
    await page.locator('.emotion-tile .tile-remove').click();
    await expect(happy).toHaveAttribute('aria-pressed', 'false');
});

test('keyboard alone can focus, select, and the choice is announced', async ({ page }) => {
    // Focus the roving tab-stop wedge and select it with the keyboard.
    await page.locator('.wedge[tabindex="0"]').focus();
    const focusedEmotion = await page.evaluate(() =>
        document.activeElement.getAttribute('data-emotion')
    );
    await page.keyboard.press('Enter');

    await expect(page.locator('.wedge.selected')).toHaveCount(1);
    await expect(page.locator('.emotion-tile')).toHaveCount(1);
    await expect(page.locator('#sr-announcer')).toHaveText(`Selected ${focusedEmotion}.`);
});

test('arrow keys move focus between wedges without selecting', async ({ page }) => {
    await page.locator('.wedge[tabindex="0"]').focus();
    const first = await page.evaluate(() => document.activeElement.getAttribute('data-wedge-id'));
    await page.keyboard.press('ArrowRight');
    const second = await page.evaluate(() => document.activeElement.getAttribute('data-wedge-id'));
    expect(second).not.toBe(first);
    // Moving focus must not select anything.
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
    // The newly focused wedge is now the single tab-stop.
    await expect(page.locator('.wedge[tabindex="0"]')).toHaveCount(1);
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
});

test('help is on demand: dialog opens, is labelled, and Escape closes it', async ({ page }) => {
    const dialog = page.locator('#help-dialog');
    // No standing instruction manual — help lives behind the ? control.
    await expect(dialog).toBeHidden();
    await page.locator('#help-btn-panel').click();
    await expect(dialog).toBeVisible();
    // Modal dialog is labelled by its title for assistive tech.
    await expect(dialog).toHaveAttribute('aria-labelledby', 'help-dialog-title');
    await expect(page.locator('#help-dialog-title')).toHaveText('How to use the wheel');
    // Escape closes (native <dialog> behavior we rely on).
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
});

test('closing the help dialog returns focus to the trigger', async ({ page }) => {
    const openBtn = page.locator('#help-btn-panel');
    await openBtn.click();
    await expect(page.locator('#help-dialog')).toBeVisible();
    await page.locator('#help-dialog-close').click();
    await expect(page.locator('#help-dialog')).toBeHidden();
    // Native showModal()/close() restores focus to the invoking element.
    await expect(openBtn).toBeFocused();
});

test('the empty-state invitation shows when empty and hides once a tile exists', async ({
    page,
}) => {
    const empty = page.locator('#panel-instructions');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('Tap a feeling');
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await expect(empty).toBeHidden();
});
