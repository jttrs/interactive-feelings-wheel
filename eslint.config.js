import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

    // TypeScript source + TS tests: browser runtime globals.
    {
        files: ['**/*.ts'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.browser },
        },
        rules: {
            // This rule alone catches the duplicate updateInstructionsVisibility() bug.
            'no-dupe-class-members': 'error',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },

    // Remaining plain-JS files: Playwright/Vitest e2e specs + helpers run in the browser
    // context, node scripts + config files run in node. Give both global sets — it's a
    // superset that keeps these lint-clean without per-file precision.
    {
        files: ['**/*.js'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    }
);
