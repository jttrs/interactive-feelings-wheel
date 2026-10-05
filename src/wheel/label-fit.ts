// ===== PER-LABEL SHRINK-TO-FIT =====
// Wheel labels are drawn RADIALLY: the word's length runs along the radius and its
// height runs across the wedge. So a label fits when
//   1. its length fits the ring's radial span (centred on the label radius), and
//   2. its height fits the wedge's angular width at the label's innermost point —
//      the narrowest part of the wedge the text occupies.
// Both scale linearly with font size, so each solves for a max font size directly.
// Pure math (no DOM) so it is unit-testable; rendering.ts supplies measurements.

import type { Level } from '../types.ts';

export interface LabelGeometry {
    innerR: number; // wedge inner radius (0 for the core disc)
    outerR: number; // wedge outer radius
    r: number; // radius of the label's centre point
    spanDeg: number; // wedge angular width in degrees
}

// Fraction of each budget the text may use — leaves a hairline of breathing room
// beside separators so words never kiss a boundary.
export const FIT_PADDING = 0.88;

// Rendered-size floor (CSS px) below which a ring's words are hard to read on a
// phone. Purely a signal for the small-screen nudge — fit always wins over it, so
// a label is never enlarged past its wedge to meet the floor.
export const LEGIBLE_PX: Record<Level, number> = { core: 11, secondary: 10, tertiary: 9 };

/**
 * Largest font size (px) at which a label fits its wedge.
 * @param lengthPerPx text advance per 1px of font size (measured length / font size)
 * @param heightPerPx text box height per 1px of font size (≈1.2 for most fonts)
 */
export function maxFittingFontSize(
    geom: LabelGeometry,
    lengthPerPx: number,
    heightPerPx: number
): number {
    const { innerR, outerR, r, spanDeg } = geom;
    if (!(lengthPerPx > 0) || !(heightPerPx > 0)) return 0;

    // 1. Radial: half the word on each side of r, within the ring.
    const halfRadial = Math.max(0, Math.min(outerR - r, r - innerR)) * FIT_PADDING;
    const byLength = (2 * halfRadial) / lengthPerPx;

    // 2. Angular: at the innermost extent r_in = r − f·k/2, the half-height f·h/2 must
    //    stay within r_in·tan(span/2). Solve f·(h/2 + k·t/2) ≤ r·t for f.
    const t = Math.tan((Math.min(spanDeg, 170) * Math.PI) / 360);
    const byWidth = (FIT_PADDING * r * t) / (heightPerPx / 2 + (lengthPerPx * t) / 2);

    return Math.max(0, Math.min(byLength, byWidth));
}

// Lower-quartile of a ring's fitting sizes. Using a quartile (not the global min)
// keeps most of a ring at one even size while the few long words in tight wedges
// shrink individually instead of shrinking every word on the ring.
export function ringTargetSize(fits: number[]): number {
    if (fits.length === 0) return 0;
    const sorted = [...fits].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) * 0.25)];
}
