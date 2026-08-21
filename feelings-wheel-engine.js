// Feelings Wheel Engine - Core wheel UI system: rendering, interaction, animation, and state management
import { AnimationMixin } from './src/wheel/animation.js';
import { RenderingMixin } from './src/wheel/rendering.js';
import { InteractionMixin } from './src/wheel/interaction.js';

// Compose the mixins over an empty base; every method lands on one prototype chain
// so shared `this` state behaves exactly as the original monolithic class.
export class FeelingsWheelGenerator extends InteractionMixin(RenderingMixin(AnimationMixin(class {}))) {
    constructor(container, data) {
        super();
        this.container = container;
        this.data = data;
        this.centerX = 300;
        this.centerY = 300;
        this.isSimplifiedMode = false;
        this.selectedWedges = new Set();

        // Structured wedge identity: maps a wedgeId string to its metadata
        // { level, emotion, parent, family }. Populated by createUniqueWedgeId at
        // generation time so wedge meaning is resolved by lookup, not by re-parsing
        // the id string (which is fragile for emotions containing separators).
        this.wedgeRegistry = new Map();

        // Rotation state
        this.currentRotation = 0;
        this.isDragging = false;
        this.lastMouseAngle = 0;
        this.svg = null;
        this.wheelGroup = null;
        this.textElements = [];

        // Animation system
        this.animations = new Map();
        this.animationId = null;
        this.isAnimating = false;
        this.animationCounter = 0;

        // DPI awareness system
        this.dpr = window.devicePixelRatio || 1;
        this.effectiveSize = 0;
        this.resizeTimeout = null;

        // State management for mode switching
        this.fullModeState = {
            rotation: 0,
            selectedWedges: new Set(),
            hasBeenInitialized: false
        };
        this.simplifiedModeState = {
            rotation: 0,
            selectedWedges: new Set(),
            hasBeenInitialized: false
        };

        // Set dynamic radii based on mode
        this.updateRadii();
    }
}
