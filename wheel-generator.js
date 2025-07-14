// Feelings Wheel Generator - Complete with rotation and click handling
class FeelingsWheelGenerator {
    constructor(container, data) {
        this.container = container;
        this.data = data;
        this.centerX = 300;
        this.centerY = 300;
        this.isChildrenMode = false;
        this.selectedWedges = new Set();
        
        // Rotation state
        this.currentRotation = 0;
        this.isDragging = false;
        this.lastMouseAngle = 0;
        this.svg = null;
        this.wheelGroup = null;
        this.textElements = [];
        
        // Set dynamic radii based on mode
        this.updateRadii();
    }
    
    updateRadii() {
        if (this.isChildrenMode) {
            // In children's mode, use the full available space for just two rings
            this.coreRadius = 80;
            this.middleRadius = 200;
            this.outerRadius = 240; // Not used in children's mode
        } else {
            // Normal mode with three rings
            this.coreRadius = 60;
            this.middleRadius = 150;
            this.outerRadius = 240;
        }
    }
    
    setChildrenMode(enabled) {
        this.isChildrenMode = enabled;
        this.updateRadii();
        this.regenerateWheel();
    }
    
    regenerateWheel() {
        // Clear existing wheel
        this.selectedWedges.clear();
        this.textElements = [];
        
        // Remove existing content
        if (this.svg) {
            this.svg.innerHTML = '';
        }
        
        // Generate new wheel
        this.generateWheel();
        this.positionResetButton();
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
        this.outerRadius = maxRadius;
        this.middleRadius = maxRadius * 0.625; // 62.5% of outer radius
        this.coreRadius = maxRadius * 0.25;    // 25% of outer radius
        

        
        // Create SVG - fill container completely
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        this.svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        this.svg.style.cursor = "grab";
        
        // Create three layers for proper shadow rendering
        // 1. Base layer for unemphasized wedges
        this.baseGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.baseGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
        this.svg.appendChild(this.baseGroup);
        
        // 2. Shadow layer (renders above unemphasized, below emphasized)
        this.shadowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.shadowGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
        this.svg.appendChild(this.shadowGroup);
        
        // 3. Top layer for emphasized wedges
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
            text.setAttribute("font-size", "12");
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
                text.setAttribute("font-size", "11");
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
        
        // Create primary emotion division lines
        this.createPrimaryDivisionLines(coreAngles);
        
        // Create outer ring (tertiary emotions) - only in full mode
        if (!this.isChildrenMode) {
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
                        text.setAttribute("font-size", "10");
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
        
        // Set initial text rotations
        this.updateTextRotations();
        
        this.container.appendChild(this.svg);
        
        // Position reset button based on actual wheel boundaries
        this.positionResetButton(containerRect);
        
        this.setupEventListeners();
    }

    positionResetButton(containerRect) {
        const resetButton = this.container.parentElement.querySelector('.reset-icon');
        if (!resetButton) return;
        
        // Calculate wheel boundaries within container
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const wheelDiameter = this.outerRadius * 2;
        
        // Calculate the gap between wheel edge and container edge
        let rightGapPercent, bottomGapPercent;
        
        if (containerWidth > containerHeight) {
            // Width is larger - wheel is limited by height
            const horizontalGap = (containerWidth - wheelDiameter) / 2;
            rightGapPercent = (horizontalGap / containerWidth) * 100;
            bottomGapPercent = 0.5; // Minimal gap for height-limited case
        } else {
            // Height is larger - wheel is limited by width
            const verticalGap = (containerHeight - wheelDiameter) / 2;
            bottomGapPercent = (verticalGap / containerHeight) * 100;
            rightGapPercent = 0.5; // Minimal gap for width-limited case
        }
        
        // Position reset button just inside wheel edge
        // rightGapPercent is the distance from container edge to wheel edge
        // We want the button slightly inside the wheel edge
        const buttonMargin = 10; // pixels inside wheel edge
        const rightPosition = rightGapPercent + (buttonMargin / containerWidth * 100);
        const bottomPosition = bottomGapPercent + (buttonMargin / containerHeight * 100);
        
        resetButton.style.right = `${rightPosition}%`;
        resetButton.style.bottom = `${bottomPosition}%`;
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
        this.topGroup.style.transform = `rotate(${this.currentRotation}deg)`;
        this.updateTextRotations();
        this.updateAllShadowTransforms();
    }
    
    updateShadowTransform(shadowGroup) {
        // Calculate shadow offset based on fixed light source (top-left)
        const shadowOffsetX = 4;
        const shadowOffsetY = 4;
        
        // Apply rotation to shadow content but offset for fixed light source
        const rotationRad = (this.currentRotation * Math.PI) / 180;
        const cosRot = Math.cos(rotationRad);
        const sinRot = Math.sin(rotationRad);
        
        // Calculate rotated offset to maintain fixed light source appearance
        const offsetX = shadowOffsetX * cosRot - shadowOffsetY * sinRot;
        const offsetY = shadowOffsetX * sinRot + shadowOffsetY * cosRot;
        
        shadowGroup.setAttribute('transform', 
            `translate(${offsetX}, ${offsetY}) rotate(${this.currentRotation} ${this.centerX} ${this.centerY})`);
    }
    
    updateAllShadowTransforms() {
        const shadowGroups = this.shadowGroup.querySelectorAll('[data-shadow-id]');
        shadowGroups.forEach(shadowGroup => {
            this.updateShadowTransform(shadowGroup);
        });
    }
    
    createPrimaryDivisionLines(coreAngles) {
        // Create thicker division lines between primary emotion families
        coreAngles.forEach((core, index) => {
            const nextCore = coreAngles[(index + 1) % coreAngles.length];
            const divisionAngle = core.end; // End of current core = start of next core
            
            // Create division line from center to outer edge
            const divisionAngleRad = divisionAngle * Math.PI / 180;
            const x1 = this.centerX + this.coreRadius * Math.cos(divisionAngleRad);
            const y1 = this.centerY + this.coreRadius * Math.sin(divisionAngleRad);
            
            // Use middle radius in children's mode, outer radius in full mode
            const endRadius = this.isChildrenMode ? this.middleRadius : this.outerRadius;
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
            
            this.wheelGroup.appendChild(divisionLine);
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
    }
} 