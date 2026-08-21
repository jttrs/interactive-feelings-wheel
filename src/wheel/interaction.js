export const InteractionMixin = (Base) =>
    class extends Base {
        saveCurrentState() {
            const currentState = this.isSimplifiedMode ? this.simplifiedModeState : this.fullModeState;
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
            this.selectedWedges.forEach(wedgeId => {
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

        setupEventListeners() {
            // Mouse events for rotation
            this.svg.addEventListener('mousedown', (e) => {
                // Prevent interaction during animations
                if (this.isAnimating) return;

                this.isDragging = true;
                this.svg.style.cursor = 'grabbing';

                const rect = this.svg.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                this.lastMouseAngle = Math.atan2(mouseY, mouseX);
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!this.isDragging || this.isAnimating) return;

                const rect = this.svg.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const currentMouseAngle = Math.atan2(mouseY, mouseX);
                const deltaAngle = (currentMouseAngle - this.lastMouseAngle) * (180 / Math.PI);

                this.currentRotation += deltaAngle;
                this.lastMouseAngle = currentMouseAngle;

                this.updateRotation();
            });

            document.addEventListener('mouseup', () => {
                this.isDragging = false;
                this.svg.style.cursor = 'grab';
            });

            // Mouse wheel for rotation - restored to original functionality
            this.svg.addEventListener('wheel', (e) => {
                // Prevent interaction during animations
                if (this.isAnimating) return;

                e.preventDefault();
                this.currentRotation += e.deltaY > 0 ? 5 : -5;
                this.updateRotation();
            });

            // Click events for emotions
            this.svg.addEventListener('click', (e) => {
                if (this.isDragging) return;
                // Remove animation blocking for clicks - only block drag/wheel during animations

                const emotion = e.target.getAttribute('data-emotion');
                if (emotion && e.target.classList.contains('wedge')) {
                    this.handleWedgeClick(e);
                }
            });

            // DPI-aware resize handling
            window.addEventListener('resize', () => this.handleResize());
            window.addEventListener('orientationchange', () => {
                // Mobile orientation change - allow time for layout to settle
                setTimeout(() => this.handleResize(), 200);
            });
        }

        // DPI-aware resize handler
        handleResize() {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                const oldSize = this.containerSize;
                const containerRect = this.container.getBoundingClientRect();

                // MOBILE FIX: Use same logic as generate() for consistent sizing
                let availableWidth = containerRect.width;
                let availableHeight = containerRect.height;

                // Check if we're on mobile (viewport width <= 767px)
                const isMobile = window.innerWidth <= 767;

                if (isMobile) {
                    // On mobile, account for bottom panel
                    const infoPanel = document.querySelector('.info-panel');
                    let panelHeight = 320; // Default fallback

                    if (infoPanel && !infoPanel.classList.contains('minimized')) {
                        const panelRect = infoPanel.getBoundingClientRect();
                        panelHeight = panelRect.height || 320;
                    } else if (infoPanel && infoPanel.classList.contains('minimized')) {
                        panelHeight = 0;
                    }

                    availableHeight = Math.max(200, availableHeight - panelHeight - 20);
                }

                const newCssSize = Math.min(availableWidth, availableHeight);

                // Only regenerate if significant change (avoid constant regeneration)
                if (Math.abs(newCssSize - oldSize) > 10) {
                    this.regenerateWheel();
                }
            }, 150);
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
                detail: { emotion, level, selected: this.selectedWedges.has(wedgeId), wedgeId }
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
                detail: { emotion, level, selected: this.selectedWedges.has(wedgeId), wedgeId }
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

            // SELECTION STYLING: Use CSS for visual emphasis (filters, not thick borders)

            // Move wedge and its text to top layer - pass the existing wedge ID
            this.topGroup.appendChild(wedge);
            this.moveTextForWedge(emotion, level, parent, this.topGroup, wedgeId);

            // Create shadow copy
            this.createShadowCopy(wedge, wedgeId);
        }

        deselectWedge(wedgeId, wedge, emotion) {
            // Centralized wedge deselection logic
            const level = wedge.getAttribute('data-level');
            const parent = wedge.getAttribute('data-parent');

            this.selectedWedges.delete(wedgeId);
            wedge.classList.remove('selected');

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
        }

        updateRotation() {
            this.baseGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.divisionLinesGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.topGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.updateTextRotations();
            this.updateAllShadowTransforms();
        }

        reset() {
            // Clear all active animations first
            this.clearAllAnimations();

            // Use centralized deselection for each selected wedge
            const selectedWedgeIds = [...this.selectedWedges]; // Copy the set to avoid modification during iteration
            selectedWedgeIds.forEach(wedgeId => {
                const { level, emotion, parent } = this.parseUniqueWedgeId(wedgeId);
                const wedge = this.findWedgeByUniqueId(level, emotion, parent);
                if (wedge) {
                    this.deselectWedge(wedgeId, wedge, emotion);
                }
            });

            // Final cleanup - ensure everything is in base layer
            const wedges = this.container.querySelectorAll('.wedge');
            wedges.forEach(wedge => {
                if (wedge.parentNode !== this.baseGroup) {
                    this.baseGroup.appendChild(wedge);
                }
            });

            // Move all text elements back to base layer using the reliable method
            this.textElements.forEach(textData => {
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
            const currentState = this.isSimplifiedMode ? this.simplifiedModeState : this.fullModeState;
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
            const currentState = this.isSimplifiedMode ? this.simplifiedModeState : this.fullModeState;
            currentState.rotation = 0;
            currentState.selectedWedges = new Set();
            currentState.hasBeenInitialized = true;
        }
    };
