// A failed dynamic import cannot be retried in place: the browser may cache
// the failure for that module specifier, and Vite's preload helper memoises
// it too, so a second import() of the same chunk can fail without trying.
// A reload starts both from scratch. Its own module so tests can replace it
// (jsdom's window.location cannot be stubbed).
export const reloadPage = () => window.location.reload();
