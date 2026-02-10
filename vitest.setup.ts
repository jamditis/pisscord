import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock Audio element
class MockAudio {
  src = '';
  volume = 1;
  currentTime = 0;
  loop = false;
  preload = '';
  paused = true;
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  addEventListener() {}
  removeEventListener() {}
}
Object.defineProperty(globalThis, 'Audio', { value: MockAudio });

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
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

// Silence console during tests unless debugging
if (!process.env.DEBUG) {
  const noop = () => {};
  globalThis.console = {
    ...console,
    log: noop,
    debug: noop,
    info: noop,
    warn: noop,
  };
}
