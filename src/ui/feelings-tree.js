// Feelings tree — the sidebar's selected-feelings display.
//
// Replaces the old flat card stack (emotion-card.js) with a grouped hierarchy: every
// selected feeling is placed into its core → secondary → tertiary branch, so selecting
// Happy › Playful › Cheeky renders one Happy "stem" with the path nested beneath it.
// Depth is carried by typography + indentation (see .feeling-node--{core,secondary,
// tertiary} in styles.css), and a definition is shown ONLY under a "terminal" selection
// (a selected node with no selected descendant shown below it), matching the wheel's
// idea that the lowest chosen level is the specific feeling.
//
// This module is pure/guarded: given the current selections it returns a fresh DOM
// subtree. The app rebuilds it wholesale on every selection change (selectedWedges is
// the source of truth), so there is no incremental add/remove state to drift.

const LEVEL_ORDER = { core: 0, secondary: 1, tertiary: 2 };

// Small inline × icon (matches the stroke style used elsewhere in the panel).
function removeIcon() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'feeling-ic');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M18 6L6 18M6 6l12 12');
    svg.appendChild(path);
    return svg;
}

// Build the grouped forest from a flat selection list.
//
// selections: [{ wedgeId, level, emotion, parent, coreFamily }]
// Returns [{ family, color, nodes: [{ level, emotion, wedgeId|null, selected, terminal }] }]
// ordered by familyOrder, each family's nodes in core→secondary→tertiary depth order.
// "Context" nodes (implied ancestors that are not themselves selected) get wedgeId:null
// and selected:false, so a lone tertiary still shows its Happy › Playful lineage.
export function buildForest(selections, { familyOrder = [] } = {}) {
    const families = new Map(); // family -> { nodesByKey: Map(level+emotion -> node) }

    const ensureFamily = (family) => {
        if (!families.has(family)) families.set(family, new Map());
        return families.get(family);
    };
    const nodeKey = (level, emotion) => `${level}:${emotion}`;

    for (const sel of selections) {
        if (!sel || !sel.coreFamily || !sel.emotion) continue;
        const level = sel.level || 'core';
        const family = sel.coreFamily;
        const nodes = ensureFamily(family);

        // Ensure the ancestor context nodes exist (unselected placeholders unless
        // a real selection later marks them selected).
        const ensureNode = (lvl, emotion, selected, wedgeId, parentEmotion) => {
            const key = nodeKey(lvl, emotion);
            const existing = nodes.get(key);
            if (existing) {
                if (selected) {
                    existing.selected = true;
                    existing.wedgeId = wedgeId;
                }
                return existing;
            }
            const node = {
                level: lvl,
                emotion,
                wedgeId: selected ? wedgeId : null,
                selected,
                parentEmotion: parentEmotion ?? null,
            };
            nodes.set(key, node);
            return node;
        };

        // Core ancestor (context unless the core itself was the selection). Core has no parent.
        ensureNode('core', family, level === 'core', level === 'core' ? sel.wedgeId : null, null);

        if (level === 'secondary') {
            // A secondary's parent is its core family.
            ensureNode('secondary', sel.emotion, true, sel.wedgeId, family);
        } else if (level === 'tertiary') {
            // parent is the secondary emotion; add it as context if not already selected.
            if (sel.parent) ensureNode('secondary', sel.parent, false, null, family);
            ensureNode('tertiary', sel.emotion, true, sel.wedgeId, sel.parent || null);
        }
    }

    // Assemble ordered output + compute terminal flags.
    const orderIndex = (family) => {
        const i = familyOrder.indexOf(family);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };

    const forest = [...families.entries()]
        .map(([family, nodesMap]) => {
            const nodes = [...nodesMap.values()].sort((a, b) => {
                const dl = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
                return dl !== 0 ? dl : a.emotion.localeCompare(b.emotion);
            });
            // A selected node is "terminal" (definition-bearing) iff it has no SELECTED
            // descendant — i.e. it's the end of a chosen path. Per-sub-branch: two selected
            // leaves under the same family each define themselves. We detect a descendant by
            // whether any selected node names this one as its parent emotion.
            const selectedParents = new Set(
                nodes.filter((n) => n.selected && n.parentEmotion).map((n) => n.parentEmotion)
            );
            for (const n of nodes) {
                n.terminal = n.selected && !selectedParents.has(n.emotion);
            }
            return { family, nodes };
        })
        .sort((a, b) => orderIndex(a.family) - orderIndex(b.family));

    return forest;
}

// Render the whole tree into a fresh element.
//
// opts:
//   selections   — [{ wedgeId, level, emotion, parent, coreFamily }]
//   familyOrder  — array of core family names (wheel order) for stable grouping
//   getDefinition(emotion) -> string | '' (only used for terminal nodes)
//   getFamilyColor(family) -> css color (decorative stem/dot only)
//   onRemove(wedgeId)      — called when a selected node's × is activated
export function renderFeelingsTree({
    selections = [],
    familyOrder = [],
    getDefinition = () => '',
    getFamilyColor = () => 'currentColor',
    onRemove = () => {},
} = {}) {
    const forest = buildForest(selections, { familyOrder });

    const root = document.createElement('div');
    root.className = 'feelings-tree';

    forest.forEach((group, familyIndex) => {
        const section = document.createElement('section');
        section.className = 'feeling-family';
        section.style.setProperty('--family-color', getFamilyColor(group.family) || 'currentColor');
        // Stagger each family's reveal slightly for a calm cascade.
        section.style.setProperty('--reveal-delay', `${familyIndex * 60}ms`);

        const list = document.createElement('ul');
        list.className = 'feeling-nodes';
        list.setAttribute('role', 'list');

        for (const node of group.nodes) {
            const li = document.createElement('li');
            li.className = `feeling-node feeling-node--${node.level}`;
            if (node.selected) li.classList.add('is-selected');
            else li.classList.add('is-context');
            if (node.terminal) li.classList.add('is-terminal');
            if (node.wedgeId) li.dataset.wedgeId = node.wedgeId;
            li.dataset.level = node.level;
            li.dataset.emotion = node.emotion;

            const row = document.createElement('div');
            row.className = 'feeling-row';

            // Core rows carry the family-color dot swatch.
            if (node.level === 'core') {
                const dot = document.createElement('span');
                dot.className = 'feeling-dot';
                dot.setAttribute('aria-hidden', 'true');
                row.appendChild(dot);
            }

            const name = document.createElement('span');
            name.className = 'feeling-name';
            name.textContent = node.emotion || 'Feeling';
            row.appendChild(name);

            // Only selected nodes are removable; context ancestors are not interactive.
            if (node.selected && node.wedgeId) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'feeling-remove';
                btn.setAttribute('aria-label', `Remove ${node.emotion}`);
                btn.appendChild(removeIcon());
                btn.addEventListener('click', () => onRemove(node.wedgeId));
                row.appendChild(btn);
            }

            li.appendChild(row);

            // Definition ONLY on a terminal selection, and only if a real one exists.
            if (node.terminal) {
                const def = (getDefinition(node.emotion) || '').trim();
                if (def) {
                    const p = document.createElement('p');
                    p.className = 'feeling-def';
                    p.textContent = def;
                    li.appendChild(p);
                }
            }

            list.appendChild(li);
        }

        section.appendChild(list);
        root.appendChild(section);
    });

    return { element: root };
}
