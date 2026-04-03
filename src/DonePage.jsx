import { useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { loadDoneDrafts, loadProjects, updateDraft, deleteDraft, downloadTextFile, formatDate } from './storage';

export default function DonePage({ onNavigate, onRefine }) {
  const { user, login } = useAuth();
  const [drafts, setDrafts] = useState(loadDoneDrafts);
  const [copiedId, setCopiedId] = useState(null);
  const copiedTimeout = useRef(null);

  const refresh = useCallback(() => setDrafts(loadDoneDrafts()), []);

  const projects = loadProjects();
  const getProjectName = (pid) => {
    if (!pid) return 'Uncategorized';
    const p = projects.find(pr => pr.id === pid);
    return p ? p.name : 'Uncategorized';
  };

  // Group by project
  const grouped = {};
  drafts.forEach(d => {
    const key = d.projectId || 'uncategorized';
    if (!grouped[key]) grouped[key] = { name: getProjectName(d.projectId), drafts: [] };
    grouped[key].drafts.push(d);
  });

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    clearTimeout(copiedTimeout.current);
    copiedTimeout.current = setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (draft) => {
    const content = `--- Original ---\n\n${draft.text}\n\n--- Sharpened ---\n\n${draft.refinedText || draft.text}`;
    downloadTextFile(content, `finished-${draft.title || 'draft'}-${formatDate()}.txt`);
  };

  const handleReEdit = (draft) => {
    onRefine(draft);
  };

  const handleMoveBack = (id) => {
    updateDraft(id, { refined: false });
    refresh();
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this finished piece? This cannot be undone.')) return;
    deleteDraft(id);
    refresh();
  };

  const getPreview = (text) => {
    if (!text) return '';
    const first = text.slice(0, 120).replace(/\n/g, ' ');
    return first + (text.length > 120 ? '...' : '');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F8F0E0', color: '#5C4A32',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '0 20px 60px',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 750, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 0',
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
          <span style={{ color: '#A8B4C4', textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)' }}>Draft</span><span style={{ color: '#5C4A32' }}>,</span> <span style={{ color: '#C0392B' }}>Stop</span><span style={{ color: '#D4943A', textShadow: '0 0 14px rgba(212,148,58,0.7), 0 0 28px rgba(212,148,58,0.4), 0 0 50px rgba(212,148,58,0.2)' }}>&nbsp;& Sharpen</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => onNavigate('flow')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
            borderRadius: 8, background: 'transparent', color: '#8B7B6B', cursor: 'pointer',
          }}>+ New Session</button>
          <button onClick={() => onNavigate('gap')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
            borderRadius: 8, background: 'transparent', color: '#8B7B6B', cursor: 'pointer',
          }}>← Drafts/Stop</button>
          {user ? (
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: '2px solid #D4943A' }}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%' }} /> : (
                <div style={{ width: '100%', height: '100%', background: '#D4943A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 12, fontWeight: 700 }}>{user.name?.[0] || '?'}</div>
              )}
            </div>
          ) : (
            <button onClick={login} style={{
              padding: '6px 12px', fontSize: 11, border: 'none', borderRadius: 8,
              background: '#D4943A', color: '#FFF', cursor: 'pointer', fontWeight: 600,
            }}>Sign in</button>
          )}
        </div>
      </div>

      {/* Page title */}
      <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 30 }}>
        <div style={{
          fontSize: 28, fontWeight: 700, color: '#D4943A',
          fontFamily: "'Source Serif 4', serif",
          textShadow: '0 0 14px rgba(212,148,58,0.5), 0 0 28px rgba(212,148,58,0.25)',
        }}>✭ Finished Pieces</div>
        <p style={{ fontSize: 13, color: '#8B7B6B', marginTop: 8 }}>
          Your sharpened, completed work lives here.
        </p>
      </div>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 750 }}>
        {drafts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
            <p style={{ fontSize: 14 }}>No finished pieces yet.</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              Click "Finish & Save" on the Sharpen & Edit page to move a piece here.
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([key, group]) => (
          <div key={key} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 18, fontWeight: 700, color: '#5C4A32', marginBottom: 10,
              fontFamily: "'Source Serif 4', serif",
            }}>{group.name}</div>

            {group.drafts.map(draft => (
              <div key={draft.id} style={{
                background: '#FDF6EC', borderRadius: 14, padding: '18px 22px', marginBottom: 10,
                border: '2px solid #E8D5B0',
                boxShadow: '0 2px 8px rgba(212,148,58,0.08)',
              }}>
                {/* Title */}
                {draft.title && (
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: '#2D8B5A', marginBottom: 6,
                    fontFamily: "'Source Serif 4', serif",
                  }}>{draft.title}</div>
                )}

                {/* Sharpened text preview */}
                <div style={{
                  fontSize: 14, color: '#5C4A32', lineHeight: 1.6, marginBottom: 10,
                  fontFamily: "'Source Serif 4', serif",
                }}>{getPreview(draft.refinedText || draft.text)}</div>

                {/* Stats */}
                <div style={{ fontSize: 11, color: '#8B7B6B', marginBottom: 12, display: 'flex', gap: 12 }}>
                  <span>Original: {draft.wordCount} words</span>
                  <span>Final: {(draft.refinedText || draft.text).trim().split(/\s+/).length} words</span>
                  <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => handleCopy(draft.refinedText || draft.text, draft.id)} style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 600,
                    background: '#D4943A', color: '#FFF', border: 'none',
                    borderRadius: 8, cursor: 'pointer',
                  }}>{copiedId === draft.id ? 'Copied!' : 'Copy Text'}</button>
                  <button onClick={() => handleDownload(draft)} style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 600,
                    background: 'transparent', color: '#D4943A', border: '1px solid #D4943A',
                    borderRadius: 8, cursor: 'pointer',
                  }}>↓ Download</button>
                  <button onClick={() => handleReEdit(draft)} style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 600,
                    background: 'transparent', color: '#A8B4C4', border: '1px solid #A8B4C4',
                    borderRadius: 8, cursor: 'pointer',
                  }}>Re-edit</button>
                  <button onClick={() => handleMoveBack(draft.id)} style={{
                    padding: '6px 14px', fontSize: 11,
                    background: 'transparent', color: '#8B7B6B', border: '1px solid #D4C4A8',
                    borderRadius: 8, cursor: 'pointer',
                  }}>Move back to Drafts</button>
                  <button onClick={() => handleDelete(draft.id)} style={{
                    padding: '6px 14px', fontSize: 11,
                    background: 'transparent', color: '#C0392B', border: '1px solid #C0392B',
                    borderRadius: 8, cursor: 'pointer',
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
