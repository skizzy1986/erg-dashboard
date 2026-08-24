import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    // Without a `files` glob here, ESLint 9 expands a directory argument
    // (`eslint src/`) to **/*.js only, so every non-test .jsx was silently
    // skipped and the lint gate reported green over ~14.5k unvisited lines.
    // The test/e2e blocks below match .jsx, which is why *those* were linted.
    files: ['**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        confirm: 'readonly',
        Image: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        DataView: 'readonly',
        ArrayBuffer: 'readonly',
        Uint8Array: 'readonly',
        TextDecoder: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: '19.2' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // ignoreRestSiblings covers the deliberate omit-a-key idiom
      // (`const { _queuedAt, ...rest } = session`), which is a rest-spread
      // filter, not dead code. varsIgnorePattern extends the existing `_`
      // convention from arguments to variables so the two agree.
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/immutability': 'warn',
      // Default forbids ' and " too, which fired 27 times purely on prose
      // ("Scott's", quoted coach notes). React renders those literally and
      // correctly; escaping them makes the copy unreadable for no safety gain.
      // > and } stay forbidden — those are the genuinely ambiguous ones.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    },
  },
  {
    files: ['src/**/__tests__/**/*.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
  },
  {
    files: ['e2e/**/*.{js,jsx}', 'playwright.config.js', 'vite.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
  },
  {
    // Node build/CI scripts. They are in the lint scope because the design-sync
    // guard lives here and is CI-enforced — a gate that is itself ungated is how
    // the barrel broke in the first place.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
];
