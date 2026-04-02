import { useState, useEffect, useCallback } from 'react';
import { loadDrafts, updateDraft, deleteDraft } from './storage';

export default function GapMode({ onNavigate, onRefine }) {
  const [drafts, setDrafts] = useState(loadDrafts);
  const [now, setNow] = useState(Date.now());
  const [overrideTaps, setOverrideTaps] = useState({});

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshDrafts = useCallback(() => setDrafts(loadDrafts()), []);

  useEffect(() => {
    window.addEventListener('focus', refreshDrafts);
    return () => window.removeEventListener('focus', refreshDrafts);
  }, [refreshDrafts]);

  const handleOverrideTap = (id) => {
    const taps = (overrideTaps[id] || 0) + 1;
    if (taps >= 3) {
      const updated = updateDraft(id, { unlocksAt: Date.now() });
      setDrafts(updated);
      setOverrideTaps(prev => ({ ...prev, [id]: 0 }));
    } else {
      setOverrideTaps(prev => ({ ...prev, [id]: taps }));
    }
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    setDrafts(deleteDraft(id));
  };

  const formatRemaining = (ms) => {
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTitle = (text) => {
    const first = text.slice(0, 40).replace(/\n/g, ' ');
    return first + (text.length > 40 ? '...' : '');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#E8E4DF', color: '#6B6560',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      transition: 'background-color 0.6s ease, color 0.6s ease',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '0 20px 60px',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 700, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 0',
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px', color: '#6B6560' }}>
          two<span style={{ color: '#9B8B7B' }}>modes</span>
        </div>
        <button onClick={() => onNavigate('flow')} style={{
          padding: '6px 12px', fontSize: 11, border: '1px solid #C4BEB8',
          borderRadius: 8, background: 'transparent', color: '#6B6560', cursor: 'pointer',
        }}>+ New Session</button>
      </div>

      {/* Center content */}
      <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 32, opacity: 0.5 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌙</div>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase',
          marginBottom: 8,
        }}>YOUR DRAFTS ARE RESTING</div>
        <p style={{ fontSize: 13, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
          Longer gaps correlate with better editing. Let it breathe.
        </p>
      </div>

      {/* Drafts list */}
      <div style={{ width: '100%', maxWidth: 700 }}>
        {drafts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
            <p style={{ fontSize: 14 }}>No drafts yet.</p>
            <button onClick={() => onNavigate('flow')} style={{
              marginTop: 16, padding: '12px 28px', fontSize: 14, fontWeight: 600,
              background: '#9B8B7B', color: '#FFF', border: 'none',
              borderRadius: 10, cursor: 'pointer',
            }}>Start Your First Flow Session</button>
          </div>
        )}

        {drafts.map(draft => {
          const remaining = draft.unlocksAt - now;
          const isReady = remaining <= 0;
          const taps = overrideTaps[draft.id] || 0;

          return (
            <div key={draft.id} style={{
              background: isReady ? '#F0ECE8' : '#E2DEDB',
              borderRadius: 12, padding: '16px 20px', marginBottom: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              opacity: isReady ? 1 : 0.7,
              transition: 'opacity 0.3s ease',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: isReady ? '#4A4440' : '#6B6560',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{getTitle(draft.text)}</div>
                <div style={{ fontSize: 11, color: '#9B9590', marginTop: 4 }}>
                  Flow session · {draft.wordCount} words · {new Date(draft.createdAt).toLocaleDateString()}
                  {draft.refined && ' · Refined ✓'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
                {isReady ? (
                  <button onClick={() => onRefine(draft)} style={{
                    padding: '8px 16px', fontSize: 12, fontWeight: 600,
                    background: '#5BA4E6', color: '#FFF', border: 'none',
                    borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>Ready to refine →</button>
                ) : (
                  <>
                    <span style={{ fontSize: 12, color: '#9B8B7B', fontFamily: "'Space Mono', monospace" }}>
                      {formatRemaining(remaining)}
                    </span>
                    <button onClick={() => handleOverrideTap(draft.id)} style={{
                      padding: '4px 8px', fontSize: 10, border: '1px solid #C4BEB8',
                      borderRadius: 6, background: 'transparent', color: '#9B8B7B',
                      cursor: 'pointer',
                    }}>
                      {taps === 0 ? 'I need it now' : taps === 1 ? 'Are you sure?' : 'Last chance...'}
                    </button>
                  </>
                )}
                <button onClick={() => handleDelete(draft.id)} style={{
                  padding: '4px 8px', fontSize: 12, background: 'transparent',
                  border: 'none', color: '#B0A8A0', cursor: 'pointer',
                }}>×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
