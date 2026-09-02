import { describe, it, expect, vi } from 'vitest';
import { buildForest, renderFeelingsTree } from '../../src/ui/feelings-tree.js';

// Convenience: a parsed-selection factory matching what app.js feeds the tree
// (the shape returned by wheelGenerator.parseUniqueWedgeId + wedgeId).
const sel = (level, emotion, parent, coreFamily, wedgeId) => ({
    wedgeId: wedgeId || `${level}-${emotion}`,
    level,
    emotion,
    parent,
    coreFamily,
});

const FAMILY_ORDER = ['Angry', 'Disgusted', 'Sad', 'Happy', 'Surprised', 'Bad', 'Fearful'];

describe('buildForest — grouping & levels', () => {
    it('groups multiple selections under one core family in level order', () => {
        const forest = buildForest(
            [
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
                sel('secondary', 'Playful', 'Happy', 'Happy'),
                sel('core', 'Happy', null, 'Happy'),
            ],
            { familyOrder: FAMILY_ORDER }
        );
        expect(forest).toHaveLength(1);
        expect(forest[0].family).toBe('Happy');
        expect(forest[0].nodes.map((n) => `${n.level}:${n.emotion}`)).toEqual([
            'core:Happy',
            'secondary:Playful',
            'tertiary:Cheeky',
        ]);
    });

    it('renders implied-ancestor context nodes for a lone tertiary', () => {
        const forest = buildForest([sel('tertiary', 'Cheeky', 'Playful', 'Happy')], {
            familyOrder: FAMILY_ORDER,
        });
        const nodes = forest[0].nodes;
        const core = nodes.find((n) => n.level === 'core');
        const secondary = nodes.find((n) => n.level === 'secondary');
        const tertiary = nodes.find((n) => n.level === 'tertiary');
        // The core + secondary are present as CONTEXT (not selected), the tertiary selected.
        expect(core.selected).toBe(false);
        expect(secondary.selected).toBe(false);
        expect(secondary.emotion).toBe('Playful');
        expect(tertiary.selected).toBe(true);
    });

    it('orders families by the wheel order, not selection order', () => {
        const forest = buildForest(
            [sel('core', 'Happy', null, 'Happy'), sel('core', 'Angry', null, 'Angry')],
            { familyOrder: FAMILY_ORDER }
        );
        expect(forest.map((f) => f.family)).toEqual(['Angry', 'Happy']);
    });
});

describe('buildForest — terminal (definition-bearing) rule', () => {
    it('marks only the deepest selected node in a chain as terminal', () => {
        const forest = buildForest(
            [
                sel('core', 'Happy', null, 'Happy'),
                sel('secondary', 'Playful', 'Happy', 'Happy'),
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
            ],
            { familyOrder: FAMILY_ORDER }
        );
        const terminal = forest[0].nodes.filter((n) => n.terminal);
        expect(terminal).toHaveLength(1);
        expect(terminal[0].emotion).toBe('Cheeky');
    });

    it('a lone selected secondary is itself terminal', () => {
        const forest = buildForest([sel('secondary', 'Playful', 'Happy', 'Happy')], {
            familyOrder: FAMILY_ORDER,
        });
        const playful = forest[0].nodes.find((n) => n.emotion === 'Playful');
        expect(playful.selected).toBe(true);
        expect(playful.terminal).toBe(true);
    });

    it('two sibling sub-branches under one family EACH have their own terminal', () => {
        // Happy > Playful > Cheeky  AND  Happy > Content (a selected secondary sibling).
        const forest = buildForest(
            [
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
                sel('secondary', 'Content', 'Happy', 'Happy'),
            ],
            { familyOrder: FAMILY_ORDER }
        );
        const nodes = forest[0].nodes;
        const cheeky = nodes.find((n) => n.emotion === 'Cheeky');
        const content = nodes.find((n) => n.emotion === 'Content');
        const playful = nodes.find((n) => n.emotion === 'Playful');
        // Per-sub-branch rule: each selected leaf with no selected descendant is terminal.
        // Cheeky (deepest of its path) AND Content (a selected leaf of its own path) both are.
        expect(cheeky.terminal).toBe(true);
        expect(content.terminal).toBe(true);
        // Playful is only context (selected:false, has a selected child) → not terminal.
        expect(playful.selected).toBe(false);
        expect(playful.terminal).toBe(false);
    });

    it('a selected parent with a selected child is NOT terminal (child is)', () => {
        // Select BOTH Playful (secondary) and its child Cheeky (tertiary).
        const forest = buildForest(
            [
                sel('secondary', 'Playful', 'Happy', 'Happy'),
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
            ],
            { familyOrder: FAMILY_ORDER }
        );
        const playful = forest[0].nodes.find((n) => n.emotion === 'Playful');
        const cheeky = forest[0].nodes.find((n) => n.emotion === 'Cheeky');
        expect(playful.selected).toBe(true);
        expect(playful.terminal).toBe(false); // has a selected descendant
        expect(cheeky.terminal).toBe(true);
    });
});

describe('renderFeelingsTree — DOM output', () => {
    const opts = {
        familyOrder: FAMILY_ORDER,
        getFamilyColor: (f) => (f === 'Happy' ? '#FFFF99' : '#B3C6FF'),
        getDefinition: (e) => (e === 'Cheeky' ? 'Playfully bold and a little impudent.' : ''),
    };

    it('renders a family section tinted with the family color and a core dot', () => {
        const { element } = renderFeelingsTree({
            selections: [sel('core', 'Happy', null, 'Happy')],
            ...opts,
        });
        const family = element.querySelector('.feeling-family');
        expect(family.style.getPropertyValue('--family-color')).toBe('#FFFF99');
        expect(family.querySelector('.feeling-node--core .feeling-dot')).not.toBeNull();
    });

    it('shows the definition ONLY on the terminal node', () => {
        const { element } = renderFeelingsTree({
            selections: [
                sel('core', 'Happy', null, 'Happy'),
                sel('secondary', 'Playful', 'Happy', 'Happy'),
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
            ],
            ...opts,
        });
        const defs = element.querySelectorAll('.feeling-def');
        expect(defs).toHaveLength(1);
        expect(defs[0].textContent).toContain('Playfully bold');
        // The terminal node is the tertiary Cheeky.
        const cheeky = element.querySelector('.feeling-node--tertiary');
        expect(cheeky.querySelector('.feeling-def')).not.toBeNull();
    });

    it('omits the definition line entirely when the terminal has no real definition', () => {
        // 'Content' has no def in this stub → no filler line.
        const { element } = renderFeelingsTree({
            selections: [sel('secondary', 'Content', 'Happy', 'Happy')],
            ...opts,
        });
        expect(element.querySelector('.feeling-def')).toBeNull();
    });

    it('renders remove controls only on selected nodes, not context ancestors', () => {
        const { element } = renderFeelingsTree({
            selections: [sel('tertiary', 'Cheeky', 'Playful', 'Happy')],
            ...opts,
        });
        // Context core (Happy) + context secondary (Playful) have no remove; Cheeky does.
        const core = element.querySelector('.feeling-node--core');
        const secondary = element.querySelector('.feeling-node--secondary');
        const tertiary = element.querySelector('.feeling-node--tertiary');
        expect(core.querySelector('.feeling-remove')).toBeNull();
        expect(secondary.querySelector('.feeling-remove')).toBeNull();
        expect(tertiary.querySelector('.feeling-remove')).not.toBeNull();
    });

    it('fires onRemove with the wedgeId when a remove control is activated', () => {
        const onRemove = vi.fn();
        const { element } = renderFeelingsTree({
            selections: [sel('core', 'Happy', null, 'Happy', 'core-Happy')],
            ...opts,
            onRemove,
        });
        element.querySelector('.feeling-remove').click();
        expect(onRemove).toHaveBeenCalledWith('core-Happy');
    });

    it('degrades safely on blank/malformed selections', () => {
        const { element } = renderFeelingsTree({
            selections: [{ wedgeId: '', level: '', emotion: '', parent: null, coreFamily: '' }],
            ...opts,
        });
        // Nothing renders for an empty selection; no throw.
        expect(element.querySelectorAll('.feeling-family')).toHaveLength(0);
    });
});
