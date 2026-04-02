import { useState, useRef } from 'react';
import { updateDraft, getDraftsByProject, reorderDrafts, downloadTextFile, formatDate } from './storage';
import TipsPanel from './TipsPanel';

export default function RefineMode({ draft, onNavigate }) {
  // Get sibling drafts from same project
  const [localDraftOrder, setLocalDraftOrder] = useState(null);
  const projectDraftsRaw = draft.projectId
    ? getDraftsByProject(draft.projectId)
    : [draft];
  const projectDrafts = localDraftOrder
    ? localDraftOrder.map(id => projectDraftsRaw.find(d => d.id === id)).filter(Boolean)
    : projectDraftsRaw;

  const [selectedOriginalId, setSelectedOriginalId] = useState(draft.id);
  const [editedText, setEditedText] = useState(draft.text);
  const [copied, setCopied] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
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

  const formatTimestamp = (ts) => {
    return new Date(ts).toLocaleString([], {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const currentOrder = projectDrafts.map(d => d.id);
    const fromIdx = currentOrder.indexOf(draggedId);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    currentOrder.splice(fromIdx, 1);
    currentOrder.splice(toIdx, 0, draggedId);
    setLocalDraftOrder(currentOrder);
    if (draft.projectId) {
      reorderDrafts(draft.projectId, currentOrder);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#14201A', color: '#E8EDF2',
      display: 'flex', flexDirection: 'column',
      transition: 'background-color 0.6s ease, color 0.6s ease',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #2A3D30',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
            draft<span style={{ color: '#D4943A' }}>&nbsp;& sharpen</span>
          </div>
          <span style={{ fontSize: 14, color: '#7A9A80' }}>Refine & Edit</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTips(true)} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #2A3D30',
            borderRadius: 8, background: 'transparent', color: '#7A9A80', cursor: 'pointer',
          }}>💡 Tips</button>
          <button onClick={() => onNavigate('gap')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #2A3D30',
            borderRadius: 8, background: 'transparent', color: '#7A9A80', cursor: 'pointer',
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
          { label: 'Original Word Count', value: originalWords, color: '#B8C0B8' },
          { label: 'Current Word Count', value: currentWords, color: '#E2B44A', glow: true },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#1A2B22', border: '1px solid #2A3D30', borderRadius: 10,
            padding: '10px 16px', minWidth: 120, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, textShadow: stat.glow ? '0 0 10px rgba(212,148,58,0.5), 0 0 24px rgba(212,148,58,0.2)' : 'none' }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: '#5E7A62', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Split panes */}
      <div style={{
        flex: 1, display: 'flex', gap: 16, padding: '0 24px 24px',
        minHeight: 0,
      }}>
        {/* Original — greyish white text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            background: '#1E3028', padding: '8px 14px', borderRadius: '10px 10px 0 0',
            fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#5E7A62', display: 'flex', alignItems: 'center', gap: 6,
          }}>🔒 Original{projectDrafts.length > 1 && ` (${projectDrafts.length} drafts)`}</div>
          <div style={{
            flex: 1, background: '#1A2B22', borderRadius: '0 0 10px 10px',
            overflowY: 'auto',
          }}>
            {projectDrafts.length > 1 ? (
              // Multi-card view with drag and drop
              projectDrafts.map(d => {
                const isSelected = d.id === selectedOriginalId;
                const isDragging = d.id === draggedId;
                const isDragOver = d.id === dragOverId;
                return (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, d.id)}
                    onDragOver={(e) => handleDragOver(e, d.id)}
                    onDrop={(e) => handleDrop(e, d.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedOriginalId(d.id)}
                    style={{
                      padding: 14, margin: 8, borderRadius: 8,
                      background: isSelected ? '#1E3028' : 'transparent',
                      border: isSelected ? '1px solid #D4943A' : isDragOver ? '1px solid #D4943A' : '1px solid transparent',
                      cursor: 'grab', transition: 'all 0.2s ease',
                      opacity: isDragging ? 0.4 : 1,
                      borderTop: isDragOver && !isDragging ? '2px solid #D4943A' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#5E7A62', marginBottom: 4 }}>
                      {d.wordCount} words · {formatTimestamp(d.createdAt)}
                    </div>
                    {isSelected ? (
                      <div style={{
                        fontSize: 15, lineHeight: 1.8, color: '#B8C0B8',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontFamily: "'Source Serif 4', serif",
                      }}>{d.text}</div>
                    ) : (
                      <div style={{
                        fontSize: 13, color: '#7A9A80', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{getTitle(d.text)}</div>
                    )}
                  </div>
                );
              })
            ) : (
              // Single draft view — greyish white
              <div style={{
                padding: 16, fontSize: 15, lineHeight: 1.8,
                fontFamily: "'Source Serif 4', serif", color: '#B8C0B8',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{selectedOriginal.text}</div>
            )}
          </div>
        </div>

        {/* Editable — shimmering gold text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            background: '#1E3028', padding: '8px 14px', borderRadius: '10px 10px 0 0',
            fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#E2B44A', display: 'flex', alignItems: 'center', gap: 6,
            textShadow: '0 0 10px rgba(212,148,58,0.5)',
          }}>✏️ Your Edit</div>
          <textarea
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            style={{
              flex: 1, background: '#1A2B22', borderRadius: '0 0 10px 10px',
              padding: 16, border: 'none', fontSize: 15, lineHeight: 1.8,
              fontFamily: "'Source Serif 4', serif", color: '#E2B44A',
              resize: 'none', minHeight: 300,
              caretColor: '#F0D080',
              textShadow: '0 0 8px rgba(212,148,58,0.4), 0 0 20px rgba(212,148,58,0.15)',
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

      {/* Tips panel */}
      {showTips && <TipsPanel mode="refine" onClose={() => setShowTips(false)} />}
    </div>
  );
}
