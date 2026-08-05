import { SignIn } from '@clerk/clerk-react';

export default function LoginPage() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'center', marginBottom: 32,
        }}>
          <img src="/mosaic-heart-logo.png" alt="Mosaic Life" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Mosaic Life
          </div>
        </div>
        <SignIn routing="hash" appearance={{ variables: { colorPrimary: '#1d98d9' } }} />
      </div>
    </div>
  );
}
