import { useState, useRef, useEffect, useCallback } from 'react';
import { addDraft, downloadTextFile, formatDate } from './storage';

const TIMER_OPTIONS = [5, 10, 15, 20, 30];
const FAUCET_TARGET = 500; // words for full meter

export default function FlowMode({ onNavigate }) {
  const [text, setText] = useState('');
  const [strictMode, setStrictMode] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [streak, setStreak] = useState(0);
  const lastLengthRef = useRef(0);
  const textareaRef = useRef(null);
  const timerRef = useRef(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const faucetFill = Math.min(1, wordCount / FAUCET_TARGET);

  const endSession = useCallback(() => {
    clearInterval(timerRef.current);
    if (text.trim()) {
      addDraft({ text: text.trim(), wordCount });
    }
    setSessionActive(false);
    setSecondsLeft(null);
    onNavigate('gap');
  }, [text, wordCount, onNavigate]);

  const startSession = () => {
    setText('');
    setSecondsLeft(timerMinutes * 60);
    setSessionActive(true);
    setStreak(0);
    lastLengthRef.current = 0;
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const startNewSession = () => {
    if (text.trim() && !confirm('You have unsaved text. Start a new session?')) return;
    startSession();
  };

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) { endSession(); return; }
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [secondsLeft === null, endSession]);

  const handleKeyDown = (e) => {
    if (strictMode && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
    }
    // Also prevent Ctrl+A then type-over by blocking select-all in strict
    if (strictMode && (e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
    }
  };

  const handleInput = (e) => {
    const newVal = e.target.value;
    if (strictMode && newVal.length < lastLengthRef.current) {
      // Revert — catches mobile backspace, cut, etc.
      e.target.value = text;
      return;
    }
    lastLengthRef.current = newVal.length;
    setText(newVal);
    if (newVal.length > text.length) {
      setStreak(s => s + 1);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSaveToComputer = () => {
    if (!text.trim()) return;
    downloadTextFile(text.trim(), `flow-session-${formatDate()}.txt`);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#FDF6EC', color: '#5C4A32',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      transition: 'background-color 0.6s ease, color 0.6s ease',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '0 20px 60px',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 0',
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
          two<span style={{ color: '#D4943A' }}>modes</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Strict/Gentle toggle */}
          <div style={{
            display: 'flex', background: '#EDE5D4', borderRadius: 20, padding: 3,
          }}>
            <button onClick={() => setStrictMode(true)} style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none',
              borderRadius: 17, cursor: 'pointer',
              background: strictMode ? '#D4943A' : 'transparent',
              color: strictMode ? '#FFF' : '#8B7B6B',
            }}>Strict</button>
            <button onClick={() => setStrictMode(false)} style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none',
              borderRadius: 17, cursor: 'pointer',
              background: !strictMode ? '#D4943A' : 'transparent',
              color: !strictMode ? '#FFF' : '#8B7B6B',
            }}>Gentle</button>
          </div>

          {/* Timer selector */}
          {!sessionActive && (
            <select value={timerMinutes} onChange={e => setTimerMinutes(Number(e.target.value))} style={{
              padding: '6px 10px', fontSize: 12, border: '1px solid #D4C4A8',
              borderRadius: 8, background: '#FDF6EC', color: '#5C4A32', cursor: 'pointer',
            }}>
              {TIMER_OPTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
            </select>
          )}

          {/* Streak */}
          {sessionActive && streak > 5 && (
            <span style={{ fontSize: 14 }}>🔥 {Math.floor(streak / 10)}</span>
          )}

          {/* Save to computer */}
          {text.trim() && (
            <button onClick={handleSaveToComputer} style={{
              padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
              borderRadius: 8, background: 'transparent', color: '#8B7B6B',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>↓ Save to Computer</button>
          )}

          {/* Nav to Gap */}
          <button onClick={() => onNavigate('gap')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
            borderRadius: 8, background: 'transparent', color: '#8B7B6B', cursor: 'pointer',
          }}>My Drafts</button>
        </div>
      </div>

      {/* Timer */}
      {sessionActive && secondsLeft !== null && (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 56, fontWeight: 200,
          color: '#D4943A', opacity: 0.6, marginTop: 20, letterSpacing: '2px',
          userSelect: 'none',
        }}>{formatTime(secondsLeft)}</div>
      )}

      {/* Main area */}
      <div style={{
        flex: 1, width: '100%', maxWidth: 800, display: 'flex',
        position: 'relative', marginTop: sessionActive ? 20 : 80,
      }}>
        {/* Textarea */}
        <div style={{ flex: 1 }}>
          {!sessionActive ? (
            <div style={{ textAlign: 'center', marginTop: 60 }}>
              <h1 style={{
                fontFamily: "'Source Serif 4', serif", fontSize: 36, fontWeight: 400,
                color: '#5C4A32', marginBottom: 12, letterSpacing: '-0.5px',
              }}>Write forward.</h1>
              <p style={{ color: '#8B7B6B', fontSize: 16, marginBottom: 40 }}>
                No backspace. No delete. Just momentum.
              </p>
              <button onClick={startSession} style={{
                padding: '14px 36px', fontSize: 16, fontWeight: 600,
                background: '#D4943A', color: '#FFF', border: 'none',
                borderRadius: 12, cursor: 'pointer',
              }}>Start {timerMinutes}-Minute Session</button>
              {text.trim() && (
                <button onClick={startNewSession} style={{
                  display: 'block', margin: '16px auto 0', padding: '10px 24px',
                  fontSize: 13, background: 'transparent', border: '1px solid #D4C4A8',
                  borderRadius: 8, color: '#8B7B6B', cursor: 'pointer',
                }}>Start New Session</button>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onKeyDown={handleKeyDown}
              onChange={handleInput}
              placeholder="Start writing... everything moves forward."
              style={{
                width: '100%', minHeight: 400, height: '60vh', padding: 20,
                border: 'none', borderBottom: '1px solid #EDE5D4',
                background: 'transparent', color: '#5C4A32', fontSize: 18,
                fontFamily: "'Source Serif 4', serif", lineHeight: 1.8,
                resize: 'none',
              }}
            />
          )}
        </div>

        {/* Faucet meter */}
        {sessionActive && (
          <div style={{
            width: 8, height: 300, background: '#EDE5D4', borderRadius: 4,
            marginLeft: 24, marginTop: 10, position: 'relative', overflow: 'hidden',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', bottom: 0, width: '100%',
              height: `${faucetFill * 100}%`,
              background: `linear-gradient(to top, #8B6914, #5BA4E6)`,
              borderRadius: 4, transition: 'height 0.3s ease',
            }} />
          </div>
        )}
      </div>

      {/* Bottom controls during session */}
      {sessionActive && (
        <div style={{
          display: 'flex', gap: 12, marginTop: 20, alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#8B7B6B' }}>{wordCount} words</span>
          <button onClick={endSession} style={{
            padding: '10px 24px', fontSize: 13, fontWeight: 600,
            background: '#D4943A', color: '#FFF', border: 'none',
            borderRadius: 8, cursor: 'pointer',
          }}>End Session & Save</button>
          <button onClick={startNewSession} style={{
            padding: '10px 24px', fontSize: 13, border: '1px solid #D4C4A8',
            borderRadius: 8, background: 'transparent', color: '#8B7B6B', cursor: 'pointer',
          }}>Start New</button>
        </div>
      )}
    </div>
  );
}
