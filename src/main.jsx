import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AppStoreProvider } from './store/appStore.js';
import { ClerkProvider } from '@clerk/clerk-react';
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: false,
  });
}

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {CLERK_KEY ? (
      <ClerkProvider publishableKey={CLERK_KEY}>
        <AppStoreProvider>
          <App />
        </AppStoreProvider>
      </ClerkProvider>
    ) : (
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    )}
  </StrictMode>
);
