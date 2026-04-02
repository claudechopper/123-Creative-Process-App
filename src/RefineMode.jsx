import { useState, useRef } from 'react';
import { updateDraft, getDraftsByProject, reorderDrafts, downloadTextFile, formatDate } from './storage';
import TipsPanel from './TipsPanel';

export default function RefineMode({ draft, onNavigate }) {
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
  const editTextareaRef = useRef(null);

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
    downloadTextFile(editedText, `sharpened-${formatDate()}.txt`);
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

  const handleInsertTip = (prompt) => {
    const newText = editedText ? editedText + '\n\n' + prompt : prompt;
    setEditedText(newText);
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
        editTextareaRef.current.selectionStart = newText.length;
        editTextareaRef.current.selectionEnd = newText.length;
      }
    }, 50);
  };

  // Drag and drop handlers
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'copyMove';
    // Set the draft text so it can be dropped on the edit column
    const draftData = projectDrafts.find(d => d.id === id);
    if (draftData) {
      e.dataTransfer.setData('text/plain', draftData.text);
      e.dataTransfer.setData('application/x-draft-id', id);
    }
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
    doReorder(draggedId, targetId);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // Arrow reorder
  const moveCard = (id, direction) => {
    const currentOrder = projectDrafts.map(d => d.id);
    const idx = currentOrder.indexOf(id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= currentOrder.length) return;
    currentOrder.splice(idx, 1);
    currentOrder.splice(newIdx, 0, id);
    setLocalDraftOrder(currentOrder);
    if (draft.projectId) reorderDrafts(draft.projectId, currentOrder);
  };

  const doReorder = (fromId, toId) => {
    const currentOrder = projectDrafts.map(d => d.id);
    const fromIdx = currentOrder.indexOf(fromId);
    const toIdx = currentOrder.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    currentOrder.splice(fromIdx, 1);
    currentOrder.splice(toIdx, 0, fromId);
    setLocalDraftOrder(currentOrder);
    if (draft.projectId) reorderDrafts(draft.projectId, currentOrder);
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
            <span style={{ color: '#A8B4C4', textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)' }}>Draft</span><span style={{ color: '#E8EDF2' }}>,</span> <span style={{ color: '#C0392B' }}>Stop</span><span style={{ color: '#D4943A' }}>&nbsp;& Sharpen</span>
          </div>
          <span style={{ fontSize: 14, color: '#7A9A80' }}><span style={{ color: '#D4943A' }}>Sharpen</span> & Edit</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTips(true)} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #2A3D30',
            borderRadius: 8, background: 'transparent', color: '#7A9A80', cursor: 'pointer',
          }}>💡 Edit Tips</button>
          <button onClick={() => onNavigate('gap')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #2A3D30',
            borderRadius: 8, background: 'transparent', color: '#7A9A80', cursor: 'pointer',
          }}>← Back to Drafts</button>
          <button onClick={handleDone} style={{
            padding: '6px 16px', fontSize: 11, fontWeight: 600,
            border: 'none', borderRadius: 8, background: '#A8B4C4',
            color: '#FFF', cursor: 'pointer',
            textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
          }}>Done & Save to Browser/Account ✓</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 12, padding: '12px 24px', flexWrap: 'wrap',
      }}>
        {[
          { label: 'Original Word Count', value: originalWords, color: '#A8B4C4', glow: false },
          { label: 'Current Word Count', value: currentWords, color: '#E2B44A', glow: true },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#1A2B22', border: '1px solid #2A3D30', borderRadius: 10,
            padding: '10px 16px', minWidth: 120, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, textShadow: stat.glow ? '0 0 10px rgba(212,148,58,0.5), 0 0 24px rgba(212,148,58,0.2)' : '0 0 10px rgba(168,180,196,0.4), 0 0 20px rgba(168,180,196,0.15)' }}>{stat.value}</div>
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
            background: 'linear-gradient(135deg, #2A3644 0%, #344050 50%, #2A3644 100%)',
            padding: '8px 14px', borderRadius: '10px 10px 0 0',
            fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#A8B4C4', display: 'flex', alignItems: 'center', gap: 6,
            textShadow: '0 0 10px rgba(168,180,196,0.5), 0 0 20px rgba(168,180,196,0.2)',
          }}>🔒 Original{projectDrafts.length > 1 && ` (${projectDrafts.length} drafts)`}</div>
          <div style={{
            flex: 1, background: 'linear-gradient(180deg, #1E2C38 0%, #1A2630 100%)',
            borderRadius: '0 0 10px 10px',
            overflowY: 'auto',
            border: '1px solid rgba(168,180,196,0.15)',
            boxShadow: 'inset 0 0 20px rgba(168,180,196,0.05), 0 0 15px rgba(168,180,196,0.08)',
          }}>
            {projectDrafts.length > 1 ? (
              projectDrafts.map((d, idx) => {
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
                      background: isSelected ? '#1E2C38' : 'transparent',
                      border: isSelected ? '1px solid #A8B4C4' : isDragOver ? '1px solid #A8B4C4' : '1px solid transparent',
                      cursor: 'grab', transition: 'all 0.2s ease',
                      opacity: isDragging ? 0.4 : 1,
                      borderTop: isDragOver && !isDragging ? '2px solid #A8B4C4' : undefined,
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}
                  >
                    {/* Arrow buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, marginTop: 2 }}>
                      <button onClick={(e) => { e.stopPropagation(); moveCard(d.id, -1); }} disabled={idx === 0} style={{
                        background: 'transparent', border: 'none', color: idx === 0 ? '#2A3D30' : '#5E7A62',
                        cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12, padding: '0 4px', lineHeight: 1,
                      }}>▲</button>
                      <button onClick={(e) => { e.stopPropagation(); moveCard(d.id, 1); }} disabled={idx === projectDrafts.length - 1} style={{
                        background: 'transparent', border: 'none', color: idx === projectDrafts.length - 1 ? '#2A3D30' : '#5E7A62',
                        cursor: idx === projectDrafts.length - 1 ? 'default' : 'pointer', fontSize: 12, padding: '0 4px', lineHeight: 1,
                      }}>▼</button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#5E7A62', marginBottom: 4 }}>
                        {d.wordCount} words · {formatTimestamp(d.createdAt)}
                      </div>
                      {isSelected ? (
                        <div style={{
                          fontSize: 15, lineHeight: 1.8, color: '#C0C8D4',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          fontFamily: "'Source Serif 4', serif",
                          textShadow: '0 0 8px rgba(168,180,196,0.15)',
                        }}>{d.text}</div>
                      ) : (
                        <div style={{
                          fontSize: 13, color: '#7A9A80', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{getTitle(d.text)}</div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{
                padding: 16, fontSize: 15, lineHeight: 1.8,
                fontFamily: "'Source Serif 4', serif", color: '#C0C8D4',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                textShadow: '0 0 8px rgba(168,180,196,0.15)',
              }}>{selectedOriginal.text}</div>
            )}
          </div>
        </div>

        {/* Editable — shimmering gold text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            background: '#1E3028', padding: '10px 14px', borderRadius: '10px 10px 0 0',
            fontSize: 16, fontWeight: 700, letterSpacing: '0.5px',
            color: '#E2B44A', textAlign: 'center',
            textShadow: '0 0 12px rgba(212,148,58,0.6), 0 0 24px rgba(212,148,58,0.3), 0 0 40px rgba(212,148,58,0.15)',
          }}>✏️ Sharpen & Edit</div>
          <textarea
            ref={editTextareaRef}
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={(e) => {
              const draftId = e.dataTransfer.getData('application/x-draft-id');
              if (!draftId) return; // not a draft card drop, let browser handle
              e.preventDefault();
              const droppedText = e.dataTransfer.getData('text/plain');
              if (!droppedText) return;
              const textarea = editTextareaRef.current;
              if (!textarea) return;
              // Insert at current cursor position or end
              const pos = textarea.selectionStart ?? editedText.length;
              const before = editedText.slice(0, pos);
              const after = editedText.slice(pos);
              const sep = (before && !before.endsWith('\n')) ? '\n\n' : '';
              setEditedText(before + sep + droppedText + after);
              setDraggedId(null);
              setDragOverId(null);
            }}
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
          background: '#A8B4C4', color: '#FFF', border: 'none',
          borderRadius: 8, cursor: 'pointer', minWidth: 160,
          textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
        }}>{copied ? 'Copied!' : 'Copy Sharpened Text'}</button>
        <button onClick={handleSave} style={{
          padding: '10px 24px', fontSize: 13, fontWeight: 600,
          background: 'transparent', color: '#D4943A',
          border: '1px solid #D4943A', borderRadius: 8, cursor: 'pointer',
          textShadow: '0 0 10px rgba(212,148,58,0.5), 0 0 20px rgba(212,148,58,0.25)',
        }}>↓ Save Sharpened Text to Computer</button>
      </div>

      {/* Tips panel */}
      {showTips && <TipsPanel mode="refine" onClose={() => setShowTips(false)} onInsertTip={handleInsertTip} />}
    </div>
  );
}
