// localStorage-polyfill.ts
import { Store } from "@tauri-apps/plugin-store";

interface StorageData {
  [key: string]: string;
}

class LocalStoragePolyfill implements Storage {
  private store: Store;
  private cache: Map<string, string>;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(store: Store) {
    this.store = store;
    this.cache = new Map();
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      const data = (await this.store.get("data")) as StorageData | null;
      if (data && typeof data === "object") {
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value);
        });
      }
    } catch (error) {
      console.error("Failed to load localStorage data:", error);
    }

    this.initialized = true;
  }

  private async persist(): Promise<void> {
    try {
      const data: StorageData = Object.fromEntries(this.cache);
      await this.store.set("data", data);
      await this.store.save();
    } catch (error) {
      console.error("Failed to persist localStorage data:", error);
    }
  }

  getItem(key: string): string | null {
    return this.cache.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, String(value));
    // Persist asynchronously to avoid blocking
    this.persist().catch(console.error);
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    this.persist().catch(console.error);
  }

  clear(): void {
    this.cache.clear();
    this.persist().catch(console.error);
  }

  get length(): number {
    return this.cache.size;
  }

  key(index: number): string | null {
    return Array.from(this.cache.keys())[index] || null;
  }

  // Required for Storage interface compatibility
  [name: string]: any;
}

// Initialize and replace global localStorage
let tauriLocalStorage: LocalStoragePolyfill | undefined;

export const initializeLocalStorage = async (): Promise<void> => {
  if (typeof window !== "undefined") {
    const store = await Store.load("localStorage.json");
    tauriLocalStorage = new LocalStoragePolyfill(store);
    await tauriLocalStorage.init();

    // Try to replace localStorage using Object.defineProperty
    try {
      Object.defineProperty(window, "localStorage", {
        value: tauriLocalStorage,
        writable: true,
        configurable: true,
      });
    } catch (error) {
      console.warn("Could not replace global localStorage:", error);
      // Fallback: store reference for manual usage
      (window as any).__tauriLocalStorage = tauriLocalStorage;
    }
  }
};

export const getTauriLocalStorage = (): LocalStoragePolyfill | undefined => {
  return tauriLocalStorage;
};

// Helper function to get localStorage (either polyfill or native)
export const getLocalStorage = (): Storage => {
  if (typeof window !== "undefined") {
    return window.localStorage || (window as any).__tauriLocalStorage;
  }
  throw new Error("localStorage not available");
};

export default tauriLocalStorage;
