import { describe, it, expect } from 'vitest';
import { readUrlOptions, writeUrlOptions } from '../../src/ui/url-options.ts';

describe('URL start-up options', () => {
    it('reads views and panel state, ignoring case, separators and unknown values', () => {
        expect(readUrlOptions('?view=simplified')).toEqual({
            simplified: true,
            focused: false,
            panelHidden: false,
        });
        expect(readUrlOptions('?view=Focused+simplified&panel=HIDDEN&x=1')).toEqual({
            simplified: true,
            focused: true,
            panelHidden: true,
        });
        expect(readUrlOptions('?view=bogus&panel=open')).toEqual({
            simplified: false,
            focused: false,
            panelHidden: false,
        });
    });

    it('writes a readable URL, keeping other params and the hash', () => {
        expect(
            writeUrlOptions('https://x.test/?lang=en#top', {
                simplified: true,
                focused: true,
                panelHidden: true,
            })
        ).toBe('https://x.test/?lang=en&view=simplified,focused&panel=hidden#top');
    });

    it('leaves no trace for the defaults', () => {
        expect(
            writeUrlOptions('https://x.test/?view=focused&panel=hidden', {
                simplified: false,
                focused: false,
                panelHidden: false,
            })
        ).toBe('https://x.test/');
    });

    it('round-trips', () => {
        const opts = { simplified: true, focused: false, panelHidden: true };
        const href = writeUrlOptions('https://x.test/', opts);
        expect(readUrlOptions(new URL(href).search)).toEqual(opts);
    });
});
