# Feelings Wheel Interactive Web Application
## Product Requirements Document (PRD)

### Executive Summary

The Feelings Wheel is a therapeutic web application designed to help users explore their emotional vocabulary through an interactive, rotatable wheel interface. Based on Geoffrey Roberts' Emotional Word Wheel design, this application serves as a digital tool for emotional self-discovery and awareness in both therapeutic and educational contexts.

### Product Vision

To create an accessible, intuitive digital platform that empowers users to explore, understand, and articulate their emotions through evidence-based therapeutic frameworks, supporting both individual emotional development and professional therapeutic practice.

### Target Audience

**Primary Users:**
- Individual users seeking emotional self-awareness and development
- Therapists and counselors using Emotion-Based Therapy approaches
- Educational institutions teaching emotional intelligence

**Secondary Users:**
- Parents and caregivers supporting children's emotional development
- Mental health organizations and clinics
- Researchers studying emotional recognition and processing

### Core Features

#### 1. Interactive Wheel Interface
- **Three-Ring Emotional Structure**: Core emotions (center), secondary emotions (middle), tertiary emotions (outer)
- **Seven Primary Emotions**: Happy, Surprised, Bad, Fearful, Angry, Disgusted, Sad
- **Dynamic Rotation**: Smooth click-and-drag rotation with momentum
- **Multi-Selection**: Click to emphasize multiple emotions simultaneously
- **Visual Emphasis**: Enhanced saturation, brightness, and shadow effects for selected emotions

#### 2. Advanced Visual System
- **Layered Rendering**: Three-layer system (base, shadow, emphasis) for sophisticated visual effects
- **Radial Text Orientation**: Text rotates with wheel while maintaining optimal readability
- **Responsive Design**: Adapts to all screen sizes and orientations
- **Color Psychology**: Therapeutic color families with scientifically-informed lightening

#### 3. Accessibility Features
- **Touch Support**: Full mobile and tablet compatibility
- **Keyboard Navigation**: Accessible input methods
- **Screen Reader Support**: Semantic HTML structure
- **High Contrast Mode**: Enhanced visibility options

### Technical Architecture

#### Frontend Stack
- **HTML5**: Semantic structure and accessibility
- **CSS3**: Responsive design and animations
- **Vanilla JavaScript**: Optimal performance and no dependencies
- **SVG**: Scalable vector graphics for crisp rendering

#### Key Components
- `wheel-generator.js`: Core wheel rendering and interaction logic
- `feelings-data.js`: Comprehensive emotion taxonomy
- `app.js`: Application lifecycle and event coordination
- `styles.css`: Responsive styling and visual effects

### User Experience Design

#### Design Principles
- **Therapeutic Authenticity**: Faithful recreation of established therapeutic tools
- **Minimalist Interface**: Focus remains entirely on the emotional exploration
- **Smooth Interactions**: Elegant transitions and responsive feedback
- **Professional Aesthetics**: Clean, therapeutic appearance suitable for clinical use

#### Interaction Flow
1. **Initial Load**: Wheel appears centered with reset button positioned at edge
2. **Exploration**: Users rotate wheel to explore different emotional sections
3. **Selection**: Click emotions to emphasize and explore relationships
4. **Reset**: Single button returns wheel to neutral state

### Feature Specifications

#### Current Implementation
- **Wheel Sizing**: Dynamic sizing fills 99% of available space
- **Rotation Controls**: Click-drag and mouse wheel support
- **Visual Feedback**: Immediate emphasis with enhanced colors and shadows
- **Reset Functionality**: Positioned dynamically just inside wheel edge

#### Planned Enhancements

##### 1. Information Panel System
- **Right-side Panel**: Displays contextual information for emphasized emotions
- **Adult Definitions**: Comprehensive dictionary definitions for all emotions
- **Children's Mode**: Age-appropriate language and simplified definitions
- **Therapeutic Context**: Emotion relationships and precursor information
- **Usage Instructions**: Contextual help when no emotions are selected

##### 2. Simplified Children's Mode
- **Toggle Feature**: Switch between full and simplified versions
- **Outer Ring Removal**: Focus on core and secondary emotions only
- **Enhanced UI**: Larger text and simplified interactions
- **Child-Friendly Content**: Age-appropriate definitions and guidance

##### 3. Advanced Visual Enhancements
- **Primary Emotion Divisions**: Bolder borders between emotion families
- **Fixed Shadow System**: Shadows rotate as if from fixed light source
- **Emphasis State Management**: Clean reset to neutral states

### Technical Requirements

#### Performance
- **Load Time**: <2 seconds on 3G connections
- **Smooth Animations**: 60fps rotation and transitions
- **Memory Usage**: <50MB total application footprint
- **Cross-Browser**: Support for Chrome, Firefox, Safari, Edge

#### Accessibility
- **WCAG 2.1 AA**: Full compliance with accessibility standards
- **Screen Readers**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full functionality without mouse
- **Color Contrast**: 4.5:1 minimum ratio for all text

#### Security
- **Static Deployment**: No server-side vulnerabilities
- **Content Security Policy**: Strict CSP headers
- **Data Privacy**: No personal data collection or tracking

### Therapeutic Framework Integration

#### Emotion-Based Therapy Compliance
- **Evidence-Based Design**: Grounded in established therapeutic research
- **Professional Language**: Appropriate terminology for clinical settings
- **Emotion Relationships**: Accurate representation of emotional connections
- **Trauma-Informed**: Sensitive to therapeutic trauma considerations

#### Educational Applications
- **Curriculum Integration**: Compatible with emotional intelligence programs
- **Assessment Tools**: Capability for educational progress tracking
- **Multi-Language Support**: Expandable for international use

### Future Roadmap

#### Phase 1: Core Enhancement (Q1 2025)
- Implement information panel system
- Add children's mode toggle
- Fix shadow rotation bugs
- Enhance primary emotion divisions

#### Phase 2: Advanced Features (Q2 2025)
- Multi-language support
- Customizable emotion sets
- Print/export functionality
- Integration APIs

#### Phase 3: Platform Expansion (Q3 2025)
- Mobile app development
- Therapist dashboard
- Progress tracking
- Community features

### Success Metrics

#### User Engagement
- **Session Duration**: Average 5+ minutes per session
- **Emotion Selections**: 3+ emotions explored per session
- **Return Rate**: 40% weekly return rate
- **Completion Rate**: 80% of users explore all emotion categories

#### Therapeutic Value
- **Professional Adoption**: 100+ therapists using in practice
- **Educational Integration**: 50+ schools incorporating tool
- **User Feedback**: 4.5+ star rating from therapeutic professionals
- **Clinical Outcomes**: Measurable improvement in emotional intelligence

### Risk Assessment

#### Technical Risks
- **Browser Compatibility**: Mitigated through progressive enhancement
- **Performance**: Optimized rendering and minimal dependencies
- **Accessibility**: Comprehensive testing and compliance verification

#### Therapeutic Risks
- **Misrepresentation**: Prevented through professional consultation
- **Inappropriate Use**: Clear guidelines and disclaimers
- **Cultural Sensitivity**: Diverse review and testing processes

### Conclusion

The Feelings Wheel represents a sophisticated digital translation of established therapeutic tools, designed to enhance emotional awareness and support therapeutic practice. Through careful attention to both technical excellence and therapeutic authenticity, this application serves as a bridge between traditional therapeutic methods and modern digital accessibility.

The product balances sophisticated functionality with intuitive usability, ensuring that users can focus on emotional exploration without technical barriers. The planned enhancements will further expand its utility while maintaining the core therapeutic value that makes it effective for both individual use and professional practice.

---

**Document Version**: 1.0  
**Date**: January 15, 2025  
**Status**: Active Development  
**Next Review**: February 15, 2025 