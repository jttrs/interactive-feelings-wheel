// Guarded SVG primitive factory for the wheel.
//
// Centralizes every raw createElementNS + attribute write behind small, validated
// helpers so the layer builders (wedges / labels / separators) never touch the DOM
// namespace directly. Each helper coerces + range-checks its numeric inputs and
// silently omits attributes that would be invalid (null/undefined/NaN), so a bad
// value produces a harmless element rather than a thrown exception mid-render.

const SVG_NS = 'http://www.w3.org/2000/svg';

// True only for a finite number (after coercion). Guards every geometry input.
function finite(n) {
    const v = Number(n);
    return Number.isFinite(v) ? v : null;
}

// Base guarded element creator. `attrs` values that are null/undefined/'' are
// skipped; numbers are stringified. `dataset`/`className`/`text` handled by callers.
export function svgEl(name, attrs = {}) {
    const el = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined || value === '') continue;
        el.setAttribute(key, typeof value === 'number' ? String(value) : value);
    }
    return el;
}

// A straight stroked line. Returns null (no element) if any endpoint is non-finite,
// so a bad coordinate can't inject a broken <line>.
export function line({ x1, y1, x2, y2, stroke, width, dash, className }) {
    const c = [finite(x1), finite(y1), finite(x2), finite(y2)];
    if (c.some((v) => v === null)) return null;
    const el = svgEl('line', {
        x1: c[0],
        y1: c[1],
        x2: c[2],
        y2: c[3],
        stroke: stroke || undefined,
        'stroke-width': finite(width) ?? undefined,
        'stroke-dasharray': dash || undefined,
        class: className || undefined,
    });
    el.style.pointerEvents = 'none';
    return el;
}

// A concentric ring circle (stroke-only by default). Returns null on bad center/radius.
export function circle({ cx, cy, r, stroke, width, fill = 'none', className }) {
    const c = [finite(cx), finite(cy), finite(r)];
    if (c.some((v) => v === null) || c[2] <= 0) return null;
    const el = svgEl('circle', {
        cx: c[0],
        cy: c[1],
        r: c[2],
        fill,
        stroke: stroke || undefined,
        'stroke-width': finite(width) ?? undefined,
        class: className || undefined,
    });
    el.style.pointerEvents = 'none';
    return el;
}

// A fill-only wedge <path>. Geometry is passed in already-computed as the `d` string
// (callers use the engine's createWedgePath so geometry.test.js stays authoritative).
// No stroke: separators own all boundaries now.
export function wedgePath({ d, fill, className, dataset = {} }) {
    if (!d) return null;
    const el = svgEl('path', { d, fill: fill || undefined, class: className || undefined });
    for (const [key, value] of Object.entries(dataset)) {
        if (value === null || value === undefined) continue;
        el.setAttribute(`data-${key}`, value);
    }
    el.style.cursor = 'pointer';
    return el;
}

// An SVG text label. Returns null if position is non-finite.
export function text({ x, y, content, fontSize, className, dataset = {} }) {
    const px = finite(x);
    const py = finite(y);
    if (px === null || py === null) return null;
    const el = svgEl('text', {
        x: px,
        y: py,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-size': finite(fontSize) ? `${finite(fontSize)}px` : undefined,
        'font-weight': 'normal',
        fill: 'currentColor',
        'pointer-events': 'none',
        class: className || undefined,
    });
    for (const [key, value] of Object.entries(dataset)) {
        if (value === null || value === undefined) continue;
        el.setAttribute(`data-${key}`, value);
    }
    if (content !== undefined && content !== null) el.textContent = content;
    return el;
}

// ===== WHEEL LINE/RING TOKENS =====
// Read from the CSS design-token layer with guarded fallbacks. In a real browser the
// :root tokens win; in bare jsdom (unit tests, no stylesheet applied) getPropertyValue
// returns '' so the fallback keeps rendering deterministic. Weights are ratios of wheel
// size; color tokens are real colors.
export const WHEEL_TOKEN_FALLBACKS = {
    '--wheel-line': '#4a453d',
    '--wheel-line-primary': '0.0028',
    '--wheel-line-secondary': '0.0012',
    '--wheel-line-dyad': '0.0008',
    '--wheel-ring': '#4a453d',
    '--wheel-ring-weight': '0.0022',
};

function readToken(name) {
    let raw = '';
    try {
        raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    } catch {
        raw = '';
    }
    return raw || WHEEL_TOKEN_FALLBACKS[name];
}

// Resolve the wheel's separator theme once per generate(). Colors are strings; weight
// ratios are parsed to numbers (falling back if a token is malformed).
export function readWheelTokens() {
    const num = (name) => {
        const v = Number(readToken(name));
        return Number.isFinite(v) ? v : Number(WHEEL_TOKEN_FALLBACKS[name]);
    };
    return {
        lineColor: readToken('--wheel-line'),
        ringColor: readToken('--wheel-ring'),
        primaryRatio: num('--wheel-line-primary'),
        secondaryRatio: num('--wheel-line-secondary'),
        dyadRatio: num('--wheel-line-dyad'),
        ringRatio: num('--wheel-ring-weight'),
    };
}
