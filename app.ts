// Main Application Controller - Coordinates between wheel engine and panel UI
// Architecture: feelings-wheel-engine.ts handles wheel rendering/interaction, app.ts handles panel/coordination
import { FeelingsWheelGenerator } from './feelings-wheel-engine.ts';
import { FEELINGS_DATA } from './feelings-data.ts';
import { renderFeelingsTree } from './src/ui/feelings-tree.ts';
import { createGuidedHint } from './src/ui/guided-hint.ts';
import { initSmallScreenNudge } from './src/ui/small-screen-nudge.ts';
import type { Selection, EmotionSelectedDetail } from './src/types.ts';

export class FeelingsWheelApp {
    wheelGenerator!: FeelingsWheelGenerator;
    currentView!: string;
    views!: Record<string, HTMLElement | null>;
    isResetting = false;

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

        // Cramped full wheel → gently suggest Simplified/Guided (never switches by itself).
        initSmallScreenNudge({
            container: wheelContainer,
            nudge: document.getElementById('screen-nudge')!,
            dismissButton: document.getElementById('screen-nudge-dismiss') as HTMLButtonElement,
            viewToggles: ['simplified-mode-panel', 'guided-mode-panel'].map(
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
            // Fullscreen can be refused (iframe, user gesture, platform); the button's
            // aria-pressed stays truthful because it's driven by fullscreenchange.
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
            fullscreenButton.title = on ? 'Exit fullscreen (Esc)' : 'Enter fullscreen (F11)';
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
                case 'g':
                    event.preventDefault();
                    (document.getElementById('guided-mode-panel') as HTMLInputElement)?.click();
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

        // Setup panel minimization (desktop)
        const minimizeTab = document.getElementById('panel-minimize-tab')!;
        minimizeTab.addEventListener('click', () => {
            this.togglePanelMinimization();
        });

        // Initialize arrow direction based on current panel state
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
            document.getElementById('panel-content')?.focus();
        });

        // Setup panel controls (moved from floating controls)
        this.setupPanelControls();

        // Show instructions initially
        this.showInstructions();
    }

    setupPanelControls(): void {
        // Guided view: opt-in spotlight over the full wheel. Purely visual — selections
        // and rotation are untouched, so switching it off returns the whole wheel as-is.
        const guidedToggle = document.getElementById('guided-mode-panel') as HTMLInputElement;
        guidedToggle.checked = false;
        const guidedHint = createGuidedHint(
            document.getElementById('guided-hint')!,
            document.getElementById('wheel-container')!
        );
        guidedToggle.addEventListener('change', () => {
            this.wheelGenerator.setGuidedMode(guidedToggle.checked);
            guidedHint.setEnabled(guidedToggle.checked);
            this.announce(
                guidedToggle.checked
                    ? 'Guided view on. Choose a core feeling to open the next ring.'
                    : 'Guided view off. The full wheel is available.'
            );
        });

        // Setup simplified mode toggle
        const simplifiedModeToggle = document.getElementById(
            'simplified-mode-panel'
        ) as HTMLInputElement;
        simplifiedModeToggle.addEventListener('change', (event) => {
            const isSimplified = (event.target as HTMLInputElement).checked;

            // CRITICAL FIX: Clear app state completely and let wheel engine manage everything
            this.clearAllTilesWithoutInstructions(); // Don't auto-show instructions during mode switch

            // Let wheel engine handle mode switching and state restoration
            this.wheelGenerator.setSimplifiedMode(isSimplified);

            // Recreate tiles from wheel engine's restored state
            this.recreateTilesFromWheelState();

            // Update instruction visibility based on final tile state
            this.updateInstructionsVisibility();
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

        // Move focus to the opened view's back button for keyboard users.
        if (name !== 'explore') {
            const back = target!.querySelector('[data-view-back]') as HTMLElement | null;
            if (back) back.focus();
        }
    }

    handleEmotionSelection(detail: EmotionSelectedDetail): void {
        const { emotion, selected } = detail;

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

        container.replaceChildren(element);
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

        // Mark wheel as animating to prevent user interaction
        this.wheelGenerator.isAnimating = true;

        this.announce('Cleared all selected feelings.');

        // RESTORED: Full reset animation with tile unwinding + wheel rotation
        this.animateUnwindTiles();
    }

    animateUnwindTiles(): void {
        // Fade the whole tree out as one calm surface (respecting reduced-motion via CSS),
        // clear it after the fade, and unwind the wheel rotation concurrently.
        const container = document.getElementById('emotion-tiles');
        if (container) {
            container.classList.add('is-clearing');
            const FADE = 260;
            setTimeout(() => {
                this.clearAllTiles();
                container.classList.remove('is-clearing');
            }, FADE);
        }

        this.wheelGenerator.clearSelections();
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
        const arrow = document.querySelector('.minimize-arrow');
        const tab = document.getElementById('panel-minimize-tab');

        if (!panel || !arrow) return;

        const minimized = panel.classList.contains('minimized');
        // Arrow points toward the action: ◀ reveals (when hidden), ▶ collapses.
        arrow.textContent = minimized ? '◀' : '▶';
        if (tab) {
            tab.setAttribute('aria-expanded', String(!minimized));
            tab.setAttribute(
                'aria-label',
                minimized ? 'Show feelings panel' : 'Hide feelings panel'
            );
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

    togglePanelMinimization(): void {
        const panel = document.querySelector('.info-panel')!;
        const mainLayout = document.querySelector('.main-layout')!;

        const wheelBox = document.getElementById('wheel-container');
        const before = this.wheelRect();

        panel.classList.toggle('minimized');
        mainLayout.classList.toggle('panel-minimized'); // For wheel centering
        this.syncSheetHeight(); // mobile: reserve the new sheet height before measuring

        // Glide the wheel to its new centre/size with a transform (FLIP) rather than
        // animating layout: the box snaps to its final layout, then we play the
        // difference back from where it was.
        const after = this.wheelRect();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
