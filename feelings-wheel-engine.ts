// Feelings Wheel Engine - Core wheel UI system: rendering, interaction, animation, and state management
import { AnimationMixin } from './src/wheel/animation.ts';
import { RenderingMixin } from './src/wheel/rendering.ts';
import { InteractionMixin } from './src/wheel/interaction.ts';
import type { FeelingsData } from './src/types.ts';

// Compose the mixins over an empty base; every method lands on one prototype chain
// so shared `this` state behaves exactly as the original monolithic class.
export class FeelingsWheelGenerator extends InteractionMixin(
    RenderingMixin(AnimationMixin(class {}))
) {
    constructor(container: Element, data: FeelingsData) {
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

        // Scroll-momentum state: the wheel carries angular velocity that decays each
        // frame, giving it perceived "weight" and absorbing the sign-jitter that slow
        // trackpad scrolling produces (which otherwise flickers the rotation).
        this.scrollVelocity = 0; // degrees per frame
        this.momentumRafId = null;

        // Held-arrow rotation feeds the SAME momentum loop as scroll. This is the net
        // direction of currently-held rotation keys (+1 cw / -1 ccw / 0 none); while
        // non-zero the loop adds KEY_ACCEL per frame so a held key spins continuously.
        this.heldRotationDir = 0;

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
            hasBeenInitialized: false,
        };
        this.simplifiedModeState = {
            rotation: 0,
            selectedWedges: new Set(),
            hasBeenInitialized: false,
        };

        // Set dynamic radii based on mode
        this.updateRadii();

        // Bind document/window listeners once here (not in generate(), which re-runs
        // on every mode switch / resize / fullscreen and would otherwise stack copies).
        this.setupGlobalListeners();
    }
}
