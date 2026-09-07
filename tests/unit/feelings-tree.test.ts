import { describe, it, expect } from 'vitest';
import { buildForest, renderFeelingsTree } from '../../src/ui/feelings-tree.ts';
import type { Selection, Level } from '../../src/types.ts';

// Convenience: a parsed-selection factory matching what app.js feeds the tree
// (the shape returned by wheelGenerator.parseUniqueWedgeId + wedgeId).
const sel = (
    level: Level,
    emotion: string,
    parent: string | null,
    coreFamily: string,
    wedgeId?: string
): Selection => ({
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
        const core = nodes.find((n) => n.level === 'core')!;
        const secondary = nodes.find((n) => n.level === 'secondary')!;
        const tertiary = nodes.find((n) => n.level === 'tertiary')!;
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

    it('groups each tertiary under its own parent secondary (not the last one)', () => {
        // Angry > Bitter > Violated  AND  Angry > Mad > Furious
        const forest = buildForest(
            [
                sel('tertiary', 'Furious', 'Mad', 'Angry'),
                sel('tertiary', 'Violated', 'Bitter', 'Angry'),
            ],
            { familyOrder: FAMILY_ORDER }
        );
        expect(forest[0].nodes.map((n) => `${n.level}:${n.emotion}`)).toEqual([
            'core:Angry',
            'secondary:Bitter',
            'tertiary:Violated',
            'secondary:Mad',
            'tertiary:Furious',
        ]);
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
        const playful = forest[0].nodes.find((n) => n.emotion === 'Playful')!;
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
        const cheeky = nodes.find((n) => n.emotion === 'Cheeky')!;
        const content = nodes.find((n) => n.emotion === 'Content')!;
        const playful = nodes.find((n) => n.emotion === 'Playful')!;
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
        const playful = forest[0].nodes.find((n) => n.emotion === 'Playful')!;
        const cheeky = forest[0].nodes.find((n) => n.emotion === 'Cheeky')!;
        expect(playful.selected).toBe(true);
        expect(playful.terminal).toBe(false); // has a selected descendant
        expect(cheeky.terminal).toBe(true);
    });
});

describe('renderFeelingsTree — DOM output', () => {
    const opts = {
        familyOrder: FAMILY_ORDER,
        getFamilyColor: (f: string) => (f === 'Happy' ? '#FFFF99' : '#B3C6FF'),
        getDefinition: (e: string) =>
            e === 'Cheeky' ? 'Playfully bold and a little impudent.' : '',
    };

    it('renders a family section tinted with the family color (stem)', () => {
        const { element } = renderFeelingsTree({
            selections: [sel('core', 'Happy', null, 'Happy')],
            ...opts,
        });
        const family = element.querySelector('.feeling-family') as HTMLElement;
        expect(family.style.getPropertyValue('--family-color')).toBe('#FFFF99');
        expect(family.querySelector('.feeling-node--core .feeling-name')).not.toBeNull();
    });

    it('renders a definition on every node that has one, but expands only the terminal by default', () => {
        // Every level has a definition here, so all three render a (collapsible) def.
        const allDefs = {
            ...opts,
            getDefinition: (e: string) => `Definition of ${e}.`,
        };
        const { element } = renderFeelingsTree({
            selections: [
                sel('core', 'Happy', null, 'Happy'),
                sel('secondary', 'Playful', 'Happy', 'Happy'),
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
            ],
            ...allDefs,
        });
        // All three levels carry a definition element.
        expect(element.querySelectorAll('.feeling-def')).toHaveLength(3);

        // Only the terminal (tertiary Cheeky) starts expanded; ancestors start collapsed.
        const core = element.querySelector('.feeling-node--core')!;
        const secondary = element.querySelector('.feeling-node--secondary')!;
        const tertiary = element.querySelector('.feeling-node--tertiary')!;
        expect(core.classList.contains('is-collapsed')).toBe(true);
        expect(secondary.classList.contains('is-collapsed')).toBe(true);
        expect(tertiary.classList.contains('is-collapsed')).toBe(false);

        // The name is a toggle button reflecting expanded state via aria-expanded.
        expect(tertiary.querySelector('.feeling-name--toggle')!.getAttribute('aria-expanded')).toBe(
            'true'
        );
        expect(core.querySelector('.feeling-name--toggle')!.getAttribute('aria-expanded')).toBe(
            'false'
        );
    });

    it('clicking any feeling word toggles its own definition collapse state', () => {
        const allDefs = { ...opts, getDefinition: (e: string) => `Definition of ${e}.` };
        const { element } = renderFeelingsTree({
            selections: [
                sel('secondary', 'Playful', 'Happy', 'Happy'),
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
            ],
            ...allDefs,
        });
        // The context core (Happy) starts collapsed; click its word to expand it.
        const core = element.querySelector('.feeling-node--core')!;
        const coreToggle = core.querySelector('.feeling-name--toggle') as HTMLButtonElement;
        expect(core.classList.contains('is-collapsed')).toBe(true);
        coreToggle.click();
        expect(core.classList.contains('is-collapsed')).toBe(false);
        expect(coreToggle.getAttribute('aria-expanded')).toBe('true');
        // Click again to collapse.
        coreToggle.click();
        expect(core.classList.contains('is-collapsed')).toBe(true);
    });

    it('a word with no definition is a plain label, not a toggle button', () => {
        // 'Content' has no def in this stub → no def element, no toggle button.
        const { element } = renderFeelingsTree({
            selections: [sel('secondary', 'Content', 'Happy', 'Happy')],
            ...opts,
        });
        const node = element.querySelector('.feeling-node--secondary')!;
        expect(node.querySelector('.feeling-def')).toBeNull();
        expect(node.querySelector('.feeling-name--toggle')).toBeNull();
        expect(node.querySelector('.feeling-name')).not.toBeNull();
    });

    it('is informational only — never renders a remove/deselect control', () => {
        // The sidebar must not control the wheel; deselection happens on the wheel itself.
        const { element } = renderFeelingsTree({
            selections: [
                sel('core', 'Happy', null, 'Happy', 'core-Happy'),
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
            ],
            ...opts,
        });
        expect(element.querySelector('.feeling-remove')).toBeNull();
        expect(element.querySelectorAll('button.feeling-remove')).toHaveLength(0);
    });

    it('both toggle-button and plain-span words carry the shared .feeling-name class', () => {
        // Structural half of the type guard (the COMPUTED-style parity is asserted in the
        // e2e spec, where the real stylesheet is applied — jsdom does not load styles.css).
        // Both element forms must carry .feeling-name so the tokenized level rules hit them.
        // A word WITH a def renders a <button>; a word withOUT one renders a <span>.
        const guardDefs = {
            ...opts,
            getDefinition: (e: string) => (e === 'Cheeky' ? 'Playfully bold.' : ''), // Aroused → ''
        };
        const { element } = renderFeelingsTree({
            selections: [
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'), // has def → <button>
                sel('tertiary', 'Aroused', 'Playful', 'Happy'), // no def → <span>
            ],
            ...guardDefs,
        });
        const nodes = [...element.querySelectorAll('.feeling-node--tertiary')];
        const toggle = nodes
            .map((n) => n.querySelector('.feeling-name--toggle'))
            .find((x): x is Element => !!x);
        const span = nodes
            .map((n) => n.querySelector('.feeling-name:not(.feeling-name--toggle)'))
            .find((x): x is Element => !!x);
        expect(toggle).toBeDefined();
        expect(span).toBeDefined();
        expect(toggle!.tagName).toBe('BUTTON');
        expect(span!.tagName).toBe('SPAN');
        expect(toggle!.classList.contains('feeling-name')).toBe(true);
        expect(span!.classList.contains('feeling-name')).toBe(true);
    });

    it('all definitions share one uniform indent regardless of level', () => {
        // The def's offset from its own word is level-independent (structural: they all get
        // the same .feeling-def class; the single padding-left token is asserted in e2e).
        const allDefs = { ...opts, getDefinition: (e: string) => `Definition of ${e}.` };
        const { element } = renderFeelingsTree({
            selections: [
                sel('secondary', 'Playful', 'Happy', 'Happy'),
                sel('tertiary', 'Cheeky', 'Playful', 'Happy'),
            ],
            ...allDefs,
        });
        const defs = [...element.querySelectorAll('.feeling-def')];
        expect(defs.length).toBeGreaterThanOrEqual(2);
        // No per-level def class/variant exists — every def is the same class.
        for (const d of defs) expect(d.className).toBe('feeling-def');
    });

    it('degrades safely on blank/malformed selections', () => {
        const { element } = renderFeelingsTree({
            selections: [
                { wedgeId: '', level: '' as Level, emotion: '', parent: null, coreFamily: '' },
            ],
            ...opts,
        });
        // Nothing renders for an empty selection; no throw.
        expect(element.querySelectorAll('.feeling-family')).toHaveLength(0);
    });
});
