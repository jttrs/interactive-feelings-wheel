// Main Application Controller - Coordinates between wheel engine and panel UI
// Architecture: feelings-wheel-engine.js handles wheel rendering/interaction, app.js handles panel/coordination
import { FeelingsWheelGenerator } from './feelings-wheel-engine.js';
import { FEELINGS_DATA } from './feelings-data.js';
import { createCard } from './src/ui/emotion-card.js';

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
        // Wait for the browser to settle the layout, then hard re-render.
        if (this.wheelGenerator) {
            setTimeout(() => this.wheelGenerator.forceRerender(), 100);
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

                case 'arrowleft':
                    event.preventDefault();
                    this.rotateWheel(-15); // Rotate left 15 degrees
                    break;

                case 'arrowright':
                    event.preventDefault();
                    this.rotateWheel(15); // Rotate right 15 degrees
                    break;

                case 'arrowup':
                    event.preventDefault();
                    this.rotateWheel(-15); // Rotate counterclockwise 15 degrees
                    break;

                case 'arrowdown':
                    event.preventDefault();
                    this.rotateWheel(15); // Rotate clockwise 15 degrees
                    break;

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

    resetAllSelections() {
        // Find and trigger the reset button
        const resetButton = document.getElementById('reset-btn-panel');
        if (resetButton) {
            resetButton.click();
        }
    }

    rotateWheel(degrees) {
        // Ignore rotate requests while an animation (e.g. the reset unwind) owns the
        // wheel — a second concurrent rAF would fight it for currentRotation and could
        // leave the wheel at an angle that disagrees with the committed reset state.
        if (!this.wheelGenerator || this.wheelGenerator.isAnimating) return;

        const targetRotation = this.wheelGenerator.currentRotation + degrees;
        this.wheelGenerator.animateRotation(targetRotation, 200); // Quick 200ms animation
    }

    // ===== INFORMATION PANEL FUNCTIONALITY =====

    setupInformationPanel() {
        // Initialize emotion tiles tracking
        this.emotionTiles = new Map(); // Maps wedgeId -> EmotionCard handle
        this.tileOrder = []; // Track order of tiles (newest first)

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
        const { emotion, level, selected, wedgeId } = detail;

        // Selecting an emotion always brings the Explore view forward.
        if (this.currentView && this.currentView !== 'explore') {
            this.showView('explore');
        }

        if (selected) {
            // Add new emotion tile
            this.addEmotionTile(wedgeId, emotion, level);
            this.announce(`Selected ${emotion}.`);
        } else {
            // Remove emotion tile
            this.removeEmotionTile(wedgeId);
            this.announce(`Removed ${emotion}.`);
        }

        // Update instructions visibility
        this.updateInstructionsVisibility();
    }

    // Announce a message to screen readers via the polite live region.
    announce(message) {
        const region = document.getElementById('sr-announcer');
        if (region) region.textContent = message;
    }

    addEmotionTile(wedgeId, emotion, level) {
        // Replace any existing card for this wedge (safety).
        if (this.emotionTiles.has(wedgeId)) {
            this.removeEmotionTile(wedgeId);
        }

        // Build a guarded EmotionCard. Every card KEEPS its definition — no accordion.
        const { element, handle } = createCard({
            wedgeId,
            emotion,
            level,
            color: this.getEmotionColor(wedgeId),
            definition: this.getEmotionDefinition(emotion, this.isSimplifiedActive()),
            onRemove: (id) => this.wheelGenerator.toggleWedgeSelection(id),
        });

        this.emotionTiles.set(wedgeId, handle);
        this.tileOrder.unshift(wedgeId); // newest first

        const tilesContainer = document.getElementById('emotion-tiles');
        tilesContainer.insertBefore(element, tilesContainer.firstChild);
    }

    removeEmotionTile(wedgeId) {
        const handle = this.emotionTiles.get(wedgeId);
        if (handle) {
            handle.remove();
            this.emotionTiles.delete(wedgeId);
            this.tileOrder = this.tileOrder.filter((id) => id !== wedgeId);
        }
    }

    isSimplifiedActive() {
        const toggle = document.getElementById('simplified-mode-panel');
        return !!(toggle && toggle.checked);
    }

    getEmotionDefinition(emotion, isSimplified) {
        // Get emotion-specific definition from our comprehensive database
        const emotionData = FEELINGS_DATA.definitions[emotion];

        if (emotionData) {
            return isSimplified ? emotionData.simplified : emotionData.standard;
        }

        // Fallback for missing definitions
        return isSimplified
            ? `${emotion} is a feeling that people experience.`
            : `${emotion} is an emotion that represents a specific aspect of human emotional experience.`;
    }

    clearAllTiles() {
        this.emotionTiles.forEach((handle) => handle.remove());
        this.emotionTiles.clear();
        this.tileOrder = [];
        this.showInstructions();
    }

    clearAllTilesWithoutInstructions() {
        // Clear tiles without automatically showing instructions (for mode switching)
        this.emotionTiles.forEach((handle) => handle.remove());
        this.emotionTiles.clear();
        this.tileOrder = [];
        // Don't call showInstructions() - let caller manage instruction visibility
    }

    // ===== ANIMATED RESET FUNCTIONALITY =====

    resetWithAnimation() {
        // CRITICAL FIX: Only reset current mode, prevent cross-mode contamination

        // If no selections, just do instant reset
        if (this.emotionTiles.size === 0 && this.wheelGenerator.currentRotation === 0) {
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
        // Cards in current order (newest first). Map values are EmotionCard handles.
        const handles = Array.from(this.emotionTiles.values());
        if (handles.length === 0) {
            // No cards to animate, but still animate wheel rotation.
            this.wheelGenerator.clearSelections();
            this.animateUnwindRotation();
            return;
        }

        // Prevent a horizontal scrollbar while cards slide out.
        const tilesContainer = document.getElementById('emotion-tiles');
        tilesContainer.style.overflowX = 'hidden';

        // Always ~1s total regardless of count.
        const totalDuration = 1000;
        const cardDuration = Math.max(150, (totalDuration * 0.6) / handles.length);
        const staggerDelay = Math.max(50, (totalDuration * 0.4) / handles.length);

        // Start the wheel unwind concurrently.
        this.wheelGenerator.clearSelections();
        this.animateUnwindRotation();

        let i = 0;
        const animateNext = () => {
            if (i >= handles.length) {
                this.clearAllTiles();
                tilesContainer.style.overflowX = '';
                return;
            }
            const handle = handles[i];
            // Deselect in the wheel + slide the card out via its own guarded API.
            this.wheelGenerator.clearSelection(handle.wedgeId);
            handle.animateOut(cardDuration).then(() => this.emotionTiles.delete(handle.wedgeId));
            i++;
            setTimeout(animateNext, staggerDelay);
        };
        animateNext();
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

    getEmotionColor(wedgeId) {
        // Resolve the wedge's core family via the engine's structured registry,
        // then map the family name to its accent color (no lightening for tiles).
        const meta = this.wheelGenerator.parseUniqueWedgeId(wedgeId);
        return FEELINGS_DATA.getCoreEmotionColor(meta.coreFamily);
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
        // Recreate tiles based on wheel engine's current selectedWedges state
        this.wheelGenerator.selectedWedges.forEach((wedgeId) => {
            // Find the actual wedge element to get emotion info
            const wedge = document.querySelector(`[data-wedge-id="${wedgeId}"]`);
            if (wedge) {
                const emotion = wedge.getAttribute('data-emotion');
                const level = wedge.getAttribute('data-level');

                // Use the same tile creation flow as normal selection
                this.addEmotionTile(wedgeId, emotion, level);
            }
        });
    }

    updateInstructionsVisibility() {
        // Show instructions only when no tiles exist
        if (this.emotionTiles.size === 0) {
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
