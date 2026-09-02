// Main Application Controller - Coordinates between wheel engine and panel UI
// Architecture: feelings-wheel-engine.js handles wheel rendering/interaction, app.js handles panel/coordination
import { FeelingsWheelGenerator } from './feelings-wheel-engine.js';
import { FEELINGS_DATA } from './feelings-data.js';
import { renderFeelingsTree } from './src/ui/feelings-tree.js';

export class FeelingsWheelApp {
    constructor() {
        this.wheelGenerator = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        // Initialize the wheel
        const wheelContainer = document.getElementById('wheel-container');
        this.wheelGenerator = new FeelingsWheelGenerator(wheelContainer, FEELINGS_DATA);
        this.wheelGenerator.generate();

        // Setup information panel (this will handle all controls now)
        this.setupInformationPanel();

        // Setup fullscreen functionality
        this.setupFullscreenFeature();

        // Setup comprehensive keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Listen for emotion selection events
        document.addEventListener('emotionSelected', (event) => {
            this.handleEmotionSelection(event.detail);
        });
    }

    setupFullscreenFeature() {
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

    isFullscreenSupported() {
        return !!(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled
        );
    }

    isCurrentlyFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }

    async toggleFullscreen() {
        try {
            if (this.isCurrentlyFullscreen()) {
                await this.exitFullscreen();
            } else {
                await this.requestFullscreen();
            }
        } catch (error) {
            // Fullscreen operation failed - handled gracefully
            // Optionally show user feedback here
        }
    }

    async requestFullscreen() {
        const element = document.documentElement;

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

    async exitFullscreen() {
        if (document.exitFullscreen) {
            return document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            return document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            return document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            return document.msExitFullscreen();
        }

        throw new Error('Exit fullscreen not supported');
    }

    updateFullscreenButton() {
        const fullscreenButton = document.getElementById('fullscreen-btn-panel');

        if (fullscreenButton) {
            if (this.isCurrentlyFullscreen()) {
                fullscreenButton.classList.add('active');
                fullscreenButton.title = 'Exit fullscreen (ESC)';
            } else {
                fullscreenButton.classList.remove('active');
                fullscreenButton.title = 'Enter fullscreen (F11)';
            }
        }
    }

    handleFullscreenChange() {
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

    setupKeyboardShortcuts() {
        // Global keyboard event listener for all shortcuts
        document.addEventListener('keydown', (event) => {
            // Skip if user is typing in an input field
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            const key = event.key.toLowerCase();

            switch (key) {
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

    toggleSimplifiedMode() {
        // Find and trigger the simplified mode toggle input
        const toggleInput = document.getElementById('simplified-mode-panel');
        if (toggleInput) {
            toggleInput.click();
        }
    }

    // ===== INFORMATION PANEL FUNCTIONALITY =====

    setupInformationPanel() {
        // The selected-feelings tree is rebuilt wholesale from the wheel's selectedWedges
        // (the source of truth) on every change — no per-tile handle map to keep in sync.

        // Setup panel minimization (desktop)
        const minimizeTab = document.getElementById('panel-minimize-tab');
        minimizeTab.addEventListener('click', () => {
            this.togglePanelMinimization();
        });

        // Initialize arrow direction based on current panel state
        this.updateArrowDirection();

        // Setup mobile collapse handle
        const mobileHandle = document.getElementById('mobile-collapse-handle');
        mobileHandle.addEventListener('click', () => {
            this.togglePanelMinimization();
        });

        // Setup panel controls (moved from floating controls)
        this.setupPanelControls();

        // Show instructions initially
        this.showInstructions();
    }

    setupPanelControls() {
        // Setup simplified mode toggle
        const simplifiedModeToggle = document.getElementById('simplified-mode-panel');
        simplifiedModeToggle.addEventListener('change', (event) => {
            const isSimplified = event.target.checked;

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
        const resetButton = document.getElementById('reset-btn-panel');
        resetButton.addEventListener('click', () => {
            this.resetWithAnimation();
        });

        // Setup fullscreen button
        const fullscreenButton = document.getElementById('fullscreen-btn-panel');
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
    setupPanelViews() {
        this.currentView = 'explore';
        this.views = {
            explore: document.getElementById('view-explore'),
            help: document.getElementById('view-help'),
            about: document.getElementById('view-about'),
            support: document.getElementById('view-support'),
        };

        // Footer icons that open a secondary view.
        document.querySelectorAll('.hero-btn[data-view]').forEach((btn) => {
            btn.addEventListener('click', () => this.showView(btn.dataset.view));
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

    showView(name) {
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
            const frame = document.getElementById('kofi-frame');
            if (frame && !frame.src && frame.dataset.src) {
                frame.src = frame.dataset.src;
            }
        }

        this.currentView = name;

        // Move focus to the opened view's back button for keyboard users.
        if (name !== 'explore') {
            const back = target.querySelector('[data-view-back]');
            if (back) back.focus();
        }
    }

    handleEmotionSelection(detail) {
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
    selectionCount() {
        return this.wheelGenerator ? this.wheelGenerator.selectedWedges.size : 0;
    }

    // Announce a message to screen readers via the polite live region.
    announce(message) {
        const region = document.getElementById('sr-announcer');
        if (region) region.textContent = message;
    }

    // Rebuild the selected-feelings tree from the wheel's selectedWedges. Each id is
    // parsed into { level, emotion, parent, coreFamily } so the tree can group by branch
    // and place ancestors as context. Called on every selection change and mode switch.
    renderFeelings() {
        const container = document.getElementById('emotion-tiles');
        if (!container) return;

        const isSimplified = this.isSimplifiedActive();
        const selections = [...this.wheelGenerator.selectedWedges].map((wedgeId) => {
            const meta = this.wheelGenerator.parseUniqueWedgeId(wedgeId);
            return { wedgeId, ...meta };
        });

        const { element } = renderFeelingsTree({
            selections,
            familyOrder: FEELINGS_DATA.core.map((c) => c.name),
            getDefinition: (emotion) => this.getEmotionDefinition(emotion, isSimplified),
            getFamilyColor: (family) => FEELINGS_DATA.getCoreEmotionColor(family),
            onRemove: (id) => this.wheelGenerator.toggleWedgeSelection(id),
        });

        container.replaceChildren(element);
    }

    isSimplifiedActive() {
        const toggle = document.getElementById('simplified-mode-panel');
        return !!(toggle && toggle.checked);
    }

    // Look up a definition; returns '' when none exists so the tree omits the line
    // entirely (no filler). The corpus covers all 130 words, but empties are honored.
    getEmotionDefinition(emotion, isSimplified) {
        const emotionData = FEELINGS_DATA.definitions[emotion];
        if (!emotionData) return '';
        return (isSimplified ? emotionData.simplified : emotionData.standard) || '';
    }

    // Clear the tree from the DOM and (optionally) restore the empty-state instructions.
    clearAllTiles() {
        const container = document.getElementById('emotion-tiles');
        if (container) container.replaceChildren();
        this.showInstructions();
    }

    clearAllTilesWithoutInstructions() {
        // Clear without auto-showing instructions (mode switch manages that itself).
        const container = document.getElementById('emotion-tiles');
        if (container) container.replaceChildren();
    }

    // ===== ANIMATED RESET FUNCTIONALITY =====

    resetWithAnimation() {
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

        this.announce('Cleared all selected emotions.');

        // RESTORED: Full reset animation with tile unwinding + wheel rotation
        this.animateUnwindTiles();
    }

    animateUnwindTiles() {
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

    animateUnwindRotation() {
        // Delegate the wheel-layer rotation animation to the engine (1s to match the
        // tile unwind), then finalize app + engine state when it resolves.
        this.wheelGenerator.animateResetRotation(1000).then(() => this.completeReset());
    }

    completeReset() {
        // Engine owns its own reset-state bookkeeping.
        this.wheelGenerator.commitResetState();

        // Re-enable interactions
        this.wheelGenerator.isAnimating = false;
        this.isResetting = false;
    }

    showInstructions() {
        const instructionsSection = document.getElementById('panel-instructions');
        instructionsSection.hidden = false;
    }

    updateArrowDirection() {
        const panel = document.querySelector('.info-panel');
        const arrow = document.querySelector('.minimize-arrow');
        const tab = document.getElementById('panel-minimize-tab');

        if (!panel || !arrow) return;

        const minimized = panel.classList.contains('minimized');
        // Arrow points toward the action: ◀ reveals (when hidden), ▶ collapses.
        arrow.textContent = minimized ? '◀' : '▶';
        if (tab) tab.setAttribute('aria-expanded', String(!minimized));
    }

    togglePanelMinimization() {
        const panel = document.querySelector('.info-panel');
        const mainLayout = document.querySelector('.main-layout');

        panel.classList.toggle('minimized');
        mainLayout.classList.toggle('panel-minimized'); // For wheel centering

        // Update arrow direction
        this.updateArrowDirection();

        // MOBILE FIX: Trigger wheel resize after panel state change
        // This ensures the wheel recalculates its size based on new available space
        if (this.wheelGenerator && window.innerWidth <= 767) {
            // Small delay to allow CSS transitions to settle
            setTimeout(() => {
                this.wheelGenerator.handleResize();
            }, 350); // Slightly longer than CSS transition (0.3s)
        }
    }

    // REMOVED: getEmotionFamily() and getFamilyColor() methods
    // These were part of the old duplicate color system that caused conflicts
    // All color resolution now uses centralized family-aware system in feelings-data.js

    // ===== PROPER STATE SYNCHRONIZATION =====

    recreateTilesFromWheelState() {
        // The tree derives entirely from selectedWedges, so a rebuild reflects the engine's
        // restored state after a mode switch.
        this.renderFeelings();
    }

    updateInstructionsVisibility() {
        // Show instructions only when nothing is selected.
        if (this.selectionCount() === 0) {
            this.showInstructions();
        } else {
            this.hideInstructions();
        }
    }

    hideInstructions() {
        const instructionsSection = document.getElementById('panel-instructions');
        if (instructionsSection) {
            instructionsSection.hidden = true;
        }
    }
}

// Initialize the app
export const app = new FeelingsWheelApp();
