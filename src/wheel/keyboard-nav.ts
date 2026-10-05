// Structured keyboard model for the wheel. Pure (no DOM) so it can be unit-tested.
//
//   ← / →           previous / next feeling in the SAME ring (wraps)
//   ↓               outward: more specific feelings (last-visited child, else the first)
//   ↑               inward: the broader parent feeling
//   Home / End      first / last feeling in the ring
//   PgUp / PgDn,    previous / next core family, staying in the same ring
//   [ / ]
//
// Nodes arrive in stable generation (data-nav-index) order, which within a ring is the
// wheel's angular order — so ring order IS visual order around the circle.

export type NavLevel = 'core' | 'secondary' | 'tertiary';

export interface NavNode {
    id: string;
    level: NavLevel;
    emotion: string;
    /** Parent feeling's emotion (secondary → core, tertiary → secondary). */
    parent: string | null;
    /** Core family this wedge belongs to. */
    family: string;
    /** Can receive focus (false for Focused-view rested wedges). */
    reachable: boolean;
}

export type NavResult =
    | { kind: 'move'; id: string }
    | { kind: 'blocked'; reason: 'center' | 'outer' | 'rested'; emotion: string }
    | { kind: 'none' };

export const NAV_KEYS = [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    '[',
    ']',
] as const;

export function isNavKey(key: string): boolean {
    return (NAV_KEYS as readonly string[]).includes(key);
}

const OUTWARD: Record<NavLevel, NavLevel | null> = {
    core: 'secondary',
    secondary: 'tertiary',
    tertiary: null,
};

/** Key identifying a node as a parent: its level + family + emotion. */
export function parentKey(node: Pick<NavNode, 'level' | 'family' | 'emotion'>): string {
    return `${node.level}/${node.family}/${node.emotion}`;
}

function isChildOf(child: NavNode, parent: NavNode): boolean {
    return (
        child.level === OUTWARD[parent.level] &&
        child.family === parent.family &&
        child.parent === parent.emotion
    );
}

function findParent(nodes: readonly NavNode[], node: NavNode): NavNode | undefined {
    return nodes.find((p) => isChildOf(node, p));
}

function wrap(i: number, n: number): number {
    return ((i % n) + n) % n;
}

/**
 * Resolve where a navigation key moves focus from `currentId`.
 * `memory` maps parentKey → last-visited child id, so ↑ then ↓ returns where you were.
 */
export function resolveNavMove(
    nodes: readonly NavNode[],
    currentId: string,
    key: string,
    memory: ReadonlyMap<string, string> = new Map()
): NavResult {
    const current = nodes.find((n) => n.id === currentId);
    if (!current) return { kind: 'none' };

    const ring = nodes.filter((n) => n.level === current.level && n.reachable);
    const pos = ring.indexOf(current);

    switch (key) {
        case 'ArrowLeft':
        case 'ArrowRight': {
            if (!ring.length) return { kind: 'none' };
            // A rested current (shouldn't normally hold focus) starts from the ring's start.
            const step = key === 'ArrowRight' ? 1 : -1;
            const next = pos === -1 ? 0 : wrap(pos + step, ring.length);
            return { kind: 'move', id: ring[next].id };
        }
        case 'Home':
            return ring.length ? { kind: 'move', id: ring[0].id } : { kind: 'none' };
        case 'End':
            return ring.length ? { kind: 'move', id: ring[ring.length - 1].id } : { kind: 'none' };

        case 'ArrowUp': {
            const parent = findParent(nodes, current);
            if (!parent) return { kind: 'blocked', reason: 'center', emotion: current.emotion };
            return parent.reachable ? { kind: 'move', id: parent.id } : { kind: 'none' };
        }
        case 'ArrowDown': {
            const children = nodes.filter((n) => isChildOf(n, current));
            if (!children.length)
                return { kind: 'blocked', reason: 'outer', emotion: current.emotion };
            const open = children.filter((c) => c.reachable);
            if (!open.length)
                return { kind: 'blocked', reason: 'rested', emotion: current.emotion };
            const remembered = memory.get(parentKey(current));
            const target = open.find((c) => c.id === remembered) ?? open[0];
            return { kind: 'move', id: target.id };
        }

        case 'PageUp':
        case 'PageDown':
        case '[':
        case ']': {
            const step = key === 'PageDown' || key === ']' ? 1 : -1;
            // Family order = order of first appearance (cores are generated in wheel order).
            const families: string[] = [];
            for (const n of nodes) if (!families.includes(n.family)) families.push(n.family);
            const start = families.indexOf(current.family);
            for (let k = 1; k < families.length; k++) {
                const fam = families[wrap(start + step * k, families.length)];
                const first = ring.find((n) => n.family === fam);
                if (first) return { kind: 'move', id: first.id };
            }
            return { kind: 'none' };
        }
    }
    return { kind: 'none' };
}

/**
 * Position of each node among its siblings (same level + same parent), counted over the
 * full structure so it stays stable as Focused view opens and rests wedges.
 */
export function siblingPositions(
    nodes: readonly NavNode[]
): Map<string, { index: number; total: number }> {
    const groups = new Map<string, NavNode[]>();
    for (const n of nodes) {
        const g = `${n.level}/${n.level === 'core' ? '' : n.family}/${n.parent ?? ''}`;
        const list = groups.get(g) ?? [];
        list.push(n);
        groups.set(g, list);
    }
    const out = new Map<string, { index: number; total: number }>();
    for (const list of groups.values()) {
        list.forEach((n, i) => out.set(n.id, { index: i + 1, total: list.length }));
    }
    return out;
}
