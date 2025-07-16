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
}

// Initialize the app
const app = new FeelingsWheelApp(); 