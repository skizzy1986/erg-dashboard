import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// A separate file from useCoach.test.js on purpose: that one mocks
// @tanstack/react-query wholesale to exercise buildTrainingContext as a pure
// function, and vi.mock is file-scoped and hoisted, so a test that needs the
// real hook machinery cannot live alongside it.

const insertMock = vi.fn((row) =>
  Promise.resolve({ error: insertErrorFor(row) })
);
const deleteEqMock = vi.fn(() => Promise.resolve({ error: deleteError }));
const getUserMock = vi.fn(() => getUserResult());

// Same mutable-module-state idiom as sessionRows/vitalsState below: the mock
// factory is hoisted, so per-test overrides have to reach it through bindings.
// insertErrorFor takes the row so a test can fail one role's insert only.
let insertErrorFor = () => null;
let deleteError = null;
let getUserResult = () => Promise.resolve({ data: { user: { id: 'u1' } } });

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      insert: (...args) => insertMock(...args),
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      delete: () => ({ eq: (...args) => deleteEqMock(...args) }),
    }),
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { access_token: 'test-token' } } }),
      getUser: (...args) => getUserMock(...args),
    },
  },
}));

vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));

import { captureError } from '../../utils/sentry.js';

let sessionRows = [];
let vitalsState = {
  latest: null,
  readinessScore: 0,
  readinessLabel: 'FATIGUED',
};
let tssRows = [];

vi.mock('../useSessions.js', () => ({
  useSessions: () => ({ data: sessionRows }),
}));
vi.mock('../useVitals.js', () => ({ useVitals: () => vitalsState }));
vi.mock('../useTSSHistory.js', () => ({
  useTSSHistory: () => ({ data: tssRows }),
}));

import { useCoach, todayISO } from '../useCoach.js';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

// The hook streams the response body, so fetch has to hand back a real
// ReadableStream carrying SSE frames or sendMessage never settles.
function stubFetch() {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      body: {
        getReader() {
          const frames = [
            'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n',
            'data: {"type":"message_stop"}\n',
          ];
          let i = 0;
          return {
            read() {
              if (i >= frames.length) return Promise.resolve({ done: true });
              return Promise.resolve({
                done: false,
                value: new globalThis.TextEncoder().encode(frames[i++]),
              });
            },
          };
        },
      },
    })
  );
  globalThis.fetch = fetchMock;
  return fetchMock;
}

// Posted body of the single coach-chat request.
async function sendAndReadBody(fetchMock) {
  const { result } = renderHook(() => useCoach(), { wrapper: makeWrapper() });
  await act(async () => {
    await result.current.sendMessage('how is my load?');
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const [url, init] = fetchMock.mock.calls[0];
  return { url, body: JSON.parse(init.body) };
}

beforeEach(() => {
  sessionRows = [];
  tssRows = [];
  vitalsState = { latest: null, readinessScore: 0, readinessLabel: 'FATIGUED' };
  insertErrorFor = () => null;
  deleteError = null;
  getUserResult = () => Promise.resolve({ data: { user: { id: 'u1' } } });
  insertMock.mockClear();
  deleteEqMock.mockClear();
  getUserMock.mockClear();
  captureError.mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete globalThis.fetch;
});

describe('useCoach sends the training context', () => {
  it('posts a non-empty context string to coach-chat', async () => {
    const fetchMock = stubFetch();
    const { url, body } = await sendAndReadBody(fetchMock);

    expect(url).toContain('/functions/v1/coach-chat');
    expect(typeof body.context).toBe('string');
    expect(body.context.length).toBeGreaterThan(0);
    expect(body.context).toContain('CURRENT TRAINING DATA');
    expect(body.messages).toHaveLength(1);
  });

  it('carries load, readiness and recent sessions when the data is there', async () => {
    tssRows = [
      { date: '8/18/26', tss: 40 },
      { date: '8/19/26', tss: 55 },
    ];
    vitalsState = {
      latest: { rhr: 58, hrv: 27, sleep: 6.8 },
      readinessScore: 68,
      readinessLabel: 'CAUTION',
    };
    sessionRows = [
      {
        date: '8/19/26',
        type: 'Z2 Aerobic',
        duration: 60,
        srpe: 4,
        status: 'completed',
      },
      {
        date: '8/18/26',
        type: 'Upper Strength',
        duration: 45,
        srpe: 6,
        status: 'actual',
      },
    ];

    const fetchMock = stubFetch();
    const { body } = await sendAndReadBody(fetchMock);

    expect(body.context).toContain('TSB:');
    expect(body.context).toContain('CTL:');
    expect(body.context).toContain('Readiness: 68/100 CAUTION');
    expect(body.context).toContain('RHR: 58');
    expect(body.context).toContain('Recent sessions (newest first):');
    expect(body.context).toContain('2026-08-19: Z2 Aerobic 60min sRPE 4');
    expect(body.context).toContain('2026-08-18: Upper Strength 45min sRPE 6');
  });

  it('parses the free-text duration column instead of interpolating it', async () => {
    sessionRows = [
      {
        date: '8/20/26',
        type: 'Erg',
        duration: '45:00',
        srpe: 5,
        status: 'completed',
      },
      {
        date: '8/19/26',
        type: 'Bike',
        duration: '1h4m',
        srpe: 4,
        status: 'completed',
      },
      { date: '8/18/26', type: 'Row', duration: '57m', status: 'actual' },
      {
        date: '8/17/26',
        type: 'Rest',
        duration: 'not-a-duration',
        status: 'completed',
      },
    ];

    const fetchMock = stubFetch();
    const { body } = await sendAndReadBody(fetchMock);

    expect(body.context).toContain('2026-08-20: Erg 45min sRPE 5');
    expect(body.context).toContain('2026-08-19: Bike 64min sRPE 4');
    expect(body.context).toContain('2026-08-18: Row 57min');
    expect(body.context).toContain('2026-08-17: Rest');
    expect(body.context).not.toContain('45:00min');
    expect(body.context).not.toContain('1h4mmin');
    expect(body.context).not.toContain('NaN');
  });

  it('leaves cancelled and planned rows out of recent sessions', async () => {
    sessionRows = [
      {
        date: '8/20/26',
        type: 'Ghost Row',
        duration: 60,
        srpe: 5,
        status: 'cancelled',
      },
      {
        date: '8/19/26',
        type: 'Future Row',
        duration: 60,
        srpe: 5,
        status: 'planned',
      },
      {
        date: '8/18/26',
        type: 'Z2 Aerobic',
        duration: 60,
        srpe: 4,
        status: 'completed',
      },
    ];

    const fetchMock = stubFetch();
    const { body } = await sendAndReadBody(fetchMock);

    expect(body.context).toContain('2026-08-18: Z2 Aerobic');
    expect(body.context).not.toContain('Ghost Row');
    expect(body.context).not.toContain('Future Row');
  });

  it('caps recent sessions at one microcycle', async () => {
    sessionRows = Array.from({ length: 20 }, (_, i) => ({
      date: `8/${20 - i}/26`,
      type: `Session${i}`,
      duration: 30,
      srpe: 5,
      status: 'completed',
    }));

    const fetchMock = stubFetch();
    const { body } = await sendAndReadBody(fetchMock);

    const listed = body.context
      .split('\n')
      .filter((l) => /^ {2}\d{4}-/.test(l));
    expect(listed).toHaveLength(8);
    expect(body.context).toContain('Session0');
    expect(body.context).toContain('Session7');
    expect(body.context).not.toContain('Session8');
  });

  // The regression this issue is really about: sessions.date is TEXT "M/D/YY",
  // and the old server-side builder compared it to an ISO day, so today's
  // prescription could never be found.
  it("matches today's planned session across the M/D/YY vs ISO boundary", async () => {
    const iso = todayISO();
    const [y, m, d] = iso.split('-');
    const logDate = `${Number(m)}/${Number(d)}/${y.slice(2)}`;
    sessionRows = [
      {
        date: logDate,
        type: 'Z2 Aerobic',
        label: '60min easy',
        status: 'planned',
      },
    ];

    const fetchMock = stubFetch();
    const { body } = await sendAndReadBody(fetchMock);

    expect(body.context).toContain("Today's session: Z2 Aerobic — 60min easy");
  });

  it('ignores a planned session dated another day', async () => {
    sessionRows = [
      { date: '1/2/26', type: 'Z2 Aerobic', label: 'stale', status: 'planned' },
    ];

    const fetchMock = stubFetch();
    const { body } = await sendAndReadBody(fetchMock);

    expect(body.context).not.toContain("Today's session:");
  });

  it('still sends a well-formed request when every source is empty', async () => {
    const fetchMock = stubFetch();
    const { body } = await sendAndReadBody(fetchMock);

    expect(body.context).toContain('CURRENT TRAINING DATA');
    expect(body.context).not.toContain('TSB:');
    expect(body.context).not.toContain('Readiness:');
    expect(body.context).not.toContain('Recent sessions');
    expect(body.context).not.toContain('undefined');
    expect(body.context).not.toContain('NaN');
  });
});

// postgrest-js resolves with `{ error }` rather than rejecting, so before #276
// every one of these failures was invisible — not merely uncaught.
// The initial coach_messages query resolves a tick after mount and replaces
// whatever setQueryData put there, so an optimistic user message written before
// it settles is silently dropped. Let it land first.
async function settleInitialQuery() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useCoach reports its own failures', () => {
  function renderCoach() {
    return renderHook(() => useCoach(), { wrapper: makeWrapper() });
  }

  it('reports a failed user-message insert without breaking the turn', async () => {
    const failure = { code: '42501', message: 'permission denied' };
    insertErrorFor = (row) => (row.role === 'user' ? failure : null);
    const fetchMock = stubFetch();

    const { result } = renderCoach();
    await settleInitialQuery();
    await act(async () => {
      await result.current.sendMessage('how is my load?');
    });

    expect(captureError).toHaveBeenCalledWith(failure, {
      source: 'useCoach',
      op: 'insertUserMessage',
    });
    // The turn still ran: the request went out and the reply landed.
    expect(fetchMock).toHaveBeenCalled();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.error).toBeNull();
  });

  it('reports a failed assistant-message insert on the message_stop path', async () => {
    const failure = { code: '42501', message: 'permission denied' };
    insertErrorFor = (row) => (row.role === 'assistant' ? failure : null);
    stubFetch();

    const { result } = renderCoach();
    await act(async () => {
      await result.current.sendMessage('how is my load?');
    });

    expect(captureError).toHaveBeenCalledWith(failure, {
      source: 'useCoach',
      op: 'insertAssistantMessage',
      finalised: true,
    });
  });

  it('distinguishes the stream-ended-without-stop fallback insert', async () => {
    const failure = { code: '42501', message: 'permission denied' };
    insertErrorFor = (row) => (row.role === 'assistant' ? failure : null);
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        body: {
          getReader() {
            const frames = [
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"cut short"}}\n',
            ];
            let i = 0;
            return {
              read() {
                if (i >= frames.length) return Promise.resolve({ done: true });
                return Promise.resolve({
                  done: false,
                  value: new globalThis.TextEncoder().encode(frames[i++]),
                });
              },
            };
          },
        },
      })
    );

    const { result } = renderCoach();
    await act(async () => {
      await result.current.sendMessage('how is my load?');
    });

    expect(captureError).toHaveBeenCalledWith(failure, {
      source: 'useCoach',
      op: 'insertAssistantMessage',
      finalised: false,
    });
  });

  it('reports a non-ok coach-chat response and still surfaces the UI error', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('upstream exploded'),
      })
    );

    const { result } = renderCoach();
    await act(async () => {
      await result.current.sendMessage('how is my load?');
    });

    const call = captureError.mock.calls.find(
      ([, ctx]) => ctx?.op === 'sendMessage'
    );
    expect(call).toBeDefined();
    expect(call[0]).toBeInstanceOf(Error);
    expect(call[1]).toEqual({
      source: 'useCoach',
      op: 'sendMessage',
      model: 'sonnet',
    });
    // Regression guard: reporting is additive, the existing UI state stands.
    await waitFor(() => expect(result.current.error).toContain('Coach error'));
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingContent).toBe('');
  });
});

describe('useCoach clearHistory', () => {
  async function seedTwoMessages(result) {
    stubFetch();
    await settleInitialQuery();
    await act(async () => {
      await result.current.sendMessage('how is my load?');
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
  }

  it('clears the list when the delete succeeds', async () => {
    const { result } = renderHook(() => useCoach(), { wrapper: makeWrapper() });
    await seedTwoMessages(result);

    await act(async () => {
      await result.current.clearHistory();
    });

    expect(deleteEqMock).toHaveBeenCalledWith('user_id', 'u1');
    await waitFor(() => expect(result.current.messages).toHaveLength(0));
    expect(captureError).not.toHaveBeenCalled();
  });

  // Clearing the UI on a failed delete only hides rows the server still has.
  it('reports a failed delete and leaves the list intact', async () => {
    const { result } = renderHook(() => useCoach(), { wrapper: makeWrapper() });
    await seedTwoMessages(result);
    captureError.mockClear();
    deleteError = { code: '42501', message: 'permission denied' };

    await act(async () => {
      await result.current.clearHistory();
    });

    expect(captureError).toHaveBeenCalledWith(deleteError, {
      source: 'useCoach',
      op: 'clearHistory',
    });
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.error).toBe(
      'Could not clear history — please try again'
    );
  });

  it('catches a rejecting getUser instead of leaking an unhandled rejection', async () => {
    const { result } = renderHook(() => useCoach(), { wrapper: makeWrapper() });
    await seedTwoMessages(result);
    captureError.mockClear();
    const authFailure = new Error('auth session missing');
    getUserResult = () => Promise.reject(authFailure);

    await act(async () => {
      await expect(result.current.clearHistory()).resolves.toBeUndefined();
    });

    expect(captureError).toHaveBeenCalledWith(authFailure, {
      source: 'useCoach',
      op: 'clearHistory',
    });
    expect(deleteEqMock).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.error).toBe(
      'Could not clear history — please try again'
    );
  });
});
