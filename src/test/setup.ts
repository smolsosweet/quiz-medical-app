import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Polyfill matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Polyfill crypto.randomUUID
if (!globalThis.crypto) {
  // @ts-expect-error fallback
  globalThis.crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}

// Polyfill ResizeObserver
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill window.scrollTo and window.print
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
  window.print = () => {};
}

// Auto cleanup after each test
afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.clear();
  }
});
