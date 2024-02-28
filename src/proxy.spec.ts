import { describe, it, beforeEach, expect, jest } from "bun:test";

import * as MBModule from './controllers/websocket/message-broker';
import { startProxy } from "./proxy";
import { Redis } from "ioredis";

// Mock the Worker and MessageBroker
// const mockWorker = BullMQModule.Worker = mock('Worker', jest.fn()) as mock.Mock;
const mockMB = MBModule.MessageBroker;

// Mock Bun's serve method

const mockBunServe = jest.fn();
const mockUpgrade = jest.fn();
const mockFetch = jest.fn((req, server) => {
  // Your mocked fetch logic here
  return new Response("Your mock response", { status: 200 });
});

Bun.serve = mockBunServe;

mockBunServe.mockImplementation(({ fetch, websocket }) => {
  // You can simulate the fetch logic here if needed

  // This mock will allow you to simulate calling the 'upgrade' method within tests
  mockUpgrade.mockImplementation((req) => {
    // Logic to determine if the request should be upgraded or not.
    // For the purposes of the tests, you can return a boolean flag from the mock itself.

    // If upgrade succeeds:
    websocket.open && websocket.open({} as any);
    return true;

    // If upgrade fails:
    // return false;
  });

  // Return the mock server object with the 'upgrade' method
  return {
    upgrade: mockUpgrade
  };
});

describe('Proxy', () => {
  beforeEach(() => {
    mockBunServe.mockClear();
    mockUpgrade.mockClear();
  });

  it('should start the proxy with the correct configuration', async () => {
    const redisClientMock = {
      hscanStream: jest.fn(() => {
        // on('end') Must be called after on('data')
        return {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              process.nextTick(callback, ['queueName', JSON.stringify({ endpoint: { url: '', method: '', headers: {} } })]);
            } else if (event === 'end') {
              process.nextTick(callback);
            }
          }),
        };
      })
    }

    await startProxy(3000, <unknown>redisClientMock as Redis, { skipInitWorkers: true });
    expect(Bun.serve).toHaveBeenCalledTimes(1);

    expect(Bun.serve).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 3000,
        fetch: expect.any(Function),
        websocket: expect.any(Object)
      })
    );
  });

});
