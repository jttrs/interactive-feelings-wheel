// Start-up options in the URL, so a therapist can jump straight into a setup (and
// bookmark it), e.g. a child's session:  ?view=simplified
//
//   view  = simplified | focused | simplified,focused   (comma, + or space separated)
//   panel = hidden
//
// The address bar is kept in sync as views change (replaceState, no history entries),
// so the current setup is always bookmarkable. Chosen feelings are deliberately NOT
// stored here (out of scope for now). Unknown values are ignored.

export interface UrlOptions {
    simplified: boolean;
    focused: boolean;
    panelHidden: boolean;
}

export function readUrlOptions(search: string): UrlOptions {
    const params = new URLSearchParams(search);
    const views = new Set(
        (params.get('view') || '')
            .toLowerCase()
            .split(/[\s,+]+/)
            .filter(Boolean)
    );
    return {
        simplified: views.has('simplified'),
        focused: views.has('focused'),
        panelHidden: (params.get('panel') || '').toLowerCase() === 'hidden',
    };
}

// Returns `href` with view/panel reflecting `options`; other params and the hash are kept.
// Defaults (full wheel, panel shown) leave no trace, so a plain link stays plain.
export function writeUrlOptions(href: string, options: UrlOptions): string {
    const url = new URL(href);
    const views = [options.simplified && 'simplified', options.focused && 'focused'].filter(
        Boolean
    ) as string[];
    if (views.length) url.searchParams.set('view', views.join(','));
    else url.searchParams.delete('view');
    if (options.panelHidden) url.searchParams.set('panel', 'hidden');
    else url.searchParams.delete('panel');
    // URLSearchParams encodes ',' as %2C; keep the readable form.
    return url.toString().replace(/view=([a-z]+)%2C([a-z]+)/, 'view=$1,$2');
}
