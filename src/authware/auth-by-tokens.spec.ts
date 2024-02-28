import { jest, mock, it, expect, describe, beforeEach, beforeAll } from "bun:test";
import { warn } from "../utils/log";
import { authByTokens } from "./auth-by-tokens";

import { config } from "../config";

describe('authByTokens', () => {

  beforeAll(() => {
    mock.module('../config', () => ({
      config: {
        ...config,
        authTokens: ['testToken1', 'testToken2']
      }
    }));

    mock.module('../utils/log', () => ({
      warn: jest.fn()
    }));
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false and logs a warning if the token is missing', async () => {
    const req = new Request("http://example.com/path", { headers: {} });
    const url = new URL(req.url);

    const result = await authByTokens(req, url, {});

    expect(result).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing token'));
  });

  it('returns false and logs a warning for an invalid token', async () => {
    const req = new Request("http://example.com/path", {
      headers: {
        'authorization': 'Bearer invalidToken'
      }
    });
    const url = new URL(req.url);

    const result = await authByTokens(req, url, {});

    expect(result).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('invalid token'));
  });

  it('returns true for a valid token', async () => {
    const req = new Request("http://example.com/path", {
      headers: {
        'authorization': 'Bearer testToken1'
      }
    });
    const url = new URL(req.url);

    const result = await authByTokens(req, url, {});

    expect(result).toBe(true);
  });
});