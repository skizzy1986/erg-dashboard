import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the BLE service so the real hook logic (buildSummary, finish, reset)
// runs against controllable callbacks instead of hardware.
let rowingStatusCallback = null;
const connectToPM5Mock = vi.fn();
const disconnectPM5Mock = vi.fn();

vi.mock('../../services/pm5Bluetooth', async () => {
  const actual = await vi.importActual('../../services/pm5Bluetooth');
  return {
    ...actual,
    connectToPM5: (...args) => connectToPM5Mock(...args),
    subscribeToRowingStatus: async (_char, cb) => {
      rowingStatusCallback = cb;
    },
    subscribeToWorkoutEnd: async () => {},
    disconnectPM5: (...args) => disconnectPM5Mock(...args),
  };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn() },
}));

import { usePM5 } from '../usePM5';
import { WorkoutState } from '../../services/pm5Bluetooth';

const fakeDevice = { addEventListener: vi.fn(), gatt: { connected: true } };

function activeSample(overrides = {}) {
  return {
    workoutState: WorkoutState.ACTIVE,
    watts: 200,
    pace500: 12000,
    strokeRate: 22,
    elapsedTime: 600,
    elapsedStr: '10:00',
    distance: 2500,
    calories: 90,
    ...overrides,
  };
}

async function connectedHook() {
  const rendered = renderHook(() => usePM5());
  connectToPM5Mock.mockResolvedValue({
    device: fakeDevice,
    chars: { rowingStatus: {}, workoutSummary: {} },
  });
  await act(async () => {
    await rendered.result.current.connect();
  });
  return rendered;
}

beforeEach(() => {
  rowingStatusCallback = null;
  connectToPM5Mock.mockReset();
  disconnectPM5Mock.mockReset();
});

describe('usePM5 finish() — manual END rescue', () => {
  it('builds the summary from the last-known metrics instead of discarding the session', async () => {
    const { result } = await connectedHook();

    await act(async () => {
      rowingStatusCallback(activeSample({ watts: 180, elapsedTime: 300 }));
      rowingStatusCallback(
        activeSample({ watts: 220, elapsedTime: 600, distance: 2600 })
      );
    });
    expect(result.current.status).toBe('rowing');

    await act(async () => {
      result.current.finish();
    });

    expect(result.current.status).toBe('finished');
    expect(result.current.summary).toEqual({
      distance: 2600,
      elapsedTime: 600,
      elapsedStr: '10:00',
      avgWatts: 200,
      avgPace: 12000,
      avgSpm: 22,
      maxWatts: 220,
      calories: 90,
    });
  });

  it('null-safes a finish with no metrics ever received (PM5 dead before first packet)', async () => {
    const { result } = await connectedHook();

    await act(async () => {
      result.current.finish();
    });

    expect(result.current.status).toBe('finished');
    expect(result.current.summary).toEqual({
      distance: 0,
      elapsedTime: 0,
      elapsedStr: '--:--',
      avgWatts: 0,
      avgPace: 0,
      avgSpm: 0,
      maxWatts: 0,
      calories: 0,
    });
  });

  it('a FINISHED status packet builds the same summary shape automatically', async () => {
    const { result } = await connectedHook();

    await act(async () => {
      rowingStatusCallback(activeSample());
      rowingStatusCallback(
        activeSample({
          workoutState: WorkoutState.FINISHED,
          elapsedTime: 1200,
          elapsedStr: '20:00',
          distance: 5000,
        })
      );
    });

    expect(result.current.status).toBe('finished');
    expect(result.current.summary.distance).toBe(5000);
    expect(result.current.summary.elapsedTime).toBe(1200);
  });

  it('reset() clears the summary and disconnects', async () => {
    const { result } = await connectedHook();

    await act(async () => {
      rowingStatusCallback(activeSample());
      result.current.finish();
    });
    expect(result.current.summary).not.toBeNull();

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.summary).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(disconnectPM5Mock).toHaveBeenCalled();
  });
});
