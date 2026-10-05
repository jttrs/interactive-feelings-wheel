// Reading lens: a large, transient caption of one wedge's word, drawn outside the
// rotating SVG. The full wheel stays the default on every screen, but on phones its
// outer words can be only a few pixels tall — the lens lets anyone read a word at a
// comfortable size before (and right after) choosing it:
//   - touch/pen: while pressing a wedge, then briefly after the tap
//   - mouse: while hovering a wedge whose label renders small
//   - keyboard: while a wedge has visible focus (any screen size)
// It is aria-hidden: wedges already carry full accessible names.

export const LENS_SMALL_LABEL_PX = 14;
const TAP_LINGER_MS = 1400;
const DRAG_CANCEL_PX = 10;

export interface LensWord {
    word: string;
    path: string; // lineage, e.g. "Happy › Playful" ('' for a core feeling)
}

// Pure: what the lens says for a wedge's data attributes.
export function lensWordFor(data: {
    level?: string;
    emotion?: string;
    parent?: string;
    grandparent?: string;
}): LensWord | null {
    if (!data.emotion) return null;
    if (data.level === 'tertiary') {
        return {
            word: data.emotion,
            path: [data.grandparent, data.parent].filter(Boolean).join(' › '),
        };
    }
    if (data.level === 'secondary') return { word: data.emotion, path: data.parent ?? '' };
    return { word: data.emotion, path: '' };
}

const wedgeFrom = (t: EventTarget | null): SVGElement | null =>
    t instanceof Element ? (t.closest('.wedge:not(.shadow-wedge)') as SVGElement | null) : null;

// Rendered label size in CSS px (font-size attr is in viewBox units; the viewBox is
// square and maps to the svg's rendered width).
function labelPx(root: HTMLElement, wedge: SVGElement): number {
    const svg = wedge.ownerSVGElement;
    const text = root.querySelector<SVGTextElement>(
        `text[data-wedge-id="${wedge.dataset.wedgeId}"]`
    );
    if (!svg || !text) return Infinity;
    const units = parseFloat(text.getAttribute('font-size') || '');
    const vb = svg.viewBox?.baseVal;
    if (!units || !vb?.width) return Infinity;
    const scale = Math.min(svg.clientWidth, svg.clientHeight) / vb.width;
    return units * scale;
}

export interface WheelLens {
    destroy(): void;
}

export function createWheelLens(lens: HTMLElement, wheelRoot: HTMLElement): WheelLens {
    const wordEl = lens.querySelector<HTMLElement>('.wheel-lens__word')!;
    const pathEl = lens.querySelector<HTMLElement>('.wheel-lens__path')!;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let down: { x: number; y: number; wedge: SVGElement } | null = null;

    const show = (wedge: SVGElement) => {
        const content = lensWordFor(wedge.dataset);
        if (!content) return;
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = null;
        wordEl.textContent = content.word;
        pathEl.textContent = content.path;
        pathEl.hidden = !content.path;
        // Never cover the word being read: sit at the top when it's in the lower half.
        const area = lens.parentElement?.getBoundingClientRect();
        const box = wedge.getBoundingClientRect();
        const lower = !!area && box.top + box.height / 2 > area.top + area.height / 2;
        lens.classList.toggle('wheel-lens--top', lower);
        lens.hidden = false;
    };
    const hide = (delay = 0) => {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = delay
            ? setTimeout(() => {
                  lens.hidden = true;
                  hideTimer = null;
              }, delay)
            : null;
        if (!delay) lens.hidden = true;
    };
    const small = (w: SVGElement) => labelPx(wheelRoot, w) < LENS_SMALL_LABEL_PX;

    const onOver = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || down) return;
        const w = wedgeFrom(e.target);
        if (w && small(w)) show(w);
        else if (!wheelRoot.contains(document.activeElement)) hide();
    };
    const onLeave = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && !down) hide();
    };
    const onDown = (e: PointerEvent) => {
        const w = wedgeFrom(e.target);
        if (!w || !e.isPrimary) return;
        down = { x: e.clientX, y: e.clientY, wedge: w };
        if (e.pointerType !== 'mouse' || small(w)) show(w);
    };
    const onMove = (e: PointerEvent) => {
        if (!down) return;
        // Turning the press into a drag (rotation) cancels the reading.
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) >= DRAG_CANCEL_PX) {
            down = null;
            hide();
        }
    };
    const onUp = (e: PointerEvent) => {
        if (!down) return;
        down = null;
        // After a tap, keep the chosen word readable for a moment.
        if (e.pointerType !== 'mouse') hide(TAP_LINGER_MS);
    };
    const onFocusIn = (e: FocusEvent) => {
        const w = wedgeFrom(e.target);
        if (w && w.matches(':focus-visible')) show(w);
    };
    const onFocusOut = (e: FocusEvent) => {
        if (!wedgeFrom(e.relatedTarget)) hide();
    };
    const onWheel = () => hide();
    // Any key on a focused wedge means the keyboard is in use: show it even if focus
    // arrived by script/mouse (where :focus-visible didn't match) or the key couldn't move.
    const onKey = (e: KeyboardEvent) => {
        const w = wedgeFrom(e.target);
        if (w && document.activeElement === w) show(w);
    };

    wheelRoot.addEventListener('pointerover', onOver);
    wheelRoot.addEventListener('pointerleave', onLeave);
    wheelRoot.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    wheelRoot.addEventListener('focusin', onFocusIn);
    wheelRoot.addEventListener('focusout', onFocusOut);
    wheelRoot.addEventListener('wheel', onWheel, { passive: true });
    wheelRoot.addEventListener('keyup', onKey);

    return {
        destroy() {
            wheelRoot.removeEventListener('pointerover', onOver);
            wheelRoot.removeEventListener('pointerleave', onLeave);
            wheelRoot.removeEventListener('pointerdown', onDown);
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
            wheelRoot.removeEventListener('focusin', onFocusIn);
            wheelRoot.removeEventListener('focusout', onFocusOut);
            wheelRoot.removeEventListener('wheel', onWheel);
            wheelRoot.removeEventListener('keyup', onKey);
            if (hideTimer) clearTimeout(hideTimer);
        },
    };
}
