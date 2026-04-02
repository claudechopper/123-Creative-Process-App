import { useState, useRef } from 'react';
import { updateDraft, downloadTextFile, formatDate } from './storage';

export default function RefineMode({ draft, onNavigate }) {
  const [editedText, setEditedText] = useState(draft.text);
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef(null);

  const originalWords = draft.text.trim().split(/\s+/).length;
  const currentWords = editedText.trim() ? editedText.trim().split(/\s+/).length : 0;
  const killRate = originalWords > 0 ? Math.round(((originalWords - currentWords) / originalWords) * 100) : 0;

  // Calculate "voice" — new words added that weren't in original
  const originalSet = new Set(draft.text.toLowerCase().match(/\b\w+\b/g) || []);
  const editedWords = editedText.toLowerCase().match(/\b\w+\b/g) || [];
  const newWords = editedWords.filter(w => !originalSet.has(w)).length;
  const voiceRate = editedWords.length > 0 ? Math.round((newWords / editedWords.length) * 100) : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      clearTimeout(copiedTimeout.current);
      copiedTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = editedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      clearTimeout(copiedTimeout.current);
      copiedTimeout.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    downloadTextFile(editedText, `refined-${formatDate()}.txt`);
  };

  const handleDone = () => {
    updateDraft(draft.id, { refined: true, refinedText: editedText });
    onNavigate('gap');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#1A2332', color: '#E8EDF2',
      display: 'flex', flexDirection: 'column',
      transition: 'background-color 0.6s ease, color 0.6s ease',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #2A3A4E',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
            two<span style={{ color: '#5BA4E6' }}>modes</span>
          </div>
          <span style={{ fontSize: 14, color: '#7B8B9B' }}>Refine & Edit</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNavigate('gap')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #344556',
            borderRadius: 8, background: 'transparent', color: '#7B8B9B', cursor: 'pointer',
          }}>← Back to Drafts</button>
          <button onClick={handleDone} style={{
            padding: '6px 16px', fontSize: 11, fontWeight: 600,
            border: 'none', borderRadius: 8, background: '#5BA4E6',
            color: '#FFF', cursor: 'pointer',
          }}>Done ✓</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 12, padding: '12px 24px', flexWrap: 'wrap',
      }}>
        {[
          { label: 'Kill Rate', value: `${Math.max(0, killRate)}%`, color: killRate > 0 ? '#22C55E' : '#7B8B9B' },
          { label: 'Your Voice', value: `${voiceRate}%`, color: '#5BA4E6' },
          { label: 'Original', value: originalWords, color: '#E8EDF2' },
          { label: 'Current', value: currentWords, color: '#E8EDF2' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#1E2B3D', border: '1px solid #344556', borderRadius: 10,
            padding: '10px 16px', minWidth: 100, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: '#7B8B9B', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Split panes */}
      <div style={{
        flex: 1, display: 'flex', gap: 16, padding: '0 24px 24px',
        minHeight: 0,
      }}>
        {/* Original */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            background: '#243044', padding: '8px 14px', borderRadius: '10px 10px 0 0',
            fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#7B8B9B', display: 'flex', alignItems: 'center', gap: 6,
          }}>🔒 Original</div>
          <div style={{
            flex: 1, background: '#1E2B3D', borderRadius: '0 0 10px 10px',
            padding: 16, overflowY: 'auto', fontSize: 15, lineHeight: 1.8,
            fontFamily: "'Source Serif 4', serif", color: '#E8EDF2', opacity: 0.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{draft.text}</div>
        </div>

        {/* Editable */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            background: '#243044', padding: '8px 14px', borderRadius: '10px 10px 0 0',
            fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#5BA4E6', display: 'flex', alignItems: 'center', gap: 6,
          }}>✏️ Your Edit</div>
          <textarea
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            style={{
              flex: 1, background: '#1E2B3D', borderRadius: '0 0 10px 10px',
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
          background: '#5BA4E6', color: '#FFF', border: 'none',
          borderRadius: 8, cursor: 'pointer', minWidth: 160,
        }}>{copied ? 'Copied!' : 'Copy to Clipboard'}</button>
        <button onClick={handleSave} style={{
          padding: '10px 24px', fontSize: 13, fontWeight: 600,
          background: 'transparent', color: '#5BA4E6',
          border: '1px solid #5BA4E6', borderRadius: 8, cursor: 'pointer',
        }}>↓ Save to Computer</button>
      </div>
    </div>
  );
}
