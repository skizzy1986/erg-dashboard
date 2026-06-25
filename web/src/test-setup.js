import '@testing-library/jest-dom';

// jsdom has no ResizeObserver, which recharts' ResponsiveContainer relies on.
// Stub it so chart-bearing components can be rendered in tests.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
