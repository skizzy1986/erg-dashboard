import { describe, it, expect } from 'vitest';
import { parseDurationMinutes } from '../duration.js';

describe('parseDurationMinutes', () => {
  it('parses mm:ss "45:00" as 45', () => {
    expect(parseDurationMinutes('45:00')).toBe(45);
  });
  it('parses mm:ss "60:00" as 60', () => {
    expect(parseDurationMinutes('60:00')).toBe(60);
  });
  it('parses mm:ss "35:00" as 35', () => {
    expect(parseDurationMinutes('35:00')).toBe(35);
  });
  it('parses minutes suffix "57m" as 57', () => {
    expect(parseDurationMinutes('57m')).toBe(57);
  });
  it('parses minutes suffix "9min" as 9', () => {
    expect(parseDurationMinutes('9min')).toBe(9);
  });
  it('parses minutes suffix "60min" as 60', () => {
    expect(parseDurationMinutes('60min')).toBe(60);
  });
  it('parses hours+minutes "1h4m" as 64', () => {
    expect(parseDurationMinutes('1h4m')).toBe(64);
  });
  it('parses hours+minutes "2h00m" as 120', () => {
    expect(parseDurationMinutes('2h00m')).toBe(120);
  });
  it('parses bare numeric string "45" as 45', () => {
    expect(parseDurationMinutes('45')).toBe(45);
  });
  it('passes a JS number 45 through unchanged', () => {
    expect(parseDurationMinutes(45)).toBe(45);
  });
  it('returns 0 for null', () => {
    expect(parseDurationMinutes(null)).toBe(0);
  });
  it('returns 0 for undefined', () => {
    expect(parseDurationMinutes(undefined)).toBe(0);
  });
  it('returns 0 for empty string', () => {
    expect(parseDurationMinutes('')).toBe(0);
  });
  it('returns 0 for garbage', () => {
    expect(parseDurationMinutes('garbage')).toBe(0);
  });
  it('returns 0 for NaN', () => {
    expect(parseDurationMinutes(NaN)).toBe(0);
  });

  it('never throws and never produces NaN for malformed input', () => {
    const malformed = [null, undefined, '', 'garbage', NaN, {}, [], 'h', ':'];
    malformed.forEach((v) => {
      let out;
      expect(() => {
        out = parseDurationMinutes(v);
      }).not.toThrow();
      expect(Number.isNaN(out)).toBe(false);
    });
  });
});
