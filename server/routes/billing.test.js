// @vitest-environment node
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../db.js', () => ({ default: { query: (...args) => mockQuery(...args) } }));

const mockCaptureException = vi.fn();
vi.mock('@sentry/node', () => ({ captureException: (...args) => mockCaptureException(...args) }));

const mockCreateSession = vi.fn();
const mockConstructEvent = vi.fn();
vi.mock('stripe', () => ({
  default: class MockStripe {
    constructor() {
      this.checkout = { sessions: { create: (...args) => mockCreateSession(...args) } };
      this.webhooks = { constructEvent: (...args) => mockConstructEvent(...args) };
    }
  },
}));

const router = (await import('./billing.js')).default;

function findHandler(method, path) {
  const layer = router.stack.find(l => l.route?.path === path && l.route.methods[method]);
  const handlers = layer.route.stack.map(s => s.handle);
  return handlers[handlers.length - 1]; // skip the raw-body placeholder middleware, if any
}

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.sendStatus = vi.fn(() => res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe('GET /status', () => {
  const handler = () => findHandler('get', '/status');

  it('returns pro when the plan is active and not expired', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan: 'pro', pro_until: '2099-01-01' }] });
    const req = { userId: 'u1' };
    const res = mockRes();
    await handler()(req, res);
    expect(res.json).toHaveBeenCalledWith({ plan: 'pro', pro_until: '2099-01-01' });
  });

  it('returns free when there is no plan row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const req = { userId: 'u1' };
    const res = mockRes();
    await handler()(req, res);
    expect(res.json).toHaveBeenCalledWith({ plan: 'free', pro_until: null });
  });

  it('returns free when the pro plan has expired', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan: 'pro', pro_until: '2000-01-01' }] });
    const req = { userId: 'u1' };
    const res = mockRes();
    await handler()(req, res);
    expect(res.json).toHaveBeenCalledWith({ plan: 'free', pro_until: '2000-01-01' });
  });

  it('logs to Sentry and returns 500 on a DB failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));
    const req = { userId: 'u1' };
    const res = mockRes();
    await handler()(req, res);
    expect(mockCaptureException).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
  });
});

describe('POST /create-checkout', () => {
  const handler = () => findHandler('post', '/create-checkout');

  it('returns 503 when Stripe is not configured', async () => {
    const req = { userId: 'u1', body: {} };
    const res = mockRes();
    await handler()(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('returns 400 when required fields are missing', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const req = { userId: 'u1', body: { price_id: 'price_1' } };
    const res = mockRes();
    await handler()(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a checkout session and returns its url', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    mockCreateSession.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/abc' });
    const req = {
      userId: 'u1',
      body: { price_id: 'price_1', success_url: 'https://a/ok', cancel_url: 'https://a/cancel' },
    };
    const res = mockRes();
    await handler()(req, res);
    expect(mockCreateSession).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      metadata: { user_id: 'u1' },
    }));
    expect(res.json).toHaveBeenCalledWith({ url: 'https://checkout.stripe.com/abc' });
  });

  it('logs to Sentry and returns 500 when Stripe throws', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    mockCreateSession.mockRejectedValueOnce(new Error('stripe down'));
    const req = {
      userId: 'u1',
      body: { price_id: 'price_1', success_url: 'https://a/ok', cancel_url: 'https://a/cancel' },
    };
    const res = mockRes();
    await handler()(req, res);
    expect(mockCaptureException).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /webhook', () => {
  const handler = () => findHandler('post', '/webhook');

  it('returns 400 via sendStatus when Stripe is not configured', async () => {
    const req = { headers: {}, body: {} };
    const res = mockRes();
    await handler()(req, res);
    expect(res.sendStatus).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the signature is invalid', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    mockConstructEvent.mockImplementationOnce(() => { throw new Error('bad signature'); });
    const req = { headers: { 'stripe-signature': 'bad' }, body: Buffer.from('{}') };
    const res = mockRes();
    await handler()(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook signature invalid' });
  });

  it('upserts the plan and acks on checkout.session.completed', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { metadata: { user_id: 'u1' }, customer: 'cus_1' } },
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const req = { headers: { 'stripe-signature': 'good' }, body: Buffer.from('{}') };
    const res = mockRes();
    await handler()(req, res);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_plans'), expect.arrayContaining(['u1']));
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('ignores event types it does not handle and still acks', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    mockConstructEvent.mockReturnValueOnce({ type: 'invoice.paid', data: { object: {} } });
    const req = { headers: { 'stripe-signature': 'good' }, body: Buffer.from('{}') };
    const res = mockRes();
    await handler()(req, res);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 500 so Stripe retries when the DB write fails', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { metadata: { user_id: 'u1' }, customer: 'cus_1' } },
    });
    mockQuery.mockRejectedValueOnce(new Error('db down'));
    const req = { headers: { 'stripe-signature': 'good' }, body: Buffer.from('{}') };
    const res = mockRes();
    await handler()(req, res);
    expect(mockCaptureException).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
