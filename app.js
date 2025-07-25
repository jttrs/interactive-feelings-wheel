// Main Application Controller - Coordinates between wheel engine and panel UI
// Architecture: feelings-wheel-engine.js handles wheel rendering/interaction, app.js handles panel/coordination
class FeelingsWheelApp {
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
            'MSFullscreenChange'
        ];
        
        fullscreenEvents.forEach(eventName => {
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
        // Use wheel generator's rotation functionality
        if (this.wheelGenerator) {
            const targetRotation = this.wheelGenerator.currentRotation + degrees;
            this.wheelGenerator.animateRotation(targetRotation, 200); // Quick 200ms animation
        }
    }

    // ===== INFORMATION PANEL FUNCTIONALITY =====

    setupInformationPanel() {
        // Initialize emotion tiles tracking
        this.emotionTiles = new Map(); // Maps wedgeId -> tile element
        this.tileOrder = []; // Track order of tiles (newest first)

        // Setup panel minimization (desktop)
        const minimizeTab = document.getElementById('panel-minimize-tab');
        minimizeTab.addEventListener('click', () => {
            this.togglePanelMinimization();
        });

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
    }

    handleEmotionSelection(detail) {
        const { emotion, level, selected, wedgeId } = detail;
        
        if (selected) {
            // Add new emotion tile
            this.addEmotionTile(wedgeId, emotion, level);
        } else {
            // Remove emotion tile
            this.removeEmotionTile(wedgeId);
        }
        
        // Update instructions visibility
        this.updateInstructionsVisibility();
    }

    addEmotionTile(wedgeId, emotion, level) {
        // Remove if already exists (shouldn't happen, but safety check)
        if (this.emotionTiles.has(wedgeId)) {
            this.removeEmotionTile(wedgeId);
        }

        // Collapse all existing tiles
        this.collapseAllTiles();

        // Create new tile element
        const tile = this.createEmotionTile(wedgeId, emotion, level);
        
        // Add to tracking
        this.emotionTiles.set(wedgeId, tile);
        this.tileOrder.unshift(wedgeId); // Add to beginning (newest first)
        
        // Add to DOM
        const tilesContainer = document.getElementById('emotion-tiles');
        tilesContainer.insertBefore(tile, tilesContainer.firstChild);
        
        // Load and display emotion-specific definition
        this.fetchEmotionDefinition(wedgeId, emotion, level);
    }

    removeEmotionTile(wedgeId) {
        const tile = this.emotionTiles.get(wedgeId);
        if (tile) {
            tile.remove();
            this.emotionTiles.delete(wedgeId);
            this.tileOrder = this.tileOrder.filter(id => id !== wedgeId);
        }
        
        // If we have remaining tiles, expand the most recent one
        if (this.tileOrder.length > 0) {
            const mostRecentId = this.tileOrder[0];
            const mostRecentTile = this.emotionTiles.get(mostRecentId);
            if (mostRecentTile) {
                mostRecentTile.classList.remove('collapsed');
                mostRecentTile.classList.add('expanded');
            }
        }
    }

    createEmotionTile(wedgeId, emotion, level) {
        const tile = document.createElement('div');
        tile.className = 'emotion-tile expanded';
        tile.setAttribute('data-wedge-id', wedgeId);
        
        // Get emotion color from centralized family-aware system
        const emotionColor = this.getEmotionColor(wedgeId);
        tile.style.setProperty('--emotion-color', emotionColor);
        
        // REMOVED: Old duplicate color system that caused conflicts
        
        tile.innerHTML = `
             <div class="tile-header">
                 <div>
                     <h4 class="tile-emotion-name">${emotion}</h4>
                 </div>
                 <button class="tile-remove" title="Remove ${emotion}">×</button>
             </div>
             <div class="tile-content">
                 <div class="tile-definition loading">Loading definition...</div>
             </div>
         `;
        
        // Setup remove button
        const removeBtn = tile.querySelector('.tile-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Deselect the emotion in the wheel
            this.wheelGenerator.toggleWedgeSelection(wedgeId);
        });
        
        // Setup tile click to expand collapsed tiles
        tile.addEventListener('click', () => {
            if (tile.classList.contains('collapsed')) {
                this.expandTile(wedgeId);
            }
        });
        
        return tile;
    }

    fetchEmotionDefinition(wedgeId, emotion, level) {
        const tile = this.emotionTiles.get(wedgeId);
        if (!tile) return;
        
        const definitionElement = tile.querySelector('.tile-definition');
        
        // Check if simplified mode is active
        const isSimplified = document.getElementById('simplified-mode-panel').checked;
        
        // Get emotion-specific definition from our comprehensive data
        const definition = this.getEmotionDefinition(emotion, isSimplified);
        
        // Update tile with definition
        definitionElement.classList.remove('loading');
        definitionElement.textContent = definition;
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

    collapseAllTiles() {
        this.emotionTiles.forEach(tile => {
            tile.classList.remove('expanded');
            tile.classList.add('collapsed');
        });
    }

    expandTile(wedgeId) {
        // Collapse all tiles first
        this.collapseAllTiles();
        
        // Expand the selected tile
        const tile = this.emotionTiles.get(wedgeId);
        if (tile) {
            tile.classList.remove('collapsed');
            tile.classList.add('expanded');
        }
        
        // Update tile order (move to front)
        this.tileOrder = this.tileOrder.filter(id => id !== wedgeId);
        this.tileOrder.unshift(wedgeId);
    }

    clearAllTiles() {
        this.emotionTiles.forEach(tile => tile.remove());
        this.emotionTiles.clear();
        this.tileOrder = [];
        this.showInstructions();
    }

    clearAllTilesWithoutInstructions() {
        // Clear tiles without automatically showing instructions (for mode switching)
        this.emotionTiles.forEach(tile => tile.remove());
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

        // RESTORED: Full reset animation with tile unwinding + wheel rotation
        this.animateUnwindTiles();
    }

    animateUnwindTiles() {
        // Get tiles in current order (newest first - this is correct)
        const tileArray = Array.from(this.emotionTiles.values());
        if (tileArray.length === 0) {
            // No tiles to animate, but still animate wheel rotation
            this.clearWheelSelectionsOnly(); // Clear selections without snapping rotation
            this.animateUnwindRotation(); // Animate wheel back to 0°
            return;
        }

        // FIXED: Prevent horizontal scrollbar during animation
        const tilesContainer = document.getElementById('emotion-tiles');
        tilesContainer.style.overflowX = 'hidden';

        // FIXED: Always 1s total duration regardless of tile count
        const totalDuration = 1000; // Always 1 second
        const tileAnimationDuration = Math.max(150, totalDuration * 0.6 / tileArray.length); // 60% of time for individual tiles
        const staggerDelay = Math.max(50, (totalDuration * 0.4) / tileArray.length); // 40% of time for stagger

        // FIXED: Start wheel animation concurrently (not sequentially)
        // Clear selections but DON'T reset rotation yet (let animation handle it)
        this.clearWheelSelectionsOnly();
        this.animateUnwindRotation(); // Start wheel animation NOW

        let currentTileIndex = 0;
        
        const animateTileOut = () => {
            if (currentTileIndex >= tileArray.length) {
                // All tiles animated out - clean up and restore container
                this.clearAllTiles();
                tilesContainer.style.overflowX = ''; // Restore normal overflow
                return;
            }

            const tile = tileArray[currentTileIndex];
            const wedgeId = tile.getAttribute('data-wedge-id');
            
            // Deselect in wheel (visual cleanup)
            if (this.wheelGenerator.selectedWedges.has(wedgeId)) {
                this.wheelGenerator.selectedWedges.delete(wedgeId);
                const wedge = document.querySelector(`[data-wedge-id="${wedgeId}"]`);
                if (wedge) {
                    wedge.classList.remove('selected');
                    wedge.style.filter = '';
                    this.wheelGenerator.removeShadowCopy(wedgeId);
                    this.wheelGenerator.baseGroup.appendChild(wedge);
                }
            }
            
            // Animate tile out with scale and fade (prevent scrollbar)
            tile.style.transition = `all ${tileAnimationDuration}ms cubic-bezier(0.4, 0, 1, 1)`;
            tile.style.transform = 'translateX(100%) scale(0.8)';
            tile.style.opacity = '0';
            
            // Remove tile after animation
            setTimeout(() => {
                if (tile.parentNode) {
                    tile.remove();
                }
                this.emotionTiles.delete(wedgeId);
            }, tileAnimationDuration);
            
            // Continue to next tile with dynamic stagger timing
            currentTileIndex++;
            setTimeout(animateTileOut, staggerDelay);
        };

        // Start the tile animation sequence
        animateTileOut();
    }

    animateUnwindRotation() {
        const startRotation = this.wheelGenerator.currentRotation;
        const targetRotation = 0;
        
        // FIXED: Use shortest rotation path calculation from wheel engine
        const rotationDelta = this.wheelGenerator.getShortestRotationPath(startRotation, targetRotation);
        
        // If no rotation needed, just complete reset after tile animation time
        if (Math.abs(rotationDelta) < 1) {
            setTimeout(() => {
                this.completeReset();
            }, 1000); // Wait for full 1s tile animation
            return;
        }

        // FIXED: 1 second rotation to match tile animation duration
        const duration = 1000; // Same as tile animation
        const startTime = performance.now();

        const animateFrame = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out cubic for natural deceleration (matches original feel)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentRotation = startRotation + (rotationDelta * easeOut);
            this.wheelGenerator.currentRotation = currentRotation;
            this.wheelGenerator.updateRotation();

            if (progress < 1) {
                requestAnimationFrame(animateFrame);
            } else {
                // Animation complete - ensure exact final position
                this.wheelGenerator.currentRotation = targetRotation;
                this.wheelGenerator.updateRotation();
                this.completeReset();
            }
        };

        requestAnimationFrame(animateFrame);
    }

    clearWheelSelectionsOnly() {
        // Clear visual selections without affecting rotation
        const selectedWedgeIds = [...this.wheelGenerator.selectedWedges];
        selectedWedgeIds.forEach(wedgeId => {
            this.wheelGenerator.selectedWedges.delete(wedgeId);
            const wedge = document.querySelector(`[data-wedge-id="${wedgeId}"]`);
            if (wedge) {
                wedge.classList.remove('selected');
                wedge.style.filter = '';
                this.wheelGenerator.removeShadowCopy(wedgeId);
                this.wheelGenerator.baseGroup.appendChild(wedge);
            }
        });
        
        // Clear shadow copies
        this.wheelGenerator.shadowGroup.innerHTML = '';
    }

    completeReset() {
        // Ensure final state is clean
        this.wheelGenerator.currentRotation = 0;
        this.wheelGenerator.updateRotation();
        
        // Update stored state for current mode
        const currentState = this.wheelGenerator.isSimplifiedMode ? 
            this.wheelGenerator.simplifiedModeState : this.wheelGenerator.fullModeState;
        currentState.rotation = 0;
        currentState.selectedWedges = new Set();
        currentState.hasBeenInitialized = true;

        // Re-enable interactions
        this.wheelGenerator.isAnimating = false;
        this.isResetting = false;
    }

    refreshAllTileDefinitions() {
        // Re-fetch definitions for all tiles when mode changes
        this.emotionTiles.forEach((tile, wedgeId) => {
            const emotionName = tile.querySelector('.tile-emotion-name').textContent;
            const level = this.extractLevelFromWedgeId(wedgeId);
            
            // Reset to loading state
            const definitionElement = tile.querySelector('.tile-definition');
            definitionElement.classList.add('loading');
            definitionElement.textContent = 'Loading definition...';
            
            // Reload definition for new mode
            this.fetchEmotionDefinition(wedgeId, emotionName, level);
        });
    }

    showInstructions() {
        const instructionsSection = document.getElementById('panel-instructions');
        instructionsSection.style.display = 'block';
    }

    updateInstructionsVisibility() {
        const instructionsSection = document.getElementById('panel-instructions');
        
        if (this.emotionTiles.size === 0) {
            instructionsSection.style.display = 'block';
        } else {
            instructionsSection.style.display = 'none';
        }
    }

    getEmotionColor(wedgeId) {
        // Get the core family color for tile accents (no lightening)
        return FEELINGS_DATA.getCoreEmotionColor(wedgeId);
    }

    togglePanelMinimization() {
        const panel = document.querySelector('.info-panel');
        const mainLayout = document.querySelector('.main-layout');
        const arrow = document.querySelector('.minimize-arrow');
        
        panel.classList.toggle('minimized');
        mainLayout.classList.toggle('panel-minimized'); // For wheel centering
        
        // Update arrow direction - CSS handles rotation automatically
        if (panel.classList.contains('minimized')) {
            arrow.textContent = '▶'; // Right arrow when minimized
        } else {
            arrow.textContent = '◀'; // Left arrow when expanded
        }
    }

    // REMOVED: getEmotionFamily() and getFamilyColor() methods
    // These were part of the old duplicate color system that caused conflicts
    // All color resolution now uses centralized family-aware system in feelings-data.js

    // ===== PROPER STATE SYNCHRONIZATION =====
    
    recreateTilesFromWheelState() {
        // Recreate tiles based on wheel engine's current selectedWedges state
        this.wheelGenerator.selectedWedges.forEach(wedgeId => {
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
            instructionsSection.style.display = 'none';
        }
    }
    
    extractLevelFromWedgeId(wedgeId) {
        // Extract level from wedge ID format: "level-family-emotion" 
        return wedgeId.split('-')[0];
    }
}

// Initialize the app
const app = new FeelingsWheelApp(); 