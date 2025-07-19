// Main Application Logic - Minimal UI
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
        
        // Setup keyboard shortcut (F11 alternative)
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

    // ===== INFORMATION PANEL FUNCTIONALITY =====

    setupInformationPanel() {
        // Initialize emotion tiles tracking
        this.emotionTiles = new Map(); // Maps wedgeId -> tile element
        this.tileOrder = []; // Track order of tiles (newest first)

        // Setup panel minimization
        const minimizeTab = document.getElementById('panel-minimize-tab');
        minimizeTab.addEventListener('click', () => {
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
            this.wheelGenerator.setSimplifiedMode(event.target.checked);
            // Update all existing tiles when mode changes
            this.refreshAllTileDefinitions();
        });

        // Setup reset button
        const resetButton = document.getElementById('reset-btn-panel');
        resetButton.addEventListener('click', () => {
            this.wheelGenerator.reset();
            this.clearAllTiles();
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
        
        // Fetch and display definition
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
        
        // Get emotion color from wheel
        const emotionColor = this.getEmotionColor(wedgeId);
        tile.style.setProperty('--emotion-color', emotionColor);
        
        // Get emotion family and family color
        const family = this.getEmotionFamily(emotion, level);
        const familyColor = this.getFamilyColor(family);
        tile.style.setProperty('--family-color', familyColor);
        
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

    async fetchEmotionDefinition(wedgeId, emotion, level) {
        const tile = this.emotionTiles.get(wedgeId);
        if (!tile) return;
        
        const definitionElement = tile.querySelector('.tile-definition');
        
        try {
            // Check if simplified mode is active
            const isSimplified = document.getElementById('simplified-mode-panel').checked;
            
            // Fetch definition from dictionary API
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${emotion.toLowerCase()}`);
            
            if (response.ok) {
                const data = await response.json();
                const definition = this.extractDefinition(data, isSimplified);
                
                // Update tile with definition
                definitionElement.classList.remove('loading');
                definitionElement.textContent = definition;
            } else {
                // Fallback to basic description
                const fallbackDefinition = this.getFallbackDefinition(emotion, level, isSimplified);
                definitionElement.classList.remove('loading');
                definitionElement.textContent = fallbackDefinition;
            }
        } catch (error) {
            console.error('Error fetching definition:', error);
            
            // Fallback to basic description
            const isSimplified = document.getElementById('simplified-mode-panel').checked;
            const fallbackDefinition = this.getFallbackDefinition(emotion, level, isSimplified);
            definitionElement.classList.remove('loading');
            definitionElement.textContent = fallbackDefinition;
        }
    }

    extractDefinition(apiData, isSimplified) {
        if (!apiData || !apiData[0] || !apiData[0].meanings) {
            return 'Definition not available.';
        }
        
        // Get the first definition from the first meaning
        const firstMeaning = apiData[0].meanings[0];
        const firstDefinition = firstMeaning.definitions[0];
        
        let definition = firstDefinition.definition;
        
        // For simplified mode, try to simplify the language
        if (isSimplified) {
            definition = this.simplifyDefinition(definition);
        }
        
        return definition;
    }

    simplifyDefinition(definition) {
        // Basic simplification - replace complex words with simpler ones
        const simplifications = {
            'characterized by': 'having',
            'involving': 'having',
            'pertaining to': 'about',
            'experiencing': 'feeling',
            'manifestation': 'sign',
            'indicating': 'showing',
            'subsequently': 'then',
            'consequently': 'so',
            'nevertheless': 'but',
            'furthermore': 'also',
            'additionally': 'also'
        };
        
        let simplified = definition;
        for (const [complex, simple] of Object.entries(simplifications)) {
            simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
        }
        
        return simplified;
    }

    getFallbackDefinition(emotion, level, isSimplified) {
        // Enhanced fallback definitions
        const definitions = {
            // Core emotions
            'Happy': {
                standard: 'A positive emotional state characterized by feelings of joy, satisfaction, contentment, and fulfillment.',
                simplified: 'Feeling good, joyful, and pleased with things.'
            },
            'Sad': {
                standard: 'An emotional state characterized by feelings of disappointment, grief, hopelessness, disinterest, and dampened mood.',
                simplified: 'Feeling unhappy, upset, or down about something.'
            },
            'Angry': {
                standard: 'A strong feeling of annoyance, displeasure, or hostility arising from perceived provocation, hurt, or threat.',
                simplified: 'Feeling mad or upset when something bothers you.'
            },
            'Fearful': {
                standard: 'An emotion induced by a perceived threat, causing a desire to escape, hide, or freeze.',
                simplified: 'Feeling scared or worried that something bad might happen.'
            },
            'Surprised': {
                standard: 'A sudden feeling of wonder or astonishment caused by something unexpected.',
                simplified: 'Feeling shocked or amazed by something you didn\'t expect.'
            },
            'Disgusted': {
                standard: 'A feeling of revulsion or strong disapproval aroused by something unpleasant or offensive.',
                simplified: 'Feeling sick or yucky about something gross.'
            },
            'Bad': {
                standard: 'A general negative emotional state encompassing discomfort, dissatisfaction, or distress.',
                simplified: 'Feeling not good or uncomfortable.'
            }
        };
        
        const emotionDef = definitions[emotion];
        if (emotionDef) {
            return isSimplified ? emotionDef.simplified : emotionDef.standard;
        }
        
        // Generic fallback
        if (isSimplified) {
            return `${emotion} is a feeling that people have. It's one way our emotions work.`;
        } else {
            return `${emotion} is a ${level}-level emotion that represents a specific aspect of human emotional experience.`;
        }
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

    refreshAllTileDefinitions() {
        // Re-fetch definitions for all tiles when mode changes
        this.emotionTiles.forEach((tile, wedgeId) => {
            const emotionName = tile.querySelector('.tile-emotion-name').textContent;
            const level = tile.querySelector('.tile-level').textContent;
            
            // Reset to loading state
            const definitionElement = tile.querySelector('.tile-definition');
            definitionElement.classList.add('loading');
            definitionElement.textContent = 'Loading definition...';
            
            // Re-fetch definition
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
        // Try to get color from the wheel SVG element
        const wedgeElement = document.querySelector(`[data-wedge-id="${wedgeId}"]`);
        if (wedgeElement) {
            const fill = wedgeElement.getAttribute('fill');
            if (fill && fill !== 'none') {
                return fill;
            }
        }
        
        // Fallback colors based on level
        const [level] = wedgeId.split('-');
        const colorMap = {
            'core': '#4a90e2',
            'secondary': '#7bb3f2',
            'tertiary': '#a8d0f7'
        };
        
        return colorMap[level] || '#4a90e2';
    }

    togglePanelMinimization() {
        const panel = document.querySelector('.info-panel');
        const arrow = document.querySelector('.minimize-arrow');
        
        panel.classList.toggle('minimized');
        
        // Update arrow direction - CSS handles rotation automatically
        if (panel.classList.contains('minimized')) {
            arrow.textContent = '▶'; // Right arrow when minimized
        } else {
            arrow.textContent = '◀'; // Left arrow when expanded
        }
    }

    getEmotionFamily(emotion, level) {
        // Find which core emotion family this belongs to
        if (level === 'core') {
            return emotion; // Core emotions are their own family
        }
        
        // For secondary emotions, find the core parent
        for (const coreEmotion of FEELINGS_DATA.core) {
            if (FEELINGS_DATA.secondary[coreEmotion.name]?.includes(emotion)) {
                return coreEmotion.name;
            }
        }
        
        // For tertiary emotions, find through secondary
        for (const coreEmotion of FEELINGS_DATA.core) {
            const secondaryEmotions = FEELINGS_DATA.secondary[coreEmotion.name] || [];
            for (const secondaryEmotion of secondaryEmotions) {
                if (FEELINGS_DATA.tertiary[secondaryEmotion]?.includes(emotion)) {
                    return coreEmotion.name;
                }
            }
        }
        
        return 'Unknown';
    }

    getFamilyColor(family) {
        // Get actual colors from wheel data to match exactly
        const coreEmotion = FEELINGS_DATA.core.find(emotion => emotion.name === family);
        if (coreEmotion) {
            return coreEmotion.color;
        }
        
        // Fallback colors for unknown
        return '#95a5a6';
    }
}

// Initialize the app
const app = new FeelingsWheelApp(); 