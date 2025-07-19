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
            console.warn('Fullscreen operation failed:', error);
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
            this.handleSimplifiedModeToggle(event.target.checked);
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
        
        // This should not happen since we have comprehensive definitions
        console.warn(`No definition found for emotion: ${emotion}`);
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

    // ===== ANIMATED RESET FUNCTIONALITY =====

    resetWithAnimation() {
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

        // Start coordinated animations
        this.animateUnwindTiles();
        this.animateUnwindRotation();
    }

    animateUnwindTiles() {
        // Get tiles in reverse chronological order (newest first, as they appear in panel)
        const tilesToRemove = [...this.tileOrder]; // Copy the array
        
        if (tilesToRemove.length === 0) return;

        // Stagger removal: 120ms between each tile for elegant cascade
        tilesToRemove.forEach((wedgeId, index) => {
            setTimeout(() => {
                // Deselect the wedge first (creates de-emphasis effect)
                this.wheelGenerator.toggleWedgeSelection(wedgeId);
                
                // Remove tile with a subtle fade out
                const tile = this.emotionTiles.get(wedgeId);
                if (tile) {
                    tile.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
                    tile.style.opacity = '0';
                    tile.style.transform = 'translateX(20px)';
                    
                    // Actually remove after fade
                    setTimeout(() => {
                        this.removeEmotionTile(wedgeId);
                    }, 200);
                }
            }, index * 120); // 120ms stagger between each tile
        });

        // Clear tracking arrays after all tiles are processed
        const totalTileTime = tilesToRemove.length * 120 + 200; // Last tile + fade time
        setTimeout(() => {
            this.emotionTiles.clear();
            this.tileOrder = [];
            this.showInstructions();
        }, totalTileTime);
    }

    animateUnwindRotation() {
        const startRotation = this.wheelGenerator.currentRotation;
        const targetRotation = 0;
        const rotationDelta = targetRotation - startRotation;
        
        // If no rotation needed, skip rotation animation
        if (Math.abs(rotationDelta) < 1) {
            setTimeout(() => {
                this.completeReset();
            }, 1400); // Wait for tile animations to complete
            return;
        }

        // 1.4 second smooth rotation with ease-out
        const duration = 1400;
        const startTime = performance.now();

        const animateFrame = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out cubic for natural deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentRotation = startRotation + (rotationDelta * easeOut);
            this.wheelGenerator.currentRotation = currentRotation;
            this.wheelGenerator.updateRotation();

            if (progress < 1) {
                requestAnimationFrame(animateFrame);
            } else {
                // Animation complete
                this.completeReset();
            }
        };

        requestAnimationFrame(animateFrame);
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
        console.log(`🎯 App getEmotionColor("${wedgeId}") - delegating to centralized system`);
        
        // CRITICAL DEBUG: Check if wedge exists in current wheel mode
        const wedge = document.querySelector(`[data-wedge-id="${wedgeId}"]`);
        if (!wedge) {
            console.warn(`⚠️ No wedge found with ID "${wedgeId}" in current wheel - wedge may not exist in this mode`);
        } else {
            console.log(`✅ Wedge found with ID "${wedgeId}" - fill: "${wedge.getAttribute('fill')}"`);
        }
        
        const color = FEELINGS_DATA.getEmotionColor(wedgeId);
        
        // Additional debug for color resolution
        if (!color || color === '#ffffff' || color === 'white') {
            console.error(`❌ getEmotionColor returned white/invalid color "${color}" for "${wedgeId}"`);
        } else {
            console.log(`✅ Color resolved successfully: "${color}"`);
        }
        
        return color;
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

    // ===== COMPREHENSIVE SIMPLIFIED MODE MANAGEMENT =====
    
    handleSimplifiedModeToggle(isSimplified) {
        console.log(`🔄 Simplified mode toggle: ${isSimplified ? 'ON' : 'OFF'}`);
        
        if (isSimplified) {
            // Switching TO simplified mode
            this.saveFullModeState();
            this.switchToSimplifiedMode();
        } else {
            // Switching FROM simplified mode
            this.saveSimplifiedModeState();
            this.restoreFullModeState();
        }
        
        // Update wheel mode
        this.wheelGenerator.setSimplifiedMode(isSimplified);
        
        // Refresh colors for remaining tiles (they might have new wedge IDs)
        this.refreshTileColors();
    }
    
    saveFullModeState() {
        // Save current full mode tile state
        this.fullModeState = {
            tiles: new Map(this.emotionTiles),
            order: [...this.tileOrder]
        };
        console.log(`💾 Saved full mode state: ${this.fullModeState.order.length} tiles`);
    }
    
    saveSimplifiedModeState() {
        // Save current simplified mode tile state  
        this.simplifiedModeState = {
            tiles: new Map(this.emotionTiles),
            order: [...this.tileOrder]
        };
        console.log(`💾 Saved simplified mode state: ${this.simplifiedModeState.order.length} tiles`);
    }
    
    switchToSimplifiedMode() {
        console.log(`🔽 Switching to simplified mode...`);
        
        // Hide tertiary emotion tiles (don't delete them)
        const tilesToHide = [];
        this.emotionTiles.forEach((tile, wedgeId) => {
            if (wedgeId.startsWith('tertiary-')) {
                tilesToHide.push({ wedgeId, tile });
            }
        });
        
        // Remove tertiary tiles from display and tracking
        tilesToHide.forEach(({ wedgeId, tile }) => {
            tile.style.display = 'none'; // Hide but don't destroy
            tile.remove(); // Remove from DOM
            this.emotionTiles.delete(wedgeId);
            this.tileOrder = this.tileOrder.filter(id => id !== wedgeId);
        });
        
        console.log(`🔽 Hidden ${tilesToHide.length} tertiary tiles`);
        
        // Update instructions visibility
        this.updateInstructionsVisibility();
        
        // Refresh definitions for remaining tiles
        this.refreshAllTileDefinitions();
    }
    
    restoreFullModeState() {
        console.log(`🔼 Restoring full mode state...`);
        
        if (!this.fullModeState) {
            console.log(`⚠️ No full mode state to restore`);
            return;
        }
        
        // Clear current tiles
        this.clearAllTiles();
        
        // Restore tiles in original order
        const tilesContainer = document.getElementById('emotion-tiles');
        
        // Restore in reverse order since we insert at beginning
        const reversedOrder = [...this.fullModeState.order].reverse();
        
        reversedOrder.forEach((wedgeId, index) => {
            const originalTile = this.fullModeState.tiles.get(wedgeId);
            if (originalTile) {
                // Clone the tile to restore it
                const restoredTile = this.recreateTileFromState(wedgeId, originalTile);
                
                // Add to tracking
                this.emotionTiles.set(wedgeId, restoredTile);
                
                // Add to DOM at beginning
                tilesContainer.insertBefore(restoredTile, tilesContainer.firstChild);
                
                // Load definition
                const emotion = restoredTile.querySelector('.tile-emotion-name').textContent;
                const level = this.extractLevelFromWedgeId(wedgeId);
                this.fetchEmotionDefinition(wedgeId, emotion, level);
            }
        });
        
        // Restore original order
        this.tileOrder = [...this.fullModeState.order];
        
        console.log(`🔼 Restored ${this.tileOrder.length} tiles in original order`);
        
        // Collapse all but most recent
        this.collapseAllTiles();
        if (this.tileOrder.length > 0) {
            const mostRecentId = this.tileOrder[0];
            this.expandTile(mostRecentId);
        }
        
        // Update instructions visibility
        this.updateInstructionsVisibility();
    }
    
    recreateTileFromState(wedgeId, originalTile) {
        // Extract emotion info from original tile
        const emotion = originalTile.querySelector('.tile-emotion-name').textContent;
        const level = this.extractLevelFromWedgeId(wedgeId);
        
        // Create new tile with current color system (handles potential ID changes)
        const newTile = this.createEmotionTile(wedgeId, emotion, level);
        
        // Restore collapsed state if needed
        const wasCollapsed = originalTile.classList.contains('collapsed');
        if (wasCollapsed) {
            newTile.classList.remove('expanded');
            newTile.classList.add('collapsed');
        }
        
        return newTile;
    }
    
    extractLevelFromWedgeId(wedgeId) {
        // Extract level from wedge ID format: "level-family-emotion"
        return wedgeId.split('-')[0];
    }
    
    refreshTileColors() {
        // Refresh colors for all current tiles (handles wedge ID changes after mode switch)
        this.emotionTiles.forEach((tile, wedgeId) => {
            console.log(`🎨 Refreshing color for tile: "${wedgeId}"`);
            
            // Get updated color using current centralized system
            const emotionColor = this.getEmotionColor(wedgeId);
            tile.style.setProperty('--emotion-color', emotionColor);
            
            console.log(`✅ Updated tile color to: "${emotionColor}"`);
        });
    }
}

// Initialize the app
const app = new FeelingsWheelApp(); 