import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function InviteAcceptModal({ token, onClose }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.getInviteInfo(token)
      .then(setInvite)
      .catch(e => setError(e.message || 'Invalid or expired invite link'));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      await api.acceptInvite(token);
      setDone(true);
      setTimeout(() => { window.location.href = '/'; }, 1800);
    } catch (e) {
      setError(e.message || 'Failed to accept invite');
      setAccepting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        background: 'var(--surface-solid)', border: '1px solid var(--border-strong)',
        borderRadius: 26, padding: '44px 40px', maxWidth: 440, width: '90%',
        textAlign: 'center', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{
          width: 60, height: 60, borderRadius: 18, margin: '0 auto 24px',
          background: 'linear-gradient(140deg,#6366f1,#a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(99,102,241,0.45)',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="#fff"/>
            <ellipse cx="12" cy="12" rx="10" ry="4.4" stroke="#fff" strokeWidth="1.6" opacity="0.95"/>
            <ellipse cx="12" cy="12" rx="10" ry="4.4" stroke="#fff" strokeWidth="1.6" transform="rotate(60 12 12)" opacity="0.6"/>
          </svg>
        </div>

        {/* Error state */}
        {error && (
          <>
            <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
              Invalid Invite
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 28, lineHeight: 1.6 }}>
              {error}
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '12px 28px', borderRadius: 12, cursor: 'pointer',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              }}
            >
              Close
            </button>
          </>
        )}

        {/* Loading state */}
        {!error && !invite && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 28, height: 28, border: '3px solid #6366f1',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'om-spin 1s linear infinite',
            }} />
            <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Loading invite...</div>
          </div>
        )}

        {/* Invite ready */}
        {!error && invite && !done && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
              You're invited!
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>
              <strong>{invite.inviter_user_id}</strong> has invited you to join
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700, margin: '14px 0 28px',
              padding: '14px 24px', borderRadius: 14,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              color: '#818cf8',
            }}>
              {invite.household_name}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px', borderRadius: 12, cursor: 'pointer',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                }}
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting}
                style={{
                  padding: '12px 28px', borderRadius: 12, cursor: 'pointer',
                  background: 'var(--accent)', border: 'none',
                  color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                  opacity: accepting ? 0.7 : 1,
                }}
              >
                {accepting ? 'Joining...' : 'Accept & Join'}
              </button>
            </div>
          </>
        )}

        {/* Success */}
        {done && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
              Welcome aboard!
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
              You've joined the household. Reloading…
            </div>
          </>
        )}
      </div>
    </div>
  );
}
