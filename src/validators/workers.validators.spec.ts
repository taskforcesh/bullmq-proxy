import { describe, it, expect } from "bun:test";
import {
  isValidUrl,
  validateRemoveOnFinish,
  validateWorkerEndpoint,
  validateWorkerMetadata,
  validateWorkerOptions
} from "./workers.validators";

describe('isValidUrl', () => {
  it('should return true for a valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBeTruthy();
  });

  it('should return true for a valid https URL', () => {
    expect(isValidUrl('https://example.com')).toBeTruthy();
  });

  it('should return false for an invalid URL', () => {
    expect(isValidUrl('htp://example.com')).toBeFalsy();
  });

  it('should return false for a non-URL string', () => {
    expect(isValidUrl('not a url')).toBeFalsy();
  });
});

describe('validateRemoveOnFinish', () => {
  it('throws an error for invalid fields', () => {
    expect(() => validateRemoveOnFinish(<any>{ invalidField: 123 }, 'removeOnComplete')).toThrow('Invalid field');
  });

  it('throws an error for non-integer count', () => {
    expect(() => validateRemoveOnFinish({ count: 3.5 }, 'removeOnComplete')).toThrow('Invalid removeOnComplete.count');
  });

  it('throws an error for non-positive count', () => {
    expect(() => validateRemoveOnFinish({ count: -1 }, 'removeOnComplete')).toThrow('Invalid removeOnComplete.count');
  });

  // Repeat tests for 'age' similar to 'count'
  it('throws an error for non-integer age', () => {
    expect(() => validateRemoveOnFinish({ age: 3.5 }, 'removeOnComplete')).toThrow('Invalid removeOnComplete.age');
  });

  it('throws an error for non-positive age', () => {
    expect(() => validateRemoveOnFinish({ age: -1 }, 'removeOnComplete')).toThrow('Invalid removeOnComplete.age');
  });
});

describe('validateWorkerOptions', () => {
  it('throws an error for invalid fields', () => {
    expect(() => validateWorkerOptions(<any>{ invalidField: true })).toThrow('Invalid field');
  });

  it('validates limiter with correct fields', () => {
    const options = { limiter: { max: 10, duration: 1000 } };
    expect(() => validateWorkerOptions(options)).not.toThrow();
  });

  // Additional tests for other fields and invalid conditions
  it('throws an error for invalid limiter.max', () => {
    expect(() => validateWorkerOptions({ limiter: { max: -1, duration: 1000 } })).toThrow('Invalid limiter.max');
  });

  it('throws an error for invalid limiter.duration', () => {
    expect(() => validateWorkerOptions({ limiter: { max: 10, duration: -1 } })).toThrow('Invalid limiter.duration');
  });

  it('throws an error for invalid maxStalledCount', () => {
    expect(() => validateWorkerOptions({ maxStalledCount: -1 })).toThrow('Invalid maxStalledCount');
  });

  it('throws an error for invalid concurrency', () => {
    expect(() => validateWorkerOptions({ concurrency: -1 })).toThrow('Invalid concurrency');
  });

  it('validates removeOnComplete with correct fields', () => {
    const options = { removeOnComplete: { count: 10, age: 1000 } };
    expect(() => validateWorkerOptions(options)).not.toThrow();
  });

  it('validates removeOnComplete with correct fields', () => {
    const options = { removeOnFail: { count: 10, age: 1000 } };
    expect(() => validateWorkerOptions(options)).not.toThrow();
  });

});

describe('validateWorkerEndpoint', () => {
  it('throws an error for missing required fields', () => {
    expect(() => validateWorkerEndpoint(<any>{})).toThrow('is required');
  });

  it('validates with correct fields', () => {
    const endpoint = { url: 'https://example.com', method: 'POST' };
    expect(() => validateWorkerEndpoint(endpoint)).not.toThrow();
  });

  it('throws with invalid method', () => {
    const endpoint = { url: 'https://example.com', method: 'GET' };
    expect(() => validateWorkerEndpoint(endpoint)).toThrow();
  });

  it('throws an error for missing url', () => {
    expect(() => validateWorkerEndpoint(<any>{ method: 'PATCH' })).toThrow('url is required');
  });

  it('throws an error for missing method', () => {
    expect(() => validateWorkerEndpoint(<any>{ url: 'https://example.com' })).toThrow('method is required');
  });

  it('throws an error for invalid method', () => {
    expect(() => validateWorkerEndpoint({ url: 'https://example.com', method: 'INVALID' })).toThrow('Invalid HTTP method INVALID');
  });

  it('throws an error for invalid url', () => {
    expect(() => validateWorkerEndpoint({ url: 'htp://example.com', method: 'PUT' })).toThrow('Invalid URL');
  });

  it('throws an error for invalid url', () => {
    expect(() => validateWorkerEndpoint({ url: 'not a url', method: 'POST' })).toThrow('Invalid URL');
  });
});

describe('validateWorkerMetadata', () => {
  it('throws an error for missing required fields', () => {
    expect(() => validateWorkerMetadata(<any>{})).toThrow('is required');
  });

  it('validates with correct fields', () => {
    const metadata = { queue: 'myQueue', endpoint: { url: 'https://example.com', method: 'POST' } };
    expect(() => validateWorkerMetadata(metadata)).not.toThrow();
  });

  // Additional tests for opts validation
  it('throws an error for invalid opts field', () => {
    expect(() => validateWorkerMetadata({ queue: 'myQueue', endpoint: { url: 'https://example.com', method: 'PUT' }, opts: <any>{ invalidField: true } })).toThrow('Invalid field');
  });

  it('throws an error for invalid queue name', () => {
    expect(() => validateWorkerMetadata({ queue: 'ab', endpoint: { url: 'https://example.com', method: 'PATCH' } })).toThrow('queue name must be at least');
  });

  it('throws an error for invalid queue name', () => {
    expect(() => validateWorkerMetadata({ queue: 'a'.repeat(101), endpoint: { url: 'https://example.com', method: 'POST' } })).toThrow('queue name must be at most');
  });

  it('throws an error for invalid endpoint', () => {
    expect(() => validateWorkerMetadata({ queue: 'myQueue', endpoint: <any>{ invalidField: true } })).toThrow('url is required');
  });

});

