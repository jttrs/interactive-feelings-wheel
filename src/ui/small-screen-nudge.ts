// ===== SMALL-SCREEN TIP =====
// When the full wheel's words render too small to read comfortably (the wheel
// reports this via `wheel:labelfit` / data-labels-cramped), show a quiet, dismissible
// one-line tip on the wheel teaching the reading lens ("press and hold a word"); the
// screen-reader version also suggests Simplified or Guided. It is ONLY a suggestion: nothing switches unless the user
// presses a view button. It retires (persisted) once it has done its job — the first
// lens hold, choosing an easier view, or dismissing it. The full wheel stays default.

export const NUDGE_DISMISSED_KEY = 'ifw:small-screen-nudge-dismissed';

export interface SmallScreenNudgeOptions {
    container: HTMLElement; // the wheel container (emits wheel:labelfit)
    nudge: HTMLElement; // the [hidden] note element
    dismissButton: HTMLButtonElement;
    viewToggles: HTMLInputElement[]; // Simplified + Guided checkboxes
    announce: (message: string) => void;
    storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
}

function readDismissed(storage: SmallScreenNudgeOptions['storage']): boolean {
    try {
        return storage?.getItem(NUDGE_DISMISSED_KEY) === '1';
    } catch {
        return false;
    }
}

export function initSmallScreenNudge({
    container,
    nudge,
    dismissButton,
    viewToggles,
    announce,
    storage = safeLocalStorage(),
}: SmallScreenNudgeOptions): { update: () => void } {
    let dismissed = readDismissed(storage);
    let cramped = container.getAttribute('data-labels-cramped') === 'true';
    let announced = false;

    const dismiss = (): void => {
        dismissed = true;
        try {
            storage?.setItem(NUDGE_DISMISSED_KEY, '1');
        } catch {
            // Private mode / quota: dismissal still holds for this page load.
        }
        update();
    };

    function update(): void {
        const easierViewOn = viewToggles.some((t) => t.checked);
        const show = cramped && !easierViewOn && !dismissed;
        nudge.hidden = !show;
        if (show && !announced) {
            announced = true;
            announce(
                nudge.dataset.announce || nudge.textContent?.replace(/\s+/g, ' ').trim() || ''
            );
        }
    }

    container.addEventListener('wheel:labelfit', (event) => {
        cramped = Boolean((event as CustomEvent<{ cramped: boolean }>).detail?.cramped);
        update();
    });

    // Mouse users read small words by pointing, not pressing.
    const how = nudge.querySelector<HTMLElement>('.screen-nudge__how');
    if (how && window.matchMedia?.('(pointer: fine)').matches) how.textContent = 'Point at a word';

    // First successful press-and-hold read: the lesson landed.
    container.addEventListener('wheel:lens-hold', () => {
        if (!nudge.hidden) dismiss();
    });

    viewToggles.forEach((toggle) =>
        toggle.addEventListener('change', () => {
            // Trying an easier view after seeing the tip means it has done its job.
            if (toggle.checked && !nudge.hidden) dismiss();
            else update();
        })
    );

    dismissButton.addEventListener('click', () => {
        dismiss();
        // The note's own button vanished; land focus on the view options it pointed to.
        viewToggles[0]?.focus();
    });

    update();
    return { update };
}

function safeLocalStorage(): Storage | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}
