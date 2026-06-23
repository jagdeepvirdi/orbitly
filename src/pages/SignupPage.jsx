import { SignUp } from '@clerk/clerk-react';

export default function SignupPage() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      <SignUp routing="hash" appearance={{ variables: { colorPrimary: '#6366f1' } }} />
    </div>
  );
}
