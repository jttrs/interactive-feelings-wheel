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

test('a word under two parents gets independent definitions with unique ids', async ({ page }) => {
    // Embarrassed sits under both Disapproving (Disgusted) and Hurt (Sad).
    const embarrassed = (parent: string) =>
        page.locator(
            `.tertiary-wedge[data-emotion="Embarrassed"][data-parent="${parent}"]:not(.shadow-wedge)`
        );
    await embarrassed('Disapproving').click();
    await embarrassed('Hurt').click();
    await expect(page.locator('.wedge.selected:not(.shadow-wedge)')).toHaveCount(2);

    const nodes = page.locator('.feeling-node--tertiary[data-emotion="Embarrassed"]');
    await expect(nodes).toHaveCount(2);

    const ids = await page.$$eval('#emotion-tiles [id]', (els) => els.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);

    const [a, b] = [nodes.nth(0), nodes.nth(1)];
    const toggleA = a.locator('.feeling-name--toggle');
    const toggleB = b.locator('.feeling-name--toggle');
    const ctrlA = await toggleA.getAttribute('aria-controls');
    const ctrlB = await toggleB.getAttribute('aria-controls');
    expect(ctrlA).not.toBe(ctrlB);
    await expect(a.locator('.feeling-def-wrap')).toHaveAttribute('id', ctrlA!);
    await expect(b.locator('.feeling-def-wrap')).toHaveAttribute('id', ctrlB!);

    await toggleA.click();
    await expect(toggleA).toHaveAttribute('aria-expanded', 'false');
    await expect(toggleB).toHaveAttribute('aria-expanded', 'true');
    await expect(b.locator('.feeling-def')).toBeVisible();

    await toggleB.click();
    await expect(toggleB).toHaveAttribute('aria-expanded', 'false');
    await toggleA.click();
    await expect(toggleA).toHaveAttribute('aria-expanded', 'true');
    await expect(toggleB).toHaveAttribute('aria-expanded', 'false');
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

test('animated reset leaves NO selection residue on the wheel (incl. bold labels)', async ({
    page,
}) => {
    // The reported bug: after Reset, previously-selected wedges kept their bold label.
    // Rotate first so the ANIMATED reset path (clearSelections) runs, then assert a fully
    // clean slate across every selection dimension.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();
    await page.mouse.wheel(0, 200); // rotate → forces the animated reset
    await expect(page.locator('.label-selected')).toHaveCount(3); // bold applied
    // Shadow clones must NOT duplicate the pressed button in the a11y tree: exactly one
    // aria-pressed=true per selected emotion (3), not 6.
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(3);

    await page.locator('#reset-btn-panel').click();
    // Wait out the ~1s reset animation.
    await expect(page.locator('.wedge.selected')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.label-selected')).toHaveCount(0); // the bug: bold gone
    await expect(page.locator('.wedge[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('.shadow-wedge')).toHaveCount(0);
    // A formerly-selected label computes back to non-bold.
    const weight = await page
        .locator('text[data-emotion="Cheeky"]')
        .evaluate((el) => getComputedStyle(el).fontWeight);
    expect(weight).toBe('400');
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

// The wheel must never sit under the panel: portrait sheets reserve their live
// height (--sheet-h), landscape phones fall back to the side panel.
async function wheelPanelOverlap(page: Page) {
    return page.evaluate(() => {
        const w = document.querySelector('.wheel-main-group')!.getBoundingClientRect();
        const p = document.getElementById('info-panel')!.getBoundingClientRect();
        const sheet = matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
        if (sheet) return Math.max(0, w.bottom - p.top);
        return p.left < innerWidth - 1 ? Math.max(0, w.right - p.left) : 0;
    });
}

for (const [width, height] of [
    [390, 844],
    [600, 900],
    [740, 360],
]) {
    test(`wheel stays clear of the panel at ${width}x${height}, expanded and collapsed`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(500);
        expect(await wheelPanelOverlap(page)).toBeLessThanOrEqual(1);

        const handle = page.locator('#mobile-collapse-handle');
        const toggle = (await handle.isVisible()) ? handle : page.locator('#panel-minimize-tab');
        await toggle.click();
        await page.waitForTimeout(600);
        expect(await wheelPanelOverlap(page)).toBeLessThanOrEqual(1);
    });
}

// Guided view is OPT-IN: the full wheel is the default (therapists use the whole
// spectrum). When on, it spotlights the path without changing geometry or selection.
test('guided view is off by default: the full wheel is fully interactive', async ({ page }) => {
    await expect(page.locator('#guided-mode-panel')).not.toBeChecked();
    await expect(page.locator('.wedge[data-guided-rest]')).toHaveCount(0);
});

test('guided view opens rings along the chosen path and toggles off losslessly', async ({
    page,
}) => {
    const rest = page.locator('.wedge[data-guided-rest]');
    await page.locator('label[for="guided-mode-panel"]').click();
    // Only the 7 cores are reachable at first.
    await expect(page.locator('.wedge:not(.shadow-wedge):not([data-guided-rest])')).toHaveCount(7);
    await expect(page.locator('.secondary-wedge[data-emotion="Playful"]')).toHaveAttribute(
        'aria-hidden',
        'true'
    );

    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await expect(page.locator('.secondary-wedge[data-emotion="Playful"]')).not.toHaveAttribute(
        'data-guided-rest',
        ''
    );
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await expect(
        page.locator('.tertiary-wedge[data-parent="Playful"]').first()
    ).not.toHaveAttribute('data-guided-rest', '');
    // Unrelated families stay at rest.
    await expect(page.locator('.secondary-wedge[data-emotion="Lonely"]')).toHaveAttribute(
        'data-guided-rest',
        ''
    );

    // G toggles it off (even with focus left on the checkbox): full wheel back, selection kept.
    await page.keyboard.press('g');
    await expect(rest).toHaveCount(0);
    await expect(page.locator('.wedge[aria-pressed="true"]')).toHaveCount(2);
});

test('keyboard toggling keeps focus on the wheel, even when guided view rests the wedge', async ({
    page,
}) => {
    const happy = page.locator('.core-wedge[data-emotion="Happy"]');
    await happy.focus();
    await page.keyboard.press('Enter');
    await expect(happy).toBeFocused();

    await page.locator('label[for="guided-mode-panel"]').click();
    const playful = page.locator('.secondary-wedge[data-emotion="Playful"]');
    await playful.click();
    await happy.click(); // deselect core; Playful stays reachable because it's selected
    await playful.focus();
    await page.keyboard.press('Enter'); // deselect -> Playful goes to rest
    await expect(playful).toHaveAttribute('data-guided-rest', '');
    await expect(happy).toBeFocused();
});

// Guided view hint: a calm on-wheel caption that explains the dimmed rings, then
// steps aside once the user is moving through them.
test('guided hint: hidden by default, walks the first two steps, returns on reset', async ({
    page,
}) => {
    const hint = page.locator('#guided-hint');
    await expect(hint).toBeHidden();

    await page.locator('label[for="guided-mode-panel"]').click();
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText('Choose a core feeling to open the next ring.');
    await expect(hint).toHaveAttribute('aria-hidden', 'true');

    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await expect(hint).toHaveText('Now choose a closer word in the next ring.');

    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await expect(hint).toBeHidden();

    await page.locator('#reset-btn-panel').click();
    await expect(page.locator('.wedge.selected')).toHaveCount(0);
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText('Choose a core feeling to open the next ring.');

    await page.locator('label[for="guided-mode-panel"]').click();
    await expect(hint).toBeHidden();
});

for (const vp of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
]) {
    test(`guided hint stays clear of reachable wedges at ${vp.width}x${vp.height}`, async ({
        page,
    }) => {
        await page.setViewportSize(vp);
        await page.waitForTimeout(300);
        await page.locator('label[for="guided-mode-panel"]').click();
        const hint = page.locator('#guided-hint');
        await expect(hint).toBeVisible();
        await page.waitForTimeout(500);
        const box = (await hint.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
        // The hint may only ever sit over wedges that are at rest.
        const coversReachable = await page.evaluate(() => {
            const h = document.getElementById('guided-hint')!.getBoundingClientRect();
            const pts: [number, number][] = [];
            for (let x = h.left + 2; x < h.right - 2; x += 6)
                for (let y = h.top + 2; y < h.bottom - 2; y += 6) pts.push([x, y]);
            const hint = document.getElementById('guided-hint')!;
            hint.style.visibility = 'hidden';
            const hit = pts.some(([x, y]) => {
                const el = document.elementFromPoint(x, y);
                return !!el?.closest('.wedge:not([data-guided-rest])');
            });
            hint.style.visibility = '';
            return hit;
        });
        expect(coversReachable).toBe(false);
    });
}

// One shared selection across views: Simplified only hides the outer ring.
test('Simplified view keeps outer-ring choices chosen and says so; full view shows them again', async ({
    page,
}) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();

    await page.locator('label[for="simplified-mode-panel"]').click();
    await expect(page.locator('.tertiary-wedge')).toHaveCount(0);
    await expect(page.locator('.wedge[aria-pressed="true"]')).toHaveCount(2);
    await expect(page.locator('.feeling-node.is-selected')).toHaveCount(3);
    await expect(page.locator('#view-status')).toContainText('Still chosen but hidden: Cheeky.');
    await expect(page.locator('#sr-announcer')).toContainText(
        '1 chosen feeling is in the hidden outer ring and stays chosen.'
    );

    await page.locator('label[for="simplified-mode-panel"]').click();
    await expect(page.locator('.tertiary-wedge[data-emotion="Cheeky"]')).toHaveAttribute(
        'aria-pressed',
        'true'
    );
    await expect(page.locator('#view-status')).toBeHidden();
});

// Drag vs tap: a drag that starts and ends on wedges rotates but never selects;
// a plain click still selects; touch drags rotate (pointer events, touch-action: none).
test('dragging across wedges rotates without selecting; a click still selects', async ({
    page,
}) => {
    const box = (await page.locator('.core-wedge[data-emotion="Happy"]').boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const rot0 = await readRotation(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y + 60, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    await expect(page.locator('.wedge[aria-pressed="true"]')).toHaveCount(0);
    const rot1 = await readRotation(page);
    expect(rot1).not.toBe(rot0);

    // A tiny wobble under the threshold is still a click.
    const box2 = (await page.locator('.core-wedge[data-emotion="Sad"]').boundingBox())!;
    const cx = box2.x + box2.width / 2;
    const cy = box2.y + box2.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 2, cy + 1);
    await page.mouse.up();
    await expect(page.locator('.core-wedge[data-emotion="Sad"]')).toHaveAttribute(
        'aria-pressed',
        'true'
    );
});

test('a touch drag rotates the wheel', async ({ page }) => {
    const before = await readRotation(page);
    await page.evaluate(() => {
        const svg = document.querySelector('#wheel-container svg')!;
        const r = svg.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const opts = (x: number, y: number) => ({
            bubbles: true,
            isPrimary: true,
            pointerId: 7,
            pointerType: 'touch',
            button: 0,
            clientX: x,
            clientY: y,
        });
        svg.dispatchEvent(new PointerEvent('pointerdown', opts(cx + 150, cy)));
        for (let i = 1; i <= 10; i++) {
            const a = (i * 4 * Math.PI) / 180;
            document.dispatchEvent(
                new PointerEvent(
                    'pointermove',
                    opts(cx + 150 * Math.cos(a), cy + 150 * Math.sin(a))
                )
            );
        }
        document.dispatchEvent(new PointerEvent('pointerup', opts(cx, cy + 150)));
    });
    const after = await readRotation(page);
    expect(after).not.toBe(before);
});

// Reading lens: a large copy of the focused/pressed word (labels can be tiny on phones).
test('keyboard focus shows the focused word large in the reading lens, clear of the wedge', async ({
    page,
}) => {
    const lens = page.locator('#wheel-lens');
    await expect(lens).toBeHidden();
    await page.locator('.core-wedge[data-emotion="Angry"]').focus();
    await page.keyboard.press('ArrowDown');
    await expect(lens).toBeVisible();
    const focused = page.locator('.wedge:focus');
    await expect(lens.locator('.wheel-lens__word')).toHaveText(
        (await focused.getAttribute('data-emotion'))!
    );
    const size = await lens
        .locator('.wheel-lens__word')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
    // The lens never sits on top of the wedge it's describing.
    const a = (await lens.boundingBox())!;
    const b = (await focused.boundingBox())!;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    expect(cx >= a.x && cx <= a.x + a.width && cy >= a.y && cy <= a.y + a.height).toBe(false);

    await page.locator('#reset-btn-panel').focus();
    await expect(lens).toBeHidden();
});

test('on a phone, pressing a wedge shows its word large and a tap still chooses it', async ({
    browser,
}) => {
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
    });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.waitForSelector('#wheel-container svg .wedge');
    const wedge = page.locator('.tertiary-wedge[data-emotion="Cheeky"]');
    const box = (await wedge.boundingBox())!;
    const cdp = await ctx.newCDPSession(page);
    const pt = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
    await expect(page.locator('#wheel-lens .wheel-lens__word')).toHaveText('Cheeky');
    await expect(page.locator('#wheel-lens .wheel-lens__path')).toHaveText('Happy › Playful');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(wedge).toHaveAttribute('aria-pressed', 'true');
    await ctx.close();
});

test('feeling names that reveal a meaning carry a chevron that turns with the state', async ({
    page,
}) => {
    await page.locator('.core-wedge[data-emotion="Happy"]').click();
    await page.locator('.secondary-wedge[data-emotion="Playful"]').click();
    const toggle = page.locator('.feeling-node--core .feeling-name--toggle');
    const chevron = () => toggle.evaluate((el) => getComputedStyle(el, '::after').transform);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const closed = await chevron();
    expect(closed).not.toBe('none');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await chevron()).not.toBe(closed);
});

test('a refused fullscreen request is announced, not silent', async ({ page }) => {
    await page.evaluate(() => {
        Element.prototype.requestFullscreen = () => Promise.reject(new Error('denied'));
    });
    await page.locator('#fullscreen-btn-panel').click();
    await expect(page.locator('#sr-announcer')).toHaveText("Fullscreen isn't available here.");
    await expect(page.locator('#fullscreen-btn-panel')).toHaveAttribute('aria-pressed', 'false');
});

test('the reading lens shows when a key is pressed on a wedge focused by script', async ({
    page,
}) => {
    await page.locator('label[for="guided-mode-panel"]').click();
    await page.locator('.core-wedge[data-emotion="Angry"]').focus();
    await page.keyboard.press('ArrowDown'); // can't move in Guided yet — still a keyboard user
    await expect(page.locator('.core-wedge[data-emotion="Angry"]')).toBeFocused();
    await expect(page.locator('#wheel-lens .wheel-lens__word')).toHaveText('Angry');
});

test('an easier view says so in words, with a one-tap way back to the full wheel', async ({
    page,
}) => {
    const status = page.locator('#view-status');
    await expect(status).toBeHidden();
    await page.locator('label[for="guided-mode-panel"]').click();
    await expect(status).toBeVisible();
    await expect(status).toContainText('Guided view');
    await page.locator('label[for="simplified-mode-panel"]').click();
    await expect(status).toContainText('Guided + Simplified');

    await page.locator('#view-status-reset').click();
    await expect(page.locator('#guided-mode-panel')).not.toBeChecked();
    await expect(page.locator('#simplified-mode-panel')).not.toBeChecked();
    await expect(status).toBeHidden();
    await expect(page.locator('.wedge[data-guided-rest]')).toHaveCount(0);
    await expect(page.locator('.tertiary-wedge').first()).toBeAttached();
    await expect(page.locator('#view-explore .view-title')).toBeFocused();
});

test('on a phone the status line counts hidden choices in its short form', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.locator('.tertiary-wedge[data-emotion="Cheeky"]').click();
    await page.locator('label[for="simplified-mode-panel"]').click();
    await expect(page.locator('.view-status__short')).toHaveText(
        'Simplified view on. 1 hidden choice.'
    );
});
