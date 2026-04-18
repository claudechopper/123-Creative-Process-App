import { useState, useRef, useEffect, useCallback } from 'react';
// useAuth removed — app is local-only, no accounts
import { addDraft, addProject, loadProjects, loadActiveDrafts, downloadTextFile, formatDate } from './storage';
import { resetOnboarding } from './OnboardingPopup';
import TipsPanel from './TipsPanel';
import AIChatPanel from './AIChatPanel';
import NavBar from './NavBar';
import useIsMobile from './useIsMobile';
const TIMER_OPTIONS = [5, 10, 15, 20, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300];

const DRAFT_QUOTES = [
  { text: "The first draft of anything is shit.", author: "Ernest Hemingway" },
  { text: "Almost all good writing begins with terrible first efforts.", author: "Anne Lamott" },
  { text: "You can't think yourself out of a writing block; you have to write yourself out of a thinking block.", author: "John Rogers" },
  { text: "Start writing, no matter what. The water does not flow until the faucet is turned on.", author: "Louis L'Amour" },
  { text: "Write drunk, edit sober.", author: "Peter De Vries" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
];
const FAUCET_TARGET = 500;

const silverShimmer = {
  color: '#A8B4C4',
  textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
};

export default function FlowMode({ onNavigate, onRefine, tourActive, onStartTour, onTourEnd, onTourState }) {
  // no auth — all users anonymous, drafts stored in localStorage
  const isMobile = useIsMobile();
  const [text, setText] = useState('');
  const [strictMode, setStrictMode] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const lastLengthRef = useRef(0);
  const textareaRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [showAIChat, setShowAIChat] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setQuoteIndex(i => (i + 1) % DRAFT_QUOTES.length), 24000);
    return () => clearInterval(id);
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const faucetFill = Math.min(1, wordCount / FAUCET_TARGET);

  // Report state to tour
  useEffect(() => {
    if (onTourState) {
      onTourState({ sessionActive, hasText: text.length > 10, showTimePicker, showSaveModal });
    }
  }, [sessionActive, text.length > 10, showTimePicker, showSaveModal, onTourState]);

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

  const handleTimerEnd = useCallback(() => {
    clearInterval(timerRef.current);
    setShowTimeUp(true);
  }, []);

  const addMoreTime = (minutes) => {
    setShowTimeUp(false);
    setSecondsLeft(minutes * 60);
  };

  const finishSession = () => {
    setShowTimeUp(false);
    showSave();
  };

  const saveAndClose = (projectId) => {
    addDraft({ text: text.trim(), wordCount, projectId });
    setShowSaveModal(false);
    onNavigate('gap');
  };

  const startSessionWithTime = (minutes) => {
    setTimerMinutes(minutes);
    setShowTimePicker(false);
    setText('');
    setSecondsLeft(minutes * 60);
    setSessionActive(true);
    lastLengthRef.current = 0;
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const startNewSession = () => {
    if (text.trim()) {
      addDraft({ text: text.trim(), wordCount, projectId: null });
    }
    setShowTimePicker(true);
  };

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) { handleTimerEnd(); return; }
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [secondsLeft === null, handleTimerEnd]);

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

  const handleInsertTip = (prompt) => {
    const newText = text ? text + '\n\n' + prompt : prompt;
    setText(newText);
    lastLengthRef.current = newText.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newText.length;
        textareaRef.current.selectionEnd = newText.length;
      }
    }, 50);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      if (content) {
        const newText = text ? text + '\n\n' + content : content;
        setText(newText);
        lastLengthRef.current = newText.length;
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.html,.xml,.rtf,.log,.tex,.yml,.yaml"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', padding: isMobile ? '12px 0' : '20px 0',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div onClick={() => onNavigate('flow')} style={{ fontSize: isMobile ? 15 : 18, fontWeight: 600, letterSpacing: '-0.5px', cursor: 'pointer' }}>
          <span style={silverShimmer}>Draft</span>, <span style={{ color: '#C0392B' }}>Stop</span><span style={{ color: '#D4943A', textShadow: '0 0 14px rgba(212,148,58,0.7), 0 0 28px rgba(212,148,58,0.4), 0 0 50px rgba(212,148,58,0.2)' }}>&nbsp;& Sharpen</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 6 : 16, flexWrap: 'wrap' }}>
          {sessionActive && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: '#EDE5D4', borderRadius: 20, padding: 3 }}>
                <button onClick={() => { setStrictMode(true); setTimeout(() => { const ta = textareaRef.current; if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; } }, 50); }} style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none',
                  borderRadius: 17, cursor: 'pointer',
                  background: strictMode ? '#A8B4C4' : 'transparent',
                  color: strictMode ? '#FFF' : '#8B7B6B',
                }}>Strict</button>
                <button onClick={() => { setStrictMode(false); setTimeout(() => { const ta = textareaRef.current; if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; } }, 50); }} style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none',
                  borderRadius: 17, cursor: 'pointer',
                  background: !strictMode ? '#A8B4C4' : 'transparent',
                  color: !strictMode ? '#FFF' : '#8B7B6B',
                }}>Gentle</button>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <div style={{ textAlign: 'center', width: 70 }}>
                  <div style={{ fontSize: 10, color: '#8B7B6B', lineHeight: 1 }}>↑</div>
                  <div style={{ fontSize: 10, color: '#8B7B6B' }}>(no backspace)</div>
                </div>
                <div style={{ textAlign: 'center', width: 70 }}>
                  <div style={{ fontSize: 10, color: '#8B7B6B', lineHeight: 1 }}>↑</div>
                  <div style={{ fontSize: 10, color: '#8B7B6B' }}>(backspace ok)</div>
                </div>
              </div>
              {secondsLeft !== null && (
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 14,
                  color: '#A8B4C4', opacity: 0.7, marginTop: 6, letterSpacing: '1px',
                  textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
                }}>{formatTime(secondsLeft)}</div>
              )}
            </div>
          )}

          {sessionActive && (
            <button onClick={() => setShowTips(true)} style={{
              padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
              borderRadius: 8, background: 'transparent', color: '#8B7B6B', cursor: 'pointer',
            }}>💡 Draft Tips</button>
          )}

          {sessionActive && (
            <button onClick={() => fileInputRef.current?.click()} style={{
              padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
              borderRadius: 8, background: 'transparent', color: '#8B7B6B', cursor: 'pointer',
            }}>📄 Upload File</button>
          )}

          {text.trim() && (
            <button onClick={handleSaveToComputer} style={{
              padding: '6px 12px', fontSize: 11, border: '1px solid #D4C4A8',
              borderRadius: 8, background: 'transparent', color: '#8B7B6B',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>↓ Save to Computer</button>
          )}

          <NavBar currentPage="flow" onNavigate={onNavigate} onSharpen={() => {
            const ready = loadActiveDrafts().find(d => d.unlocksAt <= Date.now());
            if (ready && onRefine) onRefine(ready);
            else onNavigate('gap');
          }} />

          {/* Auth removed — no avatar/sign-in button */}
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
                fontFamily: "'Source Serif 4', serif", fontSize: isMobile ? 26 : 36, fontWeight: 400,
                color: '#5C4A32', marginBottom: 12, letterSpacing: '-0.5px',
              }}>Just Get it all out.</h1>
              <p style={{ color: '#8B7B6B', fontSize: 16, marginBottom: 20 }}>
                Write forward — momentum first, sharpen later.
              </p>

              <div style={{ maxWidth: 420, margin: '0 auto 28px', minHeight: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontFamily: "'Source Serif 4', serif", fontStyle: 'italic', fontSize: 15, color: '#8B7B6B', opacity: 0.7, margin: 0, lineHeight: 1.6, textAlign: 'center' }}>
                  "{DRAFT_QUOTES[quoteIndex].text}"
                </p>
                <span style={{ fontSize: 11, color: '#B8A898', letterSpacing: '0.5px', marginTop: 6, textTransform: 'uppercase' }}>
                  — {DRAFT_QUOTES[quoteIndex].author}
                </span>
              </div>

              <button onClick={() => setShowTimePicker(true)} style={{
                padding: '14px 36px', fontSize: 16, fontWeight: 600,
                background: '#A8B4C4', color: '#FFF', border: 'none',
                borderRadius: 12, cursor: 'pointer',
                textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
              }}>Start Session</button>

              <div style={{ marginTop: 20, display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button onClick={() => { resetOnboarding(); window.location.reload(); }} style={{
                  background: 'none', border: 'none', color: '#B8A898',
                  fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
                }}>Show intro again</button>
                {onStartTour && (
                  <button onClick={onStartTour} style={{
                    padding: '6px 16px', fontSize: 11, fontWeight: 600,
                    background: '#D4943A', color: '#FFF', border: 'none',
                    borderRadius: 8, cursor: 'pointer',
                    textShadow: '0 0 8px rgba(212,148,58,0.5)',
                  }}>🗺️ Take the Tour</button>
                )}
              </div>
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

        {sessionActive && (
          <div style={{
            width: 8, height: 250, background: '#EDE5D4', borderRadius: 4,
            marginLeft: 24, marginTop: 10, position: 'relative', overflow: 'hidden',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', bottom: 0, width: '100%',
              height: `${faucetFill * 100}%`,
              background: 'linear-gradient(to top, #A8B4C4, #5BA4E6)',
              borderRadius: 4, transition: 'height 0.3s ease',
            }} />
          </div>
        )}
      </div>

      {sessionActive && (
        <div style={{
          display: 'flex', gap: isMobile ? 6 : 12, marginTop: 16, alignItems: 'center',
          paddingBottom: 10, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <span style={{ fontSize: isMobile ? 11 : 13, color: '#8B7B6B' }}>{wordCount} words</span>
          <button onClick={() => setShowAIChat(s => !s)} style={{
            padding: isMobile ? '8px 10px' : '10px 16px', fontSize: isMobile ? 11 : 13, fontWeight: 600,
            background: showAIChat ? '#D4943A' : 'transparent',
            color: showAIChat ? '#FFF' : '#D4943A',
            border: '1px solid #D4943A', borderRadius: 8, cursor: 'pointer',
          }}>✨ Coach</button>
          <button onClick={showSave} style={{
            padding: isMobile ? '8px 12px' : '10px 24px', fontSize: isMobile ? 11 : 13, fontWeight: 600,
            background: '#A8B4C4', color: '#FFF', border: 'none',
            borderRadius: 8, cursor: 'pointer',
            textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
          }}>{isMobile ? 'Finish & Save' : 'Finish Session & Save to Browser'}</button>
          <button onClick={() => {
            if (confirm('Delete this draft? The text will be lost.')) {
              clearInterval(timerRef.current);
              setText('');
              setSessionActive(false);
              setSecondsLeft(null);
              lastLengthRef.current = 0;
            }
          }} style={{
            padding: isMobile ? '8px 10px' : '10px 24px', fontSize: isMobile ? 11 : 13, fontWeight: 600,
            background: 'transparent', color: '#1A1A1A', border: '1px solid #1A1A1A',
            borderRadius: 8, cursor: 'pointer',
          }}>{isMobile ? 'Delete' : 'Delete Draft'}</button>
          <button onClick={startNewSession} style={{
            padding: isMobile ? '8px 10px' : '10px 24px', fontSize: isMobile ? 11 : 13, border: '1px solid #D4C4A8',
            borderRadius: 8, background: 'transparent', color: '#8B7B6B', cursor: 'pointer',
          }}>Start New</button>
        </div>
      )}

      {showTimePicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowTimePicker(false); }}>
          <div style={{
            background: '#FDF6EC', borderRadius: 16, padding: 28, maxWidth: 400, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#5C4A32', marginBottom: 6 }}>
              How long do you want your session to be?
            </h3>
            <p style={{ fontSize: 12, color: '#8B7B6B', marginBottom: 20 }}>
              Pick a duration and start writing.
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: 8,
            }}>
              {TIMER_OPTIONS.map(m => (
                <button key={m} onClick={() => startSessionWithTime(m)} style={{
                  padding: '12px 8px', fontSize: 13, fontWeight: 600,
                  background: '#F5EDD8', border: '2px solid transparent',
                  borderRadius: 10, cursor: 'pointer', color: '#5C4A32',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={e => e.target.style.borderColor = '#A8B4C4'}
                onMouseLeave={e => e.target.style.borderColor = 'transparent'}
                >{formatTimerLabel(m)}</button>
              ))}
            </div>
          </div>
        </div>
      )}

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
            <p style={{ fontSize: 12, color: '#8B7B6B', marginBottom: 6 }}>{wordCount} words</p>
            <p style={{ fontSize: 12, color: '#A8B4C4', marginBottom: 16, fontStyle: 'italic', lineHeight: 1.5 }}>
              ✨ Don't worry about perfection — you can always add more and sharpen it later.
            </p>

            <button onClick={() => saveAndClose(null)} style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
              background: '#A8B4C4', color: '#FFF', border: 'none',
              borderRadius: 10, cursor: 'pointer', marginBottom: 12,
              textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
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

      {/* Time's up modal */}
      {showTimeUp && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div style={{
            background: '#FDF6EC', borderRadius: 16, padding: 28, maxWidth: 400, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#5C4A32', marginBottom: 8, textAlign: 'center' }}>
              ⏰ Time's Up!
            </h3>
            <p style={{ fontSize: 13, color: '#8B7B6B', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
              Need more time to keep drafting, or are you done?
            </p>
            <button onClick={finishSession} style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
              background: '#D4943A', color: '#FFF', border: 'none',
              borderRadius: 10, cursor: 'pointer', marginBottom: 12,
              textShadow: '0 0 10px rgba(212,148,58,0.5)',
            }}>Draft Done — Finish Session</button>
            <div style={{ fontSize: 12, color: '#8B7B6B', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>
              Or add more time:
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: 8,
            }}>
              {TIMER_OPTIONS.map(m => (
                <button key={m} onClick={() => addMoreTime(m)} style={{
                  padding: '10px 6px', fontSize: 12, fontWeight: 600,
                  background: '#F5EDD8', border: '2px solid transparent',
                  borderRadius: 8, cursor: 'pointer', color: '#5C4A32',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={e => e.target.style.borderColor = '#A8B4C4'}
                onMouseLeave={e => e.target.style.borderColor = 'transparent'}
                >{formatTimerLabel(m)}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTips && <TipsPanel mode="flow" onClose={() => setShowTips(false)} onInsertTip={handleInsertTip} />}

      {/* Writing Coach — floating panel bottom-right during session */}
      {showAIChat && sessionActive && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 60 : 80,
          right: isMobile ? 8 : 24,
          left: isMobile ? 8 : 'auto',
          width: isMobile ? 'auto' : 360, zIndex: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <AIChatPanel
            theme={{
              panel: '#FDF6EC', panelBorder: '#EDE5D4', text: '#5C4A32',
              mutedText: '#B8A898', statBg: '#F5EDD8', statBorder: '#EDE5D4',
            }}
            projectDrafts={[]}
            projectId={null}
            onClose={() => setShowAIChat(false)}
            isAnon={true}
          />
        </div>
      )}
    </div>
  );
}
