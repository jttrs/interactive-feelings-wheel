// Guarded EmotionCard component.
//
// Builds one selected-emotion card (name + level chip + definition) and returns a
// small handle so the app orchestrates cards without touching their DOM internals.
// Every card keeps its own definition visible; each is independently collapsible
// (default expanded) — no accordion, so selecting more emotions never hides the
// definitions you already opened.
//
// Guards: missing/blank inputs degrade to safe defaults rather than throwing, and
// createCard always returns a usable handle.

const LEVEL_LABEL = {
    core: 'Core',
    secondary: 'Secondary',
    tertiary: 'Specific',
};

function el(tag, className, attrs = {}) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined) continue;
        node.setAttribute(k, v);
    }
    return node;
}

// Chevron icon (rotates via CSS when collapsed).
function chevron() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('card-ic');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M6 9l6 6 6-6');
    svg.appendChild(path);
    return svg;
}

function xIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('card-ic');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M6 6l12 12M18 6L6 18');
    svg.appendChild(path);
    return svg;
}

// Build a card. Returns { element, handle }.
//   handle.wedgeId
//   handle.setDefinition(text)      — swap the definition body (e.g. mode switch)
//   handle.setLoading()             — show the shimmer placeholder
//   handle.setCollapsed(bool)       — collapse/expand this one card
//   handle.isCollapsed()
//   handle.animateOut(ms)           — Promise: fade/slide out for the reset unwind
//   handle.remove()                 — remove from DOM immediately
export function createCard({
    wedgeId,
    emotion,
    level = 'core',
    color,
    definition,
    onRemove,
    onToggle,
} = {}) {
    const safeEmotion = emotion || 'Emotion';
    const safeWedgeId = wedgeId || `card-${safeEmotion}`;

    const card = el('div', 'emotion-card', { 'data-wedge-id': safeWedgeId });
    if (color) card.style.setProperty('--emotion-color', color);

    // ---- Header: emotion name + level chip, a collapse toggle, and a remove button.
    const header = el('div', 'card-header');

    const heading = el('div', 'card-heading');
    const name = el('h4', 'card-name');
    name.textContent = safeEmotion;
    const chip = el('span', 'card-chip');
    chip.textContent = LEVEL_LABEL[level] || 'Core';
    heading.append(name, chip);

    const actions = el('div', 'card-actions');
    const toggleBtn = el('button', 'card-btn card-toggle', {
        type: 'button',
        'aria-expanded': 'true',
        'aria-label': `Collapse ${safeEmotion} definition`,
    });
    toggleBtn.appendChild(chevron());
    const removeBtn = el('button', 'card-btn card-remove', {
        type: 'button',
        'aria-label': `Remove ${safeEmotion}`,
    });
    removeBtn.appendChild(xIcon());
    actions.append(toggleBtn, removeBtn);

    header.append(heading, actions);

    // ---- Body: the definition (always present; hidden only when THIS card collapses).
    const body = el('div', 'card-body');
    const region = el('p', 'card-definition');
    if (definition) {
        region.textContent = definition;
    } else {
        region.classList.add('loading');
        region.textContent = 'Loading definition…';
    }
    body.appendChild(region);

    card.append(header, body);

    // ---- Behavior.
    let collapsed = false;
    const setCollapsed = (next) => {
        collapsed = !!next;
        card.classList.toggle('is-collapsed', collapsed);
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
        toggleBtn.setAttribute(
            'aria-label',
            `${collapsed ? 'Expand' : 'Collapse'} ${safeEmotion} definition`
        );
    };

    toggleBtn.addEventListener('click', () => {
        setCollapsed(!collapsed);
        if (typeof onToggle === 'function') onToggle(safeWedgeId, collapsed);
    });
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onRemove === 'function') onRemove(safeWedgeId);
    });

    const handle = {
        wedgeId: safeWedgeId,
        element: card,
        setDefinition(text) {
            region.classList.remove('loading');
            region.textContent = text || '';
        },
        setLoading() {
            region.classList.add('loading');
            region.textContent = 'Loading definition…';
        },
        setCollapsed,
        isCollapsed: () => collapsed,
        animateOut(ms = 300) {
            return new Promise((resolve) => {
                card.style.transition = `transform ${ms}ms cubic-bezier(0.4,0,1,1), opacity ${ms}ms ease`;
                card.style.transform = 'translateX(100%) scale(0.9)';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.remove();
                    resolve();
                }, ms);
            });
        },
        remove() {
            card.remove();
        },
    };

    return { element: card, handle };
}
