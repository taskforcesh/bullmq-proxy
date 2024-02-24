/**
 * LRU Cache - Least Recently Used Cache
 * 
 * Simple cache implementation using Map.
 * 
 */
export type RemoveCallbackType<T> = (key: string, value: T) => Promise<void>;

export class LRUCache<T> {
  private cache: Map<string, T>;

  constructor(
    private capacity: number,
    private removeCallback: RemoveCallbackType<T> = async () => { }) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: string) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      if (value) {
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
      }
    }
    return null;
  }

  put(key: string, value: T) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    if (this.cache.size === this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  async remove(key: string) {
    const value = this.cache.get(key);
    if (value) {
      this.cache.delete(key);
      await this.removeCallback(key, value);
    }
  }

  async clear() {
    await Promise.all(Array.from(this.cache.keys()).map((key) => this.remove(key)));
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return this.cache.keys();
  }

  values() {
    return this.cache.values();
  }
}