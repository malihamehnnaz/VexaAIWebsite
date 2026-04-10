type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  length: number;
};

function createStoragePolyfill(): StorageLike {
  const store = new Map<string, string>();

  const polyfill: StorageLike = {
    get length() {
      return store.size;
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
    removeItem(key: string) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
  };

  return polyfill;
}

export function patchBrokenServerStorage() {
  if (typeof window !== 'undefined') {
    return;
  }

  const globalWithStorage = globalThis as typeof globalThis & {
    localStorage?: Record<string, unknown>;
    sessionStorage?: Record<string, unknown>;
  };

  if (typeof globalWithStorage.localStorage === 'undefined' || typeof globalWithStorage.localStorage?.getItem !== 'function') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStoragePolyfill(),
      configurable: true,
      writable: true,
    });
  }

  if (typeof globalWithStorage.sessionStorage === 'undefined' || typeof globalWithStorage.sessionStorage?.getItem !== 'function') {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createStoragePolyfill(),
      configurable: true,
      writable: true,
    });
  }
}