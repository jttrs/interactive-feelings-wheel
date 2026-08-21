import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        screen: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        ResizeObserver: 'readonly',
        CustomEvent: 'readonly',
        MouseEvent: 'readonly',
        WheelEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Element: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // This rule alone catches the duplicate updateInstructionsVisibility() bug.
      'no-dupe-class-members': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Test + config files run in Node with test-runner globals.
    files: ['tests/**/*.js', '*.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
