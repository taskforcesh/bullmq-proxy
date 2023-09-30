import { describe, it, beforeEach, mock, expect, jest } from "bun:test";

import * as MBModule from '@taskforcesh/message-broker';
import { startProxy } from "../src/proxy";

mock('bun');
mock('bullmq');
mock('@taskforcesh/message-broker');

// Mock the Worker and MessageBroker
// const mockWorker = BullMQModule.Worker = mock('Worker', jest.fn()) as mock.Mock;
const mockMB = MBModule.MessageBroker as mock.Mock;

// Mock Bun's serve method

const mockBunServe = jest.fn();
const mockUpgrade = jest.fn();
const mockFetch = jest.fn((req, server) => {
    // Your mocked fetch logic here
    return new Response("Your mock response", { status: yourMockStatus });
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

describe.only('Proxy', () => {
    beforeEach(() => {
        mockBunServe.mockClear();
        mockUpgrade.mockClear();
    });

    it.only('should start the proxy with the correct configuration', () => {
        startProxy(3000, {} as any, ['validToken']);
        expect(Bun.serve).toHaveBeenCalledTimes(1);
        /*
        // Not yet implemented in Bun.
        expect(Bun.serve).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 3000,
                fetch: expect.any(Function),
                websocket: expect.any(Object)
            })
        );
        */
    });

});


