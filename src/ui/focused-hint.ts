// Focused view hint: a small caption pinned to the wheel area (outside the rotating
// SVG) that explains the dimmed rings while Focused view is on. It reads selection
// straight from the DOM (aria-pressed), so it needs no hooks into the wheel engine.
//
// It is aria-hidden: app.ts already announces the first step when Focused turns on,
// and the selection announcements cover the rest — the caption is for sighted users.

export const FOCUSED_HINT_COPY = {
    start: 'Choose a core feeling to open the next ring.',
    next: 'Now choose a closer word in the next ring.',
} as const;

export type FocusedHintStep = keyof typeof FOCUSED_HINT_COPY | null;

export interface FocusedHintState {
    enabled: boolean;
    hasCore: boolean; // any core chosen
    hasDeeper: boolean; // any secondary/tertiary chosen
    nextDone: boolean; // the "next ring" step has already been passed since the last reset
}

export function focusedHintStep(s: FocusedHintState): FocusedHintStep {
    if (!s.enabled) return null;
    if (!s.hasCore && !s.hasDeeper) return 'start';
    if (!s.hasDeeper && !s.nextDone) return 'next';
    return null;
}

const CUE_CLASS = 'focused-core-cue';

export interface FocusedHint {
    setEnabled(enabled: boolean): void;
    destroy(): void;
}

export function createFocusedHint(hint: HTMLElement, wheelRoot: HTMLElement): FocusedHint {
    let enabled = false;
    let nextDone = false;
    let queued = false;

    const read = () => {
        let hasCore = false;
        let hasDeeper = false;
        for (const w of wheelRoot.querySelectorAll<SVGElement>(
            '.wedge:not(.shadow-wedge)[aria-pressed="true"]'
        )) {
            if (w.dataset.level === 'core') hasCore = true;
            else hasDeeper = true;
        }
        return { hasCore, hasDeeper };
    };

    // Place the caption where it doesn't sit on the wheel: centred above it when there's
    // room (portrait/mobile), else the free top-left corner beside the circle (desktop,
    // where the wheel fills the full height).
    const overlapsWheel = (): boolean => {
        const svg =
            wheelRoot.querySelector('svg .wheel-main-group') ?? wheelRoot.querySelector('svg');
        if (!svg) return false;
        const w = svg.getBoundingClientRect();
        const r = Math.min(w.width, w.height) / 2;
        const cx = w.left + w.width / 2;
        const cy = w.top + w.height / 2;
        const h = hint.getBoundingClientRect();
        const dx = Math.max(h.left - cx, 0, cx - h.right);
        const dy = Math.max(h.top - cy, 0, cy - h.bottom);
        return dx * dx + dy * dy < r * r;
    };
    const place = () => {
        if (hint.hidden) return;
        hint.dataset.place = 'top';
        if (!overlapsWheel()) return;
        hint.dataset.place = 'corner';
        if (overlapsWheel()) hint.dataset.place = 'tight';
    };
    let settleTimer = 0;
    const placeSoon = () => {
        requestAnimationFrame(place);
        // The panel slides with a FLIP transform; measure again once it has settled.
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(place, 450);
    };
    const resizeObserver =
        typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(placeSoon);
    resizeObserver?.observe(hint.parentElement ?? wheelRoot);

    const update = () => {
        queued = false;
        const { hasCore, hasDeeper } = read();
        if (!hasCore && !hasDeeper) nextDone = false; // reset brings the walk-through back
        if (hasDeeper) nextDone = true;
        const step = focusedHintStep({ enabled, hasCore, hasDeeper, nextDone });
        if (step) {
            hint.textContent = FOCUSED_HINT_COPY[step];
            hint.dataset.step = step;
            hint.hidden = false;
            place();
        } else {
            hint.hidden = true;
            delete hint.dataset.step;
        }
    };

    const schedule = () => {
        if (queued) return;
        queued = true;
        queueMicrotask(update);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(wheelRoot, {
        subtree: true,
        childList: true, // the SVG is rebuilt on mode switches
        attributes: true,
        attributeFilter: ['aria-pressed'],
    });

    // One soft swell on the core ring when Focused turns on. CSS disables it under
    // prefers-reduced-motion; animationend (or the fallback) removes the class so it
    // never repeats on its own.
    const cueCores = () => {
        const svg = wheelRoot.querySelector('svg');
        if (!svg) return;
        svg.classList.remove(CUE_CLASS);
        void svg.getBoundingClientRect();
        svg.classList.add(CUE_CLASS);
        const done = () => svg.classList.remove(CUE_CLASS);
        svg.addEventListener('animationend', done, { once: true });
        window.setTimeout(done, 1500);
    };

    return {
        setEnabled(next: boolean) {
            if (next === enabled) return;
            enabled = next;
            update();
            if (enabled && hint.dataset.step === 'start') cueCores();
        },
        destroy() {
            observer.disconnect();
            resizeObserver?.disconnect();
            window.clearTimeout(settleTimer);
        },
    };
}
