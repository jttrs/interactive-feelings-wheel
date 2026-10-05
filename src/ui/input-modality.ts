// Last input the user actually used: keyboard or pointer (mouse, touch, pen).
//
// Script-driven focus moves (into an opened panel view, back to the control that
// opened it, onto the visible panel toggle) exist for keyboard users. After a click
// they only paint a focus ring nobody asked for, so they're skipped — and the
// <html data-input> attribute lets CSS hide rings that a browser shows anyway.

type Modality = 'keyboard' | 'pointer';
let modality: Modality = 'pointer';

const set = (next: Modality) => {
    if (modality === next) return;
    modality = next;
    document.documentElement.dataset.input = next;
};

export function usingKeyboard(): boolean {
    return modality === 'keyboard';
}

let tracking = false;

export function trackInputModality(): void {
    if (tracking) return;
    tracking = true;
    document.documentElement.dataset.input = modality;
    document.addEventListener(
        'keydown',
        (e) => {
            // Modifier-only presses (e.g. Cmd before a click) don't make a keyboard user.
            if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
            set('keyboard');
        },
        true
    );
    document.addEventListener('pointerdown', () => set('pointer'), true);
}
