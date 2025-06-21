// Feelings Wheel Generator - Complete with rotation and click handling
class FeelingsWheelGenerator {
    constructor(container, data) {
        this.container = container;
        this.data = data;
        this.centerX = 300;
        this.centerY = 300;
        this.coreRadius = 60;
        this.middleRadius = 150;
        this.outerRadius = 240;
        this.selectedWedges = new Set();
        
        // Rotation state
        this.currentRotation = 0;
        this.isDragging = false;
        this.lastMouseAngle = 0;
        this.svg = null;
        this.wheelGroup = null;
        this.textElements = [];
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
        
        // Create main group for rotation with proper transform origin
        this.wheelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.wheelGroup.style.transformOrigin = `${this.centerX}px ${this.centerY}px`;
        this.svg.appendChild(this.wheelGroup);
        
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
        
        // Create outer ring (tertiary emotions)
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

    updateRotation() {
        this.wheelGroup.style.transform = `rotate(${this.currentRotation}deg)`;
        this.updateTextRotations();
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
        } else {
            this.selectedWedges.add(wedgeId);
            wedge.classList.add('selected');
        }
        
        // Dispatch custom event for app to handle
        const customEvent = new CustomEvent('emotionSelected', {
            detail: { emotion, level, selected: this.selectedWedges.has(wedgeId) }
        });
        document.dispatchEvent(customEvent);
    }

    reset() {
        // Clear all selections
        this.selectedWedges.clear();
        
        // Reset all wedge styles
        const wedges = this.container.querySelectorAll('.wedge');
        wedges.forEach(wedge => {
            wedge.classList.remove('selected');
        });
        
        // Reset rotation
        this.currentRotation = 0;
        this.updateRotation();
    }
} 