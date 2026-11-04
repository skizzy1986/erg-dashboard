import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  FAILED_MESSAGE,
  OFFLINE_MESSAGE,
  useAnatomyData,
} from '../hooks/useAnatomyData.js';

const mocks = vi.hoisted(() => ({ captureError: vi.fn(), workers: [] }));
vi.mock('../../utils/sentry.js', () => ({
  captureError: (...a) => mocks.captureError(...a),
}));
vi.mock('../workers/createAnatomyWorker.js', () => ({
  createAnatomyWorker: () => {
    const w = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    };
    mocks.workers.push(w);
    return w;
  },
}));

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);
// A buffer the real manifest's offsets fit inside.
const BUFFER = new ArrayBuffer(3450003);
const CAPS = { webgl: true, decompression: true, worker: true };
const URLS = { manifestUrl: '/m.json' };

const okFetch = () =>
  vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) });

const lastWorker = () => mocks.workers.at(-1);
const send = (data) => act(() => lastWorker().onmessage({ data }));

beforeEach(() => {
  mocks.captureError.mockReset();
  mocks.workers.length = 0;
  globalThis.fetch = okFetch();
});

describe('useAnatomyData', () => {
  it('walks fetching → decoding → building → ready', async () => {
    const { result } = renderHook(() =>
      useAnatomyData({ ...URLS, capabilities: CAPS })
    );
    expect(result.current.stage).toBe('fetching');
    await waitFor(() => expect(mocks.workers).toHaveLength(1));
    expect(result.current.summary.kv.mcv).toBe('0.61 m/s');
    expect(lastWorker().postMessage).toHaveBeenCalledWith({ type: 'start' });

    send({ type: 'progress', loaded: 1_100_000, total: 2_200_000 });
    expect(result.current).toMatchObject({
      stage: 'fetching',
      loaded: 1_100_000,
      total: 2_200_000,
    });
    send({ type: 'decoding' });
    expect(result.current.stage).toBe('decoding');
    send({ type: 'done', buffer: BUFFER });
    expect(result.current.stage).toBe('building');
    await waitFor(() => expect(result.current.stage).toBe('ready'));
    expect(result.current.buffer).toBe(BUFFER);
    expect(mocks.captureError).not.toHaveBeenCalled();
    // Released as soon as it delivered, not held until unmount.
    expect(lastWorker().terminate).toHaveBeenCalledTimes(1);
  });

  it('reports a download failure, then recovers on retry', async () => {
    const { result } = renderHook(() =>
      useAnatomyData({ ...URLS, capabilities: CAPS })
    );
    await waitFor(() => expect(mocks.workers).toHaveLength(1));
    send({ type: 'error', message: 'HTTP 500' });
    expect(result.current.stage).toBe('error');
    expect(lastWorker().terminate).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe(FAILED_MESSAGE);
    expect(mocks.captureError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'HTTP 500' }),
      expect.objectContaining({ where: 'useAnatomyData', stage: 'download' })
    );

    act(() => result.current.retry());
    expect(result.current.stage).toBe('fetching');
    await waitFor(() => expect(mocks.workers).toHaveLength(2));
    expect(mocks.workers[0].terminate).toHaveBeenCalled();
    send({ type: 'done', buffer: BUFFER });
    await waitFor(() => expect(result.current.stage).toBe('ready'));
  });

  it('fails a buffer too short for the manifest at the build step', async () => {
    const { result } = renderHook(() =>
      useAnatomyData({ ...URLS, capabilities: CAPS })
    );
    await waitFor(() => expect(mocks.workers).toHaveLength(1));
    send({ type: 'done', buffer: new ArrayBuffer(16) });
    await waitFor(() => expect(result.current.stage).toBe('error'));
    expect(mocks.captureError.mock.calls[0][1].stage).toBe('building');
  });

  it('treats a crashed worker as an error', async () => {
    const { result } = renderHook(() =>
      useAnatomyData({ ...URLS, capabilities: CAPS })
    );
    await waitFor(() => expect(mocks.workers).toHaveLength(1));
    const preventDefault = vi.fn();
    act(() => lastWorker().onerror({ message: 'boom', preventDefault }));
    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.stage).toBe('error');
    expect(lastWorker().terminate).toHaveBeenCalledTimes(1);
    expect(mocks.captureError.mock.calls[0][1].stage).toBe('worker');
  });

  it('says a connection is needed when the manifest fails offline', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));
    const online = vi
      .spyOn(window.navigator, 'onLine', 'get')
      .mockReturnValue(false);
    const { result } = renderHook(() =>
      useAnatomyData({ ...URLS, capabilities: CAPS })
    );
    await waitFor(() => expect(result.current.stage).toBe('error'));
    expect(result.current.error).toBe(OFFLINE_MESSAGE);
    expect(result.current.manifest).toBeNull();
    expect(mocks.workers).toHaveLength(0);
    online.mockRestore();
  });

  it('fails on a manifest HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const { result } = renderHook(() =>
      useAnatomyData({ ...URLS, capabilities: CAPS })
    );
    await waitFor(() => expect(result.current.stage).toBe('error'));
    expect(mocks.captureError.mock.calls[0][0].message).toMatch(/404/);
  });

  it('loads the manifest but skips the stream when it cannot be unpacked', async () => {
    const { result } = renderHook(() =>
      useAnatomyData({
        ...URLS,
        capabilities: { ...CAPS, decompression: false },
      })
    );
    await waitFor(() => expect(result.current.stage).toBe('unsupported'));
    expect(result.current.summary).not.toBeNull();
    expect(mocks.workers).toHaveLength(0);
    expect(mocks.captureError).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', async () => {
    const { result, unmount } = renderHook(() =>
      useAnatomyData({ ...URLS, capabilities: CAPS })
    );
    await waitFor(() => expect(mocks.workers).toHaveLength(1));
    const w = lastWorker();
    unmount();
    expect(w.terminate).toHaveBeenCalled();
    w.onmessage({ data: { type: 'decoding' } });
    expect(result.current.stage).toBe('fetching');
  });

  it('aborts an in-flight manifest fetch on unmount, without reporting it', async () => {
    let signal;
    globalThis.fetch = vi.fn((_url, init) => {
      signal = init.signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        );
      });
    });
    const { unmount } = renderHook(() =>
      useAnatomyData({ ...URLS, capabilities: CAPS })
    );
    await waitFor(() => expect(signal).toBeDefined());
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
    await Promise.resolve();
    expect(mocks.captureError).not.toHaveBeenCalled();
    expect(mocks.workers).toHaveLength(0);
  });
});
