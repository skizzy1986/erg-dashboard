// Test-only stand-in for '@testing-library/react' (vite.config.js aliases the
// bare specifier here under Vitest). Lingui's hooks throw without an
// I18nProvider, and ~130 test files render components that now use them, so
// every render gets the provider — Lingui's own RTL pattern (lingui.dev
// guides/testing), applied once instead of in every file.
//
// The real entry is re-exported from its file path, which the alias does not
// match. That keeps RTL's own auto-cleanup and act-environment setup exactly
// as they were, rather than a copy of them.
import { createElement, createRef, useEffect } from 'react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render as rtlRender } from '@testing-library/react/dist/index.js';

export * from '@testing-library/react/dist/index.js';

const provide = (ui) => createElement(I18nProvider, { i18n }, ui);

// The provider wraps the UI, not the test's `wrapper`: React double-invokes
// effects only under a StrictMode at the ROOT of the tree, so putting any
// component above a caller's `wrapper: StrictMode` silently switches off the
// very thing that test exists to check.
export function render(ui, options) {
  const result = rtlRender(provide(ui), options);
  const { rerender } = result;
  result.rerender = (next) => rerender(provide(next));
  return result;
}

// RTL's renderHook calls its own internal render, which this module cannot
// reach, and passing the provider as a `wrapper` would put a component above a
// caller's StrictMode. So this is RTL 16's renderHook (dist/pure.js) built on
// the render above, with nothing else changed.
export function renderHook(renderCallback, options = {}) {
  const { initialProps, ...renderOptions } = options;
  const result = createRef();
  function TestComponent({ renderCallbackProps }) {
    const pendingResult = renderCallback(renderCallbackProps);
    useEffect(() => {
      result.current = pendingResult;
    });
    return null;
  }
  const { rerender: baseRerender, unmount } = render(
    createElement(TestComponent, { renderCallbackProps: initialProps }),
    renderOptions
  );
  const rerender = (rerenderCallbackProps) =>
    baseRerender(
      createElement(TestComponent, {
        renderCallbackProps: rerenderCallbackProps,
      })
    );
  return { result, rerender, unmount };
}
