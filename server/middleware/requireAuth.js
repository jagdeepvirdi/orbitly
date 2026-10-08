import { createClerkClient, verifyToken } from '@clerk/backend';

const DEV_USER_ID = 'jagdeep';
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.CLERK_SECRET_KEY) {
  // Fail closed: a missing secret in production must not silently fall back
  // to the unauthenticated dev identity below.
  throw new Error('[requireAuth] CLERK_SECRET_KEY is required when NODE_ENV=production');
}

let clerkClient = null;
if (process.env.CLERK_SECRET_KEY) {
  clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

// The azp claim is a bare lowercase origin, and Clerk compares it verbatim, so a
// stray space, trailing slash or capital letter in APP_URL would 401 every request.
export function normalizeOrigin(url) {
  return url?.trim().replace(/\/+$/, '').toLowerCase() || undefined;
}

export default async function requireAuth(req, res, next) {
  if (!clerkClient) {
    req.userId = DEV_USER_ID;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[requireAuth] no bearer token on', req.method, req.path);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  // Only enforce authorizedParties in production. Clerk dev-instance JWTs often omit
  // the azp claim entirely; if authorizedParties is set and azp is absent, Clerk
  // throws and every request returns 401. In prod, APP_URL is a real domain so azp
  // will be present and the check is meaningful.
  const appOrigin = normalizeOrigin(process.env.APP_URL);
  const authorizedParties = isProd && appOrigin ? [appOrigin] : undefined;

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      ...(authorizedParties && { authorizedParties }),
      clockSkewInMs: 60_000,
    });
    req.userId = payload.sub;
    next();
  } catch (err) {
    console.error('[requireAuth] token verification failed:', {
      message: err.message,
      code: err.code,
      path: req.path,
    });
    res.status(401).json({ error: 'Invalid token' });
  }
}
