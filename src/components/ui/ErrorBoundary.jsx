import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: 'calc(100vh - 120px)',
          gap: 16, color: 'var(--text-2)',
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 14, margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred in this section.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 8, padding: '8px 20px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer', fontSize: 14,
            }}
          >
            Reload section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
