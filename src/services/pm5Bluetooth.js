// Concept2 PM5 BLE GATT service and characteristic UUIDs
// Source: ergometer.js (github.com/tijmenvangulik/ergometer) + community docs
const PM5_ROW_SERVICE       = "ce060030-43e5-11e4-916c-0800200c9a66";
const ROWING_GENERAL_STATUS = "ce060031-43e5-11e4-916c-0800200c9a66";
const WORKOUT_END_SUMMARY   = "ce060080-43e5-11e4-916c-0800200c9a66";

// Workout state values broadcast in byte 6 of the status packet
export const WorkoutState = {
  IDLE:     0,
  ACTIVE:   1,
  PAUSED:   2,
  FINISHED: 3,
};

// Convert 500m split time (raw 0.01s units) to "m:ss.t" string
export function parsePace(rawValue) {
  if (!rawValue || rawValue === 0) return "--:--";
  const totalSecs = rawValue / 100;
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

// Format elapsed seconds as "mm:ss"
export function formatElapsed(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = Math.floor(totalSecs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Parse the Rowing General Status notification packet (19 bytes, little-endian)
// Byte layout per ergometer.js / Concept2 BLE community spec:
//   0–2   elapsed time (0.01s units)
//   3–5   distance (0.1m units)
//   6     workout state
//   9     stroke rate (SPM)
//   10–11 split/500m pace (0.01s units)
//   13–14 power (watts, uint16)
//   15–16 calories (uint16)
export function parseRowingStatus(dataView) {
  const elapsed = (
    dataView.getUint8(0) |
    (dataView.getUint8(1) << 8) |
    (dataView.getUint8(2) << 16)
  ) / 100;

  const distRaw = (
    dataView.getUint8(3) |
    (dataView.getUint8(4) << 8) |
    (dataView.getUint8(5) << 16)
  );
  const distance = distRaw / 10;

  const workoutState = dataView.getUint8(6);
  const strokeRate   = dataView.getUint8(9);
  const paceRaw      = dataView.getUint16(10, true);
  const watts        = dataView.getUint16(13, true);
  const calories     = dataView.getUint16(15, true);

  return {
    elapsedTime:  elapsed,
    elapsedStr:   formatElapsed(elapsed),
    distance:     Math.round(distance),
    workoutState,
    strokeRate,
    pace500:      paceRaw,
    paceStr:      parsePace(paceRaw),
    watts,
    calories,
  };
}

// Request connection to a PM5 device via Web Bluetooth
// Returns { device, chars: { rowingStatus, workoutSummary } }
export async function connectToPM5() {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth is not supported in this browser. Use Chrome or Edge.");
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [PM5_ROW_SERVICE] }],
    optionalServices: [PM5_ROW_SERVICE],
  });

  const server  = await device.gatt.connect();
  const service = await server.getPrimaryService(PM5_ROW_SERVICE);

  const [rowingStatus, workoutSummary] = await Promise.all([
    service.getCharacteristic(ROWING_GENERAL_STATUS),
    service.getCharacteristic(WORKOUT_END_SUMMARY),
  ]);

  return { device, chars: { rowingStatus, workoutSummary } };
}

// Subscribe to live rowing data notifications
// callback receives a parsed metrics object on each update
export async function subscribeToRowingStatus(characteristic, callback) {
  await characteristic.startNotifications();
  characteristic.addEventListener("characteristicvaluechanged", (e) => {
    callback(parseRowingStatus(e.target.value));
  });
}

// Subscribe to workout end summary (fires once when session completes)
export async function subscribeToWorkoutEnd(characteristic, callback) {
  await characteristic.startNotifications();
  characteristic.addEventListener("characteristicvaluechanged", (e) => {
    // Summary packet: parse distance and time from first 6 bytes (same layout)
    const dv = e.target.value;
    const distRaw = dv.getUint8(3) | (dv.getUint8(4) << 8) | (dv.getUint8(5) << 16);
    callback({
      totalDistance: Math.round(distRaw / 10),
      rawPacket: dv,
    });
  });
}

export async function disconnectPM5(device) {
  if (device && device.gatt.connected) {
    device.gatt.disconnect();
  }
}
