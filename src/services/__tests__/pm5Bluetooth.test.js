import { describe, it, expect } from "vitest";
import {
  parsePace,
  formatElapsed,
  parseRowingStatus,
  WorkoutState,
} from "../pm5Bluetooth.js";

// ---------------------------------------------------------------------------
// Helper — build a 19-byte DataView with preset bytes
// ---------------------------------------------------------------------------
function makePacket(bytes = []) {
  const buf = new ArrayBuffer(19);
  const view = new DataView(buf);
  bytes.forEach((b, i) => view.setUint8(i, b));
  return view;
}

// Set a 3-byte little-endian integer starting at offset n
function set3ByteLE(view, n, value) {
  view.setUint8(n,     value & 0xff);
  view.setUint8(n + 1, (value >> 8) & 0xff);
  view.setUint8(n + 2, (value >> 16) & 0xff);
}

// ---------------------------------------------------------------------------
// parsePace
// ---------------------------------------------------------------------------
describe("parsePace", () => {
  it("returns '--:--' for 0", () => {
    expect(parsePace(0)).toBe("--:--");
  });

  it("returns '--:--' for undefined / falsy", () => {
    expect(parsePace(undefined)).toBe("--:--");
    expect(parsePace(null)).toBe("--:--");
  });

  it("converts 11800 (1:58.0) correctly", () => {
    // 11800 raw units * 0.01s = 118s = 1m 58.0s
    expect(parsePace(11800)).toBe("1:58.0");
  });

  it("converts 12000 (2:00.0) correctly", () => {
    // 12000 * 0.01s = 120s = 2m 0.0s
    expect(parsePace(12000)).toBe("2:00.0");
  });

  it("converts 6000 (1:00.0) correctly", () => {
    expect(parsePace(6000)).toBe("1:00.0");
  });

  it("handles a sub-minute pace (e.g. 5500 = 0:55.0)", () => {
    // 5500 * 0.01s = 55s = 0m 55.0s
    expect(parsePace(5500)).toBe("0:55.0");
  });
});

// ---------------------------------------------------------------------------
// formatElapsed
// ---------------------------------------------------------------------------
describe("formatElapsed", () => {
  it("returns '00:00' for 0 seconds", () => {
    expect(formatElapsed(0)).toBe("00:00");
  });

  it("returns '01:05' for 65 seconds", () => {
    expect(formatElapsed(65)).toBe("01:05");
  });

  it("returns '01:58' for 118 seconds", () => {
    expect(formatElapsed(118)).toBe("01:58");
  });

  it("returns '60:00' for 3600 seconds", () => {
    expect(formatElapsed(3600)).toBe("60:00");
  });

  it("returns '00:59' for 59 seconds", () => {
    expect(formatElapsed(59)).toBe("00:59");
  });

  it("pads minutes and seconds with leading zeros", () => {
    expect(formatElapsed(5)).toBe("00:05");
    expect(formatElapsed(600)).toBe("10:00");
  });
});

// ---------------------------------------------------------------------------
// parseRowingStatus — individual field tests
// ---------------------------------------------------------------------------
describe("parseRowingStatus — elapsed time (bytes 0–2, 0.01s units)", () => {
  it("decodes elapsed time correctly", () => {
    // 11800 raw = 118.00s → elapsedTime 118, elapsedStr "01:58"
    const view = makePacket();
    set3ByteLE(view, 0, 11800);
    const result = parseRowingStatus(view);
    expect(result.elapsedTime).toBe(118);
    expect(result.elapsedStr).toBe("01:58");
  });

  it("decodes a large elapsed time spanning all 3 bytes", () => {
    // 36000 raw = 360.00s = 6 minutes → "06:00"
    const view = makePacket();
    set3ByteLE(view, 0, 36000);
    const result = parseRowingStatus(view);
    expect(result.elapsedTime).toBe(360);
    expect(result.elapsedStr).toBe("06:00");
  });
});

describe("parseRowingStatus — distance (bytes 3–5, 0.1m units)", () => {
  it("decodes distance of 500m correctly", () => {
    // 5000 raw = 500.0m → Math.round → 500
    const view = makePacket();
    set3ByteLE(view, 3, 5000);
    const result = parseRowingStatus(view);
    expect(result.distance).toBe(500);
  });

  it("rounds fractional metres", () => {
    // 5005 raw = 500.5m → Math.round → 501
    const view = makePacket();
    set3ByteLE(view, 3, 5005);
    const result = parseRowingStatus(view);
    expect(result.distance).toBe(501);
  });

  it("decodes zero distance", () => {
    const view = makePacket();
    const result = parseRowingStatus(view);
    expect(result.distance).toBe(0);
  });
});

describe("parseRowingStatus — workout state (byte 6)", () => {
  it("reads IDLE state (0)", () => {
    const view = makePacket();
    view.setUint8(6, WorkoutState.IDLE);
    expect(parseRowingStatus(view).workoutState).toBe(WorkoutState.IDLE);
  });

  it("reads ACTIVE state (1)", () => {
    const view = makePacket();
    view.setUint8(6, WorkoutState.ACTIVE);
    expect(parseRowingStatus(view).workoutState).toBe(WorkoutState.ACTIVE);
  });

  it("reads PAUSED state (2)", () => {
    const view = makePacket();
    view.setUint8(6, WorkoutState.PAUSED);
    expect(parseRowingStatus(view).workoutState).toBe(WorkoutState.PAUSED);
  });

  it("reads FINISHED state (3)", () => {
    const view = makePacket();
    view.setUint8(6, WorkoutState.FINISHED);
    expect(parseRowingStatus(view).workoutState).toBe(WorkoutState.FINISHED);
  });
});

describe("parseRowingStatus — stroke rate (byte 9)", () => {
  it("decodes stroke rate of 22 SPM", () => {
    const view = makePacket();
    view.setUint8(9, 22);
    expect(parseRowingStatus(view).strokeRate).toBe(22);
  });

  it("decodes stroke rate of 0 when at rest", () => {
    const view = makePacket();
    expect(parseRowingStatus(view).strokeRate).toBe(0);
  });

  it("decodes maximum realistic stroke rate (40 SPM)", () => {
    const view = makePacket();
    view.setUint8(9, 40);
    expect(parseRowingStatus(view).strokeRate).toBe(40);
  });
});

describe("parseRowingStatus — pace (bytes 10–11, uint16 LE, 0.01s units)", () => {
  it("decodes 1:58.0 pace correctly", () => {
    // 11800 raw = 118s /500m
    const view = makePacket();
    view.setUint16(10, 11800, true);
    const result = parseRowingStatus(view);
    expect(result.pace500).toBe(11800);
    expect(result.paceStr).toBe("1:58.0");
  });

  it("decodes 2:00.0 pace correctly", () => {
    const view = makePacket();
    view.setUint16(10, 12000, true);
    const result = parseRowingStatus(view);
    expect(result.pace500).toBe(12000);
    expect(result.paceStr).toBe("2:00.0");
  });

  it("shows '--:--' when pace is zero (not rowing)", () => {
    const view = makePacket();
    // bytes 10-11 default to 0
    const result = parseRowingStatus(view);
    expect(result.pace500).toBe(0);
    expect(result.paceStr).toBe("--:--");
  });
});

describe("parseRowingStatus — watts (bytes 13–14, uint16 LE)", () => {
  it("decodes 190W correctly", () => {
    const view = makePacket();
    view.setUint16(13, 190, true);
    expect(parseRowingStatus(view).watts).toBe(190);
  });

  it("decodes 0W at rest", () => {
    const view = makePacket();
    expect(parseRowingStatus(view).watts).toBe(0);
  });

  it("decodes a high wattage (500W)", () => {
    const view = makePacket();
    view.setUint16(13, 500, true);
    expect(parseRowingStatus(view).watts).toBe(500);
  });
});

describe("parseRowingStatus — calories (bytes 15–16, uint16 LE)", () => {
  it("decodes 250 calories correctly", () => {
    const view = makePacket();
    view.setUint16(15, 250, true);
    expect(parseRowingStatus(view).calories).toBe(250);
  });

  it("decodes 0 calories at start", () => {
    const view = makePacket();
    expect(parseRowingStatus(view).calories).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseRowingStatus — all-zeros packet (safe defaults, no crash)
// ---------------------------------------------------------------------------
describe("parseRowingStatus — all-zeros packet", () => {
  it("returns safe defaults without throwing", () => {
    const view = makePacket(); // all bytes are 0 by default
    const result = parseRowingStatus(view);

    expect(result.elapsedTime).toBe(0);
    expect(result.elapsedStr).toBe("00:00");
    expect(result.distance).toBe(0);
    expect(result.workoutState).toBe(WorkoutState.IDLE);
    expect(result.strokeRate).toBe(0);
    expect(result.pace500).toBe(0);
    expect(result.paceStr).toBe("--:--");
    expect(result.watts).toBe(0);
    expect(result.calories).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseRowingStatus — realistic rowing scenario
// 500m in 1:58.0 at 190W, 22 SPM, 35 calories
// ---------------------------------------------------------------------------
describe("parseRowingStatus — realistic rowing scenario", () => {
  it("parses a complete 500m / 1:58.0 / 190W / 22 SPM packet correctly", () => {
    // elapsed: 118.00s → 11800 raw
    // distance: 500m → 5000 raw
    // workoutState: ACTIVE (1)
    // strokeRate: 22 SPM (byte 9)
    // pace: 11800 raw (1:58.0 /500m)
    // watts: 190 (uint16 LE at bytes 13-14)
    // calories: 35 (uint16 LE at bytes 15-16)
    const view = makePacket();
    set3ByteLE(view, 0, 11800);          // elapsed: 118.00s
    set3ByteLE(view, 3, 5000);           // distance: 500.0m
    view.setUint8(6, WorkoutState.ACTIVE);
    view.setUint8(9, 22);                // stroke rate
    view.setUint16(10, 11800, true);     // pace: 1:58.0
    view.setUint16(13, 190, true);       // watts
    view.setUint16(15, 35, true);        // calories

    const result = parseRowingStatus(view);

    expect(result.elapsedTime).toBe(118);
    expect(result.elapsedStr).toBe("01:58");
    expect(result.distance).toBe(500);
    expect(result.workoutState).toBe(WorkoutState.ACTIVE);
    expect(result.strokeRate).toBe(22);
    expect(result.pace500).toBe(11800);
    expect(result.paceStr).toBe("1:58.0");
    expect(result.watts).toBe(190);
    expect(result.calories).toBe(35);
  });
});
