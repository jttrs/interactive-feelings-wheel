import type {
    Ctor,
    WheelInstance,
    ParsedWedge,
    Level,
    EmotionSelectedDetail,
    ScrollPhysics,
    EffectCtx,
} from '../types.ts';
import { applyGuidedFocus, GUIDED_REST_ATTR } from './guided.ts';
import {
    isNavKey,
    parentKey,
    resolveNavMove,
    siblingPositions,
    type NavLevel,
    type NavNode,
} from './keyboard-nav.ts';

// Per-wheel "last child visited" memory for ↓ (parentKey → wedge id). Kept outside the
// mixin class so it needs no engine-wide field declaration.
const navMemory = new WeakMap<object, Map<string, string>>();

function toNavNode(w: Element): NavNode {
    const level = w.getAttribute('data-level') as NavLevel;
    const emotion = w.getAttribute('data-emotion') ?? '';
    const parent = w.getAttribute('data-parent');
    const family =
        level === 'core'
            ? emotion
            : level === 'secondary'
              ? (parent ?? '')
              : (w.getAttribute('data-grandparent') ?? '');
    return {
        id: w.getAttribute('data-wedge-id') ?? '',
        level,
        emotion,
        parent: level === 'core' ? null : parent,
        family,
        reachable: !w.hasAttribute(GUIDED_REST_ATTR),
    };
}

function announceNav(message: string): void {
    const region = document.getElementById('sr-announcer');
    if (!region) return;
    // Identical text isn't re-read by screen readers; blank it first so a repeated
    // edge press is still heard.
    if (region.textContent === message) {
        region.textContent = '';
        setTimeout(() => (region.textContent = message), 50);
    } else {
        region.textContent = message;
    }
}

// ===== SELECTION EFFECTS — THE SINGLE SOURCE OF TRUTH =====
//
// Every visual/state change a selection applies to a wedge or its label lives HERE, as a
// paired apply/clear. Nothing else may mutate a wedge on selection. selectWedge,
// deselectWedge, clearSelection (reset), and applySelectedWedges (regenerate) ALL drive
// this list — so reset can never miss a dimension, and adding a new effect is a single
// registry entry that is automatically applied AND cleared everywhere.
//
// Guard: tests/unit/wheel-dom.test.ts iterates SELECTION_EFFECTS and asserts (a) each has a
// name + apply + clear, and (b) apply→clear round-trips a wedge's DOM back to identical. A
// new effect whose clear doesn't fully undo its apply fails CI; a selection visual applied
// OUTSIDE this list is caught by the post-reset "clean slate" scan.

// The subset of engine members an effect touches. A Pick of WheelInstance (the single
// source of the method signatures — the mixins declare the same ones) so it can't drift.
type EffectHost = Pick<
    WheelInstance,
    'topGroup' | 'baseGroup' | 'selectedWedges' | 'createShadowCopy' | 'removeShadowCopy'
>;

interface SelectionEffect {
    name: string;
    apply: (ctx: EffectCtx, self: EffectHost) => void;
    clear: (ctx: EffectCtx, self: EffectHost) => void;
}

// ORDER IS SIGNIFICANT on apply: 'layer' raises the wedge to topGroup BEFORE 'shadow'
// clones it. 'selected-set' is first so membership is established before visuals. Every
// entry is a paired apply/clear; the generic baseline test (tests/unit/wheel-dom.test.ts)
// proves a reset returns the wheel to pristine, so any effect whose clear is incomplete —
// OR any selection visual added outside this list — fails CI.
export const SELECTION_EFFECTS: readonly SelectionEffect[] = [
    {
        name: 'selected-set', // Set membership is a selection dimension the registry owns.
        apply: ({ wedgeId }, self) => self.selectedWedges.add(wedgeId),
        clear: ({ wedgeId }, self) => self.selectedWedges.delete(wedgeId),
    },
    {
        name: 'selected-class',
        apply: ({ wedge }) => wedge.classList.add('selected'),
        clear: ({ wedge }) => wedge.classList.remove('selected'),
    },
    {
        name: 'aria-pressed',
        apply: ({ wedge }) => wedge.setAttribute('aria-pressed', 'true'),
        clear: ({ wedge }) => wedge.setAttribute('aria-pressed', 'false'),
    },
    {
        name: 'label-emphasis', // the bold label (was the reset-persistence bug)
        apply: ({ label }) => label?.classList.add('label-selected'),
        clear: ({ label }) => label?.classList.remove('label-selected'),
    },
    {
        name: 'layer', // raise the wedge + its label to the top group; restore to base
        apply: ({ wedge, label }, self) => {
            self.topGroup.appendChild(wedge);
            if (label) self.topGroup.appendChild(label);
        },
        clear: ({ wedge, label }, self) => {
            self.baseGroup.appendChild(wedge);
            if (label) self.baseGroup.appendChild(label);
        },
    },
    {
        name: 'shadow',
        apply: ({ wedge, wedgeId }, self) => self.createShadowCopy(wedge, wedgeId),
        clear: ({ wedgeId }, self) => self.removeShadowCopy(wedgeId),
    },
];

export const InteractionMixin = <T extends Ctor>(Base: T) =>
    class extends Base {
        // Shared instance state this mixin reads/writes (initialized by the engine ctor).
        declare isSimplifiedMode: WheelInstance['isSimplifiedMode'];
        declare isGuidedMode: WheelInstance['isGuidedMode'];
        declare selectedWedges: WheelInstance['selectedWedges'];
        declare currentRotation: WheelInstance['currentRotation'];
        declare svg: WheelInstance['svg'];
        declare container: WheelInstance['container'];
        declare containerSize: WheelInstance['containerSize'];
        declare isDragging: WheelInstance['isDragging'];
        declare isAnimating: WheelInstance['isAnimating'];
        declare scrollVelocity: WheelInstance['scrollVelocity'];
        declare momentumRafId: WheelInstance['momentumRafId'];
        declare heldRotationDir: WheelInstance['heldRotationDir'];
        declare wedgeRegistry: WheelInstance['wedgeRegistry'];
        declare topGroup: WheelInstance['topGroup'];
        declare baseGroup: WheelInstance['baseGroup'];
        declare divisionLinesGroup: WheelInstance['divisionLinesGroup'];
        declare shadowGroup: WheelInstance['shadowGroup'];
        declare textElements: WheelInstance['textElements'];
        declare resizeTimeout: WheelInstance['resizeTimeout'];
        declare lastMouseAngle: WheelInstance['lastMouseAngle'];
        declare _navCounter: WheelInstance['_navCounter'];
        declare _globalListenersBound: WheelInstance['_globalListenersBound'];
        declare _onMouseMove: WheelInstance['_onMouseMove'];
        declare _onMouseUp: WheelInstance['_onMouseUp'];
        declare _onResize: WheelInstance['_onResize'];
        declare _onOrientationChange: WheelInstance['_onOrientationChange'];
        declare _onKeyDown: WheelInstance['_onKeyDown'];
        declare _onKeyUp: WheelInstance['_onKeyUp'];
        declare _onBlur: WheelInstance['_onBlur'];
        // Provided by the rendering mixin; called from several methods below.
        declare updateRadii: () => void;
        declare generate: () => void;
        declare parseUniqueWedgeId: (wedgeId: string) => ParsedWedge;
        declare createShadowCopy: (originalWedge: SVGElement, wedgeId: string) => void;
        declare removeShadowCopy: (wedgeId: string) => void;
        declare moveTextForWedge: (
            emotion: string,
            level: Level,
            parent: string | null,
            targetGroup: SVGGElement,
            existingWedgeId?: string | null
        ) => void;
        declare findWedgeByStoredId: (wedgeId: string) => SVGElement | null;
        declare findWedgeByUniqueId: (
            level: Level,
            emotion: string,
            parent: string | null
        ) => SVGElement | null;
        declare computeAvailableWheelSize: () => number;
        declare updateTextRotations: () => void;
        declare updateAllShadowTransforms: () => void;
        declare getShortestRotationPath: (from: number, to: number) => number;
        declare clearAllAnimations: () => void;

        // Views share ONE selection and rotation. Simplified only stops drawing the outer
        // ring: a chosen outer-ring feeling stays chosen (and listed in the panel) while
        // hidden, and reappears selected when the full wheel returns. No per-view memory,
        // so switching views never silently swaps what the user picked.
        setSimplifiedMode(enabled: boolean): void {
            this.isSimplifiedMode = enabled;
            this.updateRadii();
            this.regenerateWheel();
        }

        // Guided mode is a visual spotlight over the full wheel (see guided.ts). It never
        // touches selection or rotation, so toggling it off restores the plain full view.
        setGuidedMode(enabled: boolean): void {
            this.isGuidedMode = enabled;
            this.refreshGuidedFocus();
        }

        refreshGuidedFocus(): void {
            if (!this.svg) return;
            applyGuidedFocus(this.container, this.isGuidedMode);

            // Keep the wheel a single tab-stop on a reachable wedge.
            const reachable = this.getFocusableWedges();
            if (reachable.length && !reachable.some((w) => w.getAttribute('tabindex') === '0')) {
                reachable[0].setAttribute('tabindex', '0');
            }
        }

        // After a keyboard toggle, put focus back: selection re-layers the wedge (which
        // blurs it), and in guided view a just-deselected wedge may have gone to rest —
        // then focus falls back to its family's core so the user isn't dropped to <body>.
        restoreWedgeFocus(target: Element): void {
            let next: Element | undefined = target;
            if (target.hasAttribute(GUIDED_REST_ATTR)) {
                const family =
                    target.getAttribute('data-grandparent') ?? target.getAttribute('data-parent');
                next = this.getFocusableWedges().find(
                    (w) =>
                        w.classList.contains('core-wedge') &&
                        w.getAttribute('data-emotion') === family
                );
            }
            if (!next) return;
            this.getFocusableWedges().forEach((w) =>
                w.setAttribute('tabindex', w === next ? '0' : '-1')
            );
            (next as SVGElement).focus();
        }

        regenerateWheel(): void {
            // A momentum loop from the previous SVG would write to stale groups.
            this.stopMomentum();

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

        applySelectedWedges(): void {
            // Re-apply selection state to a freshly regenerated wheel (mode switch / resize).
            // Routes through the effect registry so the rebuilt wedges get EVERY effect
            // (previously this omitted the bold label + aria-pressed — the same drift).
            // Iterate a snapshot: the 'selected-set' effect re-adds each id during apply,
            // which mutates the Set we're looping over.
            [...this.selectedWedges].forEach((wedgeId) => {
                // Skip tertiary emotions in simplified mode since they don't exist.
                if (
                    this.isSimplifiedMode &&
                    this.parseUniqueWedgeId(wedgeId).level === 'tertiary'
                ) {
                    return;
                }
                // effectCtx resolves the freshly-regenerated wedge + label by id and is the
                // ONE ctx builder — no hand-rolled second lookup path.
                const ctx = this.effectCtx(wedgeId);
                if (ctx) this.applySelectionEffects(ctx);
            });
        }

        // Called on every generate(): the <svg> is recreated each time, so its scoped
        // listeners are attached fresh (the old svg is discarded with its listeners — no
        // leak). Global document/window listeners are bound ONCE via setupGlobalListeners()
        // (from the constructor), never here, to avoid stacking a duplicate set on every
        // regenerate (mode switch / resize / fullscreen).
        setupEventListeners(): void {
            // Called only right after generate() assigns a fresh this.svg, so it's
            // always non-null here even though the shared field type is nullable.
            const svg = this.svg as SVGSVGElement;

            // Mouse down to begin a drag-rotation.
            svg.addEventListener('mousedown', (e: MouseEvent) => {
                if (this.isAnimating) return;

                // Grabbing the wheel arrests any in-flight scroll glide.
                this.stopMomentum();

                this.isDragging = true;
                svg.style.cursor = 'grabbing';

                const rect = svg.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                this.lastMouseAngle = Math.atan2(mouseY, mouseX);
                e.preventDefault();
            });

            // Mouse wheel for rotation. Scale by the scroll MAGNITUDE (not just its
            // sign) and feed a decaying-velocity model so the wheel has weight and
            // does not flicker on the tiny sign-alternating deltas a slow trackpad
            // emits. { passive: false } because we call preventDefault().
            svg.addEventListener(
                'wheel',
                (e: WheelEvent) => {
                    if (this.isAnimating) return;
                    e.preventDefault();
                    this.applyScrollInput(e.deltaY);
                },
                { passive: false }
            );

            // Click events for emotions. Blocked during a drag AND during an animation
            // (e.g. the reset unwind) — a mid-reset click would otherwise select a wedge
            // the in-flight reset won't clean up, leaving it stuck-selected.
            svg.addEventListener('click', (e: MouseEvent) => {
                if (this.isDragging || this.isAnimating) return;

                const target = e.target as Element;
                const emotion = target.getAttribute('data-emotion');
                if (emotion && target.classList.contains('wedge')) {
                    this.handleWedgeClick(e);
                }
            });

            // Keyboard support: Enter/Space selects the focused wedge; the structured nav
            // keys (keyboard-nav.ts) move focus by ring/family (roving tabindex). Scoped to
            // when a wedge is focused and stops propagation so arrows don't also rotate the
            // wheel via the global arrow-key spin — mouse/scroll behavior is unchanged.
            svg.addEventListener('keydown', (e: KeyboardEvent) => {
                const target = e.target as Element | null;
                if (!target || !target.classList || !target.classList.contains('wedge')) return;

                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    this.handleWedgeClick({ target } as unknown as MouseEvent);
                    this.restoreWedgeFocus(target);
                    return;
                }

                if (isNavKey(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.moveWedgeFocus(target, e.key);
                }
            });

            // Establish the single tab-stop into the wheel.
            this.initRovingTabindex();
        }

        // Bind document/window listeners ONCE (from the constructor). These outlive any
        // single <svg>, so re-binding per generate() would stack duplicate handlers — a
        // steadily worsening memory + CPU leak. Bound refs are stored so they can be
        // removed on teardown. Each handler no-ops until the wheel is generated (svg set).
        setupGlobalListeners(): void {
            if (this._globalListenersBound) return;
            this._globalListenersBound = true;

            this._onMouseMove = (e: MouseEvent) => {
                if (!this.isDragging || this.isAnimating || !this.svg) return;
                const P = (this.constructor as unknown as { ScrollPhysics: ScrollPhysics })
                    .ScrollPhysics;

                const rect = this.svg.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const currentMouseAngle = Math.atan2(mouseY, mouseX);
                let deltaAngle = (currentMouseAngle - this.lastMouseAngle) * (180 / Math.PI);
                // atan2 wraps at ±180°; normalize so crossing the seam doesn't spike velocity.
                if (deltaAngle > 180) deltaAngle -= 360;
                else if (deltaAngle < -180) deltaAngle += 360;

                this.currentRotation += deltaAngle;
                this.lastMouseAngle = currentMouseAngle;

                // Seed the shared momentum model with this move's angular velocity (deg per
                // move-event ≈ per frame during an active drag — the same unit startMomentum
                // consumes). A move whose delta is ~0 (cursor held still) resets velocity to
                // 0, so a pause-then-release ends at rest instead of flinging a stale value.
                this.scrollVelocity =
                    Math.abs(deltaAngle) < 0.01
                        ? 0
                        : Math.max(-P.MAX_VELOCITY, Math.min(P.MAX_VELOCITY, deltaAngle));

                this.updateRotation();
            };
            this._onMouseUp = () => {
                if (!this.svg) return;
                this.isDragging = false;
                this.svg.style.cursor = 'grab';

                // Release into a decaying glide, matching a scroll flick. A slow/still release
                // (velocity below the settle threshold) just stops. mousedown already called
                // stopMomentum(), so no prior glide competes.
                const P = (this.constructor as unknown as { ScrollPhysics: ScrollPhysics })
                    .ScrollPhysics;
                if (
                    !this.isAnimating &&
                    this.momentumRafId === null &&
                    Math.abs(this.scrollVelocity) >= P.MIN_VELOCITY
                ) {
                    this.startMomentum();
                }
            };
            this._onResize = () => this.handleResize();
            this._onOrientationChange = () => {
                // Mobile orientation change - allow time for layout to settle
                setTimeout(() => this.handleResize(), 200);
            };

            // Arrow keys spin the wheel via the shared momentum model. These fire only when
            // NO wedge is focused: the svg's own keydown (setupEventListeners) handles arrows
            // as wedge focus-navigation and stopPropagation()s them, so a focused wedge never
            // reaches document here. Map: Left/Up = ccw (-1), Right/Down = cw (+1).
            const ARROW_DIR: Record<string, number> = {
                ArrowLeft: -1,
                ArrowUp: -1,
                ArrowRight: 1,
                ArrowDown: 1,
            };
            this._onKeyDown = (e: KeyboardEvent) => {
                const dir = ARROW_DIR[e.key];
                if (dir === undefined || !this.svg) return;
                // Don't hijack arrows while typing in a field.
                const tag = e.target && (e.target as Element).tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                e.preventDefault();
                // OS key-repeat presses are no-ops: the held-accel loop sustains the spin,
                // so we only kick it on the initial (non-repeat) press.
                if (e.repeat) return;
                this.startHeldRotation(dir);
            };
            this._onKeyUp = (e: KeyboardEvent) => {
                const dir = ARROW_DIR[e.key];
                if (dir === undefined) return;
                this.stopHeldRotation(dir);
            };
            // If focus/visibility leaves mid-hold we never get keyup — clear held spin so it
            // can't get stuck accelerating.
            this._onBlur = () => {
                this.heldRotationDir = 0;
            };

            document.addEventListener('mousemove', this._onMouseMove);
            document.addEventListener('mouseup', this._onMouseUp);
            document.addEventListener('keydown', this._onKeyDown);
            document.addEventListener('keyup', this._onKeyUp);
            window.addEventListener('resize', this._onResize);
            window.addEventListener('orientationchange', this._onOrientationChange);
            window.addEventListener('blur', this._onBlur);
        }

        // Focusable wedges in STABLE generation order (data-nav-index), not live DOM
        // order — a selected wedge's <path> is moved to the top layer, which would
        // otherwise reshuffle arrow-key navigation after any selection.
        getFocusableWedges(): Element[] {
            return Array.from(
                this.container.querySelectorAll(
                    `.wedge:not(.shadow-wedge):not([${GUIDED_REST_ATTR}])`
                )
            ).sort(
                (a, b) =>
                    Number(a.getAttribute('data-nav-index')) -
                    Number(b.getAttribute('data-nav-index'))
            );
        }

        // Make exactly one wedge part of the tab order so the wheel is a single tab-stop,
        // and give every wedge its position among siblings ("Playful, under Happy, 1 of 6")
        // so screen-reader users hear where they are without a separate announcement.
        initRovingTabindex(): void {
            const wedges = this.getFocusableWedges();
            wedges.forEach((w) => w.setAttribute('tabindex', '-1'));
            if (wedges.length) wedges[0].setAttribute('tabindex', '0');

            const all = this.getNavWedges();
            const positions = siblingPositions(all.map(toNavNode));
            for (const w of all) {
                const pos = positions.get(w.getAttribute('data-wedge-id') ?? '');
                const label = w.getAttribute('aria-label');
                if (pos && label && !/, \d+ of \d+$/.test(label)) {
                    w.setAttribute('aria-label', `${label}, ${pos.index} of ${pos.total}`);
                }
            }
        }

        // Every real wedge (rested ones included) in stable nav-index order — the
        // structure the keyboard model reasons over.
        getNavWedges(): Element[] {
            return Array.from(this.container.querySelectorAll('.wedge:not(.shadow-wedge)')).sort(
                (a, b) =>
                    Number(a.getAttribute('data-nav-index')) -
                    Number(b.getAttribute('data-nav-index'))
            );
        }

        // Move keyboard focus by ring/family (see keyboard-nav.ts), updating the roving
        // tabindex. Edge presses that can't move are announced briefly instead.
        moveWedgeFocus(current: Element, key: string): void {
            const wedges = this.getNavWedges();
            const nodes = wedges.map(toNavNode);
            const currentId = current.getAttribute('data-wedge-id') ?? '';
            let memory = navMemory.get(this);
            if (!memory) navMemory.set(this, (memory = new Map()));

            const result = resolveNavMove(nodes, currentId, key, memory);
            if (result.kind === 'blocked') {
                announceNav(
                    result.reason === 'center'
                        ? 'This is the center ring.'
                        : result.reason === 'outer'
                          ? 'This is the outer ring.'
                          : `Choose ${result.emotion} to open its more specific feelings.`
                );
                return;
            }
            if (result.kind !== 'move') return;

            const targetIndex = nodes.findIndex((n) => n.id === result.id);
            const target = wedges[targetIndex] as SVGElement | undefined;
            if (!target) return;

            // Remember the child we land on under its parent, so ↑ then ↓ returns here.
            const landed = nodes[targetIndex];
            if (landed.level !== 'core') {
                const parentLevel = landed.level === 'secondary' ? 'core' : 'secondary';
                const parent = nodes.find(
                    (p) =>
                        p.level === parentLevel &&
                        p.family === landed.family &&
                        p.emotion === landed.parent
                );
                if (parent) memory.set(parentKey(parent), landed.id);
            }

            // Reset every wedge, not just `current`: focus can arrive on a non-tab-stop
            // wedge (a click, programmatic focus), and there must only ever be one stop.
            wedges.forEach((w) => w.setAttribute('tabindex', w === target ? '0' : '-1'));
            target.focus();
        }

        // DPI-aware resize handler. Uses the SAME computeAvailableWheelSize() as
        // generate(), so a resize computes an identical size to the initial render for
        // the same viewport/panel state (no more 150-vs-200 floor divergence).
        handleResize(): void {
            clearTimeout(this.resizeTimeout as ReturnType<typeof setTimeout>);
            this.resizeTimeout = setTimeout(() => {
                const oldSize = this.containerSize;
                const newCssSize = this.computeAvailableWheelSize();

                // Only regenerate if significant change (avoid constant regeneration)
                if (Math.abs(newCssSize - oldSize) > 10) {
                    this.regenerateWheel();
                }
            }, 150);
        }

        // Unconditional re-render (no size-delta guard). Used after a fullscreen
        // transition to rebuild the SVG and refresh any stale GPU layer, even when
        // the window size is unchanged. Preserves rotation + selection state.
        forceRerender(): void {
            this.regenerateWheel();
        }

        handleWedgeClick(event: MouseEvent): void {
            const wedge = event.target as SVGElement;
            const emotion = wedge.getAttribute('data-emotion') as string;
            const level = wedge.getAttribute('data-level') as Level;

            // CRITICAL FIX: Use the actual wedge ID from the element, don't recreate it!
            // This ensures consistency between generation and click handling
            const wedgeId = wedge.getAttribute('data-wedge-id');

            if (!wedgeId) {
                return;
            }

            // Toggle selection using centralized methods
            if (this.selectedWedges.has(wedgeId)) {
                // Deselection - use centralized method
                this.deselectWedge(wedgeId, wedge);
            } else {
                // Selection - use centralized method
                this.selectWedge(wedgeId, wedge);
            }

            // Dispatch custom event for app to handle
            const customEvent = new CustomEvent<EmotionSelectedDetail>('emotionSelected', {
                detail: { emotion, level, selected: this.selectedWedges.has(wedgeId), wedgeId },
            });
            document.dispatchEvent(customEvent);
        }

        // Public method to toggle wedge selection (called from panel tile X buttons)
        toggleWedgeSelection(wedgeId: string): void {
            const wedge = this.findWedgeByStoredId(wedgeId);

            if (wedge) {
                const emotion = wedge.getAttribute('data-emotion') as string;
                const level = wedge.getAttribute('data-level') as Level;

                const isCurrentlySelected = this.selectedWedges.has(wedgeId);

                // Use centralized selection/deselection logic directly
                if (isCurrentlySelected) {
                    this.deselectWedge(wedgeId, wedge);
                } else {
                    this.selectWedge(wedgeId, wedge);
                }

                // Dispatch custom event for app to handle
                const customEvent = new CustomEvent<EmotionSelectedDetail>('emotionSelected', {
                    detail: { emotion, level, selected: this.selectedWedges.has(wedgeId), wedgeId },
                });
                document.dispatchEvent(customEvent);
            }
        }

        // Build the effect context for a wedge id — the ONE ctx builder used by select,
        // deselect, clear, and regenerate. Resolves the wedge (passed in on a click, else by
        // id) AND its paired label once, so effects never re-query. Returns null if the
        // wedge isn't in the DOM (e.g. a tertiary hidden in simplified mode).
        effectCtx(wedgeId: string, wedge?: SVGElement | null): EffectCtx | null {
            const el = wedge ?? this.findWedgeByStoredId(wedgeId);
            if (!el) return null;
            const { level, emotion, parent } = this.parseUniqueWedgeId(wedgeId);
            const label = this.container.querySelector(
                `text[data-wedge-id="${wedgeId}"]`
            ) as SVGTextElement | null;
            return { wedge: el, label, wedgeId, emotion, level, parent };
        }

        // Apply / clear ALL registered selection effects for one wedge. These are the ONLY
        // methods that turn selection visuals or state on/off — select, deselect, reset, and
        // regenerate all funnel through here (incl. selectedWedges membership), so no
        // dimension can be missed.
        applySelectionEffects(ctx: EffectCtx): void {
            for (const fx of SELECTION_EFFECTS) fx.apply(ctx, this);
            if (this.isGuidedMode) this.refreshGuidedFocus();
        }
        clearSelectionEffects(ctx: EffectCtx): void {
            for (const fx of SELECTION_EFFECTS) fx.clear(ctx, this);
            if (this.isGuidedMode) this.refreshGuidedFocus();
        }

        selectWedge(wedgeId: string, wedge: SVGElement): void {
            const ctx = this.effectCtx(wedgeId, wedge);
            if (ctx) this.applySelectionEffects(ctx);
        }

        deselectWedge(wedgeId: string, wedge: SVGElement): void {
            const ctx = this.effectCtx(wedgeId, wedge);
            if (ctx) this.clearSelectionEffects(ctx);
        }

        updateRotation(): void {
            this.baseGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.divisionLinesGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.topGroup.style.transform = `rotate(${this.currentRotation}deg)`;
            this.updateTextRotations();
            this.updateAllShadowTransforms();
        }

        // ===== ROTATION MOMENTUM =====
        // Shared velocity/friction model driving BOTH scroll and held-arrow rotation.
        // SENSITIVITY converts a scroll delta (px) into degrees of velocity; FRICTION is
        // the per-frame velocity retention (higher = heavier/longer glide); MAX_VELOCITY
        // caps a fast flick or a sustained hold; MIN_VELOCITY is when we snap to rest.
        // KEY_IMPULSE is the one-shot velocity a single arrow tap adds (a tap glides
        // ~IMPULSE/(1-FRICTION) degrees); KEY_ACCEL is the per-frame velocity added while an
        // arrow is HELD, ramping up to MAX_VELOCITY for a smooth continuous spin.
        static ScrollPhysics: ScrollPhysics = {
            SENSITIVITY: 0.025,
            FRICTION: 0.9,
            MAX_VELOCITY: 2,
            MIN_VELOCITY: 0.05,
            KEY_IMPULSE: 0.3,
            KEY_ACCEL: 0.2,
        };

        // Feed one wheel event into the momentum model. Adds magnitude-scaled velocity
        // (so tiny jittery deltas add tiny, sign-correct nudges instead of a full ±5°
        // swing) and kicks the decay loop.
        applyScrollInput(deltaY: number): void {
            const P = (this.constructor as unknown as { ScrollPhysics: ScrollPhysics })
                .ScrollPhysics;
            this.scrollVelocity += deltaY * P.SENSITIVITY;
            // Clamp so a hard flick can't spin absurdly fast.
            this.scrollVelocity = Math.max(
                -P.MAX_VELOCITY,
                Math.min(P.MAX_VELOCITY, this.scrollVelocity)
            );
            if (this.momentumRafId === null) this.startMomentum();
        }

        startMomentum(): void {
            const P = (this.constructor as unknown as { ScrollPhysics: ScrollPhysics })
                .ScrollPhysics;
            const step = (): void => {
                // A programmatic animation (e.g. reset) takes over: drop momentum and any
                // held-key spin so a second rAF can't fight the reset for currentRotation.
                if (this.isAnimating) {
                    this.scrollVelocity = 0;
                    this.heldRotationDir = 0;
                    this.momentumRafId = null;
                    return;
                }

                // While an arrow key is held, feed velocity in each frame so the spin is
                // continuous and rides up to the shared MAX_VELOCITY cap.
                if (this.heldRotationDir !== 0) {
                    this.scrollVelocity += this.heldRotationDir * P.KEY_ACCEL;
                    this.scrollVelocity = Math.max(
                        -P.MAX_VELOCITY,
                        Math.min(P.MAX_VELOCITY, this.scrollVelocity)
                    );
                }

                this.currentRotation += this.scrollVelocity;
                this.updateRotation();
                this.scrollVelocity *= P.FRICTION;

                // Settle only when nothing is held AND the glide has decayed — a held key
                // keeps the loop alive even as friction pulls velocity toward the cap.
                if (this.heldRotationDir === 0 && Math.abs(this.scrollVelocity) < P.MIN_VELOCITY) {
                    this.scrollVelocity = 0;
                    this.momentumRafId = null;
                    return; // settled
                }
                this.momentumRafId = requestAnimationFrame(step);
            };
            this.momentumRafId = requestAnimationFrame(step);
        }

        // Begin (or reverse) a held-arrow spin. dir: +1 clockwise, -1 counter-clockwise.
        // A single tap lands one KEY_IMPULSE and the friction glide carries it ~15°; holding
        // the key lets startMomentum()'s per-frame KEY_ACCEL take over for a continuous spin.
        startHeldRotation(dir: number): void {
            // A programmatic animation (reset) owns the wheel — ignore, matching scroll/drag.
            if (this.isAnimating) return;
            const P = (this.constructor as unknown as { ScrollPhysics: ScrollPhysics })
                .ScrollPhysics;
            this.heldRotationDir = dir;
            this.scrollVelocity += dir * P.KEY_IMPULSE;
            this.scrollVelocity = Math.max(
                -P.MAX_VELOCITY,
                Math.min(P.MAX_VELOCITY, this.scrollVelocity)
            );
            if (this.momentumRafId === null) this.startMomentum();
        }

        // Release a held-arrow spin. Clears the held direction (if it still matches) so
        // friction decays the wheel to rest; the loop settles on its own.
        stopHeldRotation(dir: number): void {
            if (this.heldRotationDir === dir) this.heldRotationDir = 0;
        }

        stopMomentum(): void {
            if (this.momentumRafId !== null) {
                cancelAnimationFrame(this.momentumRafId);
                this.momentumRafId = null;
            }
            this.scrollVelocity = 0;
            this.heldRotationDir = 0;
        }

        reset(): void {
            // Clear all active animations first
            this.clearAllAnimations();
            this.stopMomentum();

            // Clear every selected wedge through the effect registry — the sole owner of
            // selection visuals + Set membership. No bulk layer/shadow sweep here: each
            // wedge's registry clear moves it back to baseGroup, removes its shadow, and
            // deletes it from selectedWedges. (Iterate a snapshot; the 'selected-set' effect
            // mutates the Set during the loop.) The generic baseline test proves this alone
            // returns the wheel to pristine.
            const selectedWedgeIds = [...this.selectedWedges];
            selectedWedgeIds.forEach((wedgeId) => {
                const { level, emotion, parent } = this.parseUniqueWedgeId(wedgeId);
                const wedge = this.findWedgeByUniqueId(level, emotion, parent);
                if (wedge) this.deselectWedge(wedgeId, wedge);
                // Not drawn (outer ring hidden in Simplified): only membership to clear.
                else this.selectedWedges.delete(wedgeId);
            });

            // Reset rotation instantly (a non-selection duty reset still owns).
            this.currentRotation = 0;
            this.updateRotation();
        }

        // ===== PUBLIC RESET/SELECTION API (used by the app's animated reset) =====
        // These own all wheel-layer DOM mutation so the app controller never has to reach
        // into engine internals (baseGroup/shadowGroup/selectedWedges) directly.

        // Clear every selected wedge visually WITHOUT touching rotation. Returns the ids
        // that were cleared (newest-first order is the app's concern, not ours). No bulk
        // shadow wipe — the registry's 'shadow' clear owns shadow removal per wedge.
        clearSelections(): string[] {
            const cleared = [...this.selectedWedges];
            cleared.forEach((wedgeId) => this.clearSelection(wedgeId));
            return cleared;
        }

        // Clear a single wedge's selection through the effect registry — the sole owner of
        // every dimension incl. selectedWedges membership (the 'selected-set' effect deletes
        // it). No-op if the id is not currently selected.
        clearSelection(wedgeId: string): void {
            if (!this.selectedWedges.has(wedgeId)) return;
            const ctx = this.effectCtx(wedgeId);
            if (ctx) this.clearSelectionEffects(ctx);
            // Not drawn (outer ring hidden in Simplified): only membership to clear.
            else this.selectedWedges.delete(wedgeId);
        }

        // Animate rotation back to 0 over `duration` ms (ease-out cubic), resolving when
        // done. Mirrors the app's previous hand-rolled unwind so the feel is unchanged.
        animateResetRotation(duration = 1000): Promise<void> {
            return new Promise((resolve) => {
                const startRotation = this.currentRotation;
                const delta = this.getShortestRotationPath(startRotation, 0);

                if (Math.abs(delta) < 1) {
                    setTimeout(resolve, duration);
                    return;
                }

                const startTime = performance.now();
                const frame = (now: number): void => {
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

        // Settle the wheel at rest after an animated reset completes.
        commitResetState(): void {
            this.currentRotation = 0;
            this.updateRotation();
        }
    };
