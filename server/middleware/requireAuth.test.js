// @vitest-environment node
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockVerifyToken = vi.fn();
const mockCreateClerkClient = vi.fn(() => ({}));
vi.mock('@clerk/backend', () => ({
  verifyToken: (...args) => mockVerifyToken(...args),
  createClerkClient: (...args) => mockCreateClerkClient(...args),
}));

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.NODE_ENV;
  delete process.env.APP_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('dev mode (no CLERK_SECRET_KEY)', () => {
  it('sets req.userId to the dev fallback and calls next without requiring a token', async () => {
    const { default: requireAuth } = await import('./requireAuth.js');
    const req = { headers: {}, method: 'GET', path: '/api/tasks' };
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(req.userId).toBe('jagdeep');
    expect(next).toHaveBeenCalled();
  });
});

describe('production mode without CLERK_SECRET_KEY', () => {
  it('throws at import time instead of silently falling back to the dev identity', async () => {
    process.env.NODE_ENV = 'production';
    await expect(import('./requireAuth.js')).rejects.toThrow(/CLERK_SECRET_KEY is required/);
  });
});

describe('with CLERK_SECRET_KEY configured', () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test_x';
  });

  it('returns 401 when there is no bearer token', async () => {
    const { default: requireAuth } = await import('./requireAuth.js');
    const req = { headers: {}, method: 'GET', path: '/api/tasks' };
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.userId from the verified token subject and calls next', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user_abc123' });
    const { default: requireAuth } = await import('./requireAuth.js');
    const req = { headers: { authorization: 'Bearer good.token.here' }, method: 'GET', path: '/api/tasks' };
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(req.userId).toBe('user_abc123');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('expired'));
    const { default: requireAuth } = await import('./requireAuth.js');
    const req = { headers: { authorization: 'Bearer bad.token' }, method: 'GET', path: '/api/tasks' };
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('omits authorizedParties outside production even when APP_URL is set (dev Clerk JWTs often lack azp)', async () => {
    process.env.APP_URL = 'https://example.com';
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user_x' });
    const { default: requireAuth } = await import('./requireAuth.js');
    const req = { headers: { authorization: 'Bearer t' }, method: 'GET', path: '/x' };
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    const [, opts] = mockVerifyToken.mock.calls[0];
    expect(opts.authorizedParties).toBeUndefined();
  });

  it('passes authorizedParties in production when APP_URL is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://example.com';
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user_x' });
    const { default: requireAuth } = await import('./requireAuth.js');
    const req = { headers: { authorization: 'Bearer t' }, method: 'GET', path: '/x' };
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    const [, opts] = mockVerifyToken.mock.calls[0];
    expect(opts.authorizedParties).toEqual(['https://example.com']);
  });
});
