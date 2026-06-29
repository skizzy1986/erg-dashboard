import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  connectToPM5,
  subscribeToRowingStatus,
  subscribeToWorkoutEnd,
  disconnectPM5,
  WorkoutState,
} from '../services/pm5Bluetooth';

export function usePM5() {
  const [status, setStatus] = useState('idle');
  // idle | connecting | connected | rowing | finished | error
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const deviceRef = useRef(null);
  // Track peak metrics for end-of-session summary
  const peakMetrics = useRef({ maxWatts: 0, strokeCount: 0, samples: [] });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const initBle = async () => {
      try {
        const { BluetoothLowEnergy } =
          await import('@capgo/capacitor-bluetooth-low-energy');
        await BluetoothLowEnergy.requestPermissions();
        BluetoothLowEnergy.shimWebBluetooth();
      } catch (err) {
        setError(err.message);
      }
    };
    initBle();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener('pause', () => {
      if (deviceRef.current?.gatt?.connected) {
        disconnectPM5(deviceRef.current);
        deviceRef.current = null;
        setStatus('idle');
        setMetrics(null);
      }
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    setSummary(null);
    peakMetrics.current = { maxWatts: 0, strokeCount: 0, samples: [] };

    try {
      const { device, chars } = await connectToPM5();
      deviceRef.current = device;

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('idle');
        setMetrics(null);
      });

      await subscribeToRowingStatus(chars.rowingStatus, (m) => {
        setMetrics(m);
        if (m.workoutState === WorkoutState.ACTIVE) {
          setStatus('rowing');
          if (m.watts > peakMetrics.current.maxWatts) {
            peakMetrics.current.maxWatts = m.watts;
          }
          peakMetrics.current.samples.push(m);
        }
        if (m.workoutState === WorkoutState.FINISHED) {
          buildSummary(m);
        }
      });

      await subscribeToWorkoutEnd(chars.workoutSummary, (endData) => {
        buildSummary(endData);
      });

      setStatus('connected');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  function buildSummary(finalMetrics) {
    const samples = peakMetrics.current.samples;
    const avgWatts = samples.length
      ? Math.round(samples.reduce((a, s) => a + s.watts, 0) / samples.length)
      : 0;
    const avgPace = samples.length
      ? Math.round(samples.reduce((a, s) => a + s.pace500, 0) / samples.length)
      : 0;
    const avgSpm = samples.length
      ? Math.round(
          samples.reduce((a, s) => a + s.strokeRate, 0) / samples.length
        )
      : 0;

    setSummary({
      distance: finalMetrics.distance || finalMetrics.totalDistance || 0,
      elapsedTime: finalMetrics.elapsedTime || 0,
      elapsedStr: finalMetrics.elapsedStr || '--:--',
      avgWatts,
      avgPace,
      avgSpm,
      maxWatts: peakMetrics.current.maxWatts,
      calories: finalMetrics.calories || 0,
    });
    setStatus('finished');
  }

  const disconnect = useCallback(() => {
    disconnectPM5(deviceRef.current);
    deviceRef.current = null;
    setStatus('idle');
    setMetrics(null);
  }, []);

  function reset() {
    disconnect();
    setSummary(null);
    setError(null);
  }

  return { status, metrics, summary, error, connect, disconnect, reset };
}
