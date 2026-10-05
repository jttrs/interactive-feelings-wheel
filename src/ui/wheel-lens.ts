// Reading lens: a large, transient caption of one wedge's word, drawn outside the
// rotating SVG. The full wheel stays the default on every screen, but on phones its
// outer words can be only a few pixels tall — the lens lets anyone read a word at a
// comfortable size before (and right after) choosing it:
//   - touch/pen: while pressing a wedge, then briefly after the tap
//   - mouse: while hovering a wedge whose label renders small
//   - keyboard: while a wedge has visible focus (any screen size)
// It is aria-hidden: wedges already carry full accessible names.

export const LENS_SMALL_LABEL_PX = 14;
// The keyboard lens teaches the keys for its first few appearances, then gets quiet.
export const LENS_KEYS_KEY = 'ifw:lens-key-hints-shown';
export const LENS_KEYS_TIMES = 6;
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
    const keysEl = lens.querySelector<HTMLElement>('.wheel-lens__keys');
    let keyHintsShown = 0;
    try {
        keyHintsShown = Number(localStorage.getItem(LENS_KEYS_KEY)) || 0;
    } catch {
        // storage unavailable: hints just show for this page load
    }
    let lastKeyboardWedge: SVGElement | null = null;
    // After the first few feelings the full key list steps back to a pointer ("Press ?
    // for keys"); pressing ? on a focused wedge brings the list back (and ? again hides it).
    const keysFull = keysEl?.textContent?.trim() ?? '';
    let keysPinned = false;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let down: { x: number; y: number; wedge: SVGElement } | null = null;

    const show = (wedge: SVGElement, viaKeyboard = false) => {
        const content = lensWordFor(wedge.dataset);
        if (!content) return;
        if (keysEl) {
            // Count each newly reached wedge once, not every key press on it.
            const learning = keyHintsShown < LENS_KEYS_TIMES;
            const teach = viaKeyboard && (learning || keysPinned);
            keysEl.hidden = !viaKeyboard;
            keysEl.textContent = teach ? keysFull : 'Press ? for keys';
            keysEl.classList.toggle('wheel-lens__keys--pointer', !teach);
            if (teach && learning && wedge !== lastKeyboardWedge) {
                keyHintsShown++;
                try {
                    localStorage.setItem(LENS_KEYS_KEY, String(keyHintsShown));
                } catch {
                    // ignore
                }
            }
            if (viaKeyboard) lastKeyboardWedge = wedge;
        }
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

    // When the pointer stops reading a word, hand the lens back to the keyboard-focused
    // wedge (if any) rather than hiding it, so a keyboard user never loses their place.
    const backToFocus = () => {
        const f = document.activeElement;
        const w = f instanceof Element && wheelRoot.contains(f) ? wedgeFrom(f) : null;
        if (w) show(w, true);
        else hide();
    };
    const onOver = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || down) return;
        const w = wedgeFrom(e.target);
        if (w && small(w)) show(w);
        else backToFocus();
    };
    const onLeave = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && !down) backToFocus();
    };
    const onDown = (e: PointerEvent) => {
        const w = wedgeFrom(e.target);
        if (!w || !e.isPrimary) return;
        down = { x: e.clientX, y: e.clientY, wedge: w };
        if (e.pointerType !== 'mouse' || small(w)) {
            show(w);
            // Lets the small-screen tip know its lesson ("press and hold") landed.
            if (e.pointerType !== 'mouse') {
                wheelRoot.dispatchEvent(new CustomEvent('wheel:lens-hold'));
            }
        }
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
        if (w && w.matches(':focus-visible')) show(w, true);
    };
    const onFocusOut = (e: FocusEvent) => {
        if (!wedgeFrom(e.relatedTarget)) hide();
    };
    const onWheel = () => hide();
    // Any key on a focused wedge means the keyboard is in use: show it even if focus
    // arrived by script/mouse (where :focus-visible didn't match) or the key couldn't move.
    const onKey = (e: KeyboardEvent) => {
        const w = wedgeFrom(e.target);
        if (w && document.activeElement === w) show(w, true);
    };
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return;
        const w = wedgeFrom(e.target);
        if (!w || document.activeElement !== w) return;
        e.preventDefault();
        keysPinned = !keysPinned;
        show(w, true);
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
    wheelRoot.addEventListener('keydown', onKeyDown);

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
            wheelRoot.removeEventListener('keydown', onKeyDown);
            if (hideTimer) clearTimeout(hideTimer);
        },
    };
}
