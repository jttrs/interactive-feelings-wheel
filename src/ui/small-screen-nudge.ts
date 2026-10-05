// ===== SMALL-SCREEN NUDGE =====
// When the full wheel's words render too small to read comfortably (the wheel
// reports this via `wheel:labelfit` / data-labels-cramped), show a quiet, dismissible
// note above the view chips suggesting Simplified or Guided. It is ONLY a suggestion:
// it never toggles a view itself — the existing chips are the action. The full wheel
// stays the default.

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
