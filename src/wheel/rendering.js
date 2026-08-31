import { FEELINGS_DATA } from '../../feelings-data.js';
import {
    line as makeLine,
    circle as makeCircle,
    wedgePath as makeWedgePath,
    text as makeText,
    readWheelTokens,
} from './svg.js';

export const RenderingMixin = (Base) =>
    class extends Base {
        // ===== CENTRALIZED RESPONSIVE SCALING SYSTEM =====

        calculateResponsiveScaling(wheelSize) {
            // Unified scaling for ALL visual parameters. Separator stroke widths derive
            // from the wheel line/ring TOKENS (ratios of wheel size) so the design-token
            // layer is the single source of truth; JS applies size + a minimum floor.
            const baseScale = wheelSize / 400; // Reference size: 400px wheel
            const isMobile = window.innerWidth <= 767;
            const tokens = readWheelTokens();

            return {
                // Separator stroke widths (wedges are fill-only; they carry no stroke).
                primaryDivisionStroke: Math.max(0.3, wheelSize * tokens.primaryRatio),
                secondaryDivisionStroke: Math.max(0.15, wheelSize * tokens.secondaryRatio),
                tertiaryDivisionStroke: Math.max(0.1, wheelSize * tokens.dyadRatio), // dyad, dashed
                ringStroke: Math.max(0.2, wheelSize * tokens.ringRatio),

                // Separator colors (palette-aligned, from tokens).
                lineColor: tokens.lineColor,
                ringColor: tokens.ringColor,

                // Font scaling factors (use small percentages, not raw baseScale)
                fontScale: isMobile
                    ? Math.max(0.008, 0.006 * baseScale) // Mobile: 0.6% * scale factor
                    : Math.max(0.006, 0.005 * baseScale), // Desktop: 0.5% * scale factor

                // Touch target scaling for mobile accessibility
                touchTargetScale: isMobile ? Math.max(1.2, baseScale) : baseScale,

                // General scaling factor for other elements
                generalScale: baseScale,
            };
        }

        updateAllResponsiveScaling() {
            // Re-apply separator stroke widths after a resize. Wedges are fill-only, so
            // only the lines + ring circles need updating.
            if (!this.responsiveScaling) return;
            const s = this.responsiveScaling;

            const setWidth = (selector, width) => {
                this.container.querySelectorAll(selector).forEach((el) => {
                    el.setAttribute('stroke-width', width.toString());
                });
            };
            setWidth('.primary-division-line', s.primaryDivisionStroke);
            setWidth('.secondary-division-line', s.secondaryDivisionStroke);
            // Dyad dots are drawn slightly thicker than the hairline so they read.
            setWidth('.dyad-division-line', Math.max(0.6, s.tertiaryDivisionStroke * 1.6));
            setWidth('.wheel-ring', s.ringStroke);
        }

        updateRadii() {
            // Radii are now calculated dynamically in the generate() method
            // based on container size and mode. This method is kept for compatibility
            // but actual calculation happens in generate().
        }

        calculateDynamicFontSizes() {
            // Calculate optimal font sizes for each ring based on available wedge space
            // This analyzes all wedges in each ring to find the constraining factor

            const coreAngles = this.calculateCoreAngles();
            const fontSizes = {};

            // Calculate core emotion font sizes
            const coreConstraints = coreAngles.map((core) => {
                const radialWidth = this.coreRadius * 0.8; // Core is a circle, use 80% of radius for text space
                const angularWidth = core.size;
                const constraint = this.calculateOptimalTextSize(
                    radialWidth,
                    angularWidth,
                    core.name.length
                );
                return constraint;
            });
            fontSizes.core = Math.min(...coreConstraints);

            // Calculate secondary emotion font sizes
            const secondaryConstraints = [];
            coreAngles.forEach((core) => {
                const secondaryEmotions = this.data.secondary[core.name];
                const anglePerSecondary = core.size / secondaryEmotions.length;
                const radialWidth = this.middleRadius - this.coreRadius; // Ring thickness

                secondaryEmotions.forEach((emotion) => {
                    const constraint = this.calculateOptimalTextSize(
                        radialWidth,
                        anglePerSecondary,
                        emotion.length
                    );
                    secondaryConstraints.push(constraint);
                });
            });
            fontSizes.secondary = Math.min(...secondaryConstraints);

            // Calculate tertiary emotion font sizes (only in full mode)
            if (!this.isSimplifiedMode) {
                const tertiaryConstraints = [];
                coreAngles.forEach((core) => {
                    const secondaryEmotions = this.data.secondary[core.name];
                    const anglePerSecondary = core.size / secondaryEmotions.length;

                    secondaryEmotions.forEach((emotion) => {
                        const tertiaryEmotions = this.data.tertiary[emotion] || [];
                        if (tertiaryEmotions.length > 0) {
                            const anglePerTertiary = anglePerSecondary / tertiaryEmotions.length;
                            const radialWidth = this.outerRadius - this.middleRadius; // Ring thickness

                            tertiaryEmotions.forEach((tertiary) => {
                                const constraint = this.calculateOptimalTextSize(
                                    radialWidth,
                                    anglePerTertiary,
                                    tertiary.length
                                );
                                tertiaryConstraints.push(constraint);
                            });
                        }
                    });
                });
                fontSizes.tertiary =
                    tertiaryConstraints.length > 0 ? Math.min(...tertiaryConstraints) : 12;
            }

            return fontSizes;
        }

        calculateOptimalTextSize(radialWidth, angularWidth, textLength) {
            // Calculate optimal font size for text within given constraints

            // Primary constraint: font height fits in ring thickness
            const maxHeightFromRing = radialWidth * 0.6; // Use 60% of ring thickness for text height

            // Secondary constraint: text length fits along radial span
            // For radial text, we have the full radial width to work with
            const availableRadialLength = radialWidth * 0.9; // Use 90% of radial span for text length

            // Estimate how much horizontal space the text would need at a given font size
            // Average character width is approximately 0.6 * font-size for typical fonts
            const averageCharWidth = 0.6;

            // Calculate maximum font size that allows text to fit within radial span
            const maxSizeFromLength = availableRadialLength / (textLength * averageCharWidth);

            // Take the smaller of the two constraints
            let optimalSize = Math.min(maxHeightFromRing, maxSizeFromLength);

            // RESPONSIVE CONSTRAINTS: Set bounds that scale with wheel size
            const isMobile = window.innerWidth <= 767;

            // Use much smaller minimums here since calculateFontSize will apply final responsive minimum
            const minSize = Math.max(2, this.containerSize * 0.004); // Very small minimum to let natural calculation work
            const maxSize = this.containerSize * 0.08; // Maximum reasonable size

            const boundedSize = Math.max(minSize, Math.min(maxSize, optimalSize));

            return boundedSize;
        }

        calculateFontSize(level) {
            // UNIFIED FONT CALCULATION: Use centralized responsive scaling system
            let fontSize;

            // Get dynamically calculated font size for the specified ring level
            if (this.dynamicFontSizes && this.dynamicFontSizes[level]) {
                fontSize = this.dynamicFontSizes[level];
            } else {
                // Fallback to basic sizing if dynamic sizes not calculated
                const baseSize = this.containerSize * 0.02;

                switch (level) {
                    case 'core':
                        fontSize = baseSize * 0.8;
                        break;
                    case 'secondary':
                        fontSize = baseSize * 0.7;
                        break;
                    case 'tertiary':
                        fontSize = baseSize * 0.6;
                        break;
                    default:
                        fontSize = baseSize;
                }
            }

            // SAFETY CHECK: Only apply responsive scaling if it exists
            if (this.responsiveScaling && this.responsiveScaling.fontScale) {
                // APPLY CENTRALIZED RESPONSIVE SCALING: Ensure consistent behavior across all pathways
                const responsiveMin = this.containerSize * this.responsiveScaling.fontScale;
                const scaledMin =
                    level === 'core'
                        ? responsiveMin
                        : level === 'secondary'
                          ? responsiveMin * 0.8
                          : responsiveMin * 0.6;

                // Return the larger of calculated size or responsive minimum
                return Math.max(scaledMin, fontSize);
            } else {
                // FALLBACK: Use legacy mobile-aware scaling when responsive scaling not yet available
                const isMobile = window.innerWidth <= 767;
                const minScale = isMobile ? 0.008 : 0.006;
                const responsiveMin = this.containerSize * minScale;
                const scaledMin =
                    level === 'core'
                        ? responsiveMin
                        : level === 'secondary'
                          ? responsiveMin * 0.8
                          : responsiveMin * 0.6;

                return Math.max(scaledMin, fontSize);
            }
        }

        // Helper function to lighten colors for middle and outer rings
        lightenColor(color, percent) {
            // Use the centralized color lightening function for consistency
            return FEELINGS_DATA.lightenColor(color, percent);
        }

        // Calculate dynamic angles based on secondary emotion counts
        calculateCoreAngles() {
            // Calculate total secondary emotions first
            const totalSecondary = this.data.core.reduce((sum, core) => {
                return sum + this.data.secondary[core.name].length;
            }, 0);

            const angles = [];
            // Calculate starting angle so Angry's center is at 0 degrees
            const angrySecondaryCount = this.data.secondary['Angry'].length;
            const angryAngleSize = (angrySecondaryCount / totalSecondary) * 360;
            const angryHalfWidth = angryAngleSize / 2;

            // Start at negative half of Angry's width so its center is at 0°
            let currentAngle = -angryHalfWidth;

            this.data.core.forEach((core) => {
                const secondaryCount = this.data.secondary[core.name].length;
                const angleSize = (secondaryCount / totalSecondary) * 360;

                angles.push({
                    name: core.name,
                    color: core.color,
                    start: currentAngle,
                    end: currentAngle + angleSize,
                    size: angleSize,
                });
                currentAngle += angleSize;
            });

            return angles;
        }

        // Create SVG path for a wedge
        createWedgePath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle) {
            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;

            const x1 = centerX + innerRadius * Math.cos(startAngleRad);
            const y1 = centerY + innerRadius * Math.sin(startAngleRad);
            const x2 = centerX + outerRadius * Math.cos(startAngleRad);
            const y2 = centerY + outerRadius * Math.sin(startAngleRad);

            const x3 = centerX + outerRadius * Math.cos(endAngleRad);
            const y3 = centerY + outerRadius * Math.sin(endAngleRad);
            const x4 = centerX + innerRadius * Math.cos(endAngleRad);
            const y4 = centerY + innerRadius * Math.sin(endAngleRad);

            const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

            const pathData = `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`;

            return pathData;
        }

        // Position text in the middle of a wedge with radial orientation
        positionText(centerX, centerY, radius, startAngle, endAngle) {
            const midAngle = (startAngle + endAngle) / 2;
            const midAngleRad = (midAngle * Math.PI) / 180;
            const x = centerX + radius * Math.cos(midAngleRad);
            const y = centerY + radius * Math.sin(midAngleRad);

            return { x, y, baseAngle: midAngle };
        }

        // Calculate dynamic text rotation based on wheel rotation.
        // The label is drawn along its OWN radius (baseAngle), but the up/down flip
        // decision uses flipAngle. For tertiary labels flipAngle is the SECONDARY
        // parent's midangle, so both words in a dyad flip together instead of
        // splitting when the pair straddles the 90/270 boundary. For core/secondary
        // labels flipAngle === baseAngle (no change from before).
        calculateTextRotation(baseAngle, flipAngle = baseAngle) {
            const totalRotation = (flipAngle + this.currentRotation) % 360;
            const normalizedAngle = totalRotation < 0 ? totalRotation + 360 : totalRotation;

            // Flip if the pair's orientation would be upside down (90–270 degrees).
            if (normalizedAngle > 90 && normalizedAngle < 270) {
                return baseAngle + 180;
            }
            return baseAngle;
        }

        // Update all text rotations based on current wheel rotation
        updateTextRotations() {
            this.textElements.forEach((textData) => {
                const newRotation = this.calculateTextRotation(
                    textData.baseAngle,
                    textData.flipAngle
                );
                textData.element.setAttribute(
                    'transform',
                    `rotate(${newRotation} ${textData.x} ${textData.y})`
                );
            });
        }

        generate() {
            // Clear container and text elements
            this.container.innerHTML = '';
            this.textElements = [];
            this.wedgeRegistry.clear();
            // Sequential nav index stamped on each wedge (see buildWedge) so keyboard
            // focus order follows generation order, not live DOM order (which shifts
            // when a selected wedge's <path> moves to the top layer).
            this._navCounter = 0;

            // Get container dimensions with DPI awareness
            if (!this.container) {
                console.error('❌ No container element found!');
                return;
            }

            const containerRect = this.container.getBoundingClientRect();

            // MOBILE FIX: Account for mobile layout constraints
            let availableWidth = containerRect.width;
            let availableHeight = containerRect.height;

            // Check if we're on mobile (viewport width <= 767px)
            const isMobile = window.innerWidth <= 767;

            if (isMobile) {
                // On mobile, account for bottom panel that takes 320px-340px
                // Get the actual info panel height to be precise
                const infoPanel = document.querySelector('.info-panel');
                let panelHeight = 320; // Default fallback

                if (infoPanel && !infoPanel.classList.contains('minimized')) {
                    // Panel is visible, get its actual height
                    const panelRect = infoPanel.getBoundingClientRect();
                    panelHeight = panelRect.height || 320;
                } else if (infoPanel && infoPanel.classList.contains('minimized')) {
                    // Panel is minimized, no height constraint
                    panelHeight = 0;
                }

                // Subtract panel height and some margin from available height
                availableHeight = Math.max(150, availableHeight - panelHeight - 20); // Lower minimum for very small screens

                // SMART ADAPTATION: If wheel becomes too small, suggest simplified mode
                const resultingSize = Math.min(availableWidth, availableHeight);
                if (resultingSize < 250 && !this.isSimplifiedMode) {
                    // Very small wheel - simplified mode would help but don't force it
                    console.info(
                        'ℹ️ Wheel is quite small. Consider using Simplified Mode for better text readability.'
                    );
                }
            }

            const cssSize = Math.min(availableWidth, availableHeight);

            // Update DPI information
            this.dpr = window.devicePixelRatio || 1;
            this.effectiveSize = cssSize * Math.min(this.dpr, 2); // Cap at 2x for reasonable scaling

            const size = cssSize; // Use CSS size for layout, effective size for font calculations

            // CRITICAL VALIDATION: Ensure we have a valid size
            if (!size || size <= 0) {
                console.error('❌ Invalid wheel size:', {
                    size,
                    cssSize,
                    availableWidth,
                    availableHeight,
                });
                return; // Don't generate wheel with invalid size
            }

            // Make the wheel fill almost the entire available space
            this.centerX = size / 2;
            this.centerY = size / 2;
            // Use 99% of available space for the wheel, with proper proportions
            const maxRadius = size * 0.495; // 49.5% of size = 99% diameter

            // Store size for font scaling
            this.containerSize = size;

            // CENTRALIZED RESPONSIVE SCALING SYSTEM
            this.responsiveScaling = this.calculateResponsiveScaling(size);

            // Calculate radii based on mode and available space
            if (this.isSimplifiedMode) {
                // In simplified mode, use more space since no outer ring
                this.middleRadius = maxRadius; // Use full available space
                this.coreRadius = maxRadius * 0.5; // 50% of available space (increased from 40%)
                this.outerRadius = maxRadius; // Not used but set for consistency
            } else {
                // Normal mode with three rings
                this.outerRadius = maxRadius;
                this.middleRadius = maxRadius * 0.7; // 70% of outer radius (increased from 62.5%)
                this.coreRadius = maxRadius * 0.35; // 35% of outer radius (increased from 25%)
            }

            // Calculate dynamic font sizes based on wedge dimensions and available space
            // This ensures text is optimally sized for each ring while maintaining uniformity
            this.dynamicFontSizes = this.calculateDynamicFontSizes();

            // Create SVG - fill container completely
            this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svg.setAttribute('width', '100%');
            this.svg.setAttribute('height', '100%');
            this.svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
            this.svg.style.cursor = 'grab';
            // Emotion labels use fill:currentColor; set the wheel's ink here (warm charcoal)
            // so text resolves to the palette. Kept as an inline style so file:// works.
            this.svg.style.color = '#2b2a28';
            // Expose the wheel as a labelled group of emotion buttons for assistive tech.
            this.svg.setAttribute('role', 'group');
            this.svg.setAttribute(
                'aria-label',
                'Feelings wheel. Use arrow keys to move between emotions and Enter or Space to select.'
            );

            // Create four layers for proper rendering
            // 1. Base layer for unemphasized wedges
            this.baseGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            this.baseGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
            this.baseGroup.setAttribute('class', 'wheel-main-group');
            this.svg.appendChild(this.baseGroup);

            // 2. Division lines layer (always on top, not affected by wedge movement)
            this.divisionLinesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            this.divisionLinesGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
            this.divisionLinesGroup.setAttribute('class', 'wheel-main-group');
            this.svg.appendChild(this.divisionLinesGroup);

            // 3. Shadow layer (renders above unemphasized, below emphasized) - NO CSS transforms
            this.shadowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            this.shadowGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
            this.svg.appendChild(this.shadowGroup);

            // 4. Top layer for emphasized wedges
            this.topGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            this.topGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
            this.topGroup.setAttribute('class', 'wheel-main-group');
            this.svg.appendChild(this.topGroup);

            // Keep wheelGroup as alias for baseGroup for compatibility
            this.wheelGroup = this.baseGroup;

            // Calculate core angles
            const coreAngles = this.calculateCoreAngles();

            // Create core wedges + labels (fill-only wedges; separators own strokes)
            coreAngles.forEach((core) => {
                const wedgeId = this.buildWedge({
                    level: 'core',
                    className: 'wedge core-wedge',
                    fill: core.color,
                    innerR: 0,
                    outerR: this.coreRadius,
                    start: core.start,
                    end: core.end,
                    emotion: core.name,
                    parent: null,
                });
                this.buildLabel({
                    level: 'core',
                    wedgeId,
                    emotion: core.name,
                    parent: null,
                    radius: this.coreRadius * 0.6,
                    start: core.start,
                    end: core.end,
                    smallMinFactor: 0.02,
                    smallScale: 0.7,
                });
            });

            // Create middle ring (secondary emotions)
            coreAngles.forEach((core) => {
                const secondaryEmotions = this.data.secondary[core.name];
                const anglePerSecondary = core.size / secondaryEmotions.length;

                secondaryEmotions.forEach((emotion, index) => {
                    const startAngle = core.start + index * anglePerSecondary;
                    const endAngle = startAngle + anglePerSecondary;

                    const wedgeId = this.buildWedge({
                        level: 'secondary',
                        className: 'wedge secondary-wedge',
                        fill: this.lightenColor(core.color, 40),
                        innerR: this.coreRadius,
                        outerR: this.middleRadius,
                        start: startAngle,
                        end: endAngle,
                        emotion,
                        parent: core.name,
                    });
                    this.buildLabel({
                        level: 'secondary',
                        wedgeId,
                        emotion,
                        parent: core.name,
                        radius: (this.coreRadius + this.middleRadius) / 2,
                        start: startAngle,
                        end: endAngle,
                        smallMinFactor: 0.015,
                        smallScale: 0.7,
                    });
                });
            });

            // Create outer ring (tertiary emotions) - only in full mode
            if (!this.isSimplifiedMode) {
                coreAngles.forEach((core) => {
                    const secondaryEmotions = this.data.secondary[core.name];
                    const anglePerSecondary = core.size / secondaryEmotions.length;

                    secondaryEmotions.forEach((emotion, index) => {
                        const tertiaryEmotions = this.data.tertiary[emotion] || [];
                        const secondaryStartAngle = core.start + index * anglePerSecondary;
                        const anglePerTertiary = anglePerSecondary / tertiaryEmotions.length;

                        tertiaryEmotions.forEach((tertiary, tertiaryIndex) => {
                            const startAngle =
                                secondaryStartAngle + tertiaryIndex * anglePerTertiary;
                            const endAngle = startAngle + anglePerTertiary;

                            const wedgeId = this.buildWedge({
                                level: 'tertiary',
                                className: 'wedge tertiary-wedge',
                                fill: this.lightenColor(core.color, 70),
                                innerR: this.middleRadius,
                                outerR: this.outerRadius,
                                start: startAngle,
                                end: endAngle,
                                emotion: tertiary,
                                parent: emotion,
                                grandparent: core.name,
                            });
                            this.buildLabel({
                                level: 'tertiary',
                                wedgeId,
                                emotion: tertiary,
                                parent: emotion,
                                grandparent: core.name,
                                radius: (this.middleRadius + this.outerRadius) / 2,
                                start: startAngle,
                                end: endAngle,
                                // Both dyad labels flip together, governed by the
                                // secondary parent's full span (not each half-slice).
                                flipStart: secondaryStartAngle,
                                flipEnd: secondaryStartAngle + anglePerSecondary,
                                smallMinFactor: 0.01,
                                smallScale: 0.6,
                            });
                        });
                    });
                });
            }

            // Create all division lines with gradient thickness after all rings are created
            this.createAllDivisionLines(coreAngles);

            // Set initial text rotations
            this.updateTextRotations();

            this.container.appendChild(this.svg);

            // Mark current mode as initialized
            const currentState = this.isSimplifiedMode
                ? this.simplifiedModeState
                : this.fullModeState;
            currentState.hasBeenInitialized = true;

            this.setupEventListeners();
        }

        // ===== WEDGE LAYER (fill-only) =====
        // Build one fill-only wedge path via the guarded factory, register its id,
        // attach accessibility + data attrs, append to the wheel group, and return
        // the wedge id (so the caller can pair a label to it). No stroke — the
        // separator layer owns every boundary.
        buildWedge({
            level,
            className,
            fill,
            innerR,
            outerR,
            start,
            end,
            emotion,
            parent,
            grandparent,
        }) {
            const wedgeId = this.createUniqueWedgeId(level, emotion, parent);
            const dataset = { emotion, level, 'wedge-id': wedgeId };
            if (parent !== null && parent !== undefined) dataset.parent = parent;
            if (grandparent !== undefined) dataset.grandparent = grandparent;
            // Stable keyboard-navigation order (independent of later DOM layer moves).
            dataset['nav-index'] = this._navCounter++;

            const path = makeWedgePath({
                d: this.createWedgePath(this.centerX, this.centerY, innerR, outerR, start, end),
                fill,
                className,
                dataset,
            });
            if (!path) return wedgeId;
            this.applyWedgeAccessibility(path, level, emotion, parent);
            this.wheelGroup.appendChild(path);
            return wedgeId;
        }

        // ===== LABEL LAYER =====
        // Build one radial text label paired to a wedge id, store it for rotation, and
        // append it. Keeps the prior adaptive small-wheel sizing per ring level.
        buildLabel({
            level,
            wedgeId,
            emotion,
            parent,
            grandparent,
            radius,
            start,
            end,
            flipStart,
            flipEnd,
            smallMinFactor,
            smallScale,
        }) {
            const textPos = this.positionText(this.centerX, this.centerY, radius, start, end);

            // The flip is governed by flipStart/flipEnd's midangle when provided (dyad
            // labels share their secondary parent's span), else the label's own span.
            const flipAngle =
                flipStart !== undefined && flipEnd !== undefined
                    ? (flipStart + flipEnd) / 2
                    : textPos.baseAngle;

            let fontSize = this.calculateFontSize(level);
            if (this.containerSize < 300) {
                fontSize = Math.max(this.containerSize * smallMinFactor, fontSize * smallScale);
            }

            const dataset = { emotion, level, 'wedge-id': wedgeId };
            if (parent !== null && parent !== undefined) dataset.parent = parent;
            if (grandparent !== undefined) dataset.grandparent = grandparent;

            const textEl = makeText({
                x: textPos.x,
                y: textPos.y,
                content: emotion,
                fontSize,
                dataset,
            });
            if (!textEl) return;
            this.textElements.push({
                element: textEl,
                baseAngle: textPos.baseAngle,
                flipAngle,
                x: textPos.x,
                y: textPos.y,
            });
            this.wheelGroup.appendChild(textEl);
        }

        createShadowCopy(originalWedge, wedgeId) {
            // Create a group to hold the shadow with offset
            const shadowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            shadowGroup.setAttribute('data-shadow-id', wedgeId);

            // Create a copy of the wedge for shadow layer
            const shadowWedge = originalWedge.cloneNode(true);

            // CRITICAL FIX: Remove data-wedge-id from shadow copy to prevent interference
            shadowWedge.removeAttribute('data-wedge-id');
            shadowWedge.setAttribute('class', 'shadow-wedge'); // Remove 'wedge' class to prevent selection
            shadowWedge.setAttribute('data-shadow-for', wedgeId); // Mark what it's a shadow for

            // Make shadow copy visible with a WARM, soft shadow (matches the palette
            // rather than a cold black blob). Values mirror the --wheel-shadow-* tokens.
            shadowWedge.setAttribute('fill', 'rgba(61, 52, 40, 0.28)');
            shadowWedge.setAttribute('stroke', 'none');
            shadowWedge.style.filter = 'blur(4px)';
            shadowWedge.style.pointerEvents = 'none';

            shadowGroup.appendChild(shadowWedge);
            this.shadowGroup.appendChild(shadowGroup);

            // Update shadow transform for fixed light source
            this.updateShadowTransform(shadowGroup);
        }

        removeShadowCopy(wedgeId) {
            const shadowGroup = this.shadowGroup.querySelector(`[data-shadow-id="${wedgeId}"]`);
            if (shadowGroup) {
                // Clear any lingering transforms or effects
                shadowGroup.style.transform = '';
                shadowGroup.style.filter = '';
                shadowGroup.style.opacity = '';
                this.shadowGroup.removeChild(shadowGroup);
            }
        }

        moveTextForWedge(emotion, level, parent, targetGroup, existingWedgeId = null) {
            // CRITICAL FIX: Use existing wedge ID if provided, otherwise create expected ID
            let wedgeId;
            if (existingWedgeId) {
                wedgeId = existingWedgeId;
            } else {
                wedgeId = this.createUniqueWedgeId(level, emotion, parent);
            }

            const textElement = this.container.querySelector(`text[data-wedge-id="${wedgeId}"]`);
            if (textElement) {
                targetGroup.appendChild(textElement);
            }
        }

        // ===== UNIQUE WEDGE ID SYSTEM =====

        createUniqueWedgeId(level, emotion, parent) {
            // Build the family-aware id string AND register its structured metadata so
            // that meaning is later recovered by lookup rather than by splitting the
            // string on '-' (which breaks for emotions containing that separator).
            const family =
                level === 'core'
                    ? emotion
                    : level === 'secondary'
                      ? parent
                      : level === 'tertiary'
                        ? this.findCoreFamily(parent)
                        : null;

            let id;
            switch (level) {
                case 'core':
                    id = `core-${emotion}`;
                    break;
                case 'secondary':
                    // Format: secondary-CoreFamily-SecondaryEmotion
                    id = `secondary-${parent}-${emotion}`;
                    break;
                case 'tertiary':
                    // Format: tertiary-CoreFamily-SecondaryParent-TertiaryEmotion
                    id = `tertiary-${family}-${parent}-${emotion}`;
                    break;
                default:
                    id = `${level}-${emotion}`;
            }

            this.wedgeRegistry.set(id, { level, emotion, parent: parent ?? null, family });
            return id;
        }

        findCoreFamily(secondaryEmotion) {
            // Find which core emotion family a secondary emotion belongs to
            for (const coreEmotion of this.data.core) {
                if (this.data.secondary[coreEmotion.name]?.includes(secondaryEmotion)) {
                    return coreEmotion.name;
                }
            }
            return 'Unknown';
        }

        // Human-readable label for assistive tech, e.g.
        // "Frustrated, a secondary emotion under Angry".
        buildWedgeAriaLabel(level, emotion, parent) {
            if (level === 'core') return `${emotion}, a core emotion`;
            if (level === 'secondary') return `${emotion}, a secondary emotion under ${parent}`;
            if (level === 'tertiary') return `${emotion}, a specific emotion under ${parent}`;
            return emotion;
        }

        // Apply the shared accessibility semantics to a wedge <path>. Wedges are
        // exposed as toggle buttons; keyboard focus/traversal is wired in interaction.js.
        applyWedgeAccessibility(path, level, emotion, parent) {
            path.setAttribute('role', 'button');
            path.setAttribute('tabindex', '-1'); // roving tabindex; one wedge made 0 after generation
            path.setAttribute('aria-pressed', 'false');
            path.setAttribute('aria-label', this.buildWedgeAriaLabel(level, emotion, parent));
        }

        parseUniqueWedgeId(wedgeId) {
            // Prefer the structured registry populated at generation time.
            const meta = this.wedgeRegistry.get(wedgeId);
            if (meta) {
                return {
                    level: meta.level,
                    emotion: meta.emotion,
                    parent: meta.parent,
                    coreFamily: meta.family,
                };
            }

            // Defensive fallback for ids not seen during generation (e.g. a stale id
            // referenced after a mode switch). Preserves the original parsing semantics.
            const parts = wedgeId.split('-');
            const level = parts[0];
            switch (level) {
                case 'core':
                    return {
                        level,
                        emotion: parts.slice(1).join('-'),
                        parent: null,
                        coreFamily: parts.slice(1).join('-'),
                    };
                case 'secondary':
                    return {
                        level,
                        emotion: parts.slice(2).join('-'),
                        parent: parts[1],
                        coreFamily: parts[1],
                    };
                case 'tertiary':
                    return {
                        level,
                        emotion: parts.slice(3).join('-'),
                        parent: parts[2],
                        coreFamily: parts[1],
                    };
                default:
                    return {
                        level,
                        emotion: parts.slice(1).join('-'),
                        parent: null,
                        coreFamily: null,
                    };
            }
        }

        findWedgeByUniqueId(level, emotion, parent) {
            // CRITICAL FIX: Create the expected ID format but don't recreate logic
            // This should match the ID that was set during generation
            const expectedWedgeId = this.createUniqueWedgeId(level, emotion, parent);

            // Use more specific selector to exclude shadow copies (they don't have 'wedge' class anymore)
            const element = this.container.querySelector(
                `.wedge[data-wedge-id="${expectedWedgeId}"]:not(.shadow-wedge)`
            );
            return element;
        }

        // Find wedge by its actual stored ID (most reliable)
        findWedgeByStoredId(wedgeId) {
            return this.container.querySelector(
                `.wedge[data-wedge-id="${wedgeId}"]:not(.shadow-wedge)`
            );
        }

        updateShadowTransform(shadowGroup) {
            // Fixed light source from top-left - shadow always casts toward bottom-right
            const shadowOffsetX = 4;
            const shadowOffsetY = 4;

            // For a fixed light source, the shadow offset direction stays constant in world space
            // The shadow content rotates with the wheel, but the offset stays fixed
            // No rotation of the offset - it always points toward bottom-right

            // Shadow content rotates with wheel, offset stays constant relative to screen
            shadowGroup.setAttribute(
                'transform',
                `translate(${shadowOffsetX}, ${shadowOffsetY}) rotate(${this.currentRotation} ${this.centerX} ${this.centerY})`
            );
        }

        updateAllShadowTransforms() {
            const shadowGroups = this.shadowGroup.querySelectorAll('[data-shadow-id]');
            shadowGroups.forEach((shadowGroup) => {
                this.updateShadowTransform(shadowGroup);
            });
        }

        // ===== SEPARATOR LAYER =====
        // The division lines + concentric ring circles own ALL of the wheel's
        // boundaries (wedges are fill-only), so every edge is drawn exactly once.
        createAllDivisionLines(coreAngles) {
            // Rings first (concentric arcs), then the radial hierarchy on top.
            this.buildRingCircles();

            // 1. Primary divisions (thickest): between core emotion families.
            this.createPrimaryDivisions(coreAngles);
            // 2. Secondary divisions (medium): between secondaries within a family.
            this.createSecondaryDivisions(coreAngles);
            // 3. Dyad divisions (thinnest, dashed): the split within each pair. Full mode only.
            if (!this.isSimplifiedMode) {
                this.createDyadDivisions(coreAngles);
            }
        }

        // Concentric ring circles at each ring boundary (core, middle, and — in full
        // mode — outer). These replace the arc edges the wedge outlines used to draw.
        buildRingCircles() {
            const s = this.responsiveScaling || {};
            const color = s.ringColor || '#4a453d';
            const width = s.ringStroke || Math.max(0.2, this.containerSize * 0.0022);
            const radii = this.isSimplifiedMode
                ? [this.coreRadius, this.middleRadius]
                : [this.coreRadius, this.middleRadius, this.outerRadius];

            radii.forEach((r) => {
                const ring = makeCircle({
                    cx: this.centerX,
                    cy: this.centerY,
                    r,
                    stroke: color,
                    width,
                    fill: 'none',
                    className: 'wheel-ring',
                });
                if (ring) this.divisionLinesGroup.appendChild(ring);
            });
        }

        createPrimaryDivisions(coreAngles) {
            const s = this.responsiveScaling || {};
            const color = s.lineColor || '#4a453d';
            const width = s.primaryDivisionStroke || Math.max(0.5, this.containerSize * 0.006);
            const endRadius = this.isSimplifiedMode ? this.middleRadius : this.outerRadius;

            coreAngles.forEach((core) => {
                const rad = (core.end * Math.PI) / 180; // family boundary = end of this core
                const el = makeLine({
                    x1: this.centerX,
                    y1: this.centerY,
                    x2: this.centerX + endRadius * Math.cos(rad),
                    y2: this.centerY + endRadius * Math.sin(rad),
                    stroke: color,
                    width,
                    className: 'primary-division-line',
                });
                if (el) this.divisionLinesGroup.appendChild(el);
            });
        }

        createSecondaryDivisions(coreAngles) {
            const s = this.responsiveScaling || {};
            const color = s.lineColor || '#4a453d';
            const width = s.secondaryDivisionStroke || Math.max(0.3, this.containerSize * 0.004);
            const endRadius = this.isSimplifiedMode ? this.middleRadius : this.outerRadius;

            coreAngles.forEach((core) => {
                const secondaryEmotions = this.data.secondary[core.name];
                const anglePerSecondary = core.size / secondaryEmotions.length;

                secondaryEmotions.forEach((emotion, index) => {
                    if (index === 0) return; // first boundary is the primary line
                    const rad = ((core.start + index * anglePerSecondary) * Math.PI) / 180;
                    const el = makeLine({
                        x1: this.centerX + this.coreRadius * Math.cos(rad),
                        y1: this.centerY + this.coreRadius * Math.sin(rad),
                        x2: this.centerX + endRadius * Math.cos(rad),
                        y2: this.centerY + endRadius * Math.sin(rad),
                        stroke: color,
                        width,
                        className: 'secondary-division-line',
                    });
                    if (el) this.divisionLinesGroup.appendChild(el);
                });
            });
        }

        createDyadDivisions(coreAngles) {
            const s = this.responsiveScaling || {};
            const color = s.lineColor || '#4a453d';
            // Dyad splits are the lightest hint of division — rendered as a row of
            // round DOTS (dasharray 0 + round linecap makes each dash a dot whose
            // diameter is the stroke width). Slightly thicker than the hairline dash
            // so the dots read, with a gap that scales with wheel size.
            const width = Math.max(
                0.6,
                (s.tertiaryDivisionStroke || this.containerSize * 0.001) * 1.6
            );
            const gap = Math.max(2, this.containerSize * 0.004);

            coreAngles.forEach((core) => {
                const secondaryEmotions = this.data.secondary[core.name];
                const anglePerSecondary = core.size / secondaryEmotions.length;

                secondaryEmotions.forEach((emotion, index) => {
                    const tertiaryEmotions = this.data.tertiary[emotion] || [];
                    if (tertiaryEmotions.length !== 2) return; // dyad = exactly 2
                    const secondaryStartAngle = core.start + index * anglePerSecondary;
                    const rad = ((secondaryStartAngle + anglePerSecondary / 2) * Math.PI) / 180;
                    const el = makeLine({
                        x1: this.centerX + this.middleRadius * Math.cos(rad),
                        y1: this.centerY + this.middleRadius * Math.sin(rad),
                        x2: this.centerX + this.outerRadius * Math.cos(rad),
                        y2: this.centerY + this.outerRadius * Math.sin(rad),
                        stroke: color,
                        width,
                        dash: `0 ${gap}`,
                        className: 'dyad-division-line',
                    });
                    if (el) el.setAttribute('stroke-linecap', 'round');
                    if (el) this.divisionLinesGroup.appendChild(el);
                });
            });
        }
    };
