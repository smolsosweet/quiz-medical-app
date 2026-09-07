import { describe, it, expect } from 'vitest';

describe('Test Infrastructure Smoke Test', () => {
  it('verifies that vitest and environment work', () => {
    expect(1 + 1).toBe(2);
    expect(typeof window).toBe('object');
    expect(typeof window.matchMedia).toBe('function');
    expect(typeof crypto.randomUUID).toBe('function');
  });
});
