import { createClerkClient } from '@clerk/backend';

const DEV_USER_ID = 'jagdeep';

let clerkClient = null;
if (process.env.CLERK_SECRET_KEY) {
  clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

export default async function requireAuth(req, res, next) {
  if (!clerkClient) {
    req.userId = DEV_USER_ID;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = await clerkClient.verifyToken(token, {
      // APP_URL is the frontend origin (e.g. http://localhost:5177 or https://orbitly.vercel.app).
      // Clerk's JWT azp claim carries the origin, not the publishable key.
      // Omitting authorizedParties in dev is safe — Clerk dev JWTs may not include azp at all.
      ...(process.env.APP_URL && { authorizedParties: [process.env.APP_URL] }),
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
