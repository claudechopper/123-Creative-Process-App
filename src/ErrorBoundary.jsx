import { Component } from 'react';

/**
 * Top-level safety net. If any page throws, we render a minimal recovery UI
 * instead of a white screen. Users can either reload or go back to Flow mode.
 * localStorage drafts are preserved — this only catches React render errors.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for debugging; no remote telemetry by design (no Sentry).
    console.error('App error boundary caught:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Nudge back to root URL so whichever mode we were in re-mounts fresh.
    if (window.location.pathname !== '/') window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', background: '#FDF6EC',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 24,
      }}>
        <div style={{
          maxWidth: 480, textAlign: 'center', padding: 32,
          background: '#FFF', borderRadius: 12,
          border: '1px solid #E5D8D5', boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✍️</div>
          <h1 style={{
            fontSize: 22, margin: '0 0 12px', color: '#2A1A1A',
            fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
          }}>
            Something got tangled.
          </h1>
          <p style={{ color: '#6B5A5A', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
            Your drafts are safe — they're saved to your browser. Try reloading the page,
            or if that doesn't work, head back to the start.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.handleReload} style={{
              background: '#D4943A', color: '#FFF', border: 'none',
              padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}>Reload page</button>
            <button onClick={this.handleReset} style={{
              background: 'transparent', color: '#8B7B6B',
              border: '1px solid #E5D8D5', padding: '10px 20px',
              borderRadius: 8, fontSize: 14, cursor: 'pointer',
            }}>Back to start</button>
          </div>
          {this.state.error && (
            <details style={{ marginTop: 20, textAlign: 'left', fontSize: 11, color: '#A08B8B' }}>
              <summary style={{ cursor: 'pointer' }}>Technical details</summary>
              <pre style={{
                whiteSpace: 'pre-wrap', marginTop: 8, padding: 8,
                background: '#FAF5EC', borderRadius: 4, fontSize: 10,
              }}>{String(this.state.error?.stack || this.state.error)}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
