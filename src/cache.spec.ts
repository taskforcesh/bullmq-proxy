
import { describe, it, beforeEach, jest, Mock, expect } from "bun:test";

import { LRUCache, RemoveCallbackType } from './cache';


describe('Cache', () => {
  let cache: LRUCache<string>;
  let removeCallback: Mock<RemoveCallbackType<string>>;

  beforeEach(() => {
    removeCallback = jest.fn() as Mock<RemoveCallbackType<string>>;
    cache = new LRUCache<string>(2, removeCallback);
  });

  it('should get and put values', () => {
    cache.put('key1', 'value1');
    cache.put('key2', 'value2');
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
  });

  it('should remove the least recently used item when the capacity is reached', () => {
    cache.put('key1', 'value1');
    cache.put('key2', 'value2');
    cache.put('key3', 'value3');
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
  });

  it('should remove the item when remove is called', async () => {
    cache.put('key1', 'value1');
    await cache.remove('key1');
    expect(cache.get('key1')).toBeNull();
    expect(removeCallback.mock.lastCall).toEqual(['key1', 'value1']);
  });

});

