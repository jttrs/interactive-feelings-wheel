# Feelings Wheel - Interactive Emotion Explorer

An interactive web application displaying a therapeutic feelings wheel based on Geoffrey Roberts' Emotional Word Wheel design. This tool helps users explore emotional vocabulary through an engaging, rotatable interface with visual emphasis for selected emotions.

## 🎯 Features

### Interactive Wheel Design
- **7 Core Emotions**: Happy, Surprised, Bad, Fearful, Angry, Disgusted, Sad
- **Three-Ring Structure**: Core emotions in center, secondary emotions in middle ring, tertiary emotions in outer ring
- **Authentic Colors**: Each core emotion has its own color family that lightens toward the outer rings
- **Dynamic Sizing**: Wheel automatically fills available browser space

### Interactive Controls
- **Full Rotation**: Click and drag to rotate the wheel smoothly
- **Mouse Wheel Support**: Scroll to rotate the wheel
- **Multi-Selection**: Click wedges to emphasize multiple emotions simultaneously
- **Visual Emphasis**: Selected wedges get enhanced colors, brightness, and subtle shadows
- **Reset Function**: Small reset button positioned just inside the wheel's edge

### Advanced Visual Features
- **Layered Shadows**: Shadows render over unemphasized wedges but never cover emphasized ones
- **Radial Text**: All emotion labels are oriented along radii toward the center
- **Text Rotation**: Text maintains proper orientation as the wheel rotates
- **Responsive Design**: Adapts to any screen size and aspect ratio

### User Experience
- **Minimal Interface**: Clean design with only essential elements
- **No Side Panels**: Focus remains entirely on the wheel
- **Smooth Animations**: Elegant transitions for all interactions
- **Touch Support**: Works on mobile devices

## 🎨 Attribution & Credits

### Concept & Design
**Concept borrowed from [feelingswheel.com](https://feelingswheel.com)**
- Original therapeutic feelings wheel concept

**Wheel borrowed from [Geoffrey Roberts](https://www.whitehousechurch.com.au/)**
- Emotional Word Wheel design and structure
- Progressive Christian community in Canberra, Australia

### Interactive Implementation
This web application faithfully recreates the therapeutic feelings wheel with modern web technologies for interactive exploration.

## 🚀 Getting Started

### Installation
1. Clone or download the repository
2. Open `index.html` in a web browser
3. No server setup required - runs entirely in the browser

### Usage
- **Rotate**: Click and drag anywhere on the wheel or use mouse scroll
- **Select**: Click any emotion wedge to emphasize it
- **Multi-Select**: Click multiple wedges to emphasize several emotions
- **Reset**: Click the small reset button (⟲) in the bottom-right corner of the wheel
- **Deselect**: Click an emphasized wedge again to deselect it

## 📁 File Structure

```
feelings-wheel/
├── index.html          # Main HTML structure
├── styles.css          # Complete styling and responsive design
├── app.js             # Main application logic and event handling
├── wheel-generator.js  # SVG wheel generation, rotation, and layering
├── feelings-data.js    # Complete emotion data structure
└── README.md          # This documentation
```

## 🔧 Technical Implementation

### Wheel Structure
- **Core Ring**: 7 emotions with dynamic sizing based on secondary emotion count
- **Middle Ring**: Secondary emotions with equal-width wedges within each core section
- **Outer Ring**: Tertiary emotions with half-width wedges for detailed specificity

### Visual Hierarchy
- **Base Layer**: All unemphasized wedges and text
- **Shadow Layer**: Shadows of emphasized wedges (renders above unemphasized, below emphasized)
- **Top Layer**: Emphasized wedges and their text (always visible, never covered)

### Dynamic Features
- **Responsive Sizing**: Wheel uses 99% of available space, adapting to container dimensions
- **Smart Positioning**: Reset button dynamically positions based on actual wheel boundaries
- **Color Gradients**: Systematic lightening from core (original colors) to middle (25% lighter) to outer (70% lighter)

### Technologies Used
- **HTML5**: Semantic structure
- **CSS3**: Modern styling with filters and transforms
- **JavaScript (ES6+)**: Dynamic SVG generation and interaction
- **SVG**: Scalable vector graphics for crisp rendering at any size

## 🎓 Therapeutic Use

This tool is designed for:
- **Emotional Identification**: Helping users recognize and name their emotions
- **Therapeutic Sessions**: Supporting counselors and therapists in emotion exploration
- **Self-Reflection**: Personal emotional awareness and vocabulary building
- **Educational Settings**: Teaching emotional literacy and intelligence

## 🌐 Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers with touch support

## 📱 Mobile Support

- Touch-based rotation and selection
- Responsive design for all screen sizes
- Optimized performance for mobile devices
- Dynamic sizing based on screen orientation

## 🎨 Design Principles

### Minimalism
- Clean, uncluttered interface
- Focus entirely on the wheel
- No unnecessary UI elements

### Accessibility
- High contrast between text and backgrounds
- Clear visual hierarchy
- Intuitive interaction patterns

### Authenticity
- Faithful recreation of the original therapeutic wheel
- Accurate emotion groupings and relationships
- Professional therapeutic color scheme

## 🤝 Contributing

This project honors the original therapeutic feelings wheel design. Contributions should maintain:
- Accuracy to the original emotion structure
- Professional therapeutic standards
- Clean, minimal design principles
- Accessibility and usability

## 📄 License

This implementation is created for educational and therapeutic purposes. Please respect the original work of the feelings wheel concept and Geoffrey Roberts' Emotional Word Wheel design.

## 🔗 Links

- [feelingswheel.com](https://feelingswheel.com) - Original concept
- [The Whitehouse Church](https://www.whitehousechurch.com.au/) - Geoffrey Roberts' community

---

*A faithful interactive recreation of the therapeutic feelings wheel, designed to support emotional exploration and awareness.* 