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
    await expect(angry).toHaveAttribute('aria-label', 'Angry, core feeling, 1 of 7');

    const playful = page.locator('.secondary-wedge[data-emotion="Playful"]');
    await expect(playful).toHaveAttribute('aria-label', 'Playful, under Happy, 1 of 9');
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

// ===== Structured wheel keyboard model (ring / family navigation) =====

const focusedId = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.activeElement!.getAttribute('data-wedge-id'));

test('Left/Right stay in the core ring and wrap', async ({ page }) => {
    await page.locator('.core-wedge[data-nav-index="0"]').focus();
    await page.keyboard.press('ArrowLeft');
    expect(await focusedId(page)).toBe('core-Fearful'); // wrapped to the last core
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await focusedId(page)).toBe('core-Disgusted');
    await expect(page.locator('.wedge[tabindex="0"]')).toHaveCount(1);
});

test('Down steps out to specific feelings, Up steps back, and Down remembers', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').focus();
    await page.keyboard.press('ArrowDown');
    expect(await focusedId(page)).toBe('secondary-Happy-Playful');
    await page.keyboard.press('ArrowRight');
    expect(await focusedId(page)).toBe('secondary-Happy-Content');
    await page.keyboard.press('ArrowDown');
    expect(await page.evaluate(() => document.activeElement!.getAttribute('data-parent'))).toBe(
        'Content'
    );
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focusedId(page)).toBe('core-Happy');
    await page.keyboard.press('ArrowDown');
    expect(await focusedId(page)).toBe('secondary-Happy-Content'); // remembered
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
});

test('edges are announced instead of moving', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Sad"]').focus();
    await page.keyboard.press('ArrowUp');
    expect(await focusedId(page)).toBe('core-Sad');
    await expect(page.locator('#sr-announcer')).toHaveText('This is the center ring.');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#sr-announcer')).toHaveText('This is the outer ring.');
});

test('Page Down / ] jump to the next family in the same ring; Home/End to ring ends', async ({
    page,
}) => {
    await page.locator('.secondary-wedge[data-emotion="Playful"]').focus();
    await page.keyboard.press('PageDown');
    expect(await page.evaluate(() => document.activeElement!.getAttribute('data-level'))).toBe(
        'secondary'
    );
    expect(await page.evaluate(() => document.activeElement!.getAttribute('data-parent'))).toBe(
        'Surprised'
    );
    await page.keyboard.press('[');
    expect(await focusedId(page)).toBe('secondary-Happy-Playful');
    await page.keyboard.press('Home');
    expect(await page.evaluate(() => document.activeElement!.getAttribute('data-parent'))).toBe(
        'Angry'
    );
    await page.keyboard.press('End');
    expect(await page.evaluate(() => document.activeElement!.getAttribute('data-parent'))).toBe(
        'Fearful'
    );
});

test('focused view: navigation skips rested wedges and explains closed rings', async ({ page }) => {
    await page.keyboard.press('f');
    await page.locator('.core-wedge[data-emotion="Happy"]').focus();
    await page.keyboard.press('ArrowDown');
    expect(await focusedId(page)).toBe('core-Happy');
    await expect(page.locator('#sr-announcer')).toHaveText(
        'Choose Happy to open its more specific feelings.'
    );
    await page.keyboard.press('Enter'); // opens Happy's ring
    await page.keyboard.press('ArrowDown');
    expect(await focusedId(page)).toBe('secondary-Happy-Playful');
    // Only Happy's family is open, so Left wraps inside it.
    await page.keyboard.press('ArrowLeft');
    expect(await page.evaluate(() => document.activeElement!.getAttribute('data-parent'))).toBe(
        'Happy'
    );
    expect(
        await page.evaluate(() => document.activeElement!.hasAttribute('data-focused-rest'))
    ).toBe(false);
    await expect(page.locator('.wedge[tabindex="0"]')).toHaveCount(1);
});

test('simplified view: the middle ring is the outer edge', async ({ page }) => {
    await page.keyboard.press('s');
    await page.waitForSelector('.secondary-wedge');
    await page.locator('.secondary-wedge[data-emotion="Playful"]').focus();
    await page.keyboard.press('ArrowDown');
    expect(await focusedId(page)).toBe('secondary-Happy-Playful');
    await expect(page.locator('#sr-announcer')).toHaveText('This is the outer ring.');
});

test('reset is announced to screen readers', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Sad"]').click();
    await page.locator('#reset-btn-panel').click();
    await expect(page.locator('#sr-announcer')).toHaveText(
        'Cleared all selected feelings. Undo is available for a few seconds.'
    );
});

test('control buttons have accessible names', async ({ page }) => {
    await expect(page.locator('#reset-btn-panel')).toHaveAttribute('aria-label', 'Reset the wheel');
    await expect(page.locator('#fullscreen-btn-panel')).toHaveAccessibleName('Fullscreen');
    await expect(page.locator('#fullscreen-btn-panel')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#focused-mode-panel')).toHaveAccessibleName('Focused');
    await expect(page.locator('#simplified-mode-panel')).toHaveAccessibleName('Simplified');
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

test('keyboard: opening a view moves focus in; closing returns it to the opener', async ({
    page,
}) => {
    await page.locator('#help-btn-panel').focus();
    await page.keyboard.press('Enter');
    const back = page.locator('#view-help [data-view-back]');
    await expect(back).toBeFocused(); // focus moves into the opened view
    await page.keyboard.press('Enter');
    await expect(page.locator('#view-help')).toBeHidden();
    await expect(page.locator('#view-explore')).toBeVisible();
    // Focus returns to the control that opened it, never <body>.
    await expect(page.locator('#help-btn-panel')).toBeFocused();

    await page.locator('#about-btn-panel').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(page.locator('#view-about')).toBeHidden();
    await expect(page.locator('#about-btn-panel')).toBeFocused();
});

test('pointer: opening a view does not paint a focus ring on its back button', async ({ page }) => {
    await page.locator('#help-btn-panel').click();
    await expect(page.locator('#view-help')).toBeVisible();
    await expect(page.locator('#view-help [data-view-back]')).not.toBeFocused();
    expect(await page.evaluate(() => !!document.querySelector(':focus-visible'))).toBe(false);
    await page.locator('#view-help [data-view-back]').click();
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

test('hide/show panel buttons swap places and stay on screen', async ({ page }) => {
    const hide = page.locator('#panel-hide-btn');
    const show = page.locator('#panel-show-btn');
    await expect(hide).toBeVisible();
    await expect(show).toBeHidden();
    await hide.click(); // collapse
    await expect(page.locator('.info-panel')).toHaveClass(/minimized/);
    await expect(show).toBeVisible();
    await expect(show).toHaveAttribute('aria-expanded', 'false');
    const box = (await show.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    await show.click(); // expand again
    await expect(page.locator('.info-panel')).not.toHaveClass(/minimized/);
    await expect(hide).toHaveAttribute('aria-expanded', 'true');
});

// The old mid-edge tab sat on the wheel's widest point and covered outer-ring words
// whenever the wheel was width-bound. The corner buttons can never touch the circle.
for (const [width, height] of [
    [1024, 768],
    [1440, 900],
    [844, 390],
    [1180, 820],
]) {
    test(`panel toggles never overlap the wheel at ${width}x${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(400);
        const intrusion = (sel: string) =>
            page.evaluate((sel) => {
                const w = document.querySelector('.wheel-main-group')!.getBoundingClientRect();
                const b = document.querySelector(sel)!.getBoundingClientRect();
                const cx = w.left + w.width / 2;
                const cy = w.top + w.height / 2;
                const nx = Math.max(b.left, Math.min(cx, b.right));
                const ny = Math.max(b.top, Math.min(cy, b.bottom));
                return w.width / 2 - Math.hypot(nx - cx, ny - cy);
            }, sel);
        expect(await intrusion('#panel-hide-btn')).toBeLessThanOrEqual(0);
        await page.locator('#panel-hide-btn').click();
        await page.waitForTimeout(800);
        expect(await intrusion('#panel-show-btn')).toBeLessThanOrEqual(0);
    });
}

// Portrait tablets are session devices: the wheel is width-bound there, so they get
// the bottom sheet (not a side panel that would shrink the wheel by a third).
for (const [width, height] of [
    [820, 1180],
    [1024, 1366],
]) {
    test(`portrait tablet ${width}x${height} uses the sheet and a near-full-width wheel`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(400);
        await expect(page.locator('#mobile-collapse-handle')).toBeVisible();
        await expect(page.locator('#panel-hide-btn')).toBeHidden();
        const wheel = (await page.locator('.wheel-main-group').first().boundingBox())!;
        expect(wheel.width).toBeGreaterThan(width * 0.9);
        // Footer fits on one row: the view chips and Reset share a baseline.
        const chip = (await page.locator('label[for="focused-mode-panel"]').boundingBox())!;
        const reset = (await page.locator('#reset-btn-panel').boundingBox())!;
        expect(Math.abs(chip.y + chip.height / 2 - (reset.y + reset.height / 2))).toBeLessThan(4);
    });
}

test('on mobile, the sheet handle is a button that stays on screen when collapsed', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const handle = page.locator('#mobile-collapse-handle');
    await expect(handle).toHaveJSProperty('tagName', 'BUTTON');
    await expect(handle).toHaveAttribute('aria-controls', 'panel-content');
    await expect(handle).toHaveAttribute('aria-expanded', 'true');

    await handle.click(); // collapse
    await expect(page.locator('.info-panel')).toHaveClass(/minimized/);
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    await expect(handle).toHaveAttribute('aria-label', 'Show feelings panel');
    // Regression: the desktop translateX(100%) leaked to mobile and shoved the whole
    // sheet (handle included) off the right edge.
    const box = (await handle.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);

    await handle.focus();
    await page.keyboard.press('Enter'); // expand by keyboard
    await expect(page.locator('.info-panel')).not.toHaveClass(/minimized/);
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
});

test('the empty-state invitation shows when empty and hides once a tile exists', async ({
    page,
}) => {
    const empty = page.locator('#panel-instructions');
    await expect(empty).toBeVisible();
    // Says how the tool works, not how to feel.
    await expect(empty).toContainText('Select a word on the wheel to see its definition');
    await expect(empty).not.toContainText('no wrong answers');
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await expect(empty).toBeHidden();
});

test('page has an h1 and a skip link that lands in the (re-opened) panel', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Feelings Wheel');
    await page.locator('#panel-hide-btn').click();
    await expect(page.locator('.info-panel')).toHaveClass(/minimized/);

    const skip = page.locator('.skip-link');
    await skip.focus();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('.info-panel')).not.toHaveClass(/minimized/);
    const heading = page.locator('#view-explore .view-title');
    await expect(heading).toBeFocused();
    // The landing spot shows a real focus ring.
    const outline = await heading.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
});

test('the skip link is the first tab stop on a fresh page', async ({ page }) => {
    await page.reload();
    await page.waitForSelector('#wheel-container svg .wedge');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
});

test('panel hide/show buttons are comfortable targets (>= 40px)', async ({ page }) => {
    const hide = (await page.locator('#panel-hide-btn').boundingBox())!;
    expect(hide.width).toBeGreaterThanOrEqual(40);
    expect(hide.height).toBeGreaterThanOrEqual(40);
});

test('collapsing the panel never strands focus inside it, and its controls leave the tab order', async ({
    page,
}) => {
    const reset = page.locator('#reset-btn-panel');
    await reset.focus();
    await page.keyboard.press('p'); // collapse via shortcut while focus is in the footer
    await expect(page.locator('.info-panel')).toHaveClass(/minimized/);
    await expect(page.locator('#panel-show-btn')).toBeFocused();

    // Tabbing onward never lands on an off-screen panel control.
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        const inPanel = await page.evaluate(() => !!document.activeElement?.closest('.info-panel'));
        expect(inPanel).toBe(false);
    }

    await page.locator('#panel-show-btn').focus();
    await page.keyboard.press('Enter'); // reopen
    await expect(page.locator('#panel-hide-btn')).toBeFocused();
    await expect(reset).not.toHaveJSProperty('inert', true);
});

test('on mobile, collapsing from inside the sheet moves focus to the sheet handle', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.locator('#reset-btn-panel').focus();
    await page.keyboard.press('p');
    await expect(page.locator('#mobile-collapse-handle')).toBeFocused();
});

test('shortcuts are exposed on their controls', async ({ page }) => {
    await expect(page.locator('#focused-mode-panel')).toHaveAttribute('aria-keyshortcuts', 'F');
    await expect(page.locator('#simplified-mode-panel')).toHaveAttribute('aria-keyshortcuts', 'S');
    await expect(page.locator('#reset-btn-panel')).toHaveAttribute('aria-keyshortcuts', 'R');
    await expect(page.locator('#panel-hide-btn')).toHaveAttribute('aria-keyshortcuts', 'P');
    await expect(page.locator('#panel-show-btn')).toHaveAttribute('aria-keyshortcuts', 'P');
    await expect(page.locator('#fullscreen-btn-panel')).toHaveAttribute('aria-keyshortcuts', 'F11');
});

test('the keyboard lens teaches the keys for the first few feelings, then gets quiet', async ({
    page,
}) => {
    const keys = page.locator('#wheel-lens .wheel-lens__keys');
    await page.locator('.core-wedge[data-emotion="Angry"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(keys).toBeVisible();
    await expect(keys).toContainText('change ring');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    // Retired: the full list steps back to a pointer…
    await expect(keys).toHaveText('Press ? for keys');
    await expect(page.locator('#wheel-lens .wheel-lens__word')).toBeVisible();
    // …and ? brings it back on demand (and ? again tucks it away).
    await page.keyboard.press('?');
    await expect(keys).toContainText('change ring');
    await page.keyboard.press('ArrowRight');
    await expect(keys).toContainText('change ring');
    await page.keyboard.press('?');
    await expect(keys).toHaveText('Press ? for keys');
});

test('the empty state says how to turn and reach the wheel, and never pitches a view', async ({
    page,
}) => {
    const empty = page.locator('#panel-instructions');
    await expect(empty).toContainText('Drag the wheel to turn it.');
    await expect(empty).toContainText('Tab to the wheel');
    // Views are the therapist's call (Simplified = younger clients), not a client prompt.
    await expect(empty).not.toContainText('Focused');
    await expect(empty).not.toContainText('Simplified');
    await expect(empty.locator('button')).toHaveCount(0);
});

test('switching views or hiding the panel by shortcut keeps keyboard focus on the wheel', async ({
    page,
}) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').focus();
    await page.keyboard.press('ArrowDown'); // a secondary under Happy
    await page.keyboard.press('ArrowDown'); // an outer-ring word
    const outer = await page.evaluate(() => document.activeElement?.getAttribute('data-emotion'));
    expect(outer).toBeTruthy();

    await page.keyboard.press('s'); // Simplified rebuilds the wheel and hides that ring
    const afterS = await page.evaluate(() => ({
        cls: document.activeElement?.getAttribute('class') ?? '',
        tag: document.activeElement?.tagName,
    }));
    expect(afterS.cls).toContain('secondary-wedge'); // its parent, not <body>

    await page.keyboard.press('s'); // back to the full wheel
    await expect(page.locator('.wedge:focus')).toHaveCount(1);

    await page.keyboard.press('p'); // hide the panel: the wheel resizes and rebuilds
    await page.waitForTimeout(500);
    await expect(page.locator('.wedge:focus')).toHaveCount(1);
});

test('Help leads with views and start-up links; keyboard keys are always shown', async ({
    page,
}) => {
    await page.locator('#help-btn-panel').click();
    const help = page.locator('#view-help');
    const titles = await help.locator('.help-group__title').allInnerTexts();
    expect(titles.slice(0, 3)).toEqual(['Using the wheel', 'Views', 'Start a session in a view']);
    await expect(help).toContainText('For younger clients');
    await expect(help).toContainText('?view=simplified');
    expect(titles).toContain('Keyboard');
    await expect(help.locator('details')).toHaveCount(0);
    await expect(help.getByText('Step out to more specific feelings')).toBeVisible();
});

test('short phones show the one-line instruction, never cut off by the footer', async ({
    page,
}) => {
    for (const [width, height] of [
        [320, 568],
        [375, 667],
    ]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(400);
        const shown = await page
            .locator('.empty-hint')
            .first()
            .evaluate((el) => (el as HTMLElement).innerText.trim());
        expect(shown).toBe('Select a word to see its definition.');
        const hint = (await page.locator('.empty-hint').first().boundingBox())!;
        const footer = (await page.locator('.panel-footer').boundingBox())!;
        expect(hint.y + hint.height).toBeLessThanOrEqual(footer.y);
    }
});

test('the wheel keeps one-finger drags for spinning but allows pinch-zoom', async ({ page }) => {
    const ta = await page
        .locator('#wheel-container svg')
        .first()
        .evaluate((el) => getComputedStyle(el).touchAction);
    expect(ta).toBe('pinch-zoom');
});
