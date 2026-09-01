export const InteractionMixin = (Base) =>
    class extends Base {
        saveCurrentState() {
            const currentState = this.isSimplifiedMode
                ? this.simplifiedModeState
                : this.fullModeState;
            currentState.rotation = this.currentRotation;
            currentState.selectedWedges = new Set(this.selectedWedges);
            currentState.hasBeenInitialized = true;
        }

        restoreState(targetMode) {
            const targetState = targetMode ? this.simplifiedModeState : this.fullModeState;

            if (targetState.hasBeenInitialized) {
                // Restore previous state
                this.currentRotation = targetState.rotation;
                this.selectedWedges = new Set(targetState.selectedWedges);
            } else {
                // First time seeing this mode - reset state
                this.currentRotation = 0;
                this.selectedWedges = new Set();
            }
        }

        setSimplifiedMode(enabled) {
            // Save current state before switching
            this.saveCurrentState();

            // Switch mode
            this.isSimplifiedMode = enabled;
            this.updateRadii();

            // Restore state for new mode
            this.restoreState(enabled);

            // Regenerate wheel
            this.regenerateWheel();
        }

        regenerateWheel() {
            // A momentum loop from the previous SVG would write to stale groups.
            this.stopMomentum();

            // Clear existing wheel
            this.textElements = [];

            // Remove existing content
            if (this.svg) {
                this.svg.innerHTML = '';
            }

            // Generate new wheel
            this.generate();

            // Apply current state to the new wheel
            this.updateRotation();
            this.applySelectedWedges();

            // REMOVED REDUNDANT CALL: generate() already handles all responsive scaling
            // this.updateAllResponsiveScaling(); // Not needed - generate() does this

            // OLD CONTROL REPOSITIONING REMOVED
        }

        applySelectedWedges() {
            // Re-apply selection state to wedges after regeneration
            this.selectedWedges.forEach((wedgeId) => {
                // Parse the unique wedge ID format
                const { level, emotion, parent } = this.parseUniqueWedgeId(wedgeId);

                // Skip tertiary emotions in simplified mode since they don't exist
                if (this.isSimplifiedMode && level === 'tertiary') {
                    return;
                }

                const wedge = this.findWedgeByUniqueId(level, emotion, parent);
                if (wedge) {
                    // Find the wedge click handler logic and apply it
                    wedge.classList.add('selected');

                    // Apply emphasis effect (move to top layer, add shadow)
                    this.topGroup.appendChild(wedge);

                    // Use centralized text movement method
                    this.moveTextForWedge(emotion, level, parent, this.topGroup);

                    // Create shadow copy
                    this.createShadowCopy(wedge, wedgeId);
                }
            });
        }

        // Called on every generate(): the <svg> is recreated each time, so its scoped
        // listeners are attached fresh (the old svg is discarded with its listeners — no
        // leak). Global document/window listeners are bound ONCE via setupGlobalListeners()
        // (from the constructor), never here, to avoid stacking a duplicate set on every
        // regenerate (mode switch / resize / fullscreen).
        setupEventListeners() {
            // Mouse down to begin a drag-rotation.
            this.svg.addEventListener('mousedown', (e) => {
                if (this.isAnimating) return;

                // Grabbing the wheel arrests any in-flight scroll glide.
                this.stopMomentum();

                this.isDragging = true;
                this.svg.style.cursor = 'grabbing';

                const rect = this.svg.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                this.lastMouseAngle = Math.atan2(mouseY, mouseX);
                e.preventDefault();
            });

            // Mouse wheel for rotation. Scale by the scroll MAGNITUDE (not just its
            // sign) and feed a decaying-velocity model so the wheel has weight and
            // does not flicker on the tiny sign-alternating deltas a slow trackpad
            // emits. { passive: false } because we call preventDefault().
            this.svg.addEventListener(
                'wheel',
                (e) => {
                    if (this.isAnimating) return;
                    e.preventDefault();
                    this.applyScrollInput(e.deltaY);
                },
                { passive: false }
            );

            // Click events for emotions. Blocked during a drag AND during an animation
            // (e.g. the reset unwind) — a mid-reset click would otherwise select a wedge
            // the in-flight reset won't clean up, leaving it stuck-selected.
            this.svg.addEventListener('click', (e) => {
                if (this.isDragging || this.isAnimating) return;

                const emotion = e.target.getAttribute('data-emotion');
                if (emotion && e.target.classList.contains('wedge')) {
                    this.handleWedgeClick(e);
                }
            });

            // Keyboard support: Enter/Space selects the focused wedge; Arrow keys move
            // focus between wedges (roving tabindex). Arrow handling is scoped to when a
            // wedge is focused and stops propagation so it does not also rotate the wheel
            // via the app's global arrow-key shortcut — mouse/scroll behavior is unchanged.
            this.svg.addEventListener('keydown', (e) => {
                const target = e.target;
                if (!target || !target.classList || !target.classList.contains('wedge')) return;

                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    this.handleWedgeClick({ target });
                    return;
                }

                if (
                    ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(
                        e.key
                    )
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.moveWedgeFocus(target, e.key);
                }
            });

            // Establish the single tab-stop into the wheel.
            this.initRovingTabindex();
        }

        // Bind document/window listeners ONCE (from the constructor). These outlive any
        // single <svg>, so re-binding per generate() would stack duplicate handlers — a
        // steadily worsening memory + CPU leak. Bound refs are stored so they can be
        // removed on teardown. Each handler no-ops until the wheel is generated (svg set).
        setupGlobalListeners() {
            if (this._globalListenersBound) return;
            this._globalListenersBound = true;

            this._onMouseMove = (e) => {
                if (!this.isDragging || this.isAnimating || !this.svg) return;

                const rect = this.svg.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const currentMouseAngle = Math.atan2(mouseY, mouseX);
                const deltaAngle = (currentMouseAngle - this.lastMouseAngle) * (180 / Math.PI);

                this.currentRotation += deltaAngle;
                this.lastMouseAngle = currentMouseAngle;

                this.updateRotation();
            };
            this._onMouseUp = () => {
                if (!this.svg) return;
                this.isDragging = false;
                this.svg.style.cursor = 'grab';
            };
            this._onResize = () => this.handleResize();
            this._onOrientationChange = () => {
                // Mobile orientation change - allow time for layout to settle
                setTimeout(() => this.handleResize(), 200);
            };

            // Arrow keys spin the wheel via the shared momentum model. These fire only when
            // NO wedge is focused: the svg's own keydown (setupEventListeners) handles arrows
            // as wedge focus-navigation and stopPropagation()s them, so a focused wedge never
            // reaches document here. Map: Left/Up = ccw (-1), Right/Down = cw (+1).
            const ARROW_DIR = {
                ArrowLeft: -1,
                ArrowUp: -1,
                ArrowRight: 1,
                ArrowDown: 1,
            };
            this._onKeyDown = (e) => {
                const dir = ARROW_DIR[e.key];
                if (dir === undefined || !this.svg) return;
                // Don't hijack arrows while typing in a field.
                const tag = e.target && e.target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                e.preventDefault();
                // OS key-repeat presses are no-ops: the held-accel loop sustains the spin,
                // so we only kick it on the initial (non-repeat) press.
                if (e.repeat) return;
                this.startHeldRotation(dir);
            };
            this._onKeyUp = (e) => {
                const dir = ARROW_DIR[e.key];
                if (dir === undefined) return;
                this.stopHeldRotation(dir);
            };
            // If focus/visibility leaves mid-hold we never get keyup — clear held spin so it
            // can't get stuck accelerating.
            this._onBlur = () => {
                this.heldRotationDir = 0;
            };

            document.addEventListener('mousemove', this._onMouseMove);
            document.addEventListener('mouseup', this._onMouseUp);
            document.addEventListener('keydown', this._onKeyDown);
            document.addEventListener('keyup', this._onKeyUp);
            window.addEventListener('resize', this._onResize);
            window.addEventListener('orientationchange', this._onOrientationChange);
            window.addEventListener('blur', this._onBlur);
        }

        // Focusable wedges in STABLE generation order (data-nav-index), not live DOM
        // order — a selected wedge's <path> is moved to the top layer, which would
        // otherwise reshuffle arrow-key navigation after any selection.
        getFocusableWedges() {
            return Array.from(this.container.querySelectorAll('.wedge:not(.shadow-wedge)')).sort(
                (a, b) =>
                    Number(a.getAttribute('data-nav-index')) -
                    Number(b.getAttribute('data-nav-index'))
            );
        }

        // Make exactly one wedge part of the tab order so the wheel is a single tab-stop.
        initRovingTabindex() {
            const wedges = this.getFocusableWedges();
            wedges.forEach((w) => w.setAttribute('tabindex', '-1'));
            if (wedges.length) wedges[0].setAttribute('tabindex', '0');
        }

        // Move keyboard focus among wedges, updating the roving tabindex.
        moveWedgeFocus(current, key) {
            const wedges = this.getFocusableWedges();
            const i = wedges.indexOf(current);
            if (i === -1) return;

            let next;
            if (key === 'Home') next = 0;
            else if (key === 'End') next = wedges.length - 1;
            else {
                const forward = key === 'ArrowRight' || key === 'ArrowDown';
                next = (i + (forward ? 1 : -1) + wedges.length) % wedges.length;
            }

            current.setAttribute('tabindex', '-1');
            const target = wedges[next];
            target.setAttribute('tabindex', '0');
            target.focus();
        }

        // DPI-aware resize handler. Uses the SAME computeAvailableWheelSize() as
        // generate(), so a resize computes an identical size to the initial render for
        // the same viewport/panel state (no more 150-vs-200 floor divergence).
        handleResize() {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                const oldSize = this.containerSize;
                const newCssSize = this.computeAvailableWheelSize();

                // Only regenerate if significant change (avoid constant regeneration)
                if (Math.abs(newCssSize - oldSize) > 10) {
                    this.regenerateWheel();
                }
            }, 150);
        }

        // Unconditional re-render (no size-delta guard). Used after a fullscreen
        // transition to rebuild the SVG and refresh any stale GPU layer, even when
        // the window size is unchanged. Preserves rotation + selection state.
        forceRerender() {
            this.regenerateWheel();
        }

        handleWedgeClick(event) {
            const wedge = event.target;
            const emotion = wedge.getAttribute('data-emotion');
            const level = wedge.getAttribute('data-level');
            const parent = wedge.getAttribute('data-parent');

            // CRITICAL FIX: Use the actual wedge ID from the element, don't recreate it!
            // This ensures consistency between generation and click handling
            const wedgeId = wedge.getAttribute('data-wedge-id');

            if (!wedgeId) {
                return;
            }

            // Toggle selection using centralized methods
            if (this.selectedWedges.has(wedgeId)) {
                // Deselection - use centralized method
                this.deselectWedge(wedgeId, wedge, emotion);
            } else {
                // Selection - use centralized method
                this.selectWedge(wedgeId, wedge, emotion);
            }

            // Dispatch custom event for app to handle
            const customEvent = new CustomEvent('emotionSelected', {
                detail: { emotion, level, selected: this.selectedWedges.has(wedgeId), wedgeId },
            });
            document.dispatchEvent(customEvent);
        }

        // Public method to toggle wedge selection (called from panel tile X buttons)
        toggleWedgeSelection(wedgeId) {
            const wedge = this.findWedgeByStoredId(wedgeId);

            if (wedge) {
                const emotion = wedge.getAttribute('data-emotion');
                const level = wedge.getAttribute('data-level');

                const isCurrentlySelected = this.selectedWedges.has(wedgeId);

                // Use centralized selection/deselection logic directly
                if (isCurrentlySelected) {
                    this.deselectWedge(wedgeId, wedge, emotion);
                } else {
                    this.selectWedge(wedgeId, wedge, emotion);
                }

                // Dispatch custom event for app to handle
                const customEvent = new CustomEvent('emotionSelected', {
                    detail: { emotion, level, selected: this.selectedWedges.has(wedgeId), wedgeId },
                });
                document.dispatchEvent(customEvent);
            }
        }

        selectWedge(wedgeId, wedge, emotion) {
            // Centralized wedge selection logic
            const level = wedge.getAttribute('data-level');
            const parent = wedge.getAttribute('data-parent');

            this.selectedWedges.add(wedgeId);
            wedge.classList.add('selected');
            wedge.setAttribute('aria-pressed', 'true');

            // SELECTION STYLING: Use CSS for visual emphasis (filters, not thick borders)

            // Move wedge and its text to top layer - pass the existing wedge ID
            this.topGroup.appendChild(wedge);
            this.moveTextForWedge(emotion, level, parent, this.topGroup, wedgeId);
            // Emphasize the label too (weight bump) so selection reads in the text.
            this.setLabelSelected(wedgeId, true);

            // Create shadow copy
            this.createShadowCopy(wedge, wedgeId);
        }

        deselectWedge(wedgeId, wedge, emotion) {
            // Centralized wedge deselection logic
            const level = wedge.getAttribute('data-level');
            const parent = wedge.getAttribute('data-parent');

            this.selectedWedges.delete(wedgeId);
            wedge.classList.remove('selected');
            wedge.setAttribute('aria-pressed', 'false');

            // DESELECTION STYLING: CSS handles visual reset automatically

            // Clear any lingering visual effects
            wedge.style.filter = '';
            wedge.style.opacity = '';
            wedge.style.transform = '';

            // Remove shadow copy first
            this.removeShadowCopy(wedgeId);

            // Move wedge and text back to base layer
            this.baseGroup.appendChild(wedge);
            this.moveTextForWedge(emotion, level, parent, this.baseGroup, wedgeId);
            this.setLabelSelected(wedgeId, false);
        }

        // Toggle the emphasis class on a wedge's paired label (weight bump on select).
        setLabelSelected(wedgeId, on) {
            const label = this.container.querySelector(`text[data-wedge-id="${wedgeId}"]`);
            if (label) label.classList.toggle('label-selected', on);
        }

        updateRotation() {
            this.baseGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.divisionLinesGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.topGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.updateTextRotations();
            this.updateAllShadowTransforms();
        }

        // ===== ROTATION MOMENTUM =====
        // Shared velocity/friction model driving BOTH scroll and held-arrow rotation.
        // SENSITIVITY converts a scroll delta (px) into degrees of velocity; FRICTION is
        // the per-frame velocity retention (higher = heavier/longer glide); MAX_VELOCITY
        // caps a fast flick or a sustained hold; MIN_VELOCITY is when we snap to rest.
        // KEY_IMPULSE is the one-shot velocity a single arrow tap adds (a tap glides
        // ~IMPULSE/(1-FRICTION) degrees); KEY_ACCEL is the per-frame velocity added while an
        // arrow is HELD, ramping up to MAX_VELOCITY for a smooth continuous spin.
        static ScrollPhysics = {
            SENSITIVITY: 0.025,
            FRICTION: 0.9,
            MAX_VELOCITY: 2,
            MIN_VELOCITY: 0.05,
            KEY_IMPULSE: 0.3,
            KEY_ACCEL: 0.2,
        };

        // Feed one wheel event into the momentum model. Adds magnitude-scaled velocity
        // (so tiny jittery deltas add tiny, sign-correct nudges instead of a full ±5°
        // swing) and kicks the decay loop.
        applyScrollInput(deltaY) {
            const P = this.constructor.ScrollPhysics;
            this.scrollVelocity += deltaY * P.SENSITIVITY;
            // Clamp so a hard flick can't spin absurdly fast.
            this.scrollVelocity = Math.max(
                -P.MAX_VELOCITY,
                Math.min(P.MAX_VELOCITY, this.scrollVelocity)
            );
            if (this.momentumRafId === null) this.startMomentum();
        }

        startMomentum() {
            const P = this.constructor.ScrollPhysics;
            const step = () => {
                // A programmatic animation (e.g. reset) takes over: drop momentum and any
                // held-key spin so a second rAF can't fight the reset for currentRotation.
                if (this.isAnimating) {
                    this.scrollVelocity = 0;
                    this.heldRotationDir = 0;
                    this.momentumRafId = null;
                    return;
                }

                // While an arrow key is held, feed velocity in each frame so the spin is
                // continuous and rides up to the shared MAX_VELOCITY cap.
                if (this.heldRotationDir !== 0) {
                    this.scrollVelocity += this.heldRotationDir * P.KEY_ACCEL;
                    this.scrollVelocity = Math.max(
                        -P.MAX_VELOCITY,
                        Math.min(P.MAX_VELOCITY, this.scrollVelocity)
                    );
                }

                this.currentRotation += this.scrollVelocity;
                this.updateRotation();
                this.scrollVelocity *= P.FRICTION;

                // Settle only when nothing is held AND the glide has decayed — a held key
                // keeps the loop alive even as friction pulls velocity toward the cap.
                if (this.heldRotationDir === 0 && Math.abs(this.scrollVelocity) < P.MIN_VELOCITY) {
                    this.scrollVelocity = 0;
                    this.momentumRafId = null;
                    return; // settled
                }
                this.momentumRafId = requestAnimationFrame(step);
            };
            this.momentumRafId = requestAnimationFrame(step);
        }

        // Begin (or reverse) a held-arrow spin. dir: +1 clockwise, -1 counter-clockwise.
        // A single tap lands one KEY_IMPULSE and the friction glide carries it ~15°; holding
        // the key lets startMomentum()'s per-frame KEY_ACCEL take over for a continuous spin.
        startHeldRotation(dir) {
            // A programmatic animation (reset) owns the wheel — ignore, matching scroll/drag.
            if (this.isAnimating) return;
            const P = this.constructor.ScrollPhysics;
            this.heldRotationDir = dir;
            this.scrollVelocity += dir * P.KEY_IMPULSE;
            this.scrollVelocity = Math.max(
                -P.MAX_VELOCITY,
                Math.min(P.MAX_VELOCITY, this.scrollVelocity)
            );
            if (this.momentumRafId === null) this.startMomentum();
        }

        // Release a held-arrow spin. Clears the held direction (if it still matches) so
        // friction decays the wheel to rest; the loop settles on its own.
        stopHeldRotation(dir) {
            if (this.heldRotationDir === dir) this.heldRotationDir = 0;
        }

        stopMomentum() {
            if (this.momentumRafId !== null) {
                cancelAnimationFrame(this.momentumRafId);
                this.momentumRafId = null;
            }
            this.scrollVelocity = 0;
            this.heldRotationDir = 0;
        }

        reset() {
            // Clear all active animations first
            this.clearAllAnimations();
            this.stopMomentum();

            // Use centralized deselection for each selected wedge
            const selectedWedgeIds = [...this.selectedWedges]; // Copy the set to avoid modification during iteration
            selectedWedgeIds.forEach((wedgeId) => {
                const { level, emotion, parent } = this.parseUniqueWedgeId(wedgeId);
                const wedge = this.findWedgeByUniqueId(level, emotion, parent);
                if (wedge) {
                    this.deselectWedge(wedgeId, wedge, emotion);
                }
            });

            // Final cleanup - ensure everything is in base layer
            const wedges = this.container.querySelectorAll('.wedge');
            wedges.forEach((wedge) => {
                if (wedge.parentNode !== this.baseGroup) {
                    this.baseGroup.appendChild(wedge);
                }
            });

            // Move all text elements back to base layer using the reliable method
            this.textElements.forEach((textData) => {
                if (textData.element.parentNode !== this.baseGroup) {
                    this.baseGroup.appendChild(textData.element);
                }
            });

            // Clear all shadow copies
            this.shadowGroup.innerHTML = '';

            // Reset rotation instantly
            this.currentRotation = 0;
            this.updateRotation();

            // Update the stored state for current mode only
            const currentState = this.isSimplifiedMode
                ? this.simplifiedModeState
                : this.fullModeState;
            currentState.rotation = 0;
            currentState.selectedWedges = new Set();
            currentState.hasBeenInitialized = true;
        }

        // ===== PUBLIC RESET/SELECTION API (used by the app's animated reset) =====
        // These own all wheel-layer DOM mutation so the app controller never has to reach
        // into engine internals (baseGroup/shadowGroup/selectedWedges) directly.

        // Clear every selected wedge visually WITHOUT touching rotation. Returns the ids
        // that were cleared (newest-first order is the app's concern, not ours).
        clearSelections() {
            const cleared = [...this.selectedWedges];
            cleared.forEach((wedgeId) => this.clearSelection(wedgeId));
            // Remove any residual shadow copies.
            this.shadowGroup.innerHTML = '';
            return cleared;
        }

        // Clear a single wedge's selection visuals and move it back to the base layer.
        // No-op if the id is not currently selected.
        clearSelection(wedgeId) {
            if (!this.selectedWedges.has(wedgeId)) return;
            this.selectedWedges.delete(wedgeId);
            const wedge = this.container.querySelector(
                `.wedge[data-wedge-id="${wedgeId}"]:not(.shadow-wedge)`
            );
            if (wedge) {
                wedge.classList.remove('selected');
                wedge.setAttribute('aria-pressed', 'false');
                wedge.style.filter = '';
                this.removeShadowCopy(wedgeId);
                this.baseGroup.appendChild(wedge);
            }
        }

        // Animate rotation back to 0 over `duration` ms (ease-out cubic), resolving when
        // done. Mirrors the app's previous hand-rolled unwind so the feel is unchanged.
        animateResetRotation(duration = 1000) {
            return new Promise((resolve) => {
                const startRotation = this.currentRotation;
                const delta = this.getShortestRotationPath(startRotation, 0);

                if (Math.abs(delta) < 1) {
                    setTimeout(resolve, duration);
                    return;
                }

                const startTime = performance.now();
                const frame = (now) => {
                    const progress = Math.min((now - startTime) / duration, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    this.currentRotation = startRotation + delta * easeOut;
                    this.updateRotation();
                    if (progress < 1) {
                        requestAnimationFrame(frame);
                    } else {
                        this.currentRotation = 0;
                        this.updateRotation();
                        resolve();
                    }
                };
                requestAnimationFrame(frame);
            });
        }

        // Persist the "cleared" state for the current mode after a reset completes.
        commitResetState() {
            this.currentRotation = 0;
            this.updateRotation();
            const currentState = this.isSimplifiedMode
                ? this.simplifiedModeState
                : this.fullModeState;
            currentState.rotation = 0;
            currentState.selectedWedges = new Set();
            currentState.hasBeenInitialized = true;
        }
    };
