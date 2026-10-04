// Guided mode: an opt-in spotlight over the FULL wheel. Geometry never changes —
// rings the user hasn't reached yet are dimmed and made inert, so the wheel keeps the
// same spatial map a therapist works from in the default (full) view. Pure DOM in/out:
// selection state is read from aria-pressed, which the selection-effect registry owns.
//
// Reach rules (cores are always open):
//   secondary S under core C — open if C, S, or any tertiary under C/S is selected
//   tertiary  T under C/S    — open if S or T is selected

export const GUIDED_REST_ATTR = 'data-guided-rest';

function key(...parts: (string | null | undefined)[]): string {
    return parts.map((p) => p ?? '').join('/');
}

export function applyGuidedFocus(root: ParentNode, enabled: boolean): void {
    const wedges = Array.from(root.querySelectorAll<SVGElement>('.wedge:not(.shadow-wedge)'));

    const selectedCores = new Set<string>();
    const selectedSecondaries = new Set<string>(); // C/S
    const touchedSecondaries = new Set<string>(); // C/S with a selected tertiary
    for (const w of wedges) {
        if (w.getAttribute('aria-pressed') !== 'true') continue;
        const level = w.dataset.level;
        const emotion = w.dataset.emotion;
        if (level === 'core') selectedCores.add(key(emotion));
        else if (level === 'secondary') selectedSecondaries.add(key(w.dataset.parent, emotion));
        else if (level === 'tertiary')
            touchedSecondaries.add(key(w.dataset.grandparent, w.dataset.parent));
    }

    for (const w of wedges) {
        const level = w.dataset.level;
        const selected = w.getAttribute('aria-pressed') === 'true';
        let open = true;
        if (enabled && !selected) {
            if (level === 'secondary') {
                const self = key(w.dataset.parent, w.dataset.emotion);
                open =
                    selectedCores.has(key(w.dataset.parent)) ||
                    selectedSecondaries.has(self) ||
                    touchedSecondaries.has(self);
            } else if (level === 'tertiary') {
                open = selectedSecondaries.has(key(w.dataset.grandparent, w.dataset.parent));
            }
        }

        const label = root.querySelector(`text[data-wedge-id="${w.dataset.wedgeId}"]`);
        if (open) {
            w.removeAttribute(GUIDED_REST_ATTR);
            w.removeAttribute('aria-hidden');
            label?.removeAttribute(GUIDED_REST_ATTR);
        } else {
            w.setAttribute(GUIDED_REST_ATTR, '');
            w.setAttribute('aria-hidden', 'true');
            w.setAttribute('tabindex', '-1');
            label?.setAttribute(GUIDED_REST_ATTR, '');
        }
    }
}
