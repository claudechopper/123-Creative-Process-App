import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { addDraft, addProject, loadProjects, downloadTextFile, formatDate } from './storage';

const TIMER_OPTIONS = [5, 10, 15, 20, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300];
const FAUCET_TARGET = 500;

export default function FlowMode({ onNavigate }) {
  const { user, login } = useAuth();
  const [text, setText] = useState('');
  const [strictMode, setStrictMode] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const lastLengthRef = useRef(0);
  const textareaRef = useRef(null);
  const timerRef = useRef(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const faucetFill = Math.min(1, wordCount / FAUCET_TARGET);

  const showSave = useCallback(() => {
    clearInterval(timerRef.current);
    setSessionActive(false);
    setSecondsLeft(null);
    if (text.trim()) {
      setShowSaveModal(true);
    } else {
      onNavigate('gap');
    }
  }, [text, onNavigate]);

  const saveAndClose = (projectId) => {
    addDraft({ text: text.trim(), wordCount, projectId });
    setShowSaveModal(false);
    onNavigate('gap');
  };

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
    if (secondsLeft <= 0) { showSave(); return; }
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [secondsLeft === null, showSave]);

  const handleKeyDown = (e) => {
    if (strictMode && (e.key === 'Backspace' || e.key === 'Delete')) e.preventDefault();
    if (strictMode && (e.ctrlKey || e.metaKey) && e.key === 'a') e.preventDefault();
  };

  const handleInput = (e) => {
    const newVal = e.target.value;
    if (strictMode && newVal.length < lastLengthRef.current) {
      e.target.value = text;
      return;
    }
    lastLengthRef.current = newVal.length;
    setText(newVal);
    if (newVal.length > text.length) setStreak(s => s + 1);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatTimerLabel = (m) => {
    if (m < 60) return `${m} min`;
    if (m % 60 === 0) return `${m / 60} hr`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const handleSaveToComputer = () => {
    if (!text.trim()) return;
    downloadTextFile(text.trim(), `flow-session-${formatDate()}.txt`);
  };

  const projects = loadProjects();

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
        alignItems: 'flex-start', padding: '20px 0',
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
          two<span style={{ color: '#D4943A' }}>modes</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Strict/Gentle toggle with labels + timer underneath */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#EDE5D4', borderRadius: 20, padding: 3 }}>
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
            <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
              <span style={{ fontSize: 9, color: '#8B7B6B', width: 65, textAlign: 'center' }}>no backspace</span>
              <span style={{ fontSize: 9, color: '#8B7B6B', width: 65, textAlign: 'center' }}>backspace ok</span>
            </div>
            {/* Small timer display underneath */}
            {sessionActive && secondsLeft !== null && (
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 14,
                color: '#D4943A', opacity: 0.7, marginTop: 6, letterSpacing: '1px',
              }}>{formatTime(secondsLeft)}</div>
            )}
          </div>

          {/* Timer selector */}
          {!sessionActive && (
            <select value={timerMinutes} onChange={e => setTimerMinutes(Number(e.target.value))} style={{
              padding: '6px 10px', fontSize: 12, border: '1px solid #D4C4A8',
              borderRadius: 8, background: '#FDF6EC', color: '#5C4A32', cursor: 'pointer',
            }}>
              {TIMER_OPTIONS.map(m => <option key={m} value={m}>{formatTimerLabel(m)}</option>)}
            </select>
          )}

          {sessionActive && streak > 5 && (
            <span style={{ fontSize: 14 }}>🔥 {Math.floor(streak / 10)}</span>
          )}

          {text.trim() && (
            <button onClick={handleSaveToComputer} style={{
              padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
              borderRadius: 8, background: 'transparent', color: '#8B7B6B',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>↓ Save</button>
          )}

          <button onClick={() => onNavigate('gap')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
            borderRadius: 8, background: 'transparent', color: '#8B7B6B', cursor: 'pointer',
          }}>My Drafts</button>

          {/* Auth indicator */}
          {user ? (
            <div style={{
              width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid #D4943A',
            }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', background: '#D4943A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFF', fontSize: 12, fontWeight: 700,
                }}>{user.name?.[0] || '?'}</div>
              )}
            </div>
          ) : (
            <button onClick={login} style={{
              padding: '6px 12px', fontSize: 11, border: 'none',
              borderRadius: 8, background: '#D4943A', color: '#FFF',
              cursor: 'pointer', fontWeight: 600,
            }}>Sign in</button>
          )}
        </div>
      </div>

      {/* Main area */}
      <div style={{
        flex: 1, width: '100%', maxWidth: 800, display: 'flex',
        position: 'relative', marginTop: sessionActive ? 10 : 40,
      }}>
        <div style={{ flex: 1 }}>
          {!sessionActive ? (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <h1 style={{
                fontFamily: "'Source Serif 4', serif", fontSize: 36, fontWeight: 400,
                color: '#5C4A32', marginBottom: 12, letterSpacing: '-0.5px',
              }}>Write forward.</h1>
              <p style={{ color: '#8B7B6B', fontSize: 16, marginBottom: 30 }}>
                No backspace. No delete. Just momentum.
              </p>

              {/* Sign-up encouragement card */}
              {!user && (
                <div style={{
                  background: '#F5EDD8', border: '2px solid #D4943A', borderRadius: 16,
                  padding: '20px 28px', maxWidth: 480, margin: '0 auto 30px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#5C4A32', marginBottom: 8 }}>
                    Your writing is precious.
                  </div>
                  <p style={{ fontSize: 13, color: '#8B7B6B', lineHeight: 1.6, marginBottom: 14 }}>
                    Sign in to save your drafts to the cloud and access them anywhere.
                    Without an account, drafts exist only in this browser.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={login} style={{
                      padding: '10px 20px', fontSize: 13, fontWeight: 600,
                      background: '#D4943A', color: '#FFF', border: 'none',
                      borderRadius: 8, cursor: 'pointer',
                    }}>Sign in with Google</button>
                    <button onClick={startSession} style={{
                      padding: '10px 20px', fontSize: 13,
                      background: 'transparent', border: '1px solid #D4C4A8',
                      borderRadius: 8, color: '#8B7B6B', cursor: 'pointer',
                    }}>Continue without signing in</button>
                  </div>
                </div>
              )}

              <button onClick={startSession} style={{
                padding: '14px 36px', fontSize: 16, fontWeight: 600,
                background: '#D4943A', color: '#FFF', border: 'none',
                borderRadius: 12, cursor: 'pointer',
              }}>Start {formatTimerLabel(timerMinutes)} Session</button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onKeyDown={handleKeyDown}
              onChange={handleInput}
              placeholder="Start writing... everything moves forward."
              style={{
                width: '100%', minHeight: 250, height: '45vh', padding: 20,
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
            width: 8, height: 250, background: '#EDE5D4', borderRadius: 4,
            marginLeft: 24, marginTop: 10, position: 'relative', overflow: 'hidden',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', bottom: 0, width: '100%',
              height: `${faucetFill * 100}%`,
              background: 'linear-gradient(to top, #8B6914, #5BA4E6)',
              borderRadius: 4, transition: 'height 0.3s ease',
            }} />
          </div>
        )}
      </div>

      {/* Bottom controls during session */}
      {sessionActive && (
        <div style={{
          display: 'flex', gap: 12, marginTop: 16, alignItems: 'center',
          paddingBottom: 10,
        }}>
          <span style={{ fontSize: 13, color: '#8B7B6B' }}>{wordCount} words</span>
          <button onClick={showSave} style={{
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

      {/* Save-to-project modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={(e) => { if (e.target === e.currentTarget) { saveAndClose(null); } }}>
          <div style={{
            background: '#FDF6EC', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#5C4A32', marginBottom: 6 }}>Save Draft</h3>
            <p style={{ fontSize: 12, color: '#8B7B6B', marginBottom: 20 }}>{wordCount} words</p>

            <button onClick={() => saveAndClose(null)} style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
              background: '#D4943A', color: '#FFF', border: 'none',
              borderRadius: 10, cursor: 'pointer', marginBottom: 12,
            }}>Save as New Draft</button>

            {projects.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#8B7B6B', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Save to project</div>
                {projects.map(p => (
                  <button key={p.id} onClick={() => saveAndClose(p.id)} style={{
                    width: '100%', padding: '10px 12px', fontSize: 13,
                    background: '#F5EDD8', border: '1px solid #EDE5D4',
                    borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                    color: '#5C4A32', textAlign: 'left',
                  }}>{p.name}</button>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid #EDE5D4', paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: '#8B7B6B', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Create new project</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: 13,
                    border: '1px solid #D4C4A8', borderRadius: 8,
                    background: '#FDF6EC', color: '#5C4A32',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      const p = addProject(newProjectName.trim());
                      saveAndClose(p.id);
                    }
                  }}
                />
                <button onClick={() => {
                  if (!newProjectName.trim()) return;
                  const p = addProject(newProjectName.trim());
                  saveAndClose(p.id);
                }} style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: 600,
                  background: '#5C4A32', color: '#FFF', border: 'none',
                  borderRadius: 8, cursor: 'pointer',
                }}>Create & Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
