// Feelings Wheel Generator - Complete with rotation and click handling
class FeelingsWheelGenerator {
    constructor(container, data) {
        this.container = container;
        this.data = data;
        this.centerX = 300;
        this.centerY = 300;
        this.isSimplifiedMode = false;
        this.selectedWedges = new Set();
        
        // Rotation state
        this.currentRotation = 0;
        this.isDragging = false;
        this.lastMouseAngle = 0;
        this.svg = null;
        this.wheelGroup = null;
        this.textElements = [];
        
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
    
    updateRadii() {
        // Radii are now calculated dynamically in the generate() method
        // based on container size and mode. This method is kept for compatibility
        // but actual calculation happens in generate().
    }

    calculateDynamicFontSizes() {
        // Calculate optimal font sizes for each ring based on available wedge space
        // This analyzes all wedges in each ring to find the constraining factor
        
        // Calculate optimal font sizes for each ring based on available wedge space
        
        const coreAngles = this.calculateCoreAngles();
        const fontSizes = {};
        
        // Calculate core emotion font sizes
        const coreConstraints = coreAngles.map(core => {
            const radialWidth = this.coreRadius * 0.8; // Core is a circle, use 80% of radius for text space
            const angularWidth = core.size;
            const constraint = this.calculateOptimalTextSize(radialWidth, angularWidth, core.name.length);
            console.log(`Core "${core.name}": radial=${radialWidth.toFixed(1)}, angular=${angularWidth.toFixed(1)}°, chars=${core.name.length}, constraint=${constraint.toFixed(1)}px`);
            return constraint;
        });
        fontSizes.core = Math.min(...coreConstraints);

        
        // Calculate secondary emotion font sizes
        const secondaryConstraints = [];
        coreAngles.forEach(core => {
            const secondaryEmotions = this.data.secondary[core.name];
            const anglePerSecondary = core.size / secondaryEmotions.length;
            const radialWidth = this.middleRadius - this.coreRadius; // Ring thickness
            
            console.log(`\nSecondary ring for ${core.name}: ring thickness=${radialWidth.toFixed(1)}, angle per emotion=${anglePerSecondary.toFixed(1)}°`);
            
            secondaryEmotions.forEach(emotion => {
                const constraint = this.calculateOptimalTextSize(radialWidth, anglePerSecondary, emotion.length);
                console.log(`  "${emotion}": chars=${emotion.length}, constraint=${constraint.toFixed(1)}px`);
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
        // Calculate optimal font size based on wedge dimensions and text requirements
        
        // For radial text, the constraints are:
        // 1. Font height must fit within ring thickness (radial width)
        // 2. Text length must fit along the radial span (from inner to outer radius)
        
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
        
        // Apply reasonable bounds
        const minSize = Math.max(6, this.containerSize * 0.008); // Minimum readable size
        const maxSize = this.containerSize * 0.08; // Maximum reasonable size
        
        optimalSize = Math.max(minSize, Math.min(maxSize, optimalSize));
        
        return optimalSize;
    }

    calculateFontSize(level) {
        // Legacy method - now dynamically calculated sizes are stored and retrieved
        if (this.dynamicFontSizes) {
            return this.dynamicFontSizes[level] || this.containerSize * 0.02;
        }
        
        // Fallback to old system if dynamic sizes not yet calculated
        const baseSize = this.containerSize * 0.02;
        switch (level) {
            case 'core':
                return Math.max(10, baseSize * 0.8);
            case 'secondary':
                return Math.max(8, baseSize * 0.7);
            case 'tertiary':
                return Math.max(6, baseSize * 0.6);
            default:
                return baseSize;
        }
    }
    
    saveCurrentState() {
        const currentState = this.isSimplifiedMode ? this.simplifiedModeState : this.fullModeState;
        currentState.rotation = this.currentRotation;
        currentState.selectedWedges = new Set(this.selectedWedges);
        currentState.hasBeenInitialized = true;
    }
    
    restoreState(targetMode) {
        const targetState = targetMode ? this.simplifiedModeState : this.fullModeState;
        
        if (targetState.hasBeenInitialized) {
            // Restore previous state
            this.currentRotation = targetState.rotation;
            this.selectedWedges = new Set(targetState.selectedWedges);
        } else {
            // First time seeing this mode - reset state
            this.currentRotation = 0;
            this.selectedWedges = new Set();
        }
    }
    
    setSimplifiedMode(enabled) {
        // Save current state before switching
        this.saveCurrentState();
        
        // Switch mode
        this.isSimplifiedMode = enabled;
        this.updateRadii();
        
        // Restore state for new mode
        this.restoreState(enabled);
        
        // Regenerate wheel
        this.regenerateWheel();
    }
    
    regenerateWheel() {
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
        
        // Reposition controls after wheel regeneration
        setTimeout(() => {
            this.positionControlsIntelligently();
        }, 50); // Small delay to ensure DOM is updated
    }
    
    applySelectedWedges() {
        // Re-apply selection state to wedges after regeneration
        this.selectedWedges.forEach(wedgeId => {
            // Parse the stored wedgeId format: "level-emotion"
            const [level, emotion] = wedgeId.split('-', 2);
            
            // Skip tertiary emotions in simplified mode since they don't exist
            if (this.isSimplifiedMode && level === 'tertiary') {
                return;
            }
            
            const wedge = this.container.querySelector(`.wedge[data-emotion="${emotion}"][data-level="${level}"]`);
            if (wedge) {
                // Find the wedge click handler logic and apply it
                wedge.classList.add('selected');
                
                // Apply emphasis effect (move to top layer, add shadow)
                this.topGroup.appendChild(wedge);
                
                // Find corresponding text and move it too
                const textElements = this.container.querySelectorAll('text');
                textElements.forEach(textEl => {
                    if (textEl.textContent === emotion) {
                        this.topGroup.appendChild(textEl);
                    }
                });
                
                // Create shadow copy
                this.createShadowCopy(wedge, wedgeId);
            }
        });
    }

    // Helper function to lighten colors for middle and outer rings
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const R = (num >> 16) & 0xFF;
        const G = (num >> 8) & 0xFF;
        const B = num & 0xFF;
        
        // Use a more gradual lightening approach
        const factor = 1 + (percent / 100);
        const newR = Math.min(255, Math.round(R + (255 - R) * (percent / 100)));
        const newG = Math.min(255, Math.round(G + (255 - G) * (percent / 100)));
        const newB = Math.min(255, Math.round(B + (255 - B) * (percent / 100)));
        
        return "#" + ((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1);
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
        
        return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`;
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
        
        // Get container dimensions to size the wheel properly
        const containerRect = this.container.getBoundingClientRect();
        const size = Math.min(containerRect.width, containerRect.height);
        

        
        // Make the wheel fill almost the entire available space
        this.centerX = size / 2;
        this.centerY = size / 2;
        // Use 99% of available space for the wheel, with proper proportions
        const maxRadius = (size * 0.495); // 49.5% of size = 99% diameter
        
        // Store size for font scaling
        this.containerSize = size;
        
        // Calculate radii based on mode and available space
        if (this.isSimplifiedMode) {
            // In simplified mode, use more space since no outer ring
            this.middleRadius = maxRadius; // Use full available space
            this.coreRadius = maxRadius * 0.5; // 50% of available space (increased from 40%)
            this.outerRadius = maxRadius; // Not used but set for consistency
        } else {
            // Normal mode with three rings
            this.outerRadius = maxRadius;
            this.middleRadius = maxRadius * 0.625; // 62.5% of outer radius
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
        
        // Create four layers for proper rendering
        // 1. Base layer for unemphasized wedges
        this.baseGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.baseGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
        this.svg.appendChild(this.baseGroup);
        
        // 2. Division lines layer (always on top, not affected by wedge movement)
        this.divisionLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.divisionLinesGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
        this.svg.appendChild(this.divisionLinesGroup);
        
        // 3. Shadow layer (renders above unemphasized, below emphasized)
        this.shadowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.shadowGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
        this.svg.appendChild(this.shadowGroup);
        
        // 4. Top layer for emphasized wedges
        this.topGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.topGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
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
            path.setAttribute("stroke-width", "1");
            path.setAttribute("class", "wedge core-wedge");
            path.setAttribute("data-emotion", core.name);
            path.setAttribute("data-level", "core");
            path.style.cursor = "pointer";
            
            this.wheelGroup.appendChild(path);
            
            // Add core text
            const textPos = this.positionText(this.centerX, this.centerY, this.coreRadius * 0.6, core.start, core.end);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", textPos.x);
            text.setAttribute("y", textPos.y);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "middle");
            text.setAttribute("font-size", this.calculateFontSize('core'));
            text.setAttribute("font-weight", "normal");
            text.setAttribute("fill", "#333");
            text.setAttribute("pointer-events", "none");
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
                path.setAttribute("stroke-width", "1");
                path.setAttribute("class", "wedge secondary-wedge");
                path.setAttribute("data-emotion", emotion);
                path.setAttribute("data-level", "secondary");
                path.setAttribute("data-parent", core.name);
                path.style.cursor = "pointer";
                
                this.wheelGroup.appendChild(path);
                
                // Add secondary text
                const textPos = this.positionText(this.centerX, this.centerY, (this.coreRadius + this.middleRadius) / 2, startAngle, endAngle);
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", textPos.x);
                text.setAttribute("y", textPos.y);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("dominant-baseline", "middle");
                text.setAttribute("font-size", this.calculateFontSize('secondary'));
                text.setAttribute("font-weight", "normal");
                text.setAttribute("fill", "#333");
                text.setAttribute("pointer-events", "none");
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
                        path.setAttribute("stroke-width", "1");
                        path.setAttribute("class", "wedge tertiary-wedge");
                        path.setAttribute("data-emotion", tertiary);
                        path.setAttribute("data-level", "tertiary");
                        path.setAttribute("data-parent", emotion);
                        path.setAttribute("data-grandparent", core.name);
                        path.style.cursor = "pointer";
                        
                        this.wheelGroup.appendChild(path);
                        
                        // Add tertiary text
                        const textPos = this.positionText(this.centerX, this.centerY, (this.middleRadius + this.outerRadius) / 2, startAngle, endAngle);
                        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                        text.setAttribute("x", textPos.x);
                        text.setAttribute("y", textPos.y);
                        text.setAttribute("text-anchor", "middle");
                        text.setAttribute("dominant-baseline", "middle");
                        text.setAttribute("font-size", this.calculateFontSize('tertiary'));
                        text.setAttribute("font-weight", "normal");
                        text.setAttribute("fill", "#333");
                        text.setAttribute("pointer-events", "none");
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
        
        // Setup intelligent responsive controls positioning
        this.setupSmartControlsPositioning();
        
        // Mark current mode as initialized
        const currentState = this.isSimplifiedMode ? this.simplifiedModeState : this.fullModeState;
        currentState.hasBeenInitialized = true;
        
        this.setupEventListeners();
    }



    setupEventListeners() {
        // Mouse events for rotation
        this.svg.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.svg.style.cursor = 'grabbing';
            
            const rect = this.svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;
            
            this.lastMouseAngle = Math.atan2(mouseY, mouseX);
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const rect = this.svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;
            
            const currentMouseAngle = Math.atan2(mouseY, mouseX);
            const deltaAngle = (currentMouseAngle - this.lastMouseAngle) * (180 / Math.PI);
            
            this.currentRotation += deltaAngle;
            this.lastMouseAngle = currentMouseAngle;
            
            this.updateRotation();
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.svg.style.cursor = 'grab';
        });
        
        // Mouse wheel for rotation
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.currentRotation += e.deltaY > 0 ? 5 : -5;
            this.updateRotation();
        });
        
        // Click events for emotions
        this.svg.addEventListener('click', (e) => {
            if (this.isDragging) return;
            
            const emotion = e.target.getAttribute('data-emotion');
            if (emotion && e.target.classList.contains('wedge')) {
                this.handleWedgeClick(e);
            }
        });
    }

    handleWedgeClick(event) {
        const wedge = event.target;
        const emotion = wedge.getAttribute('data-emotion');
        const level = wedge.getAttribute('data-level');
        
        // Toggle selection
        const wedgeId = `${level}-${emotion}`;
        if (this.selectedWedges.has(wedgeId)) {
            this.selectedWedges.delete(wedgeId);
            wedge.classList.remove('selected');
            // Clear any lingering visual effects
            wedge.style.filter = '';
            wedge.style.opacity = '';
            wedge.style.transform = '';
            this.removeShadowCopy(wedgeId);
            // Move wedge and its text back to base layer
            this.baseGroup.appendChild(wedge);
            this.moveTextForWedge(emotion, this.baseGroup);
        } else {
            this.selectedWedges.add(wedgeId);
            wedge.classList.add('selected');
            this.createShadowCopy(wedge, wedgeId);
            // Move wedge and its text to top layer
            this.topGroup.appendChild(wedge);
            this.moveTextForWedge(emotion, this.topGroup);
        }
        
        // Dispatch custom event for app to handle
        const customEvent = new CustomEvent('emotionSelected', {
            detail: { emotion, level, selected: this.selectedWedges.has(wedgeId) }
        });
        document.dispatchEvent(customEvent);
    }

    createShadowCopy(originalWedge, wedgeId) {
        // Create a group to hold the shadow with offset
        const shadowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        shadowGroup.setAttribute('data-shadow-id', wedgeId);
        
        // Create a copy of the wedge for shadow layer
        const shadowWedge = originalWedge.cloneNode(true);
        shadowWedge.setAttribute('class', 'wedge shadow-wedge');
        
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

    moveTextForWedge(emotion, targetGroup) {
        // Find and move the text element for this emotion
        const textElements = this.container.querySelectorAll('text');
        textElements.forEach(textEl => {
            if (textEl.textContent === emotion) {
                targetGroup.appendChild(textEl);
            }
        });
    }

    updateRotation() {
        this.baseGroup.style.transform = `rotate(${this.currentRotation}deg)`;
        this.divisionLinesGroup.style.transform = `rotate(${this.currentRotation}deg)`;
        this.topGroup.style.transform = `rotate(${this.currentRotation}deg)`;
        this.updateTextRotations();
        this.updateAllShadowTransforms();
    }
    
    updateShadowTransform(shadowGroup) {
        // Calculate shadow offset based on fixed light source (top-left)
        const shadowOffsetX = 4;
        const shadowOffsetY = 4;
        
        // For a fixed light source, shadow should move opposite to wheel rotation
        // This creates the illusion that the light source stays fixed while the wheel rotates
        const rotationRad = (-this.currentRotation * Math.PI) / 180; // Negative rotation
        const cosRot = Math.cos(rotationRad);
        const sinRot = Math.sin(rotationRad);
        
        // Calculate shadow offset that maintains fixed light source appearance
        const offsetX = shadowOffsetX * cosRot - shadowOffsetY * sinRot;
        const offsetY = shadowOffsetX * sinRot + shadowOffsetY * cosRot;
        
        // Apply only the offset - the shadow content rotates with the wheel
        shadowGroup.setAttribute('transform', 
            `translate(${offsetX}, ${offsetY}) rotate(${this.currentRotation} ${this.centerX} ${this.centerY})`);
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
            divisionLine.setAttribute("stroke-width", "2.5");
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
                    divisionLine.setAttribute("stroke-width", "1.5");
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
                    divisionLine.setAttribute("stroke-width", "0.25");
                    divisionLine.setAttribute("class", "dyad-division-line");
                    divisionLine.style.pointerEvents = "none";
                    
                    this.divisionLinesGroup.appendChild(divisionLine);
                }
            });
        });
    }

    reset() {
        // Clear all selections
        this.selectedWedges.clear();
        
        // Reset all wedge styles and move back to base layer
        const wedges = this.container.querySelectorAll('.wedge');
        wedges.forEach(wedge => {
            wedge.classList.remove('selected');
            // Clear any lingering visual effects
            wedge.style.filter = '';
            wedge.style.opacity = '';
            wedge.style.transform = '';
            // Move wedge back to base layer if it's not already there
            if (wedge.parentNode !== this.baseGroup) {
                this.baseGroup.appendChild(wedge);
            }
        });
        
        // Move all text elements back to base layer
        const textElements = this.container.querySelectorAll('text');
        textElements.forEach(textEl => {
            if (textEl.parentNode !== this.baseGroup) {
                this.baseGroup.appendChild(textEl);
            }
        });
        
        // Clear all shadow copies
        this.shadowGroup.innerHTML = '';
        
        // Reset rotation
        this.currentRotation = 0;
        this.updateRotation();
        
        // Update the stored state for current mode only
        const currentState = this.isSimplifiedMode ? this.simplifiedModeState : this.fullModeState;
        currentState.rotation = 0;
        currentState.selectedWedges = new Set();
        currentState.hasBeenInitialized = true;
    }

    setupSmartControlsPositioning() {
        // Get the controls container
        const controls = this.container.parentElement.querySelector('.wheel-controls');
        if (!controls) return;
        
        // Store reference for resize handling
        this.controlsContainer = controls;
        
        // Calculate optimal positioning
        this.positionControlsIntelligently();
        
        // Setup resize observer for dynamic adaptation
        this.setupControlsResizeObserver();
        
        // Setup window resize handler with proper debouncing
        window.addEventListener('resize', () => {
            clearTimeout(this.windowResizeTimeout);
            this.windowResizeTimeout = setTimeout(() => {
                this.positionControlsIntelligently();
            }, 200); // Slightly longer debounce for window resize
        });
    }
    
    positionControlsIntelligently() {
        if (!this.controlsContainer || !this.svg) return;
        
        // Clear any previous positioning
        this.controlsContainer.style.left = '';
        this.controlsContainer.style.top = '';
        this.controlsContainer.style.right = '';
        this.controlsContainer.style.bottom = '';
        
        // Get actual dimensions
        const container = this.container;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        // Get actual SVG dimensions (the real wheel bounds)
        const svgWidth = this.svg.offsetWidth || this.outerRadius * 2;
        const svgHeight = this.svg.offsetHeight || this.outerRadius * 2;
        
        // Calculate where the wheel actually is (centered in container)
        const wheelCenterX = containerWidth / 2;
        const wheelCenterY = containerHeight / 2;
        const wheelRadius = Math.min(svgWidth, svgHeight) / 2;
        
        // Get controls dimensions (need to temporarily show to measure)
        const controlsWidth = this.controlsContainer.offsetWidth;
        const controlsHeight = this.controlsContainer.offsetHeight;
        
        const margin = 16;
        
        // Simple, reliable positioning strategy
        let finalX, finalY, layout = 'horizontal';
        
        // Try top-right (preferred)
        const topRightX = wheelCenterX + wheelRadius + margin;
        const topRightY = margin;
        
        if (topRightX + controlsWidth <= containerWidth - margin) {
            finalX = topRightX;
            finalY = topRightY;
        }
        // Try top-left
        else if (wheelCenterX - wheelRadius - controlsWidth - margin >= margin) {
            finalX = wheelCenterX - wheelRadius - controlsWidth - margin;
            finalY = topRightY;
        }
        // Try bottom-right
        else if (topRightX + controlsWidth <= containerWidth - margin && 
                 containerHeight - controlsHeight - margin > wheelCenterY + wheelRadius + margin) {
            finalX = topRightX;
            finalY = containerHeight - controlsHeight - margin;
        }
        // Try vertical layout in top-right
        else if (containerWidth - margin > 100) { // Min width for vertical
            finalX = containerWidth - 100 - margin;
            finalY = margin;
            layout = 'vertical';
        }
        // Fallback: overlay mode
        else {
            finalX = containerWidth - controlsWidth - margin;
            finalY = margin;
            layout = 'compact';
        }
        
        // Apply positioning
        this.controlsContainer.style.left = `${finalX}px`;
        this.controlsContainer.style.top = `${finalY}px`;
        this.controlsContainer.style.right = 'auto';
        this.controlsContainer.style.bottom = 'auto';
        
        // Apply layout
        this.controlsContainer.className = `wheel-controls layout-${layout}`;
    }
    

    
    setupControlsResizeObserver() {
        // Simple, reliable resize handling
        if (window.ResizeObserver) {
            this.controlsResizeObserver = new ResizeObserver(() => {
                // Debounce resize events
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    this.positionControlsIntelligently();
                }, 150); // Longer debounce for stability
            });
            
            this.controlsResizeObserver.observe(this.container);
        }
    }
} 