// Main Application Controller - Coordinates between wheel engine and panel UI
// Architecture: feelings-wheel-engine.ts handles wheel rendering/interaction, app.ts handles panel/coordination
import { FeelingsWheelGenerator } from './feelings-wheel-engine.ts';
import { FEELINGS_DATA } from './feelings-data.ts';
import { renderFeelingsTree } from './src/ui/feelings-tree.ts';
import { createFocusedHint } from './src/ui/focused-hint.ts';
import { initSmallScreenNudge } from './src/ui/small-screen-nudge.ts';
import { createWheelLens } from './src/ui/wheel-lens.ts';
import { readUrlOptions, writeUrlOptions } from './src/ui/url-options.ts';
import { trackInputModality, usingKeyboard } from './src/ui/input-modality.ts';
import type { Selection, EmotionSelectedDetail } from './src/types.ts';

export class FeelingsWheelApp {
    wheelGenerator!: FeelingsWheelGenerator;
    currentView!: string;
    views!: Record<string, HTMLElement | null>;
    isResetting = false;
    // Reset's undo: the cleared selection, kept only briefly and only in memory.
    undoIds: string[] = [];
    undoTimer: ReturnType<typeof setTimeout> | null = null;
    // True while applying start-up options from the URL: no announcements or animation.
    quiet = false;

    constructor() {
        this.init();
    }

    init(): void {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp(): void {
        // Script-driven focus moves are for keyboard users only (see input-modality.ts).
        trackInputModality();

        // Reserve the mobile sheet's real height before the first render so the wheel
        // is sized for the visible area from frame one.
        this.syncSheetHeight();

        // Initialize the wheel
        const wheelContainer = document.getElementById('wheel-container')!;
        this.wheelGenerator = new FeelingsWheelGenerator(wheelContainer, FEELINGS_DATA);
        this.wheelGenerator.generate();
        this.observeLayout(wheelContainer);

        // Setup information panel (this will handle all controls now)
        this.setupInformationPanel();

        // Start in the view the link asks for (e.g. ?view=simplified for a child's session).
        // Before the small-screen tip starts listening, so a link-chosen view isn't taken
        // as "the user tried a view" (which would retire the tip for good).
        this.applyUrlOptions();

        // Cramped full wheel → a one-line tip teaching the reading lens (never switches views).
        // Reading lens: large copy of the pressed / hovered-small / keyboard-focused word.
        createWheelLens(document.getElementById('wheel-lens')!, wheelContainer);

        initSmallScreenNudge({
            container: wheelContainer,
            nudge: document.getElementById('screen-nudge')!,
            dismissButton: document.getElementById('screen-nudge-dismiss') as HTMLButtonElement,
            viewToggles: ['simplified-mode-panel', 'focused-mode-panel'].map(
                (id) => document.getElementById(id) as HTMLInputElement
            ),
            announce: (message) => this.announce(message),
        });

        // Setup fullscreen functionality
        this.setupFullscreenFeature();

        // Setup comprehensive keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Listen for emotion selection events
        document.addEventListener('emotionSelected', (event) => {
            this.handleEmotionSelection((event as CustomEvent<EmotionSelectedDetail>).detail);
        });
    }

    setupFullscreenFeature(): void {
        // Check if fullscreen is supported
        if (!this.isFullscreenSupported()) {
            const fullscreenButton = document.getElementById('fullscreen-btn-panel');
            if (fullscreenButton) {
                fullscreenButton.style.display = 'none';
            }
            return;
        }

        // Listen for fullscreen state changes (including ESC key)
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange',
        ];

        fullscreenEvents.forEach((eventName) => {
            document.addEventListener(eventName, () => {
                // Handle fullscreen changes (includes button update and repositioning)
                this.handleFullscreenChange();
            });
        });

        // Setup keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F11') {
                event.preventDefault();
                this.toggleFullscreen();
            }
        });

        // Initial button state
        this.updateFullscreenButton();
    }

    isFullscreenSupported(): boolean {
        const doc = document as Document & {
            webkitFullscreenEnabled?: boolean;
            mozFullScreenEnabled?: boolean;
            msFullscreenEnabled?: boolean;
        };
        return !!(
            document.fullscreenEnabled ||
            doc.webkitFullscreenEnabled ||
            doc.mozFullScreenEnabled ||
            doc.msFullscreenEnabled
        );
    }

    isCurrentlyFullscreen(): boolean {
        const doc = document as Document & {
            webkitFullscreenElement?: Element;
            mozFullScreenElement?: Element;
            msFullscreenElement?: Element;
        };
        return !!(
            document.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement
        );
    }

    async toggleFullscreen(): Promise<void> {
        try {
            if (this.isCurrentlyFullscreen()) {
                await this.exitFullscreen();
            } else {
                await this.requestFullscreen();
            }
        } catch {
            // Fullscreen can be refused (embedded frame, permissions, platform). The
            // button's aria-pressed stays truthful (driven by fullscreenchange); say why
            // nothing happened instead of failing silently.
            this.announce("Fullscreen isn't available here.");
            const btn = document.getElementById('fullscreen-btn-panel');
            if (btn) btn.dataset.tip = "Fullscreen isn't available here";
        }
    }

    async requestFullscreen(): Promise<void> {
        const element = document.documentElement as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void>;
            mozRequestFullScreen?: () => Promise<void>;
            msRequestFullscreen?: () => Promise<void>;
        };

        if (element.requestFullscreen) {
            return element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            return element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            return element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            return element.msRequestFullscreen();
        }

        throw new Error('Fullscreen not supported');
    }

    async exitFullscreen(): Promise<void> {
        const doc = document as Document & {
            webkitExitFullscreen?: () => Promise<void>;
            mozCancelFullScreen?: () => Promise<void>;
            msExitFullscreen?: () => Promise<void>;
        };

        if (document.exitFullscreen) {
            return document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
            return doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
            return doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
            return doc.msExitFullscreen();
        }

        throw new Error('Exit fullscreen not supported');
    }

    updateFullscreenButton(): void {
        const fullscreenButton = document.getElementById('fullscreen-btn-panel');

        if (fullscreenButton) {
            const on = this.isCurrentlyFullscreen();
            fullscreenButton.setAttribute('aria-pressed', String(on));
            fullscreenButton.dataset.tip = on ? 'Exit fullscreen (Esc)' : 'Fullscreen (F11)';
        }
    }

    handleFullscreenChange(): void {
        // Update button state immediately
        this.updateFullscreenButton();

        // Force the wheel to re-render after a fullscreen transition. Chrome can
        // discard the backing texture of a GPU-promoted layer across enter/exit and
        // leave it blank until an unrelated repaint (the "comes back when you click
        // the app" symptom). handleResize alone won't help — exiting returns to the
        // same window size, and its guard skips regeneration on a ~0 size delta.
        // Re-render after the post-transition paint via double-rAF (reacts to the
        // real layout/paint settle rather than guessing a fixed delay).
        if (this.wheelGenerator) {
            requestAnimationFrame(() =>
                requestAnimationFrame(() => this.wheelGenerator.forceRerender())
            );
        }
    }

    // ===== KEYBOARD SHORTCUTS FUNCTIONALITY =====

    setupKeyboardShortcuts(): void {
        // Global keyboard event listener for all shortcuts
        document.addEventListener('keydown', (event) => {
            // Skip if the user is typing (checkbox toggles must not swallow shortcuts).
            const target = event.target as HTMLElement;
            const typing =
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                (target instanceof HTMLInputElement &&
                    !['checkbox', 'radio', 'button'].includes(target.type));
            if (typing) {
                return;
            }

            // Leave browser/OS chords (Cmd+R, Ctrl+G, …) alone.
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            const key = event.key.toLowerCase();

            switch (key) {
                case 'f':
                    event.preventDefault();
                    (document.getElementById('focused-mode-panel') as HTMLInputElement)?.click();
                    break;

                case 's':
                    event.preventDefault();
                    this.toggleSimplifiedMode();
                    break;

                case 'r':
                    event.preventDefault();
                    this.resetWithAnimation();
                    break;

                case 'p':
                    event.preventDefault();
                    this.togglePanelMinimization();
                    break;

                // Arrow keys spin the wheel via the generator's shared momentum model
                // (keydown/keyup bound in setupGlobalListeners) so a held key spins
                // continuously — no discrete per-press handling here.

                case 'f11':
                    // F11 is already handled in setupFullscreenFeature
                    break;

                default:
                    // No action for other keys
                    break;
            }
        });
    }

    toggleSimplifiedMode(): void {
        // Find and trigger the simplified mode toggle input
        const toggleInput = document.getElementById(
            'simplified-mode-panel'
        ) as HTMLInputElement | null;
        if (toggleInput) {
            toggleInput.click();
        }
    }

    // ===== INFORMATION PANEL FUNCTIONALITY =====

    setupInformationPanel(): void {
        // The selected-feelings tree is rebuilt wholesale from the wheel's selectedWedges
        // (the source of truth) on every change — no per-tile handle map to keep in sync.

        // Desktop / landscape hide (in the panel) and show (screen corner) buttons.
        for (const id of ['panel-hide-btn', 'panel-show-btn']) {
            document
                .getElementById(id)
                ?.addEventListener('click', () => this.togglePanelMinimization());
        }

        // Initialize toggle state based on current panel state
        this.updateArrowDirection();

        // Setup mobile collapse handle
        const mobileHandle = document.getElementById('mobile-collapse-handle')!;
        mobileHandle.addEventListener('click', () => {
            this.togglePanelMinimization();
        });

        // Skip link: jumps past the wheel to the panel, opening it first if tucked away.
        document.querySelector('.skip-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.getElementById('info-panel')?.classList.contains('minimized')) {
                this.togglePanelMinimization();
            }
            this.focusPanelHeading();
        });

        // Setup panel controls (moved from floating controls)
        this.setupPanelControls();

        // Show instructions initially
        this.showInstructions();
    }

    setupPanelControls(): void {
        // Focused view: opt-in spotlight over the full wheel, for exploring one ring at a
        // time with a therapist. Purely visual — selections and rotation are untouched, so
        // switching it off returns the whole wheel as-is.
        const focusedToggle = document.getElementById('focused-mode-panel') as HTMLInputElement;
        focusedToggle.checked = false;
        const focusedHint = createFocusedHint(
            document.getElementById('focused-hint')!,
            document.getElementById('wheel-container')!
        );
        focusedToggle.addEventListener('change', () => {
            this.syncUrl();
            this.wheelGenerator.setFocusedMode(focusedToggle.checked);
            focusedHint.setEnabled(focusedToggle.checked);
            this.announce(
                focusedToggle.checked
                    ? 'Focused view on. Choose a core feeling to open the next ring.'
                    : 'Focused view off. The full wheel is available.'
            );
        });

        document
            .getElementById('reset-undo-btn')
            ?.addEventListener('click', () => this.undoReset());

        // Setup simplified mode toggle
        const simplifiedModeToggle = document.getElementById(
            'simplified-mode-panel'
        ) as HTMLInputElement;
        simplifiedModeToggle.addEventListener('change', (event) => {
            const isSimplified = (event.target as HTMLInputElement).checked;
            this.syncUrl();

            // One shared selection across views: the engine only changes which rings it
            // draws, so the panel is simply re-rendered (with simpler meanings).
            this.clearAllTilesWithoutInstructions(); // Don't auto-show instructions during mode switch
            this.wheelGenerator.setSimplifiedMode(isSimplified);
            this.recreateTilesFromWheelState();
            this.updateInstructionsVisibility();

            const hidden = this.hiddenSelectionCount();
            this.announce(
                isSimplified
                    ? hidden
                        ? hidden === 1
                            ? 'Simplified view on. 1 chosen feeling is in the hidden outer ring and stays chosen.'
                            : `Simplified view on. ${hidden} chosen feelings are in the hidden outer ring and stay chosen.`
                        : 'Simplified view on.'
                    : 'Full wheel shown.'
            );
        });

        // Setup reset button
        const resetButton = document.getElementById('reset-btn-panel')!;
        resetButton.addEventListener('click', () => {
            this.resetWithAnimation();
        });

        // Setup fullscreen button
        const fullscreenButton = document.getElementById('fullscreen-btn-panel')!;
        fullscreenButton.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Setup in-panel view switching (Help / About / Support fill the sidebar).
        this.setupPanelViews();
    }

    // ===== IN-PANEL VIEWS =====
    // The panel body hosts one visible "view" at a time. The default is EXPLORE
    // (empty state + emotion tiles); the footer's ?, i, and coffee icons swap in
    // Help / About / Support views that fill the same space, each with a back
    // button. Selecting an emotion returns to Explore.
    setupPanelViews(): void {
        this.currentView = 'explore';
        this.views = {
            explore: document.getElementById('view-explore'),
            help: document.getElementById('view-help'),
            about: document.getElementById('view-about'),
            support: document.getElementById('view-support'),
        };

        // Footer icons that open a secondary view.
        document.querySelectorAll('.hero-btn[data-view]').forEach((btn) => {
            btn.addEventListener('click', () =>
                this.showView((btn as HTMLElement).dataset.view || 'explore')
            );
        });

        // Back buttons return to Explore.
        document.querySelectorAll('[data-view-back]').forEach((btn) => {
            btn.addEventListener('click', () => this.showView('explore'));
        });

        // Esc closes a secondary view back to Explore.
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.currentView !== 'explore') {
                this.showView('explore');
            }
        });
    }

    showView(name: string): void {
        const target = this.views[name] || this.views.explore;
        const previous = this.currentView;
        const closing = previous ? this.views[previous] : null;
        // Was focus inside the view we're about to hide (e.g. its Back button)?
        const focusWasInClosing =
            !!closing && closing !== target && closing.contains(document.activeElement);

        Object.entries(this.views).forEach(([key, el]) => {
            if (!el) return;
            el.hidden = el !== target;
            // Reflect active state on the footer icon that owns this view.
            const owner = document.querySelector(`.hero-btn[data-view="${key}"]`);
            if (owner) owner.classList.toggle('active', el === target && key !== 'explore');
        });

        // Lazily load the Ko-fi iframe the first time Support opens (and only then).
        if (name === 'support') {
            const frame = document.getElementById('kofi-frame') as HTMLIFrameElement | null;
            if (frame && !frame.src && frame.dataset.src) {
                frame.src = frame.dataset.src;
            }
        }

        this.currentView = name;

        // Keyboard users: move focus into the opened view (its back button). After a click
        // focus stays put, so no ring appears on a control nobody is aiming at.
        if (name !== 'explore') {
            const back = target!.querySelector('[data-view-back]') as HTMLElement | null;
            if (back && usingKeyboard()) back.focus();
        } else if (previous && previous !== 'explore' && usingKeyboard()) {
            // Closing Help/About/Support: return focus to the footer button that opened it
            // (it was hidden with the view, so focus would otherwise fall to <body>) —
            // unless the user has already moved on (e.g. chose a feeling on the wheel).
            const active = document.activeElement;
            if (focusWasInClosing || !active || active === document.body) {
                document.querySelector<HTMLElement>(`.hero-btn[data-view="${previous}"]`)?.focus();
            }
        }
    }

    handleEmotionSelection(detail: EmotionSelectedDetail): void {
        const { emotion, selected } = detail;

        // A new choice after Reset starts fresh: the old selection can't be restored.
        this.dismissUndo();

        // Selecting an emotion always brings the Explore view forward.
        if (this.currentView && this.currentView !== 'explore') {
            this.showView('explore');
        }

        // Rebuild the whole tree from the wheel's current selection set.
        this.renderFeelings();
        this.announce(selected ? `Selected ${emotion}.` : `Removed ${emotion}.`);

        // Update instructions visibility
        this.updateInstructionsVisibility();
    }

    // Number of currently-selected wedges (the tree's source of truth).
    selectionCount(): number {
        return this.wheelGenerator ? this.wheelGenerator.selectedWedges.size : 0;
    }

    // Announce a message to screen readers via the polite live region.
    announce(message: string): void {
        if (this.quiet) return;
        const region = document.getElementById('sr-announcer');
        if (region) region.textContent = message;
    }

    // Rebuild the selected-feelings tree from the wheel's selectedWedges. Each id is
    // parsed into { level, emotion, parent, coreFamily } so the tree can group by branch
    // and place ancestors as context. Called on every selection change and mode switch.
    renderFeelings(): void {
        const container = document.getElementById('emotion-tiles');
        if (!container) return;

        const isSimplified = this.isSimplifiedActive();
        const selections: Selection[] = [...this.wheelGenerator.selectedWedges].map((wedgeId) => {
            const meta = this.wheelGenerator.parseUniqueWedgeId(wedgeId);
            return { wedgeId, ...meta };
        });

        const { element } = renderFeelingsTree({
            selections,
            familyOrder: FEELINGS_DATA.core.map((c) => c.name),
            getDefinition: (emotion) => this.getEmotionDefinition(emotion, isSimplified),
            getFamilyColor: (family) => FEELINGS_DATA.getCoreEmotionColor(family),
        });

        // The list is read-only by design: say where removing happens (the wheel).
        if (selections.length) {
            const note = document.createElement('p');
            note.className = 'feelings-remove-hint';
            note.textContent = 'To remove one, choose it again on the wheel.';
            container.replaceChildren(element, note);
        } else {
            container.replaceChildren(element);
        }
    }

    // Chosen feelings that exist but aren't drawn (outer ring while Simplified is on),
    // in wheel order.
    hiddenSelections(): string[] {
        if (!this.wheelGenerator?.isSimplifiedMode) return [];
        return [...this.wheelGenerator.selectedWedges]
            .map((id) => this.wheelGenerator.parseUniqueWedgeId(id))
            .filter((m) => m.level === 'tertiary')
            .map((m) => m.emotion);
    }

    hiddenSelectionCount(): number {
        return this.hiddenSelections().length;
    }

    isSimplifiedActive(): boolean {
        const toggle = document.getElementById('simplified-mode-panel') as HTMLInputElement | null;
        return !!(toggle && toggle.checked);
    }

    // Look up a definition; returns '' when none exists so the tree omits the line
    // entirely (no filler). The corpus covers all 130 words, but empties are honored.
    getEmotionDefinition(emotion: string, isSimplified: boolean): string {
        const emotionData = FEELINGS_DATA.definitions[emotion];
        if (!emotionData) return '';
        return (isSimplified ? emotionData.simplified : emotionData.standard) || '';
    }

    // Clear the tree from the DOM and (optionally) restore the empty-state instructions.
    clearAllTiles(): void {
        const container = document.getElementById('emotion-tiles');
        if (container) container.replaceChildren();
        this.showInstructions();
    }

    clearAllTilesWithoutInstructions(): void {
        // Clear without auto-showing instructions (mode switch manages that itself).
        const container = document.getElementById('emotion-tiles');
        if (container) container.replaceChildren();
    }

    // ===== ANIMATED RESET FUNCTIONALITY =====

    resetWithAnimation(): void {
        // Reset works from any panel view; bring back the feelings view first so the
        // list visibly clears and the Undo bar is where it can be seen.
        if (this.currentView !== 'explore') this.showView('explore');

        // CRITICAL FIX: Only reset current mode, prevent cross-mode contamination

        // If nothing is selected and the wheel is (near) un-rotated, reset instantly.
        // currentRotation is a float accumulated from drag/momentum, so it's rarely
        // exactly 0 after any interaction — use an epsilon so the instant path isn't
        // effectively dead (a strict === 0 forced the full 1s animation every time).
        if (this.selectionCount() === 0 && Math.abs(this.wheelGenerator.currentRotation) < 0.5) {
            this.wheelGenerator.reset();
            this.clearAllTiles();
            return;
        }

        // Prevent multiple resets while animating
        if (this.isResetting) return;
        this.isResetting = true;

        // Reset is quick to hit in a live session: keep what it clears so it can be undone.
        const cleared = [...this.wheelGenerator.selectedWedges];

        // Mark wheel as animating to prevent user interaction
        this.wheelGenerator.isAnimating = true;

        this.announce('Cleared all selected feelings. Undo is available for a few seconds.');

        // RESTORED: Full reset animation with tile unwinding + wheel rotation
        this.animateUnwindTiles();
        if (cleared.length) this.offerUndo(cleared);
    }

    offerUndo(ids: string[]): void {
        this.undoIds = ids;
        const bar = document.getElementById('reset-undo');
        if (bar) bar.hidden = false;
        if (this.undoTimer) clearTimeout(this.undoTimer);
        this.undoTimer = setTimeout(() => this.dismissUndo(), 8000);
    }

    dismissUndo(): void {
        this.undoIds = [];
        if (this.undoTimer) clearTimeout(this.undoTimer);
        this.undoTimer = null;
        const bar = document.getElementById('reset-undo');
        if (!bar || bar.hidden) return;
        // Don't strand keyboard focus on a button that's about to disappear.
        if (bar.contains(document.activeElement) && usingKeyboard()) this.focusPanelHeading();
        bar.hidden = true;
    }

    undoReset(): void {
        const ids = this.undoIds;
        if (!ids.length || this.isResetting) return;
        this.dismissUndo();
        this.wheelGenerator.restoreSelections(ids);
        this.renderFeelings();
        this.updateInstructionsVisibility();
        this.announce(
            ids.length === 1
                ? 'Restored 1 chosen feeling.'
                : `Restored ${ids.length} chosen feelings.`
        );
    }

    animateUnwindTiles(): void {
        // The panel answers at once: the list clears and the calm empty state fades in
        // (its own entrance animation) while the wheel unwinds. A lingering old list read
        // as if Reset hadn't worked.
        this.wheelGenerator.clearSelections();
        this.clearAllTiles();
        this.animateUnwindRotation();
    }

    animateUnwindRotation(): void {
        // Delegate the wheel-layer rotation animation to the engine (1s to match the
        // tile unwind), then finalize app + engine state when it resolves.
        this.wheelGenerator.animateResetRotation(1000).then(() => this.completeReset());
    }

    completeReset(): void {
        // Engine owns its own reset-state bookkeeping.
        this.wheelGenerator.commitResetState();

        // Re-enable interactions
        this.wheelGenerator.isAnimating = false;
        this.isResetting = false;
    }

    showInstructions(): void {
        const instructionsSection = document.getElementById('panel-instructions')!;
        instructionsSection.hidden = false;
    }

    updateArrowDirection(): void {
        const panel = document.querySelector('.info-panel');
        if (!panel) return;

        const minimized = panel.classList.contains('minimized');
        for (const id of ['panel-hide-btn', 'panel-show-btn']) {
            document.getElementById(id)?.setAttribute('aria-expanded', String(!minimized));
        }

        // Mobile sheet handle: ▲ reveals the sheet, ▼ tucks it away.
        const handle = document.getElementById('mobile-collapse-handle');
        const handleArrow = handle?.querySelector('.mobile-collapse-arrow');
        if (handle) {
            handle.setAttribute('aria-expanded', String(!minimized));
            handle.setAttribute(
                'aria-label',
                minimized ? 'Show feelings panel' : 'Hide feelings panel'
            );
        }
        if (handleArrow) handleArrow.textContent = minimized ? '▲' : '▼';
    }

    // Apply ?view= / ?panel= on load through the real controls (so every view behaves
    // exactly as if its chip were pressed), silently and without animation.
    applyUrlOptions(): void {
        const options = readUrlOptions(window.location.search);
        if (!options.simplified && !options.focused && !options.panelHidden) return;
        this.quiet = true;
        const panel = document.getElementById('info-panel');
        if (panel) panel.style.transition = 'none';
        try {
            const check = (id: string) => {
                const input = document.getElementById(id) as HTMLInputElement | null;
                if (input && !input.checked) input.click();
            };
            if (options.simplified) check('simplified-mode-panel');
            if (options.focused) check('focused-mode-panel');
            if (options.panelHidden) this.togglePanelMinimization();
        } finally {
            this.quiet = false;
            requestAnimationFrame(() => {
                if (panel) panel.style.transition = '';
            });
        }
    }

    // Keep the address bar in step with the current setup so it can be bookmarked.
    syncUrl(): void {
        const isChecked = (id: string) =>
            !!(document.getElementById(id) as HTMLInputElement | null)?.checked;
        this.updateViewsLabel(isChecked('focused-mode-panel'), isChecked('simplified-mode-panel'));
        if (this.quiet) return;
        const next = writeUrlOptions(window.location.href, {
            simplified: isChecked('simplified-mode-panel'),
            focused: isChecked('focused-mode-panel'),
            panelHidden: !!document.getElementById('info-panel')?.classList.contains('minimized'),
        });
        if (next !== window.location.href) history.replaceState(history.state, '', next);
    }

    // Name the current view beside "Views", so the default (Full wheel) and the combined
    // Focused + Simplified state are stated, not inferred from which chips are filled.
    updateViewsLabel(focused: boolean, simplified: boolean): void {
        const el = document.getElementById('views-current');
        if (!el) return;
        const name =
            focused && simplified
                ? 'Focused + Simplified'
                : focused
                  ? 'Focused'
                  : simplified
                    ? 'Simplified'
                    : 'Full wheel';
        el.textContent = ` · ${name}`;
    }

    // Land keyboard/screen-reader focus on the visible panel view's heading, with a
    // visible ring, so arriving in the panel is announced and seen.
    focusPanelHeading(): void {
        const title = document.querySelector<HTMLElement>('.panel-view:not([hidden]) .view-title');
        if (!title) return;
        title.tabIndex = -1;
        title.focus();
    }

    togglePanelMinimization(): void {
        const panel = document.querySelector('.info-panel')!;
        const mainLayout = document.querySelector('.main-layout')!;

        const wheelBox = document.getElementById('wheel-container');
        const before = this.wheelRect();
        const focusWasInside =
            document.activeElement instanceof Element &&
            !!document.activeElement.closest('.panel-content, .panel-footer, .panel-hide-btn');
        const fromShowButton = document.activeElement?.id === 'panel-show-btn';

        const minimized = panel.classList.toggle('minimized');
        mainLayout.classList.toggle('panel-minimized'); // For wheel centering
        this.syncSheetHeight(); // mobile: reserve the new sheet height before measuring
        this.syncUrl();

        // A tucked-away panel (slid off-screen on desktop) must not keep tab stops, and
        // focus must never be stranded inside it: hand it to the visible reopen control.
        for (const sel of ['.panel-content', '.panel-footer', '.panel-hide-btn']) {
            const el = panel.querySelector<HTMLElement>(sel);
            if (el) el.inert = minimized;
        }
        // Keyboard users: hand focus to whichever toggle is now visible, so it's never
        // stranded on a control that just went inert.
        const handle = document.getElementById('mobile-collapse-handle');
        const onSheet = !!handle && handle.offsetParent !== null;
        if (!usingKeyboard()) {
            // Pointer users: nothing to hand over.
        } else if (minimized && focusWasInside) {
            (onSheet ? handle : document.getElementById('panel-show-btn'))?.focus();
        } else if (!minimized && fromShowButton) {
            document.getElementById('panel-hide-btn')?.focus();
        }

        // Glide the wheel to its new centre/size with a transform (FLIP) rather than
        // animating layout: the box snaps to its final layout, then we play the
        // difference back from where it was.
        const after = this.wheelRect();
        const reduce = this.quiet || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (wheelBox && before && after && after.width > 0 && !reduce) {
            const c = wheelBox.getBoundingClientRect();
            const k = before.width / after.width;
            const tx = before.left - c.left - k * (after.left - c.left);
            const ty = before.top - c.top - k * (after.top - c.top);
            if (Math.abs(tx) > 0.5 || Math.abs(ty) > 0.5 || Math.abs(k - 1) > 0.005) {
                wheelBox.style.transition = 'none';
                wheelBox.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
                requestAnimationFrame(() => {
                    wheelBox.style.transition = 'transform var(--motion-panel) var(--ease-soft)';
                    wheelBox.style.transform = '';
                });
                wheelBox.addEventListener(
                    'transitionend',
                    () => {
                        wheelBox.style.transition = '';
                    },
                    { once: true }
                );
            }
        }

        // Update arrow direction
        this.updateArrowDirection();
        // Wheel re-fit happens via the layout observer once the panel settles.
    }

    // On-screen box of the drawn wheel (the circle, not its letterboxed <svg>).
    wheelRect(): DOMRect | null {
        const group = document.querySelector('#wheel-container .wheel-main-group');
        return group ? group.getBoundingClientRect() : null;
    }

    // Publish the panel's rendered height as --sheet-h. Only the portrait bottom-sheet
    // CSS reads it; elsewhere it's inert.
    syncSheetHeight(): void {
        const panel = document.getElementById('info-panel');
        if (!panel) return;
        const h = Math.round(panel.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--sheet-h', `${h}px`);
    }

    // Keep the wheel fitted to its visible area: the sheet's height feeds --sheet-h,
    // and any resulting change to the wheel container's box triggers a (debounced,
    // size-guarded) re-fit — covers collapse/expand, rotation and short screens alike.
    observeLayout(wheelContainer: HTMLElement): void {
        if (typeof ResizeObserver === 'undefined') return;
        const panel = document.getElementById('info-panel');
        if (panel) new ResizeObserver(() => this.syncSheetHeight()).observe(panel);
        new ResizeObserver(() => this.wheelGenerator?.handleResize()).observe(wheelContainer);
    }

    // REMOVED: getEmotionFamily() and getFamilyColor() methods
    // These were part of the old duplicate color system that caused conflicts
    // All color resolution now uses centralized family-aware system in feelings-data.ts

    // ===== PROPER STATE SYNCHRONIZATION =====

    recreateTilesFromWheelState(): void {
        // The tree derives entirely from selectedWedges, so a rebuild reflects the engine's
        // restored state after a mode switch.
        this.renderFeelings();
    }

    updateInstructionsVisibility(): void {
        // Show instructions only when nothing is selected.
        if (this.selectionCount() === 0) {
            this.showInstructions();
        } else {
            this.hideInstructions();
        }
    }

    hideInstructions(): void {
        const instructionsSection = document.getElementById('panel-instructions');
        if (instructionsSection) {
            instructionsSection.hidden = true;
        }
    }
}

// Initialize the app
export const app = new FeelingsWheelApp();
