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

        // Setup reset button
        const resetButton = document.getElementById('reset-btn');
        resetButton.addEventListener('click', () => {
            this.wheelGenerator.reset();
            this.updateSelectionCount(); // Update panel when reset
        });

        // Setup fullscreen functionality
        this.setupFullscreenFeature();

        // Setup simplified mode toggle
        const simplifiedModeToggle = document.getElementById('simplified-mode');
        simplifiedModeToggle.addEventListener('change', (event) => {
            this.wheelGenerator.setSimplifiedMode(event.target.checked);
        });

        // Setup information panel
        this.setupInformationPanel();

        // Listen for emotion selection events
        document.addEventListener('emotionSelected', (event) => {
            this.handleEmotionSelection(event.detail);
        });
    }

    setupFullscreenFeature() {
        // Get fullscreen button
        const fullscreenButton = document.getElementById('fullscreen-btn');
        const fullscreenText = fullscreenButton.querySelector('.fullscreen-text');
        const fullscreenIcon = fullscreenButton.querySelector('.fullscreen-icon');
        
        // Check if fullscreen is supported
        if (!this.isFullscreenSupported()) {
            fullscreenButton.style.display = 'none';
            return;
        }
        
        // Setup click handler
        fullscreenButton.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
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
        const fullscreenButton = document.getElementById('fullscreen-btn');
        const fullscreenText = fullscreenButton.querySelector('.fullscreen-text');
        const fullscreenIcon = fullscreenButton.querySelector('.fullscreen-icon');
        
        if (this.isCurrentlyFullscreen()) {
            fullscreenButton.classList.add('active');
            fullscreenText.textContent = 'Exit';
            fullscreenIcon.textContent = '⛶'; // Could use different icon for exit
            fullscreenButton.title = 'Exit fullscreen (ESC)';
        } else {
            fullscreenButton.classList.remove('active');
            fullscreenText.textContent = 'Fullscreen';
            fullscreenIcon.textContent = '⛶';
            fullscreenButton.title = 'Enter fullscreen (F11)';
        }
    }
    
    handleFullscreenChange() {
        // Update button state immediately
        this.updateFullscreenButton();
        
        // Use requestAnimationFrame to ensure positioning happens after browser layout update
        if (this.wheelGenerator && this.wheelGenerator.repositionControlsUnified) {
            requestAnimationFrame(() => {
                this.wheelGenerator.repositionControlsUnified();
            });
        }
    }

    // ===== INFORMATION PANEL FUNCTIONALITY =====

    setupInformationPanel() {
        // Setup panel toggle button
        const panelToggle = document.getElementById('panel-toggle');
        panelToggle.addEventListener('click', () => {
            this.togglePanel();
        });

        // Initialize selection count
        this.updateSelectionCount();

        // Show welcome state initially
        this.showWelcomeState();
    }

    handleEmotionSelection(detail) {
        const { emotion, level, selected } = detail;
        
        // Update selection count
        this.updateSelectionCount();

        // Get current selections from wheel generator
        const selections = this.wheelGenerator.selectedWedges;
        
        if (selections.size === 0) {
            // No selections - show welcome state
            this.showWelcomeState();
        } else if (selections.size === 1) {
            // Single selection - show details for that emotion
            const [wedgeId] = selections;
            const [emotionLevel, emotionName] = wedgeId.split('-', 2);
            this.showEmotionDetails(emotionName, emotionLevel);
        } else {
            // Multiple selections - show summary
            this.showMultipleSelectionsState(selections);
        }
    }

    updateSelectionCount() {
        const countElement = document.getElementById('selection-count');
        const count = this.wheelGenerator ? this.wheelGenerator.selectedWedges.size : 0;
        countElement.textContent = count;
    }

    showWelcomeState() {
        const welcomeSection = document.getElementById('panel-welcome');
        const emotionSection = document.getElementById('panel-emotion-info');
        
        welcomeSection.style.display = 'block';
        emotionSection.style.display = 'none';
    }

    showEmotionDetails(emotion, level) {
        const welcomeSection = document.getElementById('panel-welcome');
        const emotionSection = document.getElementById('panel-emotion-info');
        
        // Update emotion details
        document.getElementById('emotion-title').textContent = emotion;
        document.getElementById('emotion-level').textContent = level.charAt(0).toUpperCase() + level.slice(1);
        
        // Get emotion family (parent core emotion)
        const family = this.getEmotionFamily(emotion, level);
        document.getElementById('emotion-family').textContent = family;
        
        // Get emotion description
        const description = this.getEmotionDescription(emotion, level);
        document.getElementById('emotion-description').textContent = description;
        
        // Show emotion section
        welcomeSection.style.display = 'none';
        emotionSection.style.display = 'block';
    }

    showMultipleSelectionsState(selections) {
        const welcomeSection = document.getElementById('panel-welcome');
        const emotionSection = document.getElementById('panel-emotion-info');
        
        // Update for multiple selections
        document.getElementById('emotion-title').textContent = 'Multiple Emotions Selected';
        document.getElementById('emotion-level').textContent = 'Mixed';
        document.getElementById('emotion-family').textContent = 'Various';
        
        const emotionList = Array.from(selections).map(wedgeId => {
            const [level, emotion] = wedgeId.split('-', 2);
            return emotion;
        }).join(', ');
        
        document.getElementById('emotion-description').textContent = 
            `You have selected ${selections.size} emotions: ${emotionList}. This combination might reflect a complex emotional state.`;
        
        // Show emotion section
        welcomeSection.style.display = 'none';
        emotionSection.style.display = 'block';
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

    getEmotionDescription(emotion, level) {
        // Basic descriptions for now - will be enhanced with real dictionary definitions later
        const descriptions = {
            // Core emotions
            'Happy': 'A positive emotional state characterized by feelings of joy, satisfaction, contentment, and fulfillment.',
            'Sad': 'An emotional state characterized by feelings of disappointment, grief, hopelessness, disinterest, and dampened mood.',
            'Angry': 'A strong feeling of annoyance, displeasure, or hostility arising from perceived provocation, hurt, or threat.',
            'Fearful': 'An emotion induced by a perceived threat, causing a desire to escape, hide, or freeze.',
            'Surprised': 'A sudden feeling of wonder or astonishment caused by something unexpected.',
            'Disgusted': 'A feeling of revulsion or strong disapproval aroused by something unpleasant or offensive.',
            'Bad': 'A general negative emotional state encompassing discomfort, dissatisfaction, or distress.',
            
            // Common secondary emotions
            'Frustrated': 'Feeling upset or annoyed as a result of being unable to change or achieve something.',
            'Excited': 'Feeling very enthusiastic and eager about something.',
            'Nervous': 'Feeling easily agitated, anxious, or apprehensive.',
            'Content': 'Feeling satisfied and at peace with one\'s situation.',
            'Lonely': 'Feeling sad because one has no friends or company.',
            'Proud': 'Feeling deep satisfaction derived from one\'s own achievements.',
        };
        
        return descriptions[emotion] || `${emotion} is a ${level}-level emotion that represents a specific aspect of human emotional experience. Understanding this emotion can help with emotional awareness and regulation.`;
    }

    togglePanel() {
        const panel = document.querySelector('.info-panel');
        const toggleIcon = document.querySelector('.panel-toggle-icon');
        
        panel.classList.toggle('collapsed');
        
        // Update toggle icon direction
        if (panel.classList.contains('collapsed')) {
            toggleIcon.textContent = '▶'; // Right arrow when collapsed
        } else {
            toggleIcon.textContent = '◀'; // Left arrow when expanded
        }
    }
}

// Initialize the app
const app = new FeelingsWheelApp(); 