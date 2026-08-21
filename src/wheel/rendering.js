import { FEELINGS_DATA } from '../../feelings-data.js';

export const RenderingMixin = (Base) =>
    class extends Base {
        // ===== CENTRALIZED RESPONSIVE SCALING SYSTEM =====

        calculateResponsiveScaling(wheelSize) {
            // Create a unified scaling system for ALL visual parameters
            // This ensures consistent proportional scaling across the entire wheel

            const baseScale = wheelSize / 400; // Reference size: 400px wheel
            const isMobile = window.innerWidth <= 767;

            return {
                // Stroke widths (all scale proportionally) - reduced for lighter appearance
                primaryDivisionStroke: Math.max(0.4, wheelSize * 0.004),    // 0.4% of wheel size (was 0.6%)
                secondaryDivisionStroke: Math.max(0.2, wheelSize * 0.003),  // 0.3% of wheel size (was 0.4%)
                tertiaryDivisionStroke: Math.max(0.1, wheelSize * 0.0008),  // 0.08% of wheel size (was 0.1%)
                wedgeStroke: Math.max(0.2, wheelSize * 0.0015),             // 0.15% of wheel size (was 0.2%)
                // REMOVED selectedStroke: CSS handles selection emphasis with filters, not thick borders

                // Font scaling factors (use small percentages, not raw baseScale)
                fontScale: isMobile ?
                    Math.max(0.008, 0.006 * baseScale) :  // Mobile: 0.6% * scale factor
                    Math.max(0.006, 0.005 * baseScale),   // Desktop: 0.5% * scale factor

                // Touch target scaling for mobile accessibility
                touchTargetScale: isMobile ? Math.max(1.2, baseScale) : baseScale,

                // General scaling factor for other elements
                generalScale: baseScale
            };
        }

        updateAllResponsiveScaling() {
            // Update stroke widths for all existing elements after wheel resize
            // This ensures consistent scaling when wheel size changes

            if (!this.responsiveScaling) return; // Safety check

            // Update all regular wedges (selected and unselected use same stroke width)
            const allWedges = this.container.querySelectorAll('.wedge:not(.shadow-wedge)');
            allWedges.forEach(wedge => {
                // All wedges use standard stroke width - CSS handles selection emphasis
                wedge.setAttribute("stroke-width", this.responsiveScaling.wedgeStroke.toString());
            });

            // Update all division lines
            const primaryLines = this.container.querySelectorAll('.primary-division-line');
            primaryLines.forEach(line => {
                line.setAttribute("stroke-width", this.responsiveScaling.primaryDivisionStroke.toString());
            });

            const secondaryLines = this.container.querySelectorAll('.secondary-division-line');
            secondaryLines.forEach(line => {
                line.setAttribute("stroke-width", this.responsiveScaling.secondaryDivisionStroke.toString());
            });

            const tertiaryLines = this.container.querySelectorAll('.dyad-division-line');
            tertiaryLines.forEach(line => {
                line.setAttribute("stroke-width", this.responsiveScaling.tertiaryDivisionStroke.toString());
            });
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
            const coreConstraints = coreAngles.map(core => {
                const radialWidth = this.coreRadius * 0.8; // Core is a circle, use 80% of radius for text space
                const angularWidth = core.size;
                const constraint = this.calculateOptimalTextSize(radialWidth, angularWidth, core.name.length);
                return constraint;
            });
            fontSizes.core = Math.min(...coreConstraints);

            // Calculate secondary emotion font sizes
            const secondaryConstraints = [];
            coreAngles.forEach(core => {
                const secondaryEmotions = this.data.secondary[core.name];
                const anglePerSecondary = core.size / secondaryEmotions.length;
                const radialWidth = this.middleRadius - this.coreRadius; // Ring thickness

                secondaryEmotions.forEach(emotion => {
                    const constraint = this.calculateOptimalTextSize(radialWidth, anglePerSecondary, emotion.length);
                    secondaryConstraints.push(constraint);
                });
            });
            fontSizes.secondary = Math.min(...secondaryConstraints);

            // Calculate tertiary emotion font sizes (only in full mode)
            if (!this.isSimplifiedMode) {
                const tertiaryConstraints = [];
                coreAngles.forEach(core => {
                    const secondaryEmotions = this.data.secondary[core.name];
                    const anglePerSecondary = core.size / secondaryEmotions.length;

                    secondaryEmotions.forEach(emotion => {
                        const tertiaryEmotions = this.data.tertiary[emotion] || [];
                        if (tertiaryEmotions.length > 0) {
                            const anglePerTertiary = anglePerSecondary / tertiaryEmotions.length;
                            const radialWidth = this.outerRadius - this.middleRadius; // Ring thickness

                            tertiaryEmotions.forEach(tertiary => {
                                const constraint = this.calculateOptimalTextSize(radialWidth, anglePerTertiary, tertiary.length);
                                tertiaryConstraints.push(constraint);
                            });
                        }
                    });
                });
                fontSizes.tertiary = tertiaryConstraints.length > 0 ? Math.min(...tertiaryConstraints) : 12;
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
                const scaledMin = level === 'core' ? responsiveMin :
                                 level === 'secondary' ? responsiveMin * 0.8 :
                                 responsiveMin * 0.6;

                // Return the larger of calculated size or responsive minimum
                return Math.max(scaledMin, fontSize);
            } else {
                // FALLBACK: Use legacy mobile-aware scaling when responsive scaling not yet available
                const isMobile = window.innerWidth <= 767;
                const minScale = isMobile ? 0.008 : 0.006;
                const responsiveMin = this.containerSize * minScale;
                const scaledMin = level === 'core' ? responsiveMin :
                                 level === 'secondary' ? responsiveMin * 0.8 :
                                 responsiveMin * 0.6;

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
            const angrySecondaryCount = this.data.secondary["Angry"].length;
            const angryAngleSize = (angrySecondaryCount / totalSecondary) * 360;
            const angryHalfWidth = angryAngleSize / 2;

            // Start at negative half of Angry's width so its center is at 0°
            let currentAngle = -angryHalfWidth;

            this.data.core.forEach(core => {
                const secondaryCount = this.data.secondary[core.name].length;
                const angleSize = (secondaryCount / totalSecondary) * 360;

                angles.push({
                    name: core.name,
                    color: core.color,
                    start: currentAngle,
                    end: currentAngle + angleSize,
                    size: angleSize
                });
                currentAngle += angleSize;
            });

            return angles;
        }

        // Create SVG path for a wedge
        createWedgePath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle) {
            const startAngleRad = startAngle * Math.PI / 180;
            const endAngleRad = endAngle * Math.PI / 180;

            const x1 = centerX + innerRadius * Math.cos(startAngleRad);
            const y1 = centerY + innerRadius * Math.sin(startAngleRad);
            const x2 = centerX + outerRadius * Math.cos(startAngleRad);
            const y2 = centerY + outerRadius * Math.sin(startAngleRad);

            const x3 = centerX + outerRadius * Math.cos(endAngleRad);
            const y3 = centerY + outerRadius * Math.sin(endAngleRad);
            const x4 = centerX + innerRadius * Math.cos(endAngleRad);
            const y4 = centerY + innerRadius * Math.sin(endAngleRad);

            const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

            const pathData = `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`;



            return pathData;
        }

        // Position text in the middle of a wedge with radial orientation
        positionText(centerX, centerY, radius, startAngle, endAngle) {
            const midAngle = (startAngle + endAngle) / 2;
            const midAngleRad = midAngle * Math.PI / 180;
            const x = centerX + radius * Math.cos(midAngleRad);
            const y = centerY + radius * Math.sin(midAngleRad);

            return { x, y, baseAngle: midAngle };
        }

        // Calculate dynamic text rotation based on wheel rotation
        calculateTextRotation(baseAngle) {
            const totalRotation = (baseAngle + this.currentRotation) % 360;
            const normalizedAngle = totalRotation < 0 ? totalRotation + 360 : totalRotation;

            // Text runs along radius - use base angle for radial orientation
            let textRotation = baseAngle;

            // Flip text if it would be upside down (between 90 and 270 degrees)
            if (normalizedAngle > 90 && normalizedAngle < 270) {
                textRotation = baseAngle + 180;
            }

            return textRotation;
        }

        // Update all text rotations based on current wheel rotation
        updateTextRotations() {
            this.textElements.forEach(textData => {
                const newRotation = this.calculateTextRotation(textData.baseAngle);
                textData.element.setAttribute("transform", `rotate(${newRotation} ${textData.x} ${textData.y})`);
            });
        }

        generate() {
            // Clear container and text elements
            this.container.innerHTML = '';
            this.textElements = [];
            this.wedgeRegistry.clear();

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
                    console.info('ℹ️ Wheel is quite small. Consider using Simplified Mode for better text readability.');
                }
            }

            const cssSize = Math.min(availableWidth, availableHeight);

            // Update DPI information
            this.dpr = window.devicePixelRatio || 1;
            this.effectiveSize = cssSize * Math.min(this.dpr, 2); // Cap at 2x for reasonable scaling

            const size = cssSize; // Use CSS size for layout, effective size for font calculations

            // CRITICAL VALIDATION: Ensure we have a valid size
            if (!size || size <= 0) {
                console.error('❌ Invalid wheel size:', { size, cssSize, availableWidth, availableHeight });
                return; // Don't generate wheel with invalid size
            }

            // Make the wheel fill almost the entire available space
            this.centerX = size / 2;
            this.centerY = size / 2;
            // Use 99% of available space for the wheel, with proper proportions
            const maxRadius = (size * 0.495); // 49.5% of size = 99% diameter

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
                this.coreRadius = maxRadius * 0.35;    // 35% of outer radius (increased from 25%)
            }



            // Calculate dynamic font sizes based on wedge dimensions and available space
            // This ensures text is optimally sized for each ring while maintaining uniformity
            this.dynamicFontSizes = this.calculateDynamicFontSizes();

            // Create SVG - fill container completely
            this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.svg.setAttribute("width", "100%");
            this.svg.setAttribute("height", "100%");
            this.svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
            this.svg.style.cursor = "grab";
            // Expose the wheel as a labelled group of emotion buttons for assistive tech.
            this.svg.setAttribute("role", "group");
            this.svg.setAttribute("aria-label", "Feelings wheel. Use arrow keys to move between emotions and Enter or Space to select.");

            // Create four layers for proper rendering
            // 1. Base layer for unemphasized wedges
            this.baseGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.baseGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
            this.baseGroup.setAttribute('class', 'wheel-main-group');
            this.svg.appendChild(this.baseGroup);

            // 2. Division lines layer (always on top, not affected by wedge movement)
            this.divisionLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.divisionLinesGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
            this.divisionLinesGroup.setAttribute('class', 'wheel-main-group');
            this.svg.appendChild(this.divisionLinesGroup);

            // 3. Shadow layer (renders above unemphasized, below emphasized) - NO CSS transforms
            this.shadowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.shadowGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
            this.svg.appendChild(this.shadowGroup);

            // 4. Top layer for emphasized wedges
            this.topGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.topGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
            this.topGroup.setAttribute('class', 'wheel-main-group');
            this.svg.appendChild(this.topGroup);

            // Keep wheelGroup as alias for baseGroup for compatibility
            this.wheelGroup = this.baseGroup;

            // Calculate core angles
            const coreAngles = this.calculateCoreAngles();

            // Create core wedges
            coreAngles.forEach(core => {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", this.createWedgePath(
                    this.centerX, this.centerY, 0, this.coreRadius,
                    core.start, core.end
                ));
                path.setAttribute("fill", core.color);
                path.setAttribute("stroke", "#333");
                // RESPONSIVE WEDGE STROKE: Use centralized scaling system with safety check
                const strokeWidth = (this.responsiveScaling && this.responsiveScaling.wedgeStroke) ?
                    this.responsiveScaling.wedgeStroke : Math.max(0.3, this.containerSize * 0.002);
                path.setAttribute("stroke-width", strokeWidth.toString());
                path.setAttribute("class", "wedge core-wedge");
                path.setAttribute("data-emotion", core.name);
                path.setAttribute("data-level", "core");
                // Add unique wedge ID for proper identification
                const coreWedgeId = this.createUniqueWedgeId("core", core.name, null);
                path.setAttribute("data-wedge-id", coreWedgeId);
                this.applyWedgeAccessibility(path, "core", core.name, null);
                path.style.cursor = "pointer";

                this.wheelGroup.appendChild(path);

                // Add core text
                const textPos = this.positionText(this.centerX, this.centerY, this.coreRadius * 0.6, core.start, core.end);
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", textPos.x);
                text.setAttribute("y", textPos.y);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("dominant-baseline", "middle");

                // SMART TEXT SIZING: Start with calculated size but allow adaptive sizing for small wheels
                let fontSize = this.calculateFontSize('core');
                if (this.containerSize < 300) {
                    // For very small wheels, prioritize fitting over minimum size
                    fontSize = Math.max(this.containerSize * 0.02, fontSize * 0.7);
                }

                text.setAttribute("font-size", `${fontSize}px`);
                text.setAttribute("font-weight", "normal");
                text.setAttribute("fill", "#333");
                text.setAttribute("pointer-events", "none");
                // Add data attributes for unique identification
                text.setAttribute("data-emotion", core.name);
                text.setAttribute("data-level", "core");
                // Add unique wedge ID to text as well for proper text-wedge association
                text.setAttribute("data-wedge-id", coreWedgeId);
                text.textContent = core.name;

                // Store text element for dynamic rotation
                this.textElements.push({
                    element: text,
                    baseAngle: textPos.baseAngle,
                    x: textPos.x,
                    y: textPos.y
                });

                this.wheelGroup.appendChild(text);
            });

            // Create middle ring (secondary emotions)
            coreAngles.forEach(core => {
                const secondaryEmotions = this.data.secondary[core.name];
                const anglePerSecondary = core.size / secondaryEmotions.length;

                secondaryEmotions.forEach((emotion, index) => {
                    const startAngle = core.start + (index * anglePerSecondary);
                    const endAngle = startAngle + anglePerSecondary;

                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("d", this.createWedgePath(
                        this.centerX, this.centerY, this.coreRadius, this.middleRadius,
                        startAngle, endAngle
                    ));
                    path.setAttribute("fill", this.lightenColor(core.color, 40));
                    path.setAttribute("stroke", "#333");
                    // RESPONSIVE WEDGE STROKE: Use centralized scaling system with safety check
                    const strokeWidth = (this.responsiveScaling && this.responsiveScaling.wedgeStroke) ?
                        this.responsiveScaling.wedgeStroke : Math.max(0.3, this.containerSize * 0.002);
                    path.setAttribute("stroke-width", strokeWidth.toString());
                    path.setAttribute("class", "wedge secondary-wedge");
                    path.setAttribute("data-emotion", emotion);
                    path.setAttribute("data-level", "secondary");
                    path.setAttribute("data-parent", core.name);
                    // Add unique wedge ID for proper identification
                    const secondaryWedgeId = this.createUniqueWedgeId("secondary", emotion, core.name);
                    path.setAttribute("data-wedge-id", secondaryWedgeId);
                    this.applyWedgeAccessibility(path, "secondary", emotion, core.name);
                    path.style.cursor = "pointer";

                    this.wheelGroup.appendChild(path);

                    // Add secondary text
                    const textPos = this.positionText(this.centerX, this.centerY, (this.coreRadius + this.middleRadius) / 2, startAngle, endAngle);
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", textPos.x);
                    text.setAttribute("y", textPos.y);
                    text.setAttribute("text-anchor", "middle");
                    text.setAttribute("dominant-baseline", "middle");

                    // SMART TEXT SIZING: Adaptive sizing for small wheels
                    let fontSize = this.calculateFontSize('secondary');
                    if (this.containerSize < 300) {
                        fontSize = Math.max(this.containerSize * 0.015, fontSize * 0.7);
                    }

                    text.setAttribute("font-size", `${fontSize}px`);
                    text.setAttribute("font-weight", "normal");
                    text.setAttribute("fill", "#333");
                    text.setAttribute("pointer-events", "none");
                    // Add data attributes for unique identification
                    text.setAttribute("data-emotion", emotion);
                    text.setAttribute("data-level", "secondary");
                    text.setAttribute("data-parent", core.name);
                    // Add unique wedge ID to text as well for proper text-wedge association
                    text.setAttribute("data-wedge-id", secondaryWedgeId);
                    text.textContent = emotion;

                    // Store text element for dynamic rotation
                    this.textElements.push({
                        element: text,
                        baseAngle: textPos.baseAngle,
                        x: textPos.x,
                        y: textPos.y
                    });

                    this.wheelGroup.appendChild(text);
                });
            });

            // Create outer ring (tertiary emotions) - only in full mode
            if (!this.isSimplifiedMode) {
                coreAngles.forEach(core => {
                    const secondaryEmotions = this.data.secondary[core.name];
                    const anglePerSecondary = core.size / secondaryEmotions.length;

                    secondaryEmotions.forEach((emotion, index) => {
                        const tertiaryEmotions = this.data.tertiary[emotion] || [];
                        const secondaryStartAngle = core.start + (index * anglePerSecondary);
                        const anglePerTertiary = anglePerSecondary / tertiaryEmotions.length;

                        tertiaryEmotions.forEach((tertiary, tertiaryIndex) => {
                            const startAngle = secondaryStartAngle + (tertiaryIndex * anglePerTertiary);
                            const endAngle = startAngle + anglePerTertiary;

                            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                            path.setAttribute("d", this.createWedgePath(
                                this.centerX, this.centerY, this.middleRadius, this.outerRadius,
                                startAngle, endAngle
                            ));
                            path.setAttribute("fill", this.lightenColor(core.color, 70));
                            path.setAttribute("stroke", "#333");
                            // RESPONSIVE WEDGE STROKE: Use centralized scaling system with safety check
                            const strokeWidth = (this.responsiveScaling && this.responsiveScaling.wedgeStroke) ?
                                this.responsiveScaling.wedgeStroke : Math.max(0.3, this.containerSize * 0.002);
                            path.setAttribute("stroke-width", strokeWidth.toString());
                            path.setAttribute("class", "wedge tertiary-wedge");
                            path.setAttribute("data-emotion", tertiary);
                            path.setAttribute("data-level", "tertiary");
                            path.setAttribute("data-parent", emotion);
                            path.setAttribute("data-grandparent", core.name);
                            // Add unique wedge ID for proper identification
                            const tertiaryWedgeId = this.createUniqueWedgeId("tertiary", tertiary, emotion);
                            path.setAttribute("data-wedge-id", tertiaryWedgeId);
                            this.applyWedgeAccessibility(path, "tertiary", tertiary, emotion);
                            path.style.cursor = "pointer";

                            this.wheelGroup.appendChild(path);

                            // Add tertiary text
                            const textPos = this.positionText(this.centerX, this.centerY, (this.middleRadius + this.outerRadius) / 2, startAngle, endAngle);
                            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                            text.setAttribute("x", textPos.x);
                            text.setAttribute("y", textPos.y);
                            text.setAttribute("text-anchor", "middle");
                            text.setAttribute("dominant-baseline", "middle");

                            // SMART TEXT SIZING: Adaptive sizing for small wheels
                            let fontSize = this.calculateFontSize('tertiary');
                            if (this.containerSize < 300) {
                                fontSize = Math.max(this.containerSize * 0.01, fontSize * 0.6);
                            }

                            text.setAttribute("font-size", `${fontSize}px`);
                            text.setAttribute("font-weight", "normal");
                            text.setAttribute("fill", "#333");
                            text.setAttribute("pointer-events", "none");
                            // Add data attributes for unique identification
                            text.setAttribute("data-emotion", tertiary);
                            text.setAttribute("data-level", "tertiary");
                            text.setAttribute("data-parent", emotion);
                            text.setAttribute("data-grandparent", core.name);
                            // Add unique wedge ID to text as well for proper text-wedge association
                            text.setAttribute("data-wedge-id", tertiaryWedgeId);
                            text.textContent = tertiary;

                            // Store text element for dynamic rotation
                            this.textElements.push({
                                element: text,
                                baseAngle: textPos.baseAngle,
                                x: textPos.x,
                                y: textPos.y
                            });

                            this.wheelGroup.appendChild(text);
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
            const currentState = this.isSimplifiedMode ? this.simplifiedModeState : this.fullModeState;
            currentState.hasBeenInitialized = true;

            this.setupEventListeners();
        }

        createShadowCopy(originalWedge, wedgeId) {
            // Create a group to hold the shadow with offset
            const shadowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            shadowGroup.setAttribute('data-shadow-id', wedgeId);

            // Create a copy of the wedge for shadow layer
            const shadowWedge = originalWedge.cloneNode(true);

            // CRITICAL FIX: Remove data-wedge-id from shadow copy to prevent interference
            shadowWedge.removeAttribute('data-wedge-id');
            shadowWedge.setAttribute('class', 'shadow-wedge'); // Remove 'wedge' class to prevent selection
            shadowWedge.setAttribute('data-shadow-for', wedgeId); // Mark what it's a shadow for

            // Make shadow copy visible with proper shadow styling
            shadowWedge.setAttribute('fill', 'rgba(0, 0, 0, 0.3)');
            shadowWedge.setAttribute('stroke', 'none');
            shadowWedge.style.filter = 'blur(3px)';
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
                    return { level, emotion: parts.slice(1).join('-'), parent: null, coreFamily: parts.slice(1).join('-') };
                case 'secondary':
                    return { level, emotion: parts.slice(2).join('-'), parent: parts[1], coreFamily: parts[1] };
                case 'tertiary':
                    return { level, emotion: parts.slice(3).join('-'), parent: parts[2], coreFamily: parts[1] };
                default:
                    return { level, emotion: parts.slice(1).join('-'), parent: null, coreFamily: null };
            }
        }

        findWedgeByUniqueId(level, emotion, parent) {
            // CRITICAL FIX: Create the expected ID format but don't recreate logic
            // This should match the ID that was set during generation
            const expectedWedgeId = this.createUniqueWedgeId(level, emotion, parent);

            // Use more specific selector to exclude shadow copies (they don't have 'wedge' class anymore)
            const element = this.container.querySelector(`.wedge[data-wedge-id="${expectedWedgeId}"]:not(.shadow-wedge)`);
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
            shadowGroup.setAttribute('transform',
                `translate(${shadowOffsetX}, ${shadowOffsetY}) rotate(${this.currentRotation} ${this.centerX} ${this.centerY})`);
        }

        updateAllShadowTransforms() {
            const shadowGroups = this.shadowGroup.querySelectorAll('[data-shadow-id]');
            shadowGroups.forEach(shadowGroup => {
                this.updateShadowTransform(shadowGroup);
            });
        }

        createAllDivisionLines(coreAngles) {
            // Create division lines with gradient thickness based on hierarchy

            // 1. Primary divisions (thickest, 2.5px): Between core emotions
            this.createPrimaryDivisions(coreAngles);

            // 2. Secondary divisions (medium, 1.5px): Between secondary emotions within each core group
            this.createSecondaryDivisions(coreAngles);

            // 3. Dyad divisions (thinnest, 1px): Between emotions within each dyad pair
            if (!this.isSimplifiedMode) {
                this.createDyadDivisions(coreAngles);
            }
        }

        createPrimaryDivisions(coreAngles) {
            // Create thickest division lines between primary emotion families
            coreAngles.forEach((core, index) => {
                const divisionAngle = core.end; // End of current core = start of next core

                // Create division line from center to outer edge (like radii)
                const divisionAngleRad = divisionAngle * Math.PI / 180;
                const x1 = this.centerX; // Start from center
                const y1 = this.centerY; // Start from center

                // Use middle radius in simplified mode, outer radius in full mode
                const endRadius = this.isSimplifiedMode ? this.middleRadius : this.outerRadius;
                const x2 = this.centerX + endRadius * Math.cos(divisionAngleRad);
                const y2 = this.centerY + endRadius * Math.sin(divisionAngleRad);

                const divisionLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                divisionLine.setAttribute("x1", x1);
                divisionLine.setAttribute("y1", y1);
                divisionLine.setAttribute("x2", x2);
                divisionLine.setAttribute("y2", y2);
                divisionLine.setAttribute("stroke", "#333");
                // RESPONSIVE STROKE WIDTH: Use centralized scaling system with safety check
                const strokeWidth = (this.responsiveScaling && this.responsiveScaling.primaryDivisionStroke) ?
                    this.responsiveScaling.primaryDivisionStroke : Math.max(0.5, this.containerSize * 0.006);
                divisionLine.setAttribute("stroke-width", strokeWidth.toString());
                divisionLine.setAttribute("class", "primary-division-line");
                divisionLine.style.pointerEvents = "none";

                this.divisionLinesGroup.appendChild(divisionLine);
            });
        }

        createSecondaryDivisions(coreAngles) {
            // Create medium thickness division lines between secondary emotions
            coreAngles.forEach(core => {
                const secondaryEmotions = this.data.secondary[core.name];
                const anglePerSecondary = core.size / secondaryEmotions.length;

                secondaryEmotions.forEach((emotion, index) => {
                    if (index > 0) { // Skip first emotion (no line before it)
                        const divisionAngle = core.start + (index * anglePerSecondary);
                        const divisionAngleRad = divisionAngle * Math.PI / 180;

                        // Line from core radius to outer edge
                        const x1 = this.centerX + this.coreRadius * Math.cos(divisionAngleRad);
                        const y1 = this.centerY + this.coreRadius * Math.sin(divisionAngleRad);

                        const endRadius = this.isSimplifiedMode ? this.middleRadius : this.outerRadius;
                        const x2 = this.centerX + endRadius * Math.cos(divisionAngleRad);
                        const y2 = this.centerY + endRadius * Math.sin(divisionAngleRad);

                        const divisionLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        divisionLine.setAttribute("x1", x1);
                        divisionLine.setAttribute("y1", y1);
                        divisionLine.setAttribute("x2", x2);
                        divisionLine.setAttribute("y2", y2);
                        divisionLine.setAttribute("stroke", "#333");
                        // RESPONSIVE STROKE WIDTH: Use centralized scaling system with safety check
                        const strokeWidth = (this.responsiveScaling && this.responsiveScaling.secondaryDivisionStroke) ?
                            this.responsiveScaling.secondaryDivisionStroke : Math.max(0.3, this.containerSize * 0.004);
                        divisionLine.setAttribute("stroke-width", strokeWidth.toString());
                        divisionLine.setAttribute("class", "secondary-division-line");
                        divisionLine.style.pointerEvents = "none";

                        this.divisionLinesGroup.appendChild(divisionLine);
                    }
                });
            });
        }

        createDyadDivisions(coreAngles) {
            // Create thinnest division lines between emotions within each dyad pair
            coreAngles.forEach(core => {
                const secondaryEmotions = this.data.secondary[core.name];
                const anglePerSecondary = core.size / secondaryEmotions.length;

                secondaryEmotions.forEach((emotion, index) => {
                    const tertiaryEmotions = this.data.tertiary[emotion] || [];
                    if (tertiaryEmotions.length === 2) { // Should always be 2 for dyad pairs
                        const secondaryStartAngle = core.start + (index * anglePerSecondary);
                        const anglePerTertiary = anglePerSecondary / tertiaryEmotions.length;

                        // Create division line between the two emotions in the dyad
                        const divisionAngle = secondaryStartAngle + anglePerTertiary;
                        const divisionAngleRad = divisionAngle * Math.PI / 180;

                        // Line from middle radius to outer radius
                        const x1 = this.centerX + this.middleRadius * Math.cos(divisionAngleRad);
                        const y1 = this.centerY + this.middleRadius * Math.sin(divisionAngleRad);
                        const x2 = this.centerX + this.outerRadius * Math.cos(divisionAngleRad);
                        const y2 = this.centerY + this.outerRadius * Math.sin(divisionAngleRad);

                        const divisionLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        divisionLine.setAttribute("x1", x1);
                        divisionLine.setAttribute("y1", y1);
                        divisionLine.setAttribute("x2", x2);
                        divisionLine.setAttribute("y2", y2);
                        divisionLine.setAttribute("stroke", "#333");
                        // RESPONSIVE STROKE WIDTH: Use centralized scaling system with safety check
                        const strokeWidth = (this.responsiveScaling && this.responsiveScaling.tertiaryDivisionStroke) ?
                            this.responsiveScaling.tertiaryDivisionStroke : Math.max(0.1, this.containerSize * 0.001);
                        divisionLine.setAttribute("stroke-width", strokeWidth.toString());
                        divisionLine.setAttribute("class", "dyad-division-line");
                        divisionLine.style.pointerEvents = "none";

                        this.divisionLinesGroup.appendChild(divisionLine);
                    }
                });
            });
        }
    };
