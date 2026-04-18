import { useState, useCallback, useRef } from 'react';
// useAuth removed — app is local-only, no accounts
import { loadDoneDrafts, loadProjects, updateDraft, deleteDraft, downloadTextFile, formatDate } from './storage';
import NavBar from './NavBar';
import useIsMobile from './useIsMobile';

export default function DonePage({ onNavigate, onRefine }) {
  // no auth — drafts live in localStorage only
  const [drafts, setDrafts] = useState(loadDoneDrafts);
  const [copiedId, setCopiedId] = useState(null);
  const [viewingDraft, setViewingDraft] = useState(null);
  const copiedTimeout = useRef(null);
  const isMobile = useIsMobile();

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
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea'); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopiedId(id);
    clearTimeout(copiedTimeout.current);
    copiedTimeout.current = setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (draft) => {
    const content = draft.refinedText || draft.text;
    downloadTextFile(content, `polished-${draft.title || 'draft'}-${formatDate()}.txt`);
  };

  const handleReEdit = (draft) => onRefine(draft);

  const handleMoveBack = (id) => {
    updateDraft(id, { refined: false });
    onNavigate('gap');
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this finished piece? This cannot be undone.')) return;
    deleteDraft(id); refresh();
  };

  const getPreview = (text) => {
    if (!text) return '';
    const first = text.slice(0, 120).replace(/\n/g, ' ');
    return first + (text.length > 120 ? '...' : '');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FBF0D0 0%, #F5E6C0 50%, #F0DDB0 100%)',
      color: '#5C4A32',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: isMobile ? '0 10px 60px' : '0 20px 60px',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 750, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 0', flexWrap: 'wrap', gap: 10,
      }}>
        <div onClick={() => onNavigate('flow')} style={{ fontSize: isMobile ? 15 : 18, fontWeight: 600, letterSpacing: '-0.5px', cursor: 'pointer' }}>
          <span style={{ color: '#A8B4C4', textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)' }}>Draft</span><span style={{ color: '#5C4A32' }}>,</span> <span style={{ color: '#C0392B' }}>Stop</span><span style={{ color: '#D4943A', textShadow: '0 0 14px rgba(212,148,58,0.7), 0 0 28px rgba(212,148,58,0.4), 0 0 50px rgba(212,148,58,0.2)' }}>&nbsp;& Sharpen</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NavBar currentPage="done" onNavigate={onNavigate} onSharpen={() => {
            if (drafts.length > 0) {
              onRefine(drafts[0]);
            } else {
              onNavigate('gap');
            }
          }} />
          {/* Auth removed — no avatar/sign-in button */}
        </div>
      </div>

      {/* Page title — golden and shiny */}
      <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 30 }}>
        <div style={{
          fontSize: isMobile ? 24 : 34, fontWeight: 700, color: '#D4943A',
          fontFamily: "'Source Serif 4', serif",
          textShadow: '0 0 20px rgba(212,148,58,0.8), 0 0 40px rgba(212,148,58,0.5), 0 0 70px rgba(212,148,58,0.25), 0 0 100px rgba(212,148,58,0.1)',
        }}>✭ Finished Works</div>
        <p style={{ fontSize: 14, color: '#8B7B6B', marginTop: 8, lineHeight: 1.5 }}>
          Your sharpened, completed work lives here.
          <br /><span style={{ fontSize: 12, fontStyle: 'italic', opacity: 0.7 }}>(You can always re-edit these if needed)</span>
        </p>
      </div>

      {/* Decorative gold line */}
      <div style={{
        width: '100%', maxWidth: 750, height: 2, marginBottom: 24,
        background: 'linear-gradient(90deg, transparent 0%, #D4943A 20%, #F0D060 50%, #D4943A 80%, transparent 100%)',
        borderRadius: 1, opacity: 0.7,
      }} />

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 750 }}>
        {drafts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✭</div>
            <p style={{ fontSize: 14 }}>No polished pieces yet.</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              Click "Finish & Save" on the Sharpen & Edit page to move a piece here.
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([key, group]) => (
          <div key={key} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: '#5C4A32', marginBottom: 12,
              fontFamily: "'Source Serif 4', serif",
            }}>{group.name}</div>

            {group.drafts.map(draft => (
              <div key={draft.id} style={{
                background: 'linear-gradient(135deg, #FFFDF5 0%, #FFF8E8 50%, #FFFDF5 100%)',
                borderRadius: isMobile ? 10 : 14, padding: isMobile ? '14px 14px' : '20px 24px', marginBottom: 12,
                border: '2px solid #D4943A',
                boxShadow: '0 2px 16px rgba(212,148,58,0.15), 0 0 30px rgba(212,148,58,0.08), 0 0 0 1px rgba(212,148,58,0.1)',
              }}>
                {/* Title */}
                {draft.title && (
                  <div style={{
                    fontSize: 20, fontWeight: 700, color: '#2D8B5A', marginBottom: 8,
                    fontFamily: "'Source Serif 4', serif",
                  }}>{draft.title}</div>
                )}

                {/* Sharpened text preview */}
                <div style={{
                  fontSize: 15, color: '#5C4A32', lineHeight: 1.7, marginBottom: 12,
                  fontFamily: "'Source Serif 4', serif",
                }}>{getPreview(draft.refinedText || draft.text)}</div>

                {/* Stats */}
                <div style={{ fontSize: isMobile ? 10 : 11, color: '#8B7B6B', marginBottom: 14, display: 'flex', gap: isMobile ? 8 : 16, flexWrap: 'wrap' }}>
                  <span>Original: {draft.wordCount} words</span>
                  <span>Polished: {(draft.refinedText || draft.text).trim().split(/\s+/).length} words</span>
                  <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: isMobile ? 6 : 8, flexWrap: 'wrap' }}>
                  <button onClick={() => setViewingDraft(draft)} style={{
                    padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 10 : 11, fontWeight: 700,
                    background: 'linear-gradient(135deg, #D4943A 0%, #E8B860 50%, #D4943A 100%)',
                    color: '#FFF', border: 'none',
                    borderRadius: 8, cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(212,148,58,0.4), 0 0 20px rgba(212,148,58,0.15)',
                    textShadow: '0 0 10px rgba(255,255,255,0.5)',
                  }}>{isMobile ? '📄 View' : '📄 See Finished Product'}</button>
                  <button onClick={() => handleCopy(draft.refinedText || draft.text, draft.id)} style={{
                    padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 10 : 11, fontWeight: 600,
                    background: '#D4943A', color: '#FFF', border: 'none',
                    borderRadius: 8, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(212,148,58,0.25)',
                  }}>{copiedId === draft.id ? 'Copied!' : '📋 Copy'}</button>
                  <button onClick={() => handleDownload(draft)} style={{
                    padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 10 : 11, fontWeight: 600,
                    background: 'transparent', color: '#D4943A', border: '1.5px solid #D4943A',
                    borderRadius: 8, cursor: 'pointer',
                  }}>↓ Download</button>
                  <button onClick={() => handleReEdit(draft)} style={{
                    padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 10 : 11, fontWeight: 600,
                    background: 'transparent', color: '#5A8F6A', border: '1.5px solid #5A8F6A',
                    borderRadius: 8, cursor: 'pointer',
                  }}>✏️ Re-edit</button>
                  <button onClick={() => handleMoveBack(draft.id)} style={{
                    padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 10 : 11,
                    background: 'transparent', color: '#8B7B6B', border: '1px solid #D4C4A8',
                    borderRadius: 8, cursor: 'pointer',
                  }}>{isMobile ? '↩ Back' : '↩ Send This Back to Drafts'}</button>
                  <button onClick={() => handleDelete(draft.id)} style={{
                    padding: isMobile ? '6px 10px' : '7px 16px', fontSize: isMobile ? 10 : 11,
                    background: 'transparent', color: '#C0392B', border: '1px solid #C0392B',
                    borderRadius: 8, cursor: 'pointer',
                  }}>× Delete</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Finished Product Viewer Modal */}
      {viewingDraft && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center',
          zIndex: 500, padding: isMobile ? 8 : 20,
          overflowY: isMobile ? 'auto' : 'visible',
        }} onClick={(e) => { if (e.target === e.currentTarget) setViewingDraft(null); }}>
          <div style={{
            background: 'linear-gradient(180deg, #FFFDF5 0%, #FFF8E8 100%)',
            borderRadius: isMobile ? 12 : 20, maxWidth: 700, width: '100%',
            maxHeight: isMobile ? 'none' : '85vh', overflowY: isMobile ? 'visible' : 'auto',
            padding: isMobile ? '20px 16px' : '40px 44px',
            margin: isMobile ? '8px 0 40px' : 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 40px rgba(212,148,58,0.15), 0 0 0 2px #D4943A',
            fontFamily: "'Source Serif 4', serif",
          }}>
            {viewingDraft.title && (
              <h1 style={{
                fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#2D8B5A', marginBottom: 16,
                lineHeight: 1.3,
              }}>{viewingDraft.title}</h1>
            )}
            <div style={{
              fontSize: isMobile ? 15 : 17, color: '#3A3020', lineHeight: isMobile ? 1.8 : 2,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{viewingDraft.refinedText || viewingDraft.text}</div>

            <div style={{
              marginTop: 30, paddingTop: 20,
              borderTop: '2px solid rgba(212,148,58,0.2)',
              display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap',
            }}>
              <button onClick={() => handleCopy(viewingDraft.refinedText || viewingDraft.text, viewingDraft.id)} style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 600,
                background: '#D4943A', color: '#FFF', border: 'none',
                borderRadius: 10, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(212,148,58,0.3)',
              }}>{copiedId === viewingDraft.id ? 'Copied!' : '📋 Copy Text'}</button>
              <button onClick={() => handleDownload(viewingDraft)} style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 600,
                background: 'transparent', color: '#D4943A', border: '1.5px solid #D4943A',
                borderRadius: 10, cursor: 'pointer',
              }}>↓ Download</button>
              <button onClick={() => setViewingDraft(null)} style={{
                padding: '10px 20px', fontSize: 13,
                background: 'transparent', color: '#8B7B6B', border: '1px solid #D4C4A8',
                borderRadius: 10, cursor: 'pointer',
              }}>Close</button>
            </div>

            <div style={{
              textAlign: 'center', marginTop: 14, fontSize: 11, color: '#A8977A',
            }}>
              {(viewingDraft.refinedText || viewingDraft.text).trim().split(/\s+/).length} words · Finished {new Date(viewingDraft.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
