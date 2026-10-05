import { describe, it, expect, vi, beforeEach } from 'vitest';
import { maxFittingFontSize, ringTargetSize } from '../../src/wheel/label-fit.ts';
import { initSmallScreenNudge, NUDGE_DISMISSED_KEY } from '../../src/ui/small-screen-nudge.ts';
import { createTestWheel } from '../helpers/wheel.ts';

describe('maxFittingFontSize', () => {
    const geom = { innerR: 100, outerR: 150, r: 125, spanDeg: 10 };

    it('is limited by radial length for long words', () => {
        // half radial = 25 * 0.88 = 22 → length budget 44; 10 chars × 0.55 = 5.5/px
        expect(maxFittingFontSize(geom, 5.5, 1.2)).toBeCloseTo(8, 5);
    });

    it('is limited by the wedge width for short words in thin wedges', () => {
        const thin = { ...geom, spanDeg: 2 };
        const size = maxFittingFontSize(thin, 1, 1.2);
        // The box's half-height at its innermost point stays inside the wedge.
        const rIn = thin.r - size / 2;
        expect((size * 1.2) / 2).toBeLessThanOrEqual(rIn * Math.tan(Math.PI / 180) + 1e-9);
        expect(size).toBeLessThan(maxFittingFontSize(geom, 1, 1.2));
    });

    it('returns 0 for unusable measurements', () => {
        expect(maxFittingFontSize(geom, 0, 1.2)).toBe(0);
    });

    it('targets the lower quartile so one long word does not shrink a ring', () => {
        expect(ringTargetSize([2, 10, 10, 10, 10, 10, 10, 10, 10])).toBe(10);
        expect(ringTargetSize([])).toBe(0);
    });
});

describe('wheel label fit', () => {
    it('reports cramped state on the container and via wheel:labelfit', () => {
        const { gen, container } = createTestWheel({ size: 320 });
        const seen = vi.fn();
        container.addEventListener('wheel:labelfit', (e) => seen((e as CustomEvent).detail));
        gen.fitLabels();
        expect(seen).toHaveBeenCalledOnce();
        expect(container.getAttribute('data-labels-cramped')).toBe(
            String(seen.mock.calls[0][0].cramped)
        );
    });

    it('keeps labels larger on a big wheel than on a small one', () => {
        const small = createTestWheel({ size: 320 }).container;
        const big = createTestWheel({ size: 1000 }).container;
        const size = (c: Element) =>
            parseFloat(c.querySelector('text[data-level="tertiary"]')!.getAttribute('font-size')!);
        expect(size(big)).toBeGreaterThan(size(small));
    });
});

describe('small-screen nudge', () => {
    let container: HTMLElement;
    let nudge: HTMLElement;
    let dismissButton: HTMLButtonElement;
    let simplified: HTMLInputElement;
    let guided: HTMLInputElement;
    let store: Map<string, string>;
    let storage: Pick<Storage, 'getItem' | 'setItem'>;
    let announce: ReturnType<typeof vi.fn>;

    const fit = (cramped: boolean) =>
        container.dispatchEvent(new CustomEvent('wheel:labelfit', { detail: { cramped } }));

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="wheel"></div>
            <div id="nudge" hidden><p>Small screen? Simplified or Guided view can make words easier to read.</p>
              <button id="x"></button></div>
            <input type="checkbox" id="s" /><input type="checkbox" id="g" />`;
        container = document.getElementById('wheel')!;
        nudge = document.getElementById('nudge')!;
        dismissButton = document.getElementById('x') as HTMLButtonElement;
        simplified = document.getElementById('s') as HTMLInputElement;
        guided = document.getElementById('g') as HTMLInputElement;
        store = new Map();
        storage = {
            getItem: (k) => store.get(k) ?? null,
            setItem: (k, v) => void store.set(k, v),
        };
        announce = vi.fn();
    });

    const init = () =>
        initSmallScreenNudge({
            container,
            nudge,
            dismissButton,
            viewToggles: [simplified, guided],
            announce,
            storage,
        });

    it('stays hidden until the wheel reports cramped labels', () => {
        init();
        expect(nudge.hidden).toBe(true);
        fit(true);
        expect(nudge.hidden).toBe(false);
        fit(false);
        expect(nudge.hidden).toBe(true);
    });

    it('reads initial state from the container attribute', () => {
        container.setAttribute('data-labels-cramped', 'true');
        init();
        expect(nudge.hidden).toBe(false);
    });

    it('announces politely only once', () => {
        init();
        fit(true);
        fit(false);
        fit(true);
        expect(announce).toHaveBeenCalledOnce();
        expect(announce.mock.calls[0][0]).toMatch(/Small screen\?/);
    });

    it('never toggles a view by itself', () => {
        init();
        fit(true);
        dismissButton.click();
        expect(simplified.checked).toBe(false);
        expect(guided.checked).toBe(false);
    });

    it('dismisses persistently and moves focus to the view options', () => {
        init();
        fit(true);
        dismissButton.click();
        expect(nudge.hidden).toBe(true);
        expect(store.get(NUDGE_DISMISSED_KEY)).toBe('1');
        expect(document.activeElement).toBe(simplified);
        fit(true);
        expect(nudge.hidden).toBe(true);
    });

    it('stays dismissed on a later page load', () => {
        store.set(NUDGE_DISMISSED_KEY, '1');
        init();
        fit(true);
        expect(nudge.hidden).toBe(true);
    });

    it('hides while an easier view is on, and counts trying one as dismissal', () => {
        init();
        fit(true);
        guided.checked = true;
        guided.dispatchEvent(new Event('change'));
        expect(nudge.hidden).toBe(true);
        guided.checked = false;
        guided.dispatchEvent(new Event('change'));
        expect(nudge.hidden).toBe(true);
    });

    it('tolerates storage that throws', () => {
        storage = {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            },
        };
        init();
        fit(true);
        expect(nudge.hidden).toBe(false);
        dismissButton.click();
        expect(nudge.hidden).toBe(true);
    });
});
