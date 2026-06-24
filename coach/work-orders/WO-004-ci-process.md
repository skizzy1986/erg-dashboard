---
id: WO-004
title: Implement rigorous CI process — lint, test, coverage, branch protection
status: ready
author: coach
created: 2026-06-24
targets: [github-actions, npm-config, vite-config]
schedule: null
notify: null
reversible: true
depends_on: []
acceptance:
  - npm run lint passes on a clean checkout
  - npm run format:check passes on a clean checkout
  - npm run build passes
  - .github/workflows/ci.yml triggers on pull_request and push to main
  - all three CI jobs (lint, test, build) pass on a clean branch
  - coverage summary appears as a comment on a PR
  - a PR that drops line coverage below 70% causes the test job to fail
  - a PR with an ESLint error causes the lint job to fail
  - .github/dependabot.yml opens grouped weekly PRs for npm and github-actions
  - git commit on a staged .js or .jsx file triggers the pre-commit hook
---

# WO-004 — CI Process

## Feature name

Establish a complete CI pipeline: lint, format check, test with coverage gates,
and build verification gated on every pull request.

## User story

As Scott, I want every pull request to be automatically checked for lint errors,
formatting violations, test regressions, and build failures, so that broken code
cannot reach `main` without an explicit decision to override the gate.

## Acceptance criteria

1. Running `npm run lint` on a clean checkout exits 0.
2. Running `npm run format:check` on a clean checkout exits 0.
3. Running `npm run build` exits 0 and produces a `dist/` directory.
4. `.github/workflows/ci.yml` triggers on every `pull_request` event and on every `push` to `main`.
5. The `lint` CI job runs `npm run lint` and `npm run format:check` in sequence; a single ESLint error causes the job to exit non-zero and the PR is blocked.
6. The `test` CI job runs `npx vitest run --coverage`; the run exits non-zero if any test fails.
7. The `test` CI job exits non-zero when line coverage drops below 70%, function coverage drops below 70%, or branch coverage drops below 60%.
8. A coverage summary comment is posted on the PR by `davelosert/vitest-coverage-report-action@v2` after the `test` job completes.
9. The `build` CI job only runs after `test` passes (`needs: test`); it runs `npm run build` and exits non-zero on any build error.
10. A new push to a branch that already has an open PR cancels the in-progress CI run for that branch (concurrency cancel-in-progress).
11. `.github/dependabot.yml` causes Dependabot to open one grouped PR per week for minor/patch npm updates, and one grouped PR per week for minor/patch GitHub Actions updates. Major-version bumps get individual PRs.
12. Running `git commit` with staged `*.js` or `*.jsx` files triggers the lint-staged pre-commit hook, which runs `eslint --fix` and `prettier --write` on those files before the commit lands.
13. The pre-commit hook does NOT run Vitest (keeping commit latency under 5 seconds).
14. The branch protection rules documented in the "Post-merge manual steps" section are applied manually on GitHub and block direct pushes to `main`.

## Files to create or modify

### Create (new files)

| Path | Purpose |
|---|---|
| `.github/workflows/ci.yml` | GitHub Actions CI workflow |
| `.github/dependabot.yml` | Dependabot version update config |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template |
| `eslint.config.js` | ESLint v9 flat config |
| `.prettierrc` | Prettier config |
| `.husky/pre-commit` | Pre-commit hook script |

### Modify (existing files)

| Path | Change |
|---|---|
| `package.json` | Add devDependencies, new scripts, lint-staged config, `prepare` script |
| `vite.config.js` | Add `coverage` block inside existing `test` block |

### No changes required

- `src/test-setup.js` — already correct
- `vercel.json` — not relevant to CI
- All `src/` application files — must not be modified as part of this work-order

## New devDependencies to install

```
npm install --save-dev eslint eslint-plugin-react eslint-plugin-react-hooks @eslint/js prettier husky lint-staged
```

## Detailed implementation

### `package.json` — scripts block

Replace existing `scripts` entirely:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "lint": "eslint src/",
  "format": "prettier --write src/",
  "format:check": "prettier --check src/",
  "prepare": "husky"
}
```

Add `lint-staged` as a top-level key in `package.json`:

```json
"lint-staged": {
  "*.{js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

### `.prettierrc`

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true
}
```

### `eslint.config.js`

The project uses `"type": "module"` so this must use ES module syntax:

```js
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
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
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
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
];
```

Rule rationale:
- `react/prop-types: off` — project has no PropTypes usage; enforcing it generates hundreds of immediate warnings
- `react/react-in-jsx-scope: off` — React 18 JSX transform does not require importing React
- `no-console: off` — codebase uses console.log for debugging throughout
- `no-unused-vars: warn` not error — monolith likely has unused vars from in-progress refactor; warn so CI doesn't break immediately

### `vite.config.js` — coverage block

Add inside the existing `test: { ... }` object:

```js
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.js'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary', 'json'],
    thresholds: {
      lines: 70,
      functions: 70,
      branches: 60,
    },
  },
},
```

**Important:** Before committing, run `npx vitest run --coverage` locally and verify the thresholds pass against the current codebase. If the thresholds cause immediate failure (because most of the 3,900-line monolith is untested), lower them to match the actual baseline (e.g. `lines: 10`) and ratchet them up as coverage improves. Do not merge a CI config that fails on the current codebase.

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm audit --audit-level=high

  test:
    name: Test & Coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: davelosert/vitest-coverage-report-action@v2
        if: always()
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
```

Notes:
- `npm audit --audit-level=high` — fails on high/critical only; moderate advisories are too common in transitive deps to be actionable
- `davelosert/vitest-coverage-report-action@v2` uses `if: always()` so the coverage comment posts even when tests fail
- `GITHUB_TOKEN` is provided automatically; no secret setup required
- Job names (`Lint & Format`, `Test & Coverage`, `Build`) must match exactly what is added to GitHub branch protection required checks

### `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    groups:
      minor-and-patch:
        update-types:
          - minor
          - patch
    open-pull-requests-limit: 5

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
    groups:
      minor-and-patch:
        update-types:
          - minor
          - patch
    open-pull-requests-limit: 5
```

### `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## What changed and why

<!-- One sentence. What does this PR do and why is it needed? -->

## How to test manually

<!-- Only needed if the change isn't covered by CI tests. Delete if not applicable. -->

## Checklist

- [ ] CI is green (lint, test, build)
- [ ] Tests cover the change, or I've noted why they don't
- [ ] `npm run build` passes locally
- [ ] No unexpected console errors in the browser
```

### `.husky/pre-commit`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

This file must be executable. After installing husky, run:

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

The `"prepare": "husky"` script in `package.json` runs automatically on `npm install` for all future checkouts.

## Post-merge manual steps — branch protection (GitHub UI)

Navigate to: **GitHub → skizzy1986/erg-dashboard → Settings → Branches → Add branch ruleset**

Configure:

| Setting | Value |
|---|---|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ checked; required approvals: 0 |
| Require status checks to pass | ✅ checked |
| Required checks | `Lint & Format`, `Test & Coverage`, `Build` |
| Require branches to be up to date | ✅ checked |
| Do not allow bypassing | ✅ checked |
| Block force pushes | ✅ checked |

After the first PR with the new workflow runs, observe the exact Vercel status check name (e.g. `Vercel — erg-dashboard`) and add it to the required checks list.

## Scope boundary — what this spec does NOT include

- **Supabase local stack in CI** — no DB integration tests exist; deferred until they do
- **E2E tests against Vercel preview** — Playwright/Cypress setup is a separate work-order
- **TypeScript type-checking** — project is plain JavaScript
- **Node version matrix** — Node 20 LTS only (migrate to 22 before September 2026 runner deprecation)
- **Coverage threshold increases** — ratchet thresholds upward in future work-orders as the strangler-fig refactor produces testable modules
- **Bundle-size budgets in CI** — deferred
- **Changes to `src/` application code** — ESLint may surface warnings on first run; those are addressed in separate refactor work-orders, not here
