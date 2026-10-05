---
name: Feelings Wheel
description: A calm, faithful feelings wheel a therapist and client explore together.
colors:
    sage-teal: '#4d7a71'
    sage-teal-deep: '#3f6a61'
    sage-teal-ink: '#335a53'
    focus-teal: '#335a53'
    on-teal: '#ffffff'
    linen: '#ece6dc'
    surface: '#f6f1ea'
    surface-sand: '#ebe4d8'
    soft-charcoal: '#3a3631'
    ink-muted: '#625a4f'
    ink-faint: '#736b5e'
    hairline: '#e2d9cb'
    control-edge: '#c4b9a8'
    wheel-line: '#6f665a'
    family-angry: '#E6B3A6'
    family-disgusted: '#CBC5B9'
    family-sad: '#B3C3D6'
    family-happy: '#EAD89E'
    family-surprised: '#CDBBD8'
    family-bad: '#B8CCAF'
    family-fearful: '#E8C9A2'
typography:
    headline:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        fontSize: '1.65rem'
        fontWeight: 400
        lineHeight: 1.25
        letterSpacing: '-0.01em'
    title:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif'
        fontSize: '1.05rem'
        fontWeight: 700
        lineHeight: 1.3
    feeling-core:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif'
        fontSize: '1.25rem'
        fontWeight: 700
        lineHeight: 1.2
        letterSpacing: '0.01em'
    feeling-secondary:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif'
        fontSize: '1.05rem'
        fontWeight: 600
        lineHeight: 1.2
    feeling-tertiary:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif'
        fontSize: '0.9rem'
        fontWeight: 600
        lineHeight: 1.2
    body:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif'
        fontSize: '0.95rem'
        fontWeight: 400
        lineHeight: 1.5
    definition:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif'
        fontSize: '0.85rem'
        fontWeight: 400
        lineHeight: 1.45
    label:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif'
        fontSize: '0.85rem'
        fontWeight: 600
        lineHeight: 1.2
    lens-word:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif'
        fontSize: '1.75rem'
        fontWeight: 700
        lineHeight: 1.15
        letterSpacing: '-0.01em'
rounded:
    sm: '8px'
    md: '12px'
    lg: '18px'
    pill: '999px'
spacing:
    '1': '0.25rem'
    '2': '0.5rem'
    '3': '0.75rem'
    '4': '1rem'
    '5': '1.5rem'
    '6': '2rem'
components:
    view-chip:
        backgroundColor: '{colors.surface-sand}'
        textColor: '{colors.ink-muted}'
        typography: '{typography.label}'
        rounded: '{rounded.pill}'
        padding: '0 0.75rem'
        height: '36px'
    view-chip-on:
        backgroundColor: '{colors.sage-teal}'
        textColor: '{colors.on-teal}'
        rounded: '{rounded.pill}'
    icon-button:
        backgroundColor: 'transparent'
        textColor: '{colors.ink-muted}'
        rounded: '{rounded.md}'
        size: '44px'
    icon-button-hover:
        backgroundColor: '{colors.surface-sand}'
        textColor: '{colors.sage-teal-ink}'
    icon-button-pressed:
        backgroundColor: '{colors.sage-teal}'
        textColor: '{colors.on-teal}'
    panel-show-button:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink-muted}'
        rounded: '{rounded.md}'
        size: '40px'
    reading-lens:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.soft-charcoal}'
        typography: '{typography.lens-word}'
        rounded: '{rounded.lg}'
        padding: '0.5rem 1.5rem'
    wheel-tip:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink-muted}'
        rounded: '{rounded.pill}'
---

<!-- North Star chosen by the owner (2026-10-05) from three rendered directions.
     The other two are kept in docs/design-directions.md. -->

# Design System: Feelings Wheel

## Overview

**Creative North Star: "The Quiet Room"**

The wheel sits in a soft, low-stimulation room, like a good therapy office: linen walls, a warm cream panel, softened ink and one dusty sage-teal. Nothing is clinical, bright or loud. The room exists so a distressed client can settle, look, and find a word with their therapist. The interface never interprets and never coaches; it furnishes the space and stays quiet.

Low arousal is the whole point. There is no pure white and no pure black anywhere. The family colours are muted and earthy (honey, clay, dusk blue, sage, lavender, apricot, stone), so the full 130-word wheel reads as calm rather than as a candy chart. Edges are drawn by soft light, not by rules: the docked panel and the footer lift on a gentle shadow instead of a hairline, and headings are asked in a regular weight rather than announced in bold. Motion is a slow ease, and none at all when reduced motion is requested.

The room is still a working tool. The wheel gets the centre and the space; the chrome docks to the edge (a side panel on wide screens, a bottom sheet with soft rounded corners on phones). Atkinson Hyperlegible is used everywhere, every text pair is audited to WCAG AA, and small words get a reading lens rather than being dropped.

**Key Characteristics:**

- Linen, cream and soft charcoal: nothing pure black or pure white.
- Muted, earthy family colours on the wheel; a faint pool of light behind it.
- One accent (dusty sage-teal), used for state and focus, never for decoration.
- Edges made with soft shadow, not ruled lines. The panel docks; it never floats.
- Regular-weight headline; bold is kept for chosen feelings.
- Choosing a feeling deepens its colour (more saturation), never brightens it toward white.

## Colors

A warm, low-glare room in linen and cream, with one dusty sage-teal accent and a muted, earthy wheel.

### Primary

- **Sage Teal** (#4d7a71): the one UI accent. It fills a toggled-on view chip, a pressed icon button (fullscreen on), the skip link and selected states. White text on it reaches 4.8:1.
- **Sage Teal Deep** (#3f6a61): the hover/active shade for teal-filled controls.
- **Sage Teal Ink** (#335a53): teal used as text on light surfaces (hover text on icon buttons, Help links). 6.9:1 on cream.
- **Focus Teal** (#335a53): every keyboard focus ring (3px, 2px offset). 6.9:1 on cream, 6.2:1 on linen.

### Neutral

- **Linen** (#ece6dc): the room: the page behind the wheel. A lighter cream pool (#f6f1ea) sits behind the wheel itself.
- **Cream** (#f6f1ea, token `surface`): the docked panel, bottom sheet, tip, lens and corner buttons.
- **Sand** (#ebe4d8): soft fills: unselected view chips, hover fills and keyboard-key chips.
- **Soft Charcoal** (#3a3631): primary text. 10.7:1 on cream. Wheel labels use a slightly deeper charcoal (#2b2a28) for small sizes.
- **Muted Ink** (#625a4f): secondary text, including empty-state instructions, definitions and resting icons. 6.0:1 on cream.
- **Faint Ink** (#736b5e): tertiary text, including context-only ancestors, quiet hints and chevrons. 4.7:1 on cream.
- **Hairline** (#e2d9cb): the few remaining decorative dividers.
- **Control Edge** (#c4b9a8): outlines on the sheet handle and keycaps.
- **Wheel Line** (#6f665a): every boundary on the wheel, softer than the text ink.

### Wheel Family Colours (content, not brand)

The seven families keep the source wheel's hue for each feeling but are muted to sit in the room: Angry #E6B3A6 (clay rose), Disgusted #CBC5B9 (stone), Sad #B3C3D6 (dusk blue), Happy #EAD89E (honey), Surprised #CDBBD8 (lavender), Bad #B8CCAF (sage), Fearful #E8C9A2 (apricot). Wheel labels are at least 7.7:1 on every core colour. Each family's middle and outer rings are generated lighter versions of its colour. A chosen wedge is saturated (deeper), not brightened. In the panel the colours appear only as the thin stem that groups a family.

### Named Rules

**The Map-Holds-the-Colour Rule.** Saturated colour belongs to the wheel's families. UI chrome uses linen, cream, ink and sage-teal only. Never tint a control with a family colour or theme a screen around one.

**The One Teal Rule.** Sage Teal marks state (on, pressed, selected, focused). If something is teal, it is on or it has focus.

## Typography

**Display Font:** Atkinson Hyperlegible (with ui-sans-serif, system-ui fallbacks)
**Body Font:** Atkinson Hyperlegible
**Label Font:** Atkinson Hyperlegible

**Character:** a single humanist face built by the Braille Institute for low-vision legibility. It reads as warm and plain rather than stylish, which is what a shared clinical tool needs. It's self-hosted in two weights (400 and 700) so it works offline.

### Hierarchy

- **Headline** (400, 1.65rem, 1.25): the panel's one question, "How are you feeling?", and secondary view titles, asked in a regular weight. Smaller on very short phones.
- **Title** (700, 1.05rem, 1.3): Help section headings, in sentence case.
- **Feeling – core / secondary / outer** (700 / 600 / 600 at 1.25 / 1.05 / 0.9rem, leading 1.2): the chosen-feelings list, where depth is carried by size, weight and indent.
- **Body** (400, 0.95rem, 1.5): empty-state instructions and Help text.
- **Definition** (400, 0.85rem, 1.45, max 42ch): the meaning under a chosen feeling, in Muted Ink.
- **Label** (600, 0.85rem): view chips and Reset.
- **Group label** (600, 0.85rem, sentence case, Muted Ink): the "Views" label over the view chips, so Focused and Simplified don't read as feeling words. The current view follows in 400 Faint Ink ("· Full wheel", "· Focused + Simplified"), so the default and the combined state are named rather than inferred. On short phones the label sits beside the chips.
- **Lens word** (700, 1.75rem, 1.15): the enlarged word in the reading lens.
- **Wheel labels**: sized per wedge in code so each word fits its wedge (never a fixed size), bold when selected.

### Named Rules

**The One Face Rule.** Atkinson Hyperlegible everywhere: chrome, list and wheel. Hierarchy comes from size, weight and indent, never a second family.

**The Fit-Never-Overflows Rule.** A wheel word may shrink to fit its wedge, but it never spills over a boundary. When it gets small, offer the reading lens instead of cutting words.

## Layout

The wheel is always the centrepiece. It's a circle sized to the largest square that fits the space left by the panel, and it re-centres smoothly when the panel opens or closes.

- **Wide screens and landscape phones:** a docked side panel (`clamp(280px, 25vw, 380px)` wide) on the right. It docks flush to the edge (never floating as a card) and is separated by a soft shadow, not a line. The wheel fills the rest.
- **Portrait phones and tablets (up to 1100px wide):** a bottom sheet with 28px rounded top corners. In portrait the wheel is width-bound, so a side panel would shrink it by a third. On phones the sheet takes the height the wheel can't use (`100dvh − 100vw − 60px`, leaving room for the small-screen tip). On tablets (600px and wider) the footer sits on one row, with views on the left and actions on the right. It reserves its own live height so the wheel never sits under it, grows up to 45% of the height (max 420px) on tall phones, and starts compact (236px) on very short ones. On short phones (up to 700px tall) it grows one step once feelings are chosen (`min(52vh, 360px)`), because the record then matters more; the wheel re-fits above it.
- **Corners are for chrome.** A circle never reaches the corners of its square, so the panel's hide button (in the panel's top-right corner) and the show button (in the screen's top-right corner) can never cover a word. Transient overlays (Focused hint, reading lens, small-screen tip) sit on the top or bottom edge, away from the word being read.
- **Spacing rhythm:** a 4px-based scale (0.25, 0.5, 0.75, 1, 1.5, 2rem). Tight inside a group, generous between groups.
- **Touch targets:** at least 44px on coarse pointers (`--touch-target-min`).

### Named Rules

**The Circle-Owns-the-Centre Rule.** Nothing may sit over the wheel's disc except a transient, pointer-transparent overlay (lens, hint, tip). Persistent controls live in the panel or in a corner.

## Elevation & Depth

Mostly flat and warm. Depth comes from surface contrast (cream panel in a linen room) and soft, low-alpha shadows in warm brown, never cold black. Shadows replace ruled lines wherever a surface meets another.

### Shadow Vocabulary

- **Rest** (`0 1px 2px rgba(43,42,40,0.06), 0 1px 3px rgba(43,42,40,0.08)`): chips at rest, the corner show button, the mobile handle.
- **Lifted** (`0 4px 12px rgba(43,42,40,0.08), 0 2px 4px rgba(43,42,40,0.06)`): floating overlays such as the reading lens and small-screen tip, and the collapsed sheet pill.
- **Panel edge** (`--shadow-panel-edge`, `-12px 0 40px rgba(70,55,35,0.07)`): the docked side panel's soft edge against the room.
- **Sheet** (`--shadow-sheet`, `0 -12px 40px rgba(70,55,35,0.1)`): the phone bottom sheet's upward lift.
- **Footer lift** (`--shadow-footer-lift`, `0 -14px 20px -16px rgba(70,55,35,0.18)`): separates the panel footer from the list scrolling beneath it.
- **Selected wedge**: a soft sage glow (`drop-shadow(0 0 8px rgba(77,122,113,0.5))`) plus a saturation lift (`saturate(1.8) brightness(1.03)`). It's the only shadow on the wheel.

### Named Rules

**The Warm Shadow Rule.** Shadows use warm brown or charcoal at 18% opacity or less. If a shadow is noticeable before the thing it lifts, it's too strong.

## Shapes

Gently rounded and friendly, never sharp, never blobby. Small pieces use 8px, controls and buttons 12px, floating surfaces 18px, and chips and pills are fully round. The bottom sheet rounds only its top corners (28px). The wheel itself is pure geometry, with straight radial divisions and concentric rings, and is never rounded or softened.

## Components

### View chips (Focused, Simplified)

- **Character:** quiet, labelled toggles for the two views; the therapist's choice, never a client prompt.
- **Shape:** full pill (999px), 36px tall (44px on touch), no outline: soft Sand pads under a "Views" label.
- **Off:** Sand with Muted Ink text and a 16px line icon. **On:** filled Sage Teal with white text.
- **Hover / Focus:** a slightly deeper sand (#e2d9cb) with teal text on hover; the standard 3px Focus Teal ring.

### Icon buttons (Fullscreen, Help, About, Ko-fi)

- **Shape:** 44px square target, 12px radius, transparent at rest, 22px line icon (1.9 stroke).
- **Hover:** Sand fill with teal icon. **Pressed toggle** (fullscreen on): Sage Teal fill with white icon.
- **Tooltip:** a small charcoal label above, on hover and focus.
- **Reset** is the one labelled action in the row (icon plus "Reset"). A hairline and open space set it apart from the routine icons, because it clears the session. There's no confirm dialog; Undo covers mistakes, and Reset from Help or About returns to the feelings view so Undo is visible.

### Panel hide / show

- **Hide:** a 40px transparent icon button (sidebar glyph) in the panel's top-right corner, level with the heading.
- **Show:** the same glyph on a cream 40px button with a hairline border and Rest shadow, in the screen's top-right corner. It fades in only while the panel is hidden.
- **Phones:** replaced by the bottom sheet's grab handle.

### Chosen-feelings list (signature)

- One tinted stem per feeling family, a 3px line in the family colour. Under it, core, secondary and outer-ring words are stepped by size, weight and indent. Context-only ancestors are shown in Faint Ink.
- Names with a meaning carry a small chevron (› hidden, ⌄ shown). The definition expands below in Muted Ink.
- The list is read-only, with one Faint Ink line underneath: "To remove one, choose it again on the wheel."

### Reading lens (signature)

- A cream floating card (18px radius, Lifted shadow) with the word in 1.75rem bold and its family path above in Muted Ink. It sits on the top or bottom edge of the wheel area, whichever is away from the word.
- **Keyboard:** for the first few feelings reached it lists the keys; after that it shows a faint "Press ? for keys".

### Wheel overlays (Focused hint, small-screen tip)

- Cream pills with a hairline border and a soft shadow, in Muted Ink 0.85–0.95rem text. Pointer-transparent (the tip's dismiss button excepted), transient, and pinned to an edge of the wheel area.

### Focus ring

- 3px solid Focus Teal with a 2px offset on every interactive element. It's inset on wedges, which sit flush against each other, and 4px when more contrast is requested.

## Do's and Don'ts

### Do:

- **Do** keep chrome in linen, cream, ink and Sage Teal (#4d7a71). Teal means "on" or "focused".
- **Do** dock the panel flush to the screen edge, and separate surfaces with soft shadow rather than ruled lines.
- **Do** give the wheel the centre and the space. Put persistent controls in the panel or a corner.
- **Do** use Atkinson Hyperlegible for everything, with hierarchy from size (1.65 / 1.25 / 1.05 / 0.95 / 0.85rem) and weight (400 / 600 / 700).
- **Do** use warm, low-alpha shadows (Rest / Lifted / Sheet) and the single easing curve `cubic-bezier(0.4, 0, 0.2, 1)` at 0.15–0.35s.
- **Do** keep every text pair at WCAG AA or better, every unlabelled control boundary at 3:1 or better, and touch targets at 44px or larger.
- **Do** shrink a wheel word to fit its wedge, and offer the reading lens when it gets small.

### Don't:

- **Don't** use the wheel's family colours for UI chrome, or add new saturated colours. Don't return the wheel to bright pastels.
- **Don't** float the panel as a card over an empty patch of room, or brighten chosen wedges toward white.
- **Don't** put persistent controls over the wheel's disc. The old mid-edge panel tab covered outer-ring words.
- **Don't** use pure black text, pure white backgrounds behind the wheel, or cold grey shadows.
- **Don't** add bouncy or elastic easing, looping animation, or motion that ignores reduced-motion settings.
- **Don't** add visual "insight" devices (scores, charts, mood colours, badges) around chosen feelings. The list stays a plain, read-only record.
