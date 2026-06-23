import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setTokenGetter } from '../api/client';
import LoginPage from '../pages/LoginPage';

// Bridges Clerk token getter into the API client.
// Only mounted inside a ClerkProvider tree.
export function ClerkBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(getToken);
    return () => setTokenGetter(null);
  }, [getToken]);
  return null;
}

// Shows LoginPage when not signed in, passes children through when signed in.
export function ClerkAuthGuard({ children }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)',
      }}>
        <div style={{
          width: 36, height: 36, border: '3px solid #6366f1',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'om-spin 1s linear infinite',
        }} />
      </div>
    );
  }

  if (!isSignedIn) return <LoginPage />;
  return <>{children}</>;
}
