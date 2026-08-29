import { describe, it, expect, vi } from 'vitest';
import { createCard } from '../../src/ui/emotion-card.js';

// The guarded EmotionCard component: correct markup, keeps its definition,
// per-card collapse, remove callback, and safe degradation on bad input.

function make(overrides = {}) {
    return createCard({
        wedgeId: 'core-Angry',
        emotion: 'Angry',
        level: 'core',
        color: '#FFB3B3',
        definition: 'An emotional response to perceived threats.',
        ...overrides,
    });
}

describe('createCard markup', () => {
    it('builds a card with name, level chip, definition, and the family accent', () => {
        const { element, handle } = make();
        expect(element.classList.contains('emotion-card')).toBe(true);
        expect(element.getAttribute('data-wedge-id')).toBe('core-Angry');
        expect(element.style.getPropertyValue('--emotion-color')).toBe('#FFB3B3');
        expect(element.querySelector('.card-name').textContent).toBe('Angry');
        expect(element.querySelector('.card-chip').textContent).toBe('Core');
        expect(element.querySelector('.card-definition').textContent).toBe(
            'An emotional response to perceived threats.'
        );
        expect(handle.wedgeId).toBe('core-Angry');
    });

    it('maps each level to its chip label', () => {
        expect(make({ level: 'secondary' }).element.querySelector('.card-chip').textContent).toBe(
            'Secondary'
        );
        expect(make({ level: 'tertiary' }).element.querySelector('.card-chip').textContent).toBe(
            'Specific'
        );
    });

    it('shows a loading placeholder when no definition is provided', () => {
        const { element } = make({ definition: undefined });
        const def = element.querySelector('.card-definition');
        expect(def.classList.contains('loading')).toBe(true);
    });
});

describe('definition is always kept (no accordion)', () => {
    it('setDefinition swaps text and clears the loading state', () => {
        const { element, handle } = make({ definition: undefined });
        handle.setDefinition('Feeling mad or upset.');
        const def = element.querySelector('.card-definition');
        expect(def.classList.contains('loading')).toBe(false);
        expect(def.textContent).toBe('Feeling mad or upset.');
    });

    it('a freshly built card is expanded (body visible, not collapsed)', () => {
        const { element, handle } = make();
        expect(handle.isCollapsed()).toBe(false);
        expect(element.classList.contains('is-collapsed')).toBe(false);
    });
});

describe('per-card collapse', () => {
    it('toggles only this card and reflects aria-expanded', () => {
        const { element, handle } = make();
        const toggle = element.querySelector('.card-toggle');

        toggle.click();
        expect(handle.isCollapsed()).toBe(true);
        expect(element.classList.contains('is-collapsed')).toBe(true);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        toggle.click();
        expect(handle.isCollapsed()).toBe(false);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });

    it('fires onToggle with the wedge id and collapsed state', () => {
        const onToggle = vi.fn();
        const { element } = make({ onToggle });
        element.querySelector('.card-toggle').click();
        expect(onToggle).toHaveBeenCalledWith('core-Angry', true);
    });
});

describe('remove', () => {
    it('the remove button fires onRemove with the wedge id', () => {
        const onRemove = vi.fn();
        const { element } = make({ onRemove });
        element.querySelector('.card-remove').click();
        expect(onRemove).toHaveBeenCalledWith('core-Angry');
    });

    it('handle.remove() detaches the element', () => {
        const { element, handle } = make();
        document.body.appendChild(element);
        expect(document.body.contains(element)).toBe(true);
        handle.remove();
        expect(document.body.contains(element)).toBe(false);
    });
});

describe('guards', () => {
    it('degrades to safe defaults when required fields are missing', () => {
        const { element, handle } = createCard();
        expect(element.classList.contains('emotion-card')).toBe(true);
        expect(element.querySelector('.card-name').textContent).toBe('Emotion');
        expect(element.querySelector('.card-chip').textContent).toBe('Core'); // unknown level -> Core
        expect(typeof handle.wedgeId).toBe('string');
        // No callbacks provided: clicking must not throw.
        expect(() => element.querySelector('.card-remove').click()).not.toThrow();
        expect(() => element.querySelector('.card-toggle').click()).not.toThrow();
    });
});
