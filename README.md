# Feelings Wheel - Interactive Emotion Explorer

An interactive web application displaying a therapeutic feelings wheel based on Geoffrey Roberts' Emotional Word Wheel design. This tool helps users explore emotional vocabulary through an engaging, rotatable interface with visual emphasis for selected emotions.

## 🎯 Features

### Interactive Wheel Design

- **7 Core Emotions**: Happy, Surprised, Bad, Fearful, Angry, Disgusted, Sad
- **Three-Ring Structure**: Core emotions in center, secondary emotions in middle ring, tertiary emotions in outer ring
- **Authentic Colors**: Each core emotion has its own color family that lightens toward the outer rings
- **Dynamic Sizing**: Wheel automatically fills available browser space

### Interactive Controls

- **Full Rotation**: Drag, scroll, or hold the ← → arrow keys to spin the wheel
- **Multi-Selection**: Choose as many feelings as fit; choose one again to remove it
- **Feelings Panel**: Your chosen feelings appear in a side panel (a bottom sheet on phones) with their meanings
- **Focused View** (opt-in, `F`): Starts with the core feelings and opens each ring as a feeling is chosen — the full wheel stays the default
- **Simplified View** (`S`): For younger clients — hides the outer ring and uses simpler meanings
- **Fullscreen** (`F11`), **Reset** (`R`), **Hide panel** (`P`)
- **Reading Lens**: Press and hold a word (or focus it with the keyboard) to see it large, with its family path — handy when outer-ring words are small on phones
- **Keyboard & Screen Readers**: The wheel is one tab-stop. ← → move around a ring, ↓ steps out to more specific feelings and ↑ back in, `[` `]` (or Page Up/Down) jump between families, Home/End go to the ends of a ring, Enter/Space chooses. Each feeling is read with its place, e.g. "Playful, under Happy, 1 of 6"

### Advanced Visual Features

- **Layered Shadows**: Shadows render over unemphasized wedges but never cover emphasized ones
- **Radial Text**: All emotion labels are oriented along radii toward the center
- **Text Rotation**: Text maintains proper orientation as the wheel rotates
- **Responsive Design**: Adapts to any screen size and aspect ratio

### User Experience

- **Calm Interface**: Warm, low-contrast-glare palette and Atkinson Hyperlegible type
- **Wheel First**: The panel tucks away any time to give the wheel the whole screen
- **Smooth Animations**: Gentle transitions, respecting reduced-motion settings
- **Touch Support**: Works on phones and tablets, portrait or landscape

## 🎨 Attribution & Credits

### Concept & Design

**Concept borrowed from [feelingswheel.com](https://feelingswheel.com)**

- Available feelings wheel online concept

**Wheel borrowed from [Geoffrey Roberts](https://www.whitehousechurch.com.au/)**

- Emotional Word Wheel design and structure

### Interactive Implementation

This web application faithfully recreates the therapeutic feelings wheel with modern web technologies for interactive exploration.

## 🚀 Getting Started

### Installation

1. Clone the repository and run `npm install`
2. `npm run dev` to start the Vite dev server
3. `npm run build` produces a single self-contained `dist/index.html`

### Usage

- **Choose**: Click or tap any feeling to add it to your list, with its meaning
- **Remove**: Choose a selected feeling on the wheel again
- **Rotate**: Drag the wheel, scroll over it, or hold the arrow keys (when no feeling has focus)
- **Keyboard**: Tab into the wheel; ← → around a ring, ↓ / ↑ out to specific / back to broader feelings, `[` `]` between families
- **Focused view**: Turn on in the panel footer (or press `F`) to explore one ring at a time
- **Reset**: The Reset button (or `R`) clears your choices and re-centres the wheel

### Start-up links

The page address carries the current view, so a therapist can bookmark a setup or open a session straight into it:

| URL                        | Opens with                                  |
| -------------------------- | ------------------------------------------- |
| `?view=simplified`         | Simplified view (e.g. for a younger client) |
| `?view=focused`            | Focused view                                |
| `?view=simplified,focused` | Both                                        |
| `&panel=hidden`            | The side panel tucked away                  |

The address updates as views change (without adding history entries). Chosen feelings are not stored in the URL.

## 📁 File Structure

```
feelings-wheel/
├── index.html               # Page structure, panel views, footer controls
├── styles.css               # Design tokens, layout, responsive + a11y styles
├── app.ts                   # Panel, shortcuts, fullscreen, coordination
├── feelings-wheel-engine.ts # Composes the wheel mixins below
├── feelings-data.ts         # Feelings, families, and definitions
└── src/
    ├── wheel/               # rendering, interaction, animation, svg, focused view (focused-view.ts)
    └── ui/feelings-tree.ts  # Selected-feelings list
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

This is a tool for **therapists working with their clients**. It is not a self-help app and deliberately offers no interpretation, advice, or "insights": the wheel's structure and the definitions in the side panel are there to support the conversation between a client and a trained therapist, not to replace it.

- **The full wheel** is the default, so a session can range across the whole emotional spectrum.
- **Definitions** in the side panel help the therapist and client find shared language for a feeling.
- **Simplified view** is for younger clients (mostly children) who don't yet have the nuance for the outer-ring words; a therapist would start a child's session there.
- **Focused view** lets a therapist walk through the wheel one ring at a time.

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

_A faithful interactive recreation of the therapeutic feelings wheel, designed to support emotional exploration and awareness._
