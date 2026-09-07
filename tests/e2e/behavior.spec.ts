import { test, expect, type Page } from '@playwright/test';

// Behavioral assertions driven entirely through the DOM (no reliance on any global),
// so they stay valid after the module conversion removes the `app` global. These lock
// the interaction contract: selection, tiles, deselection, reset, and mode switching.

async function settle(page: Page) {
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

test('clicking a core wedge selects it and grows its family in the tree', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await expect(page.locator('.wedge.selected')).toHaveCount(1);
    const node = page.locator('.feeling-node.is-selected');
    await expect(node).toHaveCount(1);
    await expect(node.locator('.feeling-name')).toHaveText('Angry');
    // A lone core selection is terminal, so its definition shows (non-empty, from data).
    await expect(node.locator('.feeling-def')).toHaveCount(1);
    await expect(node.locator('.feeling-def')).not.toHaveText('');
});

test('clicking a selected wedge again clears it from the tree (wheel is the only control)', async ({
    page,
}) => {
    await page.locator('.core-wedge[data-emotion="Sad"]').click();
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(1);
    // The sidebar is informational only — there is no remove control in it.
    await expect(page.locator('.feeling-remove')).toHaveCount(0);
    // Deselect by clicking the wedge again on the wheel.
    await page.locator('.core-wedge[data-emotion="Sad"]').click();
    await expect(page.locator('.feeling-node')).toHaveCount(0);
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
});

test('a selected branch nests core > secondary > tertiary under one family', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();
    await expect(page.locator('.wedge.selected')).toHaveCount(3);

    // One Happy family section containing the nested path, all three selected.
    await expect(page.locator('.feeling-family')).toHaveCount(1);
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(3);
    await expect(page.locator('.feeling-node--core .feeling-name')).toHaveText('Happy');
    await expect(page.locator('.feeling-node--secondary .feeling-name')).toHaveText('Playful');
    await expect(page.locator('.feeling-node--tertiary .feeling-name')).toHaveText('Cheeky');
});

test('only the deepest selected node is expanded by default; others collapse', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();

    // Every level has a definition (all 130 words are defined), but only the terminal
    // (tertiary Cheeky) is expanded on load; the ancestors start collapsed.
    await expect(page.locator('.feeling-node--tertiary')).not.toHaveClass(/is-collapsed/);
    await expect(page.locator('.feeling-node--core')).toHaveClass(/is-collapsed/);
    await expect(page.locator('.feeling-node--secondary')).toHaveClass(/is-collapsed/);
    // The expanded definition is actually visible; a collapsed one is not.
    await expect(page.locator('.feeling-node--tertiary .feeling-def')).toBeVisible();
    await expect(page.locator('.feeling-node--core .feeling-def')).toBeHidden();
});

test('clicking a feeling word toggles its definition open and closed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();

    // Playful is the terminal here → expanded. Click the CORE word (Happy) to expand it.
    const coreWord = page.locator('.feeling-node--core .feeling-name--toggle');
    await expect(page.locator('.feeling-node--core')).toHaveClass(/is-collapsed/);
    await coreWord.click();
    await expect(page.locator('.feeling-node--core')).not.toHaveClass(/is-collapsed/);
    await expect(page.locator('.feeling-node--core .feeling-def')).toBeVisible();
    await expect(coreWord).toHaveAttribute('aria-expanded', 'true');
    // Click again to collapse it back.
    await coreWord.click();
    await expect(page.locator('.feeling-node--core')).toHaveClass(/is-collapsed/);
    await expect(coreWord).toHaveAttribute('aria-expanded', 'false');
});

test('separate families each render their own stem in wheel order', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await page.locator('.core-wedge[data-emotion="Sad"]').click();

    const families = page.locator('.feeling-family');
    await expect(families).toHaveCount(3);
    // Ordered by the wheel's core order (Angry, Sad, Happy) regardless of click order.
    await expect(families.locator('.feeling-node--core .feeling-name')).toHaveText([
        'Angry',
        'Sad',
        'Happy',
    ]);
});

test('a fullscreen change re-renders the wheel and preserves selection', async ({ page }) => {
    // Regression: exiting fullscreen left the GPU-promoted SVG layer blank until an
    // unrelated repaint. handleFullscreenChange now forces a re-render (bypassing the
    // resize size-delta guard) that rebuilds the SVG and restores state.
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await expect(page.locator('.wedge.selected')).toHaveCount(1);

    await page.evaluate(() => document.dispatchEvent(new Event('fullscreenchange')));
    // Wait out the 100ms handler delay + regeneration.
    await page.waitForTimeout(300);

    // Wheel fully rebuilt and the selection survived.
    await expect(page.locator('.wedge:not(.shadow-wedge)')).toHaveCount(130);
    await expect(page.locator('.wedge.selected')).toHaveCount(1);
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(1);
});

test('reset clears all selections and the tree', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.core-wedge[data-emotion="Fearful"]').click();
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(2);
    await page.locator('#reset-btn-panel').click();
    await expect(page.locator('.feeling-node')).toHaveCount(0);
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
});

test('clicking a wedge mid-reset does not select it (isAnimating gate)', async ({ page }) => {
    // Regression: the click listener lacked an isAnimating guard, so a wedge clicked
    // during the ~1s reset unwind got selected + moved to topGroup but was never
    // cleaned up by the in-flight reset — leaving it stuck-selected.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.mouse.wheel(0, 200); // rotate so the unwind takes ~1s
    await page.locator('#reset-btn-panel').click();
    // Immediately click another wedge while the reset animation owns the wheel.
    await page.locator('.core-wedge[data-emotion="Angry"]').click({ force: true });
    // Let the reset finish.
    await expect(page.locator('.feeling-node')).toHaveCount(0, { timeout: 3000 });
    // Nothing is stuck-selected, and the wheel is usable again afterward.
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
    await page.locator('.core-wedge[data-emotion="Sad"]').click();
    await expect(page.locator('.wedge.selected')).toHaveCount(1);
});

test('regenerating (mode switch) does not stack duplicate document listeners', async ({ page }) => {
    // Regression: setupEventListeners re-ran on every generate() and re-added global
    // document/window listeners with no removal. They are now bound once in the ctor.
    const added = await page.evaluate(() => {
        let mousemoveAdds = 0;
        const orig = document.addEventListener.bind(document);
        document.addEventListener = (
            type: string,
            ...rest: [EventListenerOrEventListenerObject, (boolean | AddEventListenerOptions)?]
        ) => {
            if (type === 'mousemove') mousemoveAdds++;
            return orig(type, ...rest);
        };
        const toggle = document.getElementById('simplified-mode-panel') as HTMLElement;
        for (let i = 0; i < 3; i++) toggle.click();
        document.dispatchEvent(new Event('fullscreenchange'));
        return mousemoveAdds;
    });
    expect(added).toBe(0);
});

test('animated reset (rotated + a full branch) fully clears state', async ({ page }) => {
    // Runs with real motion so the tree fade-out + rotation unwind path
    // (engine.animateResetRotation + clearSelections) actually executes.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();
    // Rotate so the unwind has real work to do.
    await page.mouse.wheel(0, 200);
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(3);
    await page.locator('#reset-btn-panel').click();
    // Wait out the ~1s animation.
    await expect(page.locator('.feeling-node')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
    // Wheel should be interactive again (isAnimating cleared) and instructions back.
    await expect(page.locator('#panel-instructions')).toBeVisible();
    await page.locator('.core-wedge[data-emotion="Sad"]').click();
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(1);
});

test('simplified mode removes the tertiary ring', async ({ page }) => {
    await expect(page.locator('.tertiary-wedge').first()).toBeAttached();
    // The checkbox itself is display:none; users toggle it via its label.
    await page.locator('label[for="simplified-mode-panel"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.tertiary-wedge')).toHaveCount(0);
    await expect(page.locator('.core-wedge')).toHaveCount(7);
});

test('instructions show when empty and hide when a feeling is selected', async ({ page }) => {
    const instructions = page.locator('#panel-instructions');
    await expect(instructions).toBeVisible();
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await expect(instructions).toBeHidden();
    // Deselect on the wheel (sidebar has no control); instructions return.
    await page.locator('.core-wedge[data-emotion="Angry"]').click();
    await expect(instructions).toBeVisible();
});

// ===== Keyboard rotation (arrows spin the wheel via the shared momentum model) =====

// Absolute rotation (degrees) off the base group's inline transform: rotate(Ndeg).
async function readRotation(page: Page): Promise<number> {
    return page.evaluate(() => {
        const g = document.querySelector<SVGElement>('#wheel-container svg .wheel-main-group');
        const m = /rotate\(([-\d.]+)deg\)/.exec(g?.style.transform || '');
        return m ? parseFloat(m[1]) : 0;
    });
}

test('a single arrow press nudges the wheel; holding spins it further', async ({ page }) => {
    // Arrows rotate only when NO wedge is focused (body has focus on load). Blur any
    // focus to be safe, then confirm no wedge is the active element.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());

    const start = await readRotation(page);
    await page.keyboard.press('ArrowRight'); // one tap
    await page.waitForTimeout(400); // let the short glide settle
    const afterTap = await readRotation(page);
    const tapDelta = Math.abs(afterTap - start);
    expect(tapDelta).toBeGreaterThan(0); // it moved

    // Hold the same key: the per-frame acceleration should carry it much further than a tap.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(600);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(500); // decay to rest
    const afterHold = await readRotation(page);
    const holdDelta = Math.abs(afterHold - afterTap);
    expect(holdDelta).toBeGreaterThan(tapDelta);
});

test('rapid arrow presses accumulate more rotation than a single press', async ({ page }) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());

    const start = await readRotation(page);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    const oneDelta = Math.abs((await readRotation(page)) - start);

    // Reset velocity by waiting, then mash the key several times in quick succession.
    const beforeMash = await readRotation(page);
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    const mashDelta = Math.abs((await readRotation(page)) - beforeMash);
    // Rapid presses are NOT dropped (the old isAnimating gate swallowed them).
    expect(mashDelta).toBeGreaterThan(oneDelta);
});

test('arrows move wedge focus (not rotation) when a wedge is focused', async ({ page }) => {
    // Coexistence: with a wedge focused, the svg keydown handles arrows as roving-tabindex
    // navigation and stopPropagation()s them, so the wheel must NOT rotate.
    await page.locator('.wedge[tabindex="0"]').focus();
    const startRotation = await readRotation(page);
    const first = await page.evaluate(() => document.activeElement!.getAttribute('data-wedge-id'));

    await page.keyboard.press('ArrowRight');
    const second = await page.evaluate(() => document.activeElement!.getAttribute('data-wedge-id'));
    await page.waitForTimeout(300);
    const endRotation = await readRotation(page);

    expect(second).not.toBe(first); // focus moved
    expect(endRotation).toBe(startRotation); // wheel did not spin
    await expect(page.locator('.wedge.selected')).toHaveCount(0); // and nothing selected
});

// ===== Feelings-tree typography guard (real stylesheet applied) =====

test('the toggle-button feeling word renders the tokenized type (no UA font leak)', async ({
    page,
}) => {
    // A <button> carries a UA system font/weight; the tokenized .feeling-name baseline must
    // override family + line-height so the toggle word matches the design, not the button UA.
    // (Every defined word renders as a button, so this is the case that matters.) We assert
    // the button's computed type equals the :root token values + the body font — and, as a
    // cross-check, that it matches a reference span given the same classes.
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();

    const r = await page.evaluate(() => {
        const btn = document.querySelector<HTMLElement>(
            '.feeling-node--tertiary .feeling-name--toggle'
        );
        const result = {
            ok: false,
            familyMatch: false,
            weightMatch: false,
            lineHeightMatch: false,
            usesBodyFont: false,
            weight: '',
        };
        if (!btn) return result;
        // Reference span with the SAME classes, inserted as a sibling in the same node.
        const ref = document.createElement('span');
        ref.className = 'feeling-name';
        btn.parentElement!.appendChild(ref);
        const cb = getComputedStyle(btn);
        const cr = getComputedStyle(ref);
        const root = getComputedStyle(document.documentElement);
        result.ok = true;
        result.familyMatch = cb.fontFamily === cr.fontFamily; // button vs span parity
        result.weightMatch = cb.fontWeight === cr.fontWeight;
        result.lineHeightMatch = cb.lineHeight === cr.lineHeight;
        result.usesBodyFont = cb.fontFamily === root.getPropertyValue('--font-body').trim();
        result.weight = cb.fontWeight; // tertiary weight token (600)
        ref.remove();
        return result;
    });
    expect(r.ok).toBe(true);
    expect(r.familyMatch).toBe(true);
    expect(r.weightMatch).toBe(true);
    expect(r.lineHeightMatch).toBe(true);
    expect(r.usesBodyFont).toBe(true);
    expect(r.weight).toBe('600');
});

test('definitions share one uniform left indent regardless of level', async ({ page }) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click(); // secondary def
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click(); // tertiary def
    // Expand the secondary's own def (only the terminal is open by default).
    await page.locator('.feeling-node--secondary .feeling-name--toggle').click();

    const pads = await page.evaluate(() => {
        const secDef = document.querySelector<HTMLElement>('.feeling-node--secondary .feeling-def');
        const terDef = document.querySelector<HTMLElement>('.feeling-node--tertiary .feeling-def');
        return {
            sec: secDef ? getComputedStyle(secDef).paddingLeft : null,
            ter: terDef ? getComputedStyle(terDef).paddingLeft : null,
        };
    });
    expect(pads.sec).not.toBeNull();
    expect(pads.sec).toBe(pads.ter); // uniform, level-independent
});

// ===== Drag momentum (a flick glides like a scroll flick) =====

test('a fast drag-and-release makes the wheel coast, then settle', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const svg = page.locator('#wheel-container svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('no svg box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Drag along an arc near the rim and release while still moving (a flick).
    await page.mouse.move(cx + box.width * 0.35, cy);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
        const ang = (i / 8) * 0.9; // sweep ~0.9 rad
        await page.mouse.move(
            cx + Math.cos(ang) * box.width * 0.35,
            cy + Math.sin(ang) * box.width * 0.35
        );
    }
    await page.mouse.up();

    // Immediately after release the wheel should still be moving (coasting)...
    const r0 = await readRotation(page);
    await page.waitForTimeout(120);
    const r1 = await readRotation(page);
    expect(Math.abs(r1 - r0)).toBeGreaterThan(0); // coasted after mouseup

    // ...then friction brings it to rest.
    await page.waitForTimeout(1200);
    const r2 = await readRotation(page);
    await page.waitForTimeout(200);
    const r3 = await readRotation(page);
    expect(Math.abs(r3 - r2)).toBeLessThan(0.5); // settled
});
