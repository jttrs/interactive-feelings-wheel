import { describe, it, expect } from 'vitest';
import { createTestWheel, CORE, FEELINGS_DATA } from '../helpers/wheel.ts';
import {
    resolveNavMove,
    siblingPositions,
    isNavKey,
    parentKey,
    type NavNode,
} from '../../src/wheel/keyboard-nav.ts';

// Tiny two-family fixture in generation order: cores, then secondaries, then tertiaries.
function node(
    id: string,
    level: NavNode['level'],
    family: string,
    parent: string | null = null,
    reachable = true
): NavNode {
    return { id, level, emotion: id, parent, family, reachable };
}
const NODES: NavNode[] = [
    node('A', 'core', 'A'),
    node('B', 'core', 'B'),
    node('a1', 'secondary', 'A', 'A'),
    node('a2', 'secondary', 'A', 'A'),
    node('b1', 'secondary', 'B', 'B'),
    node('a1x', 'tertiary', 'A', 'a1'),
    node('a1y', 'tertiary', 'A', 'a1'),
    node('a2x', 'tertiary', 'A', 'a2'),
    node('b1x', 'tertiary', 'B', 'b1'),
];
const move = (from: string, key: string, nodes = NODES, mem?: Map<string, string>) =>
    resolveNavMove(nodes, from, key, mem);

describe('resolveNavMove', () => {
    it('Left/Right stay in the ring and wrap', () => {
        expect(move('A', 'ArrowRight')).toEqual({ kind: 'move', id: 'B' });
        expect(move('B', 'ArrowRight')).toEqual({ kind: 'move', id: 'A' });
        expect(move('a1', 'ArrowLeft')).toEqual({ kind: 'move', id: 'b1' });
        expect(move('a2', 'ArrowRight')).toEqual({ kind: 'move', id: 'b1' }); // crosses family
    });

    it('Home/End go to the ends of the current ring', () => {
        expect(move('a2x', 'Home')).toEqual({ kind: 'move', id: 'a1x' });
        expect(move('a1x', 'End')).toEqual({ kind: 'move', id: 'b1x' });
    });

    it('Down goes to the first child; Up to the parent', () => {
        expect(move('A', 'ArrowDown')).toEqual({ kind: 'move', id: 'a1' });
        expect(move('a2', 'ArrowDown')).toEqual({ kind: 'move', id: 'a2x' });
        expect(move('a2x', 'ArrowUp')).toEqual({ kind: 'move', id: 'a2' });
        expect(move('b1', 'ArrowUp')).toEqual({ kind: 'move', id: 'B' });
    });

    it('Down prefers the remembered child', () => {
        const mem = new Map([[parentKey(NODES[0]), 'a2']]);
        expect(move('A', 'ArrowDown', NODES, mem)).toEqual({ kind: 'move', id: 'a2' });
    });

    it('reports center/outer edges instead of moving', () => {
        expect(move('A', 'ArrowUp')).toEqual({ kind: 'blocked', reason: 'center', emotion: 'A' });
        expect(move('a1x', 'ArrowDown')).toMatchObject({ kind: 'blocked', reason: 'outer' });
    });

    it('treats a secondary as the outer ring when tertiaries are absent (simplified)', () => {
        const simplified = NODES.filter((n) => n.level !== 'tertiary');
        expect(move('a1', 'ArrowDown', simplified)).toMatchObject({
            kind: 'blocked',
            reason: 'outer',
        });
    });

    it('PageUp/PageDown and [ ] jump families within the ring', () => {
        expect(move('a2', 'PageDown')).toEqual({ kind: 'move', id: 'b1' });
        expect(move('b1', ']')).toEqual({ kind: 'move', id: 'a1' }); // wraps
        expect(move('b1x', '[')).toEqual({ kind: 'move', id: 'a1x' });
        expect(move('A', 'PageUp')).toEqual({ kind: 'move', id: 'B' });
    });

    it('skips rested (focused) wedges and reports rested children', () => {
        const focused = NODES.map((n) =>
            n.level === 'core' || n.id === 'b1' ? n : { ...n, reachable: false }
        );
        expect(move('b1', 'ArrowRight', focused)).toEqual({ kind: 'move', id: 'b1' });
        expect(move('A', 'ArrowDown', focused)).toEqual({
            kind: 'blocked',
            reason: 'rested',
            emotion: 'A',
        });
        // Family jump skips family A, which has nothing open in the secondary ring.
        expect(move('b1', 'PageDown', focused)).toEqual({ kind: 'none' });
    });

    it('recognises only the navigation keys', () => {
        for (const k of ['ArrowLeft', 'Home', 'PageDown', '[', ']']) expect(isNavKey(k)).toBe(true);
        for (const k of ['g', 's', 'Enter', 'Tab']) expect(isNavKey(k)).toBe(false);
    });
});

describe('siblingPositions', () => {
    it('counts position among siblings sharing a parent', () => {
        const pos = siblingPositions(NODES);
        expect(pos.get('B')).toEqual({ index: 2, total: 2 });
        expect(pos.get('a2')).toEqual({ index: 2, total: 2 });
        expect(pos.get('b1')).toEqual({ index: 1, total: 1 });
        expect(pos.get('a1y')).toEqual({ index: 2, total: 2 });
    });
});

describe('wheel keyboard integration (jsdom)', () => {
    const focusId = (c: Element) =>
        c.querySelector('.wedge[tabindex="0"]')?.getAttribute('data-wedge-id');
    const wedge = (c: Element, sel: string) => c.querySelector(sel) as SVGElement;

    it('labels each wedge with its position among siblings', () => {
        const { container } = createTestWheel();
        const happyCount = FEELINGS_DATA.secondary.Happy.length;
        expect(
            wedge(container, '.core-wedge[data-emotion="Angry"]').getAttribute('aria-label')
        ).toBe(`Angry, core feeling, 1 of ${CORE}`);
        expect(
            wedge(container, '.secondary-wedge[data-emotion="Playful"]').getAttribute('aria-label')
        ).toBe(`Playful, under Happy, 1 of ${happyCount}`);
    });

    it('moves by ring and family, keeping a single tab stop', () => {
        const { container, gen } = createTestWheel();
        const happy = wedge(container, '.core-wedge[data-emotion="Happy"]');
        gen.moveWedgeFocus(happy, 'ArrowDown');
        const playful = wedge(container, '.secondary-wedge[data-emotion="Playful"]');
        expect(focusId(container)).toBe(playful.dataset.wedgeId);
        expect(container.querySelectorAll('.wedge[tabindex="0"]')).toHaveLength(1);

        gen.moveWedgeFocus(playful, 'ArrowRight');
        const content = wedge(container, '.secondary-wedge[data-emotion="Content"]');
        expect(focusId(container)).toBe(content.dataset.wedgeId);

        // Up then Down returns to the remembered child.
        gen.moveWedgeFocus(content, 'ArrowUp');
        expect(focusId(container)).toBe(happy.dataset.wedgeId);
        gen.moveWedgeFocus(happy, 'ArrowDown');
        expect(focusId(container)).toBe(content.dataset.wedgeId);
    });

    it('announces edges in simplified view', () => {
        const region = document.createElement('div');
        region.id = 'sr-announcer';
        document.body.appendChild(region);
        const { container, gen } = createTestWheel({ simplified: true });
        gen.moveWedgeFocus(
            wedge(container, '.secondary-wedge[data-emotion="Playful"]'),
            'ArrowDown'
        );
        expect(region.textContent).toBe('This is the outer ring.');
        region.remove();
    });
});
