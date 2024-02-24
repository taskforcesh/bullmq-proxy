import { describe, it, expect } from "bun:test";
import { validateJob, validateJobOpts, validateQueueName, validateRepeatOpts } from "./queue.validators";

describe('validateQueueName', () => {
  it('throws an error for too short queue names', () => {
    expect(() => validateQueueName('ab')).toThrow('queue name must be at least');
  });

  it('throws an error for too long queue names', () => {
    expect(() => validateQueueName('a'.repeat(101))).toThrow('queue name must be at most');
  });

  it('validates correct length queue names', () => {
    expect(() => validateQueueName('validName')).not.toThrow();
  });
});

describe('validateJob', () => {
  it('throws an error if required fields are missing', () => {
    expect(() => validateJob(<any>{})).toThrow('name is required');
    expect(() => validateJob(<any>{ name: 'test' })).toThrow('data is required');
  });

  it('throws an error for unexpected fields', () => {
    expect(() => validateJob(<any>{ name: 'test', data: {}, unexpected: true })).toThrow('Unexpected field: unexpected');
  });

  it('validates successfully with correct fields', () => {
    expect(() => validateJob(<any>{ name: 'test', data: {} })).not.toThrow();
  });

  // Include a test case for opts validation if provided
  it('validates successfully with correct fields and opts', () => {
    expect(() => validateJob(<any>{ name: 'test', data: {}, opts: {} })).not.toThrow();
  });

  it('throws an error for invalid opts', () => {
    expect(() => validateJob(<any>{ name: 'test', data: {}, opts: <any>{ invalidField: true } })).toThrow('Unexpected field: opts.invalidField');
  });

  it('throws an error for invalid delay', () => {
    expect(() => validateJob(<any>{ name: 'test', data: {}, opts: <any>{ delay: 'invalid' } })).toThrow('Invalid delay');
  });

});

describe('validateRepeatOpts', () => {
  it('throws an error for unexpected fields', () => {
    expect(() => validateRepeatOpts(<any>{ every: 1000, unexpected: true })).toThrow('Unexpected field: opts.unexpected');
  });

  it('throws an error if required "every" field is missing or invalid', () => {
    expect(() => validateRepeatOpts({})).toThrow('repeat.every is required');
    expect(() => validateRepeatOpts({ every: -1000 })).toThrow('Invalid every -1000');
  });

  it('validates successfully with correct fields', () => {
    expect(() => validateRepeatOpts({ every: 1000 })).not.toThrow();
  });

  // Additional tests for "limit", "key", and "immediately" validations
  it('throws an error for invalid limit', () => {
    expect(() => validateRepeatOpts({ every: 1000, limit: -1000 })).toThrow('Invalid limit -1000');
  });

  it('throws an error for invalid immediately', () => {
    expect(() => validateRepeatOpts(<any>{ every: 1000, immediately: 'invalid' })).toThrow('Invalid immediately invalid, must be a boolean');
  });

  it('throws an error for invalid key', () => {
    expect(() => validateRepeatOpts(<any>{ every: 1000, key: 123 })).toThrow('Invalid key 123, must be a string');
  });

  it('validates successfully with correct fields', () => {
    expect(() => validateRepeatOpts({ every: 1000, limit: 10, key: 'test', immediately: true })).not.toThrow();
  });
});

describe('validateJobOpts', () => {
  it('throws an error for unexpected fields', () => {
    expect(() => validateJobOpts(<any>{ delay: 1000, unexpected: true })).toThrow('Unexpected field: opts.unexpected');
  });

  it('validates delay correctly', () => {
    expect(() => validateJobOpts({ delay: -1 })).toThrow('Invalid delay -1');
    expect(() => validateJobOpts({ delay: 1000 })).not.toThrow();
  });

  it('validates priority correctly', () => {
    expect(() => validateJobOpts({ priority: 0 })).toThrow('Invalid priority 0');
    expect(() => validateJobOpts({ priority: 1 })).not.toThrow();
  });

  it('validates lifo correctly', () => {
    expect(() => validateJobOpts(<any>{ lifo: 'not boolean' })).toThrow('Invalid lifo');
    expect(() => validateJobOpts({ lifo: true })).not.toThrow();
  });

  // Additional tests for "attempts", "backoff", "jobId", and "repeat" validations
  it('throws an error for invalid attempts', () => {
    expect(() => validateJobOpts({ attempts: -1 })).toThrow('Invalid attempts -1');
  });

  it('validates attempts correctly', () => {
    expect(() => validateJobOpts({ attempts: 1 })).not.toThrow();
  });

  it('throws an error for invalid backoff', () => {
    expect(() => validateJobOpts(<any>{ backoff: 'invalid' })).toThrow('Invalid backoff');
  });

  it('validates backoff correctly', () => {
    expect(() => validateJobOpts(<any>{ backoff: { type: 'fixed' } })).not.toThrow();
  });

  it('throws an error for invalid jobId', () => {
    expect(() => validateJobOpts(<any>{ jobId: 123 })).toThrow('Invalid jobId 123, must be a string');
  });

  it('validates jobId correctly', () => {
    expect(() => validateJobOpts({ jobId: 'test' })).not.toThrow();
  });
});
