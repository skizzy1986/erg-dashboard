// The one place the worker is constructed. Vite only recognises the worker if
// `new URL(..., import.meta.url)` sits directly inside `new Worker(...)` with
// static options (Vite docs, "Web Workers > Import with Constructors"), so this
// line must stay literal. Isolated so tests can mock it.
export function createAnatomyWorker() {
  return new Worker(new URL('./anatomyDecode.worker.js', import.meta.url), {
    type: 'module',
  });
}
