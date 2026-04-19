import { useState, useRef, useEffect } from 'react';
import { api } from './api';
import { addDraft } from './storage';
import * as settings from './settings';
import { sendMessage } from './llm';
import SettingsModal from './SettingsModal';

// Display-only token conversion for the usage bar on the free tier.
const CENTS_PER_TOKEN = 0.25;
const centsToTokens = (cents) => Math.max(0, Math.round(cents / CENTS_PER_TOKEN));

// The quick-switcher items. Selecting an unconfigured entry opens the
// settings modal at the relevant tab.
const BACKEND_MENU = [
  { key: 'free',      label: 'Free (Haiku)',         model: 'Claude Haiku 4.5' },
  { key: 'anthropic', label: 'Your Claude',          model: 'Claude Sonnet 4.5' },
  { key: 'openai',    label: 'Your GPT',             model: 'GPT-4o' },
  { key: 'gemini',    label: 'Your Gemini',          model: 'Gemini 2.0 Flash' },
  { key: 'ollama',    label: 'Local (offline)',      model: 'Your local model' },
];

function CopyBtn({ text, theme: t }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      title="Copy to clipboard"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
        fontSize: 10, color: copied ? '#5A8F6A' : (t.mutedText || '#888'), lineHeight: 1,
      }}
    >{copied ? 'Copied!' : 'Copy'}</button>
  );
}

function CardBtn({ onClick, label, theme: t }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
        fontSize: 10, color: t.mutedText || '#888', lineHeight: 1,
      }}
    >{label}</button>
  );
}

export default function AIChatPanel({ theme: t, projectDrafts, projectId, onClose, isAnon = false, onDraftCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backend, setBackendState] = useState(settings.getBackend());
  const [contextEnabled, setContextEnabled] = useState(false);
  const [spent, setSpent] = useState(0);
  const [cap, setCap] = useState(0);
  const [panelSize, setPanelSize] = useState('normal'); // 'minimized' | 'normal' | 'expanded'
  const [cardFlash, setCardFlash] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('free');
  const scrollRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  // Load free-tier usage info (only relevant when backend === 'free')
  useEffect(() => {
    if (backend !== 'free') { setSpent(0); setCap(0); return; }
    api.getChatInfo().then(info => {
      if (info) { setSpent(info.spent || 0); setCap(info.cap || 0); }
    }).catch(() => { setSpent(0); setCap(isAnon ? 25 : 50); });
  }, [isAnon, backend]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const contextText = contextEnabled && projectDrafts?.length
    ? projectDrafts.map(d => d.text).join('\n\n---\n\n')
    : null;

  const pickBackend = (key) => {
    setDropdownOpen(false);

    // Not configured yet → bounce to the right settings tab
    if (!settings.isBackendConfigured(key)) {
      setSettingsInitialTab(key === 'ollama' ? 'local' : 'byok');
      setShowSettings(true);
      return;
    }

    settings.setBackend(key);
    setBackendState(key);
    setLimitReached(false);
  };

  const onSettingsSaved = () => {
    // Re-read backend in case anything changed
    setBackendState(settings.getBackend());
    // Intentionally do NOT auto-switch — the user might have saved a key
    // without wanting to flip away from their current backend. They can pick
    // from the dropdown when ready.
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Soft client-side check for free tier (server is authoritative)
    if (backend === 'free' && cap > 0 && spent >= cap) {
      setLimitReached(true);
      setMessages(prev => [...prev, {
        role: 'assistant', costCents: 0, error: true,
        content: "Daily free limit reached. Add your own key in Settings to keep going, or come back tomorrow!",
      }]);
      return;
    }

    const userMsg = { role: 'user', content: text, costCents: 0 };
    const historySnapshot = messages;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage({
        backend,
        message: text,
        context: contextText,
        history: historySnapshot.slice(-10),
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text,
        costCents: data.costCents || 0,
        modelUsed: data.model,
      }]);
      if (typeof data.spent === 'number') setSpent(data.spent);
      if (typeof data.cap === 'number') setCap(data.cap);
    } catch (err) {
      if (err?.limitReached) setLimitReached(true);
      if (typeof err?.spent === 'number') setSpent(err.spent);
      if (typeof err?.cap === 'number') setCap(err.cap);

      const content = err?.limitReached
        ? (backend === 'free'
            ? "Daily free limit reached. Add your own key in Settings → Your key for unlimited chats!"
            : (err.message || "Limit reached."))
        : (err?.message || 'Something went wrong. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content, costCents: 0, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const makeCardFromText = (text, label) => {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    addDraft({ text, wordCount, projectId: projectId || null });
    setCardFlash(label);
    setTimeout(() => setCardFlash(null), 2000);
    if (onDraftCreated) onDraftCreated();
  };
  const makeMessageCard = (content) => makeCardFromText(content, 'Message saved as draft!');
  const makeConversationCard = () => {
    const fullText = messages
      .map(m => `${m.role === 'user' ? 'Me' : 'Writing Coach'}:\n${m.content}`)
      .join('\n\n---\n\n');
    makeCardFromText(fullText, 'Conversation saved as draft!');
  };

  const spentTokens = centsToTokens(spent);
  const capTokens = centsToTokens(cap);
  const usagePercent = capTokens > 0 ? Math.min(100, (spentTokens / capTokens) * 100) : 0;

  const isMinimized = panelSize === 'minimized';
  const isExpanded = panelSize === 'expanded';
  const messagesMaxHeight = isExpanded ? 'calc(50vh - 120px)' : 200;

  const sizeBtn = (label, size, title) => (
    <button
      onClick={() => setPanelSize(size)}
      title={title}
      style={{
        background: panelSize === size ? 'rgba(212,148,58,0.2)' : 'none',
        border: 'none', color: t.mutedText, cursor: 'pointer',
        fontSize: 12, padding: '2px 5px', lineHeight: 1, borderRadius: 3,
      }}
    >{label}</button>
  );

  const currentBackendLabel = settings.backendLabel(backend);

  return (
    <>
      <div style={{
        background: t.panel,
        border: `1px solid ${t.panelBorder}`,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible', // allow dropdown to escape
        marginBottom: 8,
        ...(isExpanded ? { height: '50vh', minHeight: 400 } : {}),
      }}>
        {/* Header */}
        <div style={{
          padding: '8px 12px',
          borderBottom: isMinimized ? 'none' : `1px solid ${t.panelBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>&#10024;</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#D4943A', letterSpacing: '0.5px' }}>
              Writing Coach
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isMinimized && (
              <>
                {/* Context toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 10, color: t.mutedText }}>
                  <input
                    type="checkbox"
                    checked={contextEnabled}
                    onChange={() => setContextEnabled(!contextEnabled)}
                    style={{ width: 12, height: 12 }}
                  />
                  Share my drafts
                </label>

                {/* Backend quick-switcher */}
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setDropdownOpen(v => !v)}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 4,
                      background: t.statBg, color: t.text,
                      border: `1px solid ${t.statBorder}`, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {currentBackendLabel} <span style={{ fontSize: 8 }}>▼</span>
                  </button>
                  {dropdownOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4,
                      background: t.panel, border: `1px solid ${t.panelBorder}`,
                      borderRadius: 6, minWidth: 180, zIndex: 100,
                      boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                      overflow: 'hidden',
                    }}>
                      {BACKEND_MENU.map(item => {
                        const isCurrent = item.key === backend;
                        const isConfigured = settings.isBackendConfigured(item.key);
                        const needsSetup = !isConfigured;
                        return (
                          <button
                            key={item.key}
                            onClick={() => pickBackend(item.key)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              width: '100%', padding: '8px 10px', border: 'none', cursor: 'pointer',
                              background: isCurrent ? 'rgba(212,148,58,0.15)' : 'transparent',
                              color: t.text, fontSize: 11, textAlign: 'left',
                            }}
                          >
                            <span>
                              {isCurrent ? '● ' : '○ '}
                              {item.label}
                            </span>
                            <span style={{ fontSize: 9, color: t.mutedText }}>
                              {needsSetup ? (item.key === 'ollama' ? 'configure' : 'add key') : ''}
                            </span>
                          </button>
                        );
                      })}
                      <div style={{ borderTop: `1px solid ${t.panelBorder}` }}>
                        <button
                          onClick={() => { setDropdownOpen(false); setSettingsInitialTab('free'); setShowSettings(true); }}
                          style={{
                            width: '100%', padding: '8px 10px', border: 'none', cursor: 'pointer',
                            background: 'transparent', color: t.mutedText, fontSize: 10, textAlign: 'left',
                          }}
                        >
                          ⋯ Settings…
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Size toggles */}
            <div style={{ display: 'flex', gap: 2 }}>
              {sizeBtn('_', 'minimized', 'Minimize')}
              {sizeBtn('□', 'normal', 'Normal size')}
              {sizeBtn('▣', 'expanded', 'Expand (half page)')}
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: t.mutedText, cursor: 'pointer',
              fontSize: 14, padding: 0, lineHeight: 1,
            }}>&times;</button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Usage bar (free tier only) */}
            {backend === 'free' && (cap > 0 || isAnon) && (
              <div style={{ padding: '4px 12px', borderBottom: `1px solid ${t.panelBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: t.mutedText, marginBottom: 2 }}>
                  <span>{spentTokens} tokens used</span>
                  <span>{capTokens} token limit</span>
                </div>
                <div style={{ height: 3, background: t.statBorder, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${usagePercent}%`, height: '100%', borderRadius: 2,
                    background: usagePercent > 80 ? '#C0392B' : '#D4943A',
                  }} />
                </div>
              </div>
            )}

            {/* Upgrade hint (shown on free tier, persistent but tiny) */}
            {backend === 'free' && messages.length === 0 && (
              <div style={{
                padding: '6px 12px',
                fontSize: 10,
                color: t.mutedText,
                background: 'rgba(212,148,58,0.05)',
                borderBottom: `1px solid ${t.panelBorder}`,
                lineHeight: 1.4,
              }}>
                Using <b>Haiku</b> (free). Want Sonnet/Opus/GPT-4?{' '}
                <button
                  onClick={() => { setSettingsInitialTab('byok'); setShowSettings(true); }}
                  style={{
                    background: 'none', border: 'none', color: '#D4943A',
                    padding: 0, cursor: 'pointer', textDecoration: 'underline',
                    fontSize: 10, fontWeight: 600,
                  }}
                >
                  Add your own key
                </button>
              </div>
            )}

            {/* BYO / Local mode indicator */}
            {backend !== 'free' && (() => {
              const item = BACKEND_MENU.find(b => b.key === backend);
              if (!item) return null;
              const isLocal = backend === 'ollama';
              return (
                <div style={{
                  padding: '6px 12px', fontSize: 10,
                  color: isLocal ? '#A8B4C4' : '#5A8F6A',
                  background: isLocal ? 'rgba(168,180,196,0.08)' : 'rgba(90,143,106,0.08)',
                  borderBottom: `1px solid ${t.panelBorder}`,
                }}>
                  {isLocal ? (
                    <>Running <b>{item.model}</b> locally on your machine. No cost, no network.</>
                  ) : (
                    <>Using <b>your</b> key → {item.model}. Costs billed to your provider account.</>
                  )}
                </div>
              );
            })()}

            {/* Card creation flash */}
            {cardFlash && (
              <div style={{ padding: '4px 12px', background: 'rgba(90,143,106,0.15)', fontSize: 11, color: '#5A8F6A', fontWeight: 600, textAlign: 'center' }}>
                {cardFlash}
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1, overflowY: 'auto', padding: 8,
              maxHeight: messagesMaxHeight, minHeight: 100,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {messages.length === 0 && !loading && (
                <div style={{ textAlign: 'center', color: t.mutedText, fontSize: 11, padding: 16, lineHeight: 1.6 }}>
                  Ask me anything about your writing.<br />
                  I can help you tighten, restructure, or find your voice.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}>
                  <div style={{
                    padding: '6px 10px',
                    borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                    background: m.role === 'user' ? 'rgba(168,180,196,0.15)' : 'rgba(212,148,58,0.1)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(168,180,196,0.2)' : 'rgba(212,148,58,0.2)'}`,
                    fontSize: 12, lineHeight: 1.5,
                    color: m.error ? '#C0392B' : t.text,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                    {m.costCents > 0 && (
                      <div style={{ fontSize: 9, color: t.mutedText, marginTop: 2, textAlign: 'right' }}>
                        {centsToTokens(m.costCents)} token{centsToTokens(m.costCents) !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <CopyBtn text={m.content} theme={t} />
                    <CardBtn onClick={() => makeMessageCard(m.content)} label="Save as draft" theme={t} />
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{
                  alignSelf: 'flex-start', padding: '6px 10px', borderRadius: '10px 10px 10px 2px',
                  background: 'rgba(212,148,58,0.1)', border: '1px solid rgba(212,148,58,0.2)',
                  fontSize: 12, color: '#D4943A', fontStyle: 'italic',
                }}>
                  Thinking...
                </div>
              )}
            </div>

            {messages.length > 1 && (
              <div style={{ padding: '4px 8px', borderTop: `1px solid ${t.panelBorder}`, textAlign: 'center' }}>
                <button
                  onClick={makeConversationCard}
                  style={{
                    background: 'none', border: `1px solid ${t.statBorder}`, borderRadius: 6,
                    padding: '4px 10px', fontSize: 10, color: t.mutedText, cursor: 'pointer',
                  }}
                >Save whole conversation as draft</button>
              </div>
            )}

            {/* Input */}
            <div style={{
              padding: '6px 8px',
              borderTop: `1px solid ${t.panelBorder}`,
              display: 'flex', gap: 6, alignItems: 'flex-end',
            }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your writing coach..."
                rows={isExpanded ? 2 : 1}
                style={{
                  flex: 1, resize: 'none', border: `1px solid ${t.statBorder}`,
                  borderRadius: 6, padding: '6px 8px', fontSize: 12, lineHeight: 1.4,
                  background: t.statBg, color: t.text, outline: 'none',
                  fontFamily: 'inherit', maxHeight: isExpanded ? 100 : 60,
                }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                style={{
                  background: '#D4943A', color: '#FFF', border: 'none', borderRadius: 6,
                  padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  opacity: (loading || !input.trim()) ? 0.5 : 1,
                }}
              >Send</button>
            </div>
          </>
        )}
      </div>

      {showSettings && (
        <SettingsModal
          theme={t}
          initialTab={settingsInitialTab}
          onClose={() => setShowSettings(false)}
          onSaved={onSettingsSaved}
        />
      )}
    </>
  );
}
