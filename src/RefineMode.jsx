import { useState, useRef } from 'react';
import { updateDraft, getDraftsByProject, downloadTextFile, formatDate } from './storage';

export default function RefineMode({ draft, onNavigate }) {
  // Get sibling drafts from same project
  const projectDrafts = draft.projectId
    ? getDraftsByProject(draft.projectId)
    : [draft];

  const [selectedOriginalId, setSelectedOriginalId] = useState(draft.id);
  const [editedText, setEditedText] = useState(draft.text);
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef(null);

  const selectedOriginal = projectDrafts.find(d => d.id === selectedOriginalId) || draft;
  const originalWords = selectedOriginal.text.trim().split(/\s+/).length;
  const currentWords = editedText.trim() ? editedText.trim().split(/\s+/).length : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = editedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    clearTimeout(copiedTimeout.current);
    copiedTimeout.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    downloadTextFile(editedText, `refined-${formatDate()}.txt`);
  };

  const handleDone = () => {
    updateDraft(draft.id, { refined: true, refinedText: editedText });
    onNavigate('gap');
  };

  const getTitle = (text) => {
    const first = text.slice(0, 50).replace(/\n/g, ' ');
    return first + (text.length > 50 ? '...' : '');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#1A2B1E', color: '#E8EDF2',
      display: 'flex', flexDirection: 'column',
      transition: 'background-color 0.6s ease, color 0.6s ease',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #2B3D2E',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
            two<span style={{ color: '#D4943A' }}>modes</span>
          </div>
          <span style={{ fontSize: 14, color: '#8B9B7B' }}>Refine & Edit</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNavigate('gap')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #3D5040',
            borderRadius: 8, background: 'transparent', color: '#8B9B7B', cursor: 'pointer',
          }}>← Back to Drafts</button>
          <button onClick={handleDone} style={{
            padding: '6px 16px', fontSize: 11, fontWeight: 600,
            border: 'none', borderRadius: 8, background: '#D4943A',
            color: '#FFF', cursor: 'pointer',
          }}>Done ✓</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 12, padding: '12px 24px', flexWrap: 'wrap',
      }}>
        {[
          { label: 'Original Word Count', value: originalWords, color: '#E8EDF2' },
          { label: 'Current Word Count', value: currentWords, color: '#E8EDF2' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#1E2D22', border: '1px solid #3D5040', borderRadius: 10,
            padding: '10px 16px', minWidth: 120, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: '#8B9B7B', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Split panes */}
      <div style={{
        flex: 1, display: 'flex', gap: 16, padding: '0 24px 24px',
        minHeight: 0,
      }}>
        {/* Original — multi-card if project has multiple drafts */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            background: '#243D28', padding: '8px 14px', borderRadius: '10px 10px 0 0',
            fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#8B9B7B', display: 'flex', alignItems: 'center', gap: 6,
          }}>🔒 Original{projectDrafts.length > 1 && ` (${projectDrafts.length} drafts)`}</div>
          <div style={{
            flex: 1, background: '#1E2D22', borderRadius: '0 0 10px 10px',
            overflowY: 'auto',
          }}>
            {projectDrafts.length > 1 ? (
              // Multi-card view
              projectDrafts.map(d => {
                const isSelected = d.id === selectedOriginalId;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedOriginalId(d.id)}
                    style={{
                      padding: 14, margin: 8, borderRadius: 8,
                      background: isSelected ? '#2A3D2E' : 'transparent',
                      border: isSelected ? '1px solid #D4943A' : '1px solid transparent',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#8B9B7B', marginBottom: 4 }}>
                      {d.wordCount} words · {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                    {isSelected ? (
                      <div style={{
                        fontSize: 15, lineHeight: 1.8, color: '#E8EDF2', opacity: 0.7,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontFamily: "'Source Serif 4', serif",
                      }}>{d.text}</div>
                    ) : (
                      <div style={{
                        fontSize: 13, color: '#8B9B7B', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{getTitle(d.text)}</div>
                    )}
                  </div>
                );
              })
            ) : (
              // Single draft view
              <div style={{
                padding: 16, fontSize: 15, lineHeight: 1.8,
                fontFamily: "'Source Serif 4', serif", color: '#E8EDF2', opacity: 0.7,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{selectedOriginal.text}</div>
            )}
          </div>
        </div>

        {/* Editable */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            background: '#243D28', padding: '8px 14px', borderRadius: '10px 10px 0 0',
            fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#D4943A', display: 'flex', alignItems: 'center', gap: 6,
          }}>✏️ Your Edit</div>
          <textarea
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            style={{
              flex: 1, background: '#1E2D22', borderRadius: '0 0 10px 10px',
              padding: 16, border: 'none', fontSize: 15, lineHeight: 1.8,
              fontFamily: "'Source Serif 4', serif", color: '#E8EDF2',
              resize: 'none', minHeight: 300,
            }}
          />
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 12, padding: '0 24px 24px',
      }}>
        <button onClick={handleCopy} style={{
          padding: '10px 24px', fontSize: 13, fontWeight: 600,
          background: '#D4943A', color: '#FFF', border: 'none',
          borderRadius: 8, cursor: 'pointer', minWidth: 160,
        }}>{copied ? 'Copied!' : 'Copy to Clipboard'}</button>
        <button onClick={handleSave} style={{
          padding: '10px 24px', fontSize: 13, fontWeight: 600,
          background: 'transparent', color: '#D4943A',
          border: '1px solid #D4943A', borderRadius: 8, cursor: 'pointer',
        }}>↓ Save to Computer</button>
      </div>
    </div>
  );
}
