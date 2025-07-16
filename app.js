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
        });

        // Setup fullscreen functionality
        this.setupFullscreenFeature();

        // Setup simplified mode toggle
        const simplifiedModeToggle = document.getElementById('simplified-mode');
        simplifiedModeToggle.addEventListener('change', (event) => {
            this.wheelGenerator.setSimplifiedMode(event.target.checked);
        });

        // Listen for emotion selection events
        document.addEventListener('emotionSelected', (event) => {
            // Currently no side panel, so we don't need to do anything
            // Just let the visual selection happen
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
                this.updateFullscreenButton();
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
}

// Initialize the app
const app = new FeelingsWheelApp(); 