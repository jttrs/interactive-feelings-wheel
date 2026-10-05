---
name: Feelings Wheel
description: A calm, faithful feelings wheel a therapist and client explore together.
colors:
    calm-teal: '#2f6f6e'
    calm-teal-deep: '#245957'
    calm-teal-ink: '#1f4e4d'
    focus-teal: '#1b4d4c'
    on-teal: '#ffffff'
    warm-paper: '#f7f4ef'
    surface: '#ffffff'
    surface-sand: '#f2eee7'
    warm-charcoal: '#2b2a28'
    ink-muted: '#5e574c'
    ink-faint: '#736b5e'
    hairline: '#e4ded4'
    control-edge: '#cbc3b6'
    wheel-line: '#4a453d'
    family-angry: '#FFB3B3'
    family-disgusted: '#D3D3D3'
    family-sad: '#B3C6FF'
    family-happy: '#FFFF99'
    family-surprised: '#D4B3FF'
    family-bad: '#B3FFB3'
    family-fearful: '#FFD4A3'
typography:
    headline:
        fontFamily: 'Atkinson Hyperlegible, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        fontSize: '1.5rem'
        fontWeight: 700
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
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink-muted}'
        typography: '{typography.label}'
        rounded: '{rounded.pill}'
        padding: '0 0.75rem'
        height: '36px'
    view-chip-on:
        backgroundColor: '{colors.calm-teal}'
        textColor: '{colors.on-teal}'
        rounded: '{rounded.pill}'
    icon-button:
        backgroundColor: 'transparent'
        textColor: '{colors.ink-muted}'
        rounded: '{rounded.md}'
        size: '44px'
    icon-button-hover:
        backgroundColor: '{colors.surface-sand}'
        textColor: '{colors.calm-teal-ink}'
    icon-button-pressed:
        backgroundColor: '{colors.calm-teal}'
        textColor: '{colors.on-teal}'
    panel-show-button:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink-muted}'
        rounded: '{rounded.md}'
        size: '40px'
    status-line:
        backgroundColor: '{colors.surface-sand}'
        textColor: '{colors.ink-muted}'
        padding: '0.75rem 1.5rem'
    reading-lens:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.warm-charcoal}'
        typography: '{typography.lens-word}'
        rounded: '{rounded.lg}'
        padding: '0.5rem 1.5rem'
    wheel-tip:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink-muted}'
        rounded: '{rounded.pill}'
---

<!-- North Star chosen by the agent (the owner was unavailable to pick); it follows
     PRODUCT.md's positioning. Revise freely. -->

# Design System: Feelings Wheel

## Overview

**Creative North Star: "The Shared Map"**

The wheel is a calm, faithful map that a therapist and client read together. The interface's job is to make the map easy to share and then step back. It never interprets, never decorates, and never competes with the words. Everything around the wheel is warm paper, charcoal ink and one quiet teal. Colour lives in the wheel, because the wheel's family colours are part of the established tool, not the brand.

The system is low-arousal on purpose. Clients may be distressed, so surfaces are soft and warm rather than stark, motion is a gentle ease rather than a flourish, and nothing flashes, bounces or demands attention. Density is set by the content: the full 130-word wheel is the default, so the chrome around it is sparse and pushed to the edges. That means a side panel on wide screens, a bottom sheet on phones, and corner controls that a circle can never reach.

Legibility comes first. Atkinson Hyperlegible is used everywhere, text pairs are contrast-audited to WCAG AA, and small words get a reading lens rather than being dropped.

**Key Characteristics:**

- Warm paper and charcoal ink, never pure black on white.
- One accent (calm teal), used for state and focus, never for decoration.
- The wheel's family colours belong to the wheel alone.
- Chrome sits at the edges; the wheel always gets the centre and the space.
- Soft, slow-ish motion (0.15–0.35s, one easing curve), and none when reduced motion is requested.

## Colors

A warm, low-glare neutral world with a single calm teal accent. The vivid colour is reserved for the wheel's own feeling families.

### Primary

- **Calm Teal** (#2f6f6e): the one UI accent. It fills a toggled-on view chip, a pressed icon button (fullscreen on), the skip link and selected states. White text on it reaches 5.8:1.
- **Calm Teal Deep** (#245957): the hover/active shade for teal-filled controls.
- **Calm Teal Ink** (#1f4e4d): teal used as text on light surfaces (hover text on icon buttons, the "Show full wheel" link). 9.3:1 on white.
- **Focus Teal** (#1b4d4c): every keyboard focus ring (3px, 2px offset). At least 3:1 against both paper and surface.

### Neutral

- **Warm Paper** (#f7f4ef): the page background behind the wheel; warm, to avoid halation.
- **Surface** (#ffffff): the side panel, bottom sheet, chips, tip, lens and corner buttons.
- **Sand** (#f2eee7): inset or raised fills, such as the view-status band, hover fills and the keyboard-key chips.
- **Warm Charcoal** (#2b2a28): primary text and wheel labels. 14.3:1 on white.
- **Muted Ink** (#5e574c): secondary text, including empty-state copy, definitions and resting icons.
- **Faint Ink** (#736b5e): tertiary text, including context-only ancestors in the list, quiet hints and chevrons.
- **Hairline** (#e4ded4): decorative dividers such as the panel edge and header rules.
- **Control Edge** (#cbc3b6): the visible boundary of interactive controls such as chip outlines. At least 3:1 against white.
- **Wheel Line** (#4a453d): every boundary on the wheel: family divisions, ring circles and the dashed split between outer-ring pairs.

### Wheel Family Colours (content, not brand)

The seven pastel family colours come from the source wheel: Angry #FFB3B3, Disgusted #D3D3D3, Sad #B3C6FF, Happy #FFFF99, Surprised #D4B3FF, Bad #B3FFB3, Fearful #FFD4A3. Each family's middle and outer rings are generated lighter versions of its colour. In the panel they appear only as the thin coloured stem that groups a family.

### Named Rules

**The Map-Holds-the-Colour Rule.** Saturated colour belongs to the wheel's families. UI chrome uses paper, ink and teal only. Never tint a control with a family colour or theme a screen around one.

**The One Teal Rule.** Calm Teal marks state (on, pressed, selected, focused). If something is teal, it is on or it has focus.

## Typography

**Display Font:** Atkinson Hyperlegible (with ui-sans-serif, system-ui fallbacks)
**Body Font:** Atkinson Hyperlegible
**Label Font:** Atkinson Hyperlegible

**Character:** a single humanist face built by the Braille Institute for low-vision legibility. It reads as warm and plain rather than stylish, which is what a shared clinical tool needs. It's self-hosted in two weights (400 and 700) so it works offline.

### Hierarchy

- **Headline** (700, 1.5rem, 1.25): the panel's one question, "How are you feeling?", and secondary view titles. 1.15rem on very short phones.
- **Title** (700, 1.05rem, 1.3): Help section headings, in sentence case.
- **Feeling – core / secondary / outer** (700 / 600 / 600 at 1.25 / 1.05 / 0.9rem, leading 1.2): the chosen-feelings list, where depth is carried by size, weight and indent.
- **Body** (400, 0.95rem, 1.5): empty-state invitation and Help text.
- **Definition** (400, 0.85rem, 1.45, max 42ch): the meaning under a chosen feeling, in Muted Ink.
- **Label** (600, 0.85rem): view chips, Reset and status-line links.
- **Lens word** (700, 1.75rem, 1.15): the enlarged word in the reading lens.
- **Wheel labels**: sized per wedge in code so each word fits its wedge (never a fixed size), bold when selected.

### Named Rules

**The One Face Rule.** Atkinson Hyperlegible everywhere: chrome, list and wheel. Hierarchy comes from size, weight and indent, never a second family.

**The Fit-Never-Overflows Rule.** A wheel word may shrink to fit its wedge, but it never spills over a boundary. When it gets small, offer the reading lens instead of cutting words.

## Layout

The wheel is always the centrepiece. It's a circle sized to the largest square that fits the space left by the panel, and it re-centres smoothly when the panel opens or closes.

- **Wide screens and landscape phones:** a docked side panel (`clamp(280px, 25vw, 380px)` wide) on the right with a single hairline edge. The wheel fills the rest.
- **Portrait phones:** a bottom sheet. It reserves its own live height so the wheel never sits under it, grows up to 45% of the height (max 420px) on tall phones, and starts compact (236px) on very short ones.
- **Corners are for chrome.** A circle never reaches the corners of its square, so the panel's hide button (in the panel's top-right corner) and the show button (in the screen's top-right corner) can never cover a word. Transient overlays (Focused hint, reading lens, small-screen tip) sit on the top or bottom edge, away from the word being read.
- **Spacing rhythm:** a 4px-based scale (0.25, 0.5, 0.75, 1, 1.5, 2rem). Tight inside a group, generous between groups.
- **Touch targets:** at least 44px on coarse pointers (`--touch-target-min`).

### Named Rules

**The Circle-Owns-the-Centre Rule.** Nothing may sit over the wheel's disc except a transient, pointer-transparent overlay (lens, hint, tip). Persistent controls live in the panel or in a corner.

## Elevation & Depth

Mostly flat and warm. Depth comes from surface contrast (white panel on warm paper) plus three soft, low-alpha shadows, always tinted with warm charcoal, never cold black.

### Shadow Vocabulary

- **Rest** (`0 1px 2px rgba(43,42,40,0.06), 0 1px 3px rgba(43,42,40,0.08)`): chips at rest, the corner show button, the mobile handle.
- **Lifted** (`0 4px 12px rgba(43,42,40,0.08), 0 2px 4px rgba(43,42,40,0.06)`): floating overlays such as the reading lens and small-screen tip, and the collapsed sheet pill.
- **Sheet** (`0 -8px 24px rgba(43,42,40,0.1), 0 -1px 4px rgba(43,42,40,0.06)`): the phone bottom sheet's upward lift.
- **Selected wedge**: a soft teal glow (`drop-shadow(0 0 6px rgba(47,111,110,0.55))`) plus a slight saturation lift. It's the only shadow on the wheel.

### Named Rules

**The Warm Shadow Rule.** Shadows use warm charcoal at 12% opacity or less. If a shadow is noticeable before the thing it lifts, it's too strong.

## Shapes

Gently rounded and friendly, never sharp, never blobby. Small pieces use 8px, controls and buttons 12px, floating surfaces 18px, and chips and pills are fully round. The bottom sheet rounds only its top corners (18px). The wheel itself is pure geometry, with straight radial divisions and concentric rings, and is never rounded or softened.

## Components

### View chips (Focused, Simplified)

- **Character:** quiet, labelled toggles for the two views; the therapist's choice, never a client prompt.
- **Shape:** full pill (999px), 36px tall (44px on touch), outline in Control Edge.
- **Off:** white with Muted Ink text and a 16px line icon. **On:** filled Calm Teal with white text.
- **Hover / Focus:** Sand fill with teal text on hover; the standard 3px Focus Teal ring.

### Icon buttons (Fullscreen, Help, About, Ko-fi)

- **Shape:** 44px square target, 12px radius, transparent at rest, 22px line icon (1.9 stroke).
- **Hover:** Sand fill with teal icon. **Pressed toggle** (fullscreen on): Calm Teal fill with white icon.
- **Tooltip:** a small charcoal label above, on hover and focus.
- **Reset** is the one labelled action in the row (icon plus "Reset").

### Panel hide / show

- **Hide:** a 40px transparent icon button (sidebar glyph) in the panel's top-right corner, level with the heading.
- **Show:** the same glyph on a white 40px button with a hairline border and Rest shadow, in the screen's top-right corner. It fades in only while the panel is hidden.
- **Phones:** replaced by the bottom sheet's grab handle.

### Chosen-feelings list (signature)

- One tinted stem per feeling family, a 3px line in the family colour. Under it, core, secondary and outer-ring words are stepped by size, weight and indent. Context-only ancestors are shown in Faint Ink.
- Names with a meaning carry a small chevron (› hidden, ⌄ shown). The definition expands below in Muted Ink.
- The list is read-only, with one Faint Ink line underneath: "To remove one, choose it again on the wheel."

### View status line

- A Sand band under the heading while Focused and/or Simplified is on. It says what's different in words, names any hidden choices, and has an underlined teal "Show full wheel" link. On phones it's one compact row.

### Reading lens (signature)

- A white floating card (18px radius, Lifted shadow) with the word in 1.75rem bold and its family path above in Muted Ink. It sits on the top or bottom edge of the wheel area, whichever is away from the word.
- **Keyboard:** for the first few feelings reached it lists the keys; after that it shows a faint "Press ? for keys".

### Wheel overlays (Focused hint, small-screen tip)

- White pills with a hairline border and a soft shadow, in Muted Ink 0.85–0.95rem text. Pointer-transparent (the tip's dismiss button excepted), transient, and pinned to an edge of the wheel area.

### Focus ring

- 3px solid Focus Teal with a 2px offset on every interactive element. It's inset on wedges, which sit flush against each other, and 4px when more contrast is requested.

## Do's and Don'ts

### Do:

- **Do** keep chrome in paper, ink and Calm Teal (#2f6f6e). Teal means "on" or "focused".
- **Do** give the wheel the centre and the space. Put persistent controls in the panel or a corner.
- **Do** use Atkinson Hyperlegible for everything, with hierarchy from size (1.5 / 1.25 / 1.05 / 0.95 / 0.85rem) and weight (400 / 600 / 700).
- **Do** use warm, low-alpha shadows (Rest / Lifted / Sheet) and the single easing curve `cubic-bezier(0.4, 0, 0.2, 1)` at 0.15–0.35s.
- **Do** keep every text pair at WCAG AA or better, every control boundary at 3:1 or better, and touch targets at 44px or larger.
- **Do** shrink a wheel word to fit its wedge, and offer the reading lens when it gets small.

### Don't:

- **Don't** use the wheel's family colours for UI chrome, or add new saturated colours.
- **Don't** put persistent controls over the wheel's disc. The old mid-edge panel tab covered outer-ring words.
- **Don't** use pure black text, pure white backgrounds behind the wheel, or cold grey shadows.
- **Don't** add bouncy or elastic easing, looping animation, or motion that ignores reduced-motion settings.
- **Don't** add visual "insight" devices (scores, charts, mood colours, badges) around chosen feelings. The list stays a plain, read-only record.
