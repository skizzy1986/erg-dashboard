import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// A separate file from useCoach.test.js on purpose: that one mocks
// @tanstack/react-query wholesale to exercise buildTrainingContext as a pure
// function, and vi.mock is file-scoped and hoisted, so a test that needs the
// real hook machinery cannot live alongside it.

const insertMock = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      insert: (...args) => insertMock(...args),
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { access_token: 'test-token' } } }),
      getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }),
    },
  },
}));

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
  insertMock.mockClear();
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
