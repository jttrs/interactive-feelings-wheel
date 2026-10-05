import { describe, it, expect } from 'vitest';
import { lensWordFor } from '../../src/ui/wheel-lens.ts';

describe('reading lens content', () => {
    it('shows a core word on its own', () => {
        expect(lensWordFor({ level: 'core', emotion: 'Angry' })).toEqual({
            word: 'Angry',
            path: '',
        });
    });
    it('shows the family above a secondary word', () => {
        expect(lensWordFor({ level: 'secondary', emotion: 'Playful', parent: 'Happy' })).toEqual({
            word: 'Playful',
            path: 'Happy',
        });
    });
    it('shows the full lineage above an outer-ring word', () => {
        expect(
            lensWordFor({
                level: 'tertiary',
                emotion: 'Cheeky',
                parent: 'Playful',
                grandparent: 'Happy',
            })
        ).toEqual({ word: 'Cheeky', path: 'Happy › Playful' });
    });
    it('ignores elements without a word', () => {
        expect(lensWordFor({})).toBeNull();
    });
});
