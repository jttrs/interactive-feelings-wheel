// Shared type surface for the feelings wheel.
//
// The engine is composed from three mixins over a single `this`, so every field must be
// declared in one shared place — `WheelInstance` — that each mixin's methods can be typed
// against. `FeelingsWheelGenerator` implements it and the constructor initializes it; each
// mixin re-`declare`s the subset of fields it touches so strict-mode `this` access resolves
// without a runtime footprint.

// ===== Domain types =====

export type Level = 'core' | 'secondary' | 'tertiary';

// A core emotion family + its wheel color.
export interface CoreEmotion {
    name: string;
    color: string;
}

// One standard + one simplified definition per feeling word.
export interface Definition {
    standard: string;
    simplified: string;
}

// The whole taxonomy + helpers, as exported by feelings-data.ts.
export interface FeelingsData {
    core: CoreEmotion[];
    secondary: Record<string, string[]>;
    tertiary: Record<string, string[]>;
    getCoreEmotionColor(family: string): string;
    lightenColor(color: string, percent: number): string;
    definitions: Record<string, Definition>;
}

// Metadata stored per wedge id in the registry (source of truth for a wedge's meaning).
export interface WedgeMeta {
    level: Level;
    emotion: string;
    parent: string | null;
    family: string;
}

// The registry returns this shape (family is exposed as coreFamily to callers).
export interface ParsedWedge {
    level: Level;
    emotion: string;
    parent: string | null;
    coreFamily: string;
}

// A positioned label tracked for per-frame rotation updates. `lastRotation` is filled in
// lazily by updateTextRotations (undefined until the first write).
export interface TextEl {
    element: SVGTextElement;
    baseAngle: number;
    flipAngle: number;
    x: number;
    y: number;
    lastRotation?: number;
}

// Per-mode snapshot for the simplified/full toggle.
export interface ModeState {
    rotation: number;
    selectedWedges: Set<string>;
    hasBeenInitialized: boolean;
}

// Result of calculateResponsiveScaling().
export interface ResponsiveScaling {
    primaryDivisionStroke: number;
    secondaryDivisionStroke: number;
    tertiaryDivisionStroke: number;
    ringStroke: number;
    lineColor: string;
    ringColor: string;
    fontScale: number;
    touchTargetScale: number;
    generalScale: number;
}

// Result of calculateDynamicFontSizes(), indexed by level.
export type DynamicFontSizes = Record<Level, number>;

// The static momentum tunables (InteractionMixin.ScrollPhysics).
export interface ScrollPhysics {
    SENSITIVITY: number;
    FRICTION: number;
    MAX_VELOCITY: number;
    MIN_VELOCITY: number;
    KEY_IMPULSE: number;
    KEY_ACCEL: number;
}

// The detail payload of the 'emotionSelected' CustomEvent the wheel dispatches.
export interface EmotionSelectedDetail {
    emotion: string;
    level: Level;
    selected: boolean;
    wedgeId: string;
}

// ===== feelings-tree types =====

// A parsed selection fed into the tree (wedgeId + its parsed metadata).
export interface Selection {
    wedgeId: string;
    level: Level;
    emotion: string;
    parent: string | null;
    coreFamily: string;
}

// A node in a family's rendered subtree.
export interface ForestNode {
    level: Level;
    emotion: string;
    wedgeId: string | null;
    selected: boolean;
    parentEmotion: string | null;
    terminal: boolean;
}

// One core family's grouped subtree.
export interface ForestFamily {
    family: string;
    nodes: ForestNode[];
}

// ===== Mixin plumbing =====

// A constructable base for the mixin `Base` parameter. Concrete (non-abstract) so the
// returned mixin class stays concrete and `new`-able by the engine; the chain starts from
// a concrete empty `class {}`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ctor<T = object> = new (...args: any[]) => T;

// The complete shared instance surface. Every field the constructor or any mixin reads or
// writes on `this` lives here. Group refs are non-null after generate(); they're typed
// non-optional because all render/interaction paths run post-generate (the constructor sets
// svg=null and defers group creation to generate()).
export interface WheelInstance {
    // Core identity + data
    container: Element;
    data: FeelingsData;
    centerX: number;
    centerY: number;
    isSimplifiedMode: boolean;
    selectedWedges: Set<string>;
    wedgeRegistry: Map<string, WedgeMeta>;

    // Rotation + pointer state
    currentRotation: number;
    isDragging: boolean;
    lastMouseAngle: number;
    svg: SVGSVGElement | null;
    wheelGroup: SVGGElement | null;
    textElements: TextEl[];

    // Scroll / held-key momentum
    scrollVelocity: number;
    momentumRafId: number | null;
    heldRotationDir: number;

    // Animation system
    animations: Map<string, WheelAnimation>;
    animationId: number | null;
    isAnimating: boolean;
    animationCounter: number;

    // DPI + sizing
    dpr: number;
    effectiveSize: number;
    resizeTimeout: ReturnType<typeof setTimeout> | null;

    // Mode-switch snapshots
    fullModeState: ModeState;
    simplifiedModeState: ModeState;

    // Radii + scaling (set during generate())
    coreRadius: number;
    middleRadius: number;
    outerRadius: number;
    containerSize: number;
    responsiveScaling: ResponsiveScaling | null;
    dynamicFontSizes: DynamicFontSizes | null;

    // SVG layer groups (created during generate())
    baseGroup: SVGGElement;
    divisionLinesGroup: SVGGElement;
    shadowGroup: SVGGElement;
    topGroup: SVGGElement;

    // Stable nav-index counter stamped on wedges during generate()
    _navCounter: number;

    // Global-listener bookkeeping (bound once in the constructor)
    _globalListenersBound?: boolean;
    _onMouseMove?: (e: MouseEvent) => void;
    _onMouseUp?: () => void;
    _onResize?: () => void;
    _onOrientationChange?: () => void;
    _onKeyDown?: (e: KeyboardEvent) => void;
    _onKeyUp?: (e: KeyboardEvent) => void;
    _onBlur?: () => void;
}

// Options accepted by addAnimation().
export interface AnimationOptions {
    duration?: number;
    from: number | number[];
    to: number | number[];
    easing?: (t: number) => number;
    onUpdate?: (value: number | number[], easedProgress: number) => void;
    onComplete?: () => void;
}

// One registered animation in the shared rAF loop (the normalized, stored form).
export interface WheelAnimation {
    id: string;
    startTime: number;
    duration: number;
    from: number | number[];
    to: number | number[];
    easing: (t: number) => number;
    onUpdate: (value: number | number[], easedProgress: number) => void;
    onComplete: () => void;
    active: boolean;
}
