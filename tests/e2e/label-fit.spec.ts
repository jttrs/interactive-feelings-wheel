import { test, expect, type Page } from '@playwright/test';

// Small-screen readability: every wheel label must sit inside its own wedge at phone,
// landscape, tablet and desktop sizes (panel open and collapsed), and cramped wheels
// get a gentle, dismissible tip that never switches the view by itself.

const VIEWPORTS = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
];

async function open(page: Page, width: number, height: number) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height });
    await page.goto('/index.html');
    await page.waitForSelector('#wheel-container svg .wedge');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
}

async function collapsePanel(page: Page) {
    const handle = page.locator('#mobile-collapse-handle');
    const tab = page.locator('#panel-minimize-tab');
    await ((await handle.isVisible()) ? handle : tab).click();
    await expect(page.locator('.info-panel')).toHaveClass(/minimized/);
    // Let the resize-driven regenerate + refit settle.
    await page.waitForTimeout(800);
}

// Labels whose (unrotated) text box has a corner outside its paired wedge's fill.
async function overflowingLabels(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const svg = document.querySelector('#wheel-container svg')!;
        const out: string[] = [];
        svg.querySelectorAll<SVGTextElement>('text[data-wedge-id]').forEach((t) => {
            const path = svg.querySelector<SVGPathElement>(
                `path.wedge[data-wedge-id="${t.dataset.wedgeId}"]`
            );
            if (!path) return;
            const bb = t.getBBox();
            const m = path.getScreenCTM()!.inverse().multiply(t.getScreenCTM()!);
            const corners = [
                [bb.x, bb.y],
                [bb.x + bb.width, bb.y],
                [bb.x, bb.y + bb.height],
                [bb.x + bb.width, bb.y + bb.height],
            ];
            const outside = corners.some(
                ([x, y]) => !path.isPointInFill(new DOMPoint(x, y).matrixTransform(m))
            );
            if (outside) out.push(t.textContent || '');
        });
        return out;
    });
}

for (const { width, height } of VIEWPORTS) {
    test(`no wheel label overflows its wedge at ${width}x${height} (panel open + collapsed)`, async ({
        page,
    }) => {
        await open(page, width, height);
        expect(await page.locator('#wheel-container svg text').count()).toBeGreaterThan(100);
        expect(await overflowingLabels(page)).toEqual([]);

        await collapsePanel(page);
        expect(await overflowingLabels(page)).toEqual([]);
    });
}

test('selected (bold) labels still fit their wedges on a phone', async ({ page }) => {
    await open(page, 390, 844);
    for (const emotion of ['Disrespected', 'Disillusioned', 'Disappointed']) {
        await page.locator(`.wedge[data-emotion="${emotion}"]`).first().click();
        await page.waitForTimeout(300);
    }
    await expect(page.locator('.wedge.selected')).toHaveCount(3);
    expect(await overflowingLabels(page)).toEqual([]);
});

test('words in the same ring share an even size on a desktop wheel', async ({ page }) => {
    await open(page, 1440, 900);
    const sizes = await page.$$eval('#wheel-container svg text[data-level="tertiary"]', (ts) =>
        ts.map((t) => parseFloat(t.getAttribute('font-size') || '0'))
    );
    const max = Math.max(...sizes);
    // Most words sit at the ring's size; only a few long ones shrink a little.
    expect(sizes.filter((s) => s >= max * 0.99).length / sizes.length).toBeGreaterThan(0.7);
});

test.describe('small-screen tip', () => {
    test('shows on a phone and never changes the view by itself', async ({ page }) => {
        await open(page, 320, 568);
        const nudge = page.locator('#screen-nudge');
        await expect(nudge).toBeVisible();
        await expect(nudge).toContainText('to read it');
        // It sits on the wheel it's about, not in the panel.
        await expect(page.locator('.wheel-container #screen-nudge')).toHaveCount(1);
        await expect(page.locator('#simplified-mode-panel')).not.toBeChecked();
        await expect(page.locator('#guided-mode-panel')).not.toBeChecked();
        await expect(page.locator('#wheel-container svg .tertiary-wedge').first()).toBeAttached();
        await expect(page.locator('#sr-announcer')).toContainText('Simplified or Guided');
    });

    test('is hidden on a desktop wheel', async ({ page }) => {
        await open(page, 1440, 900);
        await expect(page.locator('#screen-nudge')).toBeHidden();
    });

    test('dismisses by keyboard, stays dismissed after reload, leaves the view alone', async ({
        page,
    }) => {
        await open(page, 390, 844);
        const dismiss = page.locator('#screen-nudge-dismiss');
        await expect(dismiss).toBeVisible();
        await dismiss.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#screen-nudge')).toBeHidden();
        await expect(page.locator('#simplified-mode-panel')).toBeFocused();
        await expect(page.locator('#simplified-mode-panel')).not.toBeChecked();
        await expect(page.locator('#guided-mode-panel')).not.toBeChecked();

        await page.reload();
        await page.waitForSelector('#wheel-container svg .wedge');
        await page.waitForTimeout(300);
        await expect(page.locator('#screen-nudge')).toBeHidden();
    });

    test('retires after the first press-and-hold, persisting across reloads', async ({
        browser,
    }) => {
        const ctx = await browser.newContext({
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            isMobile: true,
        });
        const page = await ctx.newPage();
        await page.goto('/index.html');
        await page.waitForSelector('#wheel-container svg .wedge');
        await expect(page.locator('#screen-nudge')).toBeVisible();
        const box = (await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').boundingBox())!;
        const cdp = await ctx.newCDPSession(page);
        const pt = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
        await expect(page.locator('#wheel-lens')).toBeVisible();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect(page.locator('#screen-nudge')).toBeHidden();
        await page.reload();
        await page.waitForSelector('#wheel-container svg .wedge');
        await page.waitForTimeout(300);
        await expect(page.locator('#screen-nudge')).toBeHidden();
        await ctx.close();
    });

    test('hides while Simplified is on', async ({ page }) => {
        await open(page, 390, 844);
        await expect(page.locator('#screen-nudge')).toBeVisible();
        await page.locator('label[for="simplified-mode-panel"]').click();
        await expect(page.locator('#simplified-mode-panel')).toBeChecked();
        await expect(page.locator('#screen-nudge')).toBeHidden();
    });
});
