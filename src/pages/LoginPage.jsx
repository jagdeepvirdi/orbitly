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
          <div style={{
            width: 40, height: 40, borderRadius: 13,
            background: 'linear-gradient(140deg,#6366f1,#a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(99,102,241,0.4)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="#fff"/>
              <ellipse cx="12" cy="12" rx="10" ry="4.4" stroke="#fff" strokeWidth="1.6" opacity="0.95"/>
              <ellipse cx="12" cy="12" rx="10" ry="4.4" stroke="#fff" strokeWidth="1.6" transform="rotate(60 12 12)" opacity="0.6"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>
            Orbitly
          </div>
        </div>
        <SignIn routing="hash" appearance={{ variables: { colorPrimary: '#6366f1' } }} />
      </div>
    </div>
  );
}
