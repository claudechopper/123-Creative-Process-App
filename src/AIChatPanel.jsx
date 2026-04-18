import { useState, useRef, useEffect } from 'react';
import { api } from './api';
import { addDraft } from './storage';

const MODEL_OPTIONS = [
  { key: 'haiku', label: 'Haiku 4.5', desc: 'Fast & cheap', avgTokens: 1 },
  { key: 'sonnet', label: 'Sonnet 4.6', desc: 'Balanced', avgTokens: 2 },
  { key: 'opus', label: 'Opus 4.6', desc: 'Most capable', avgTokens: 10 },
];

// 1000 tokens = $2.50 free allowance (1 token = 0.25 cents)
const ANON_TOKEN_CAP = 1000;
const CENTS_PER_TOKEN = 0.25;
const ANON_CAP_CENTS = 250; // kept for backend/localStorage compatibility
const ANON_SPEND_KEY = 'twomodes_ai_spend_cents';

const centsToTokens = (cents) => Math.round(cents / CENTS_PER_TOKEN);

function getAnonSpent() {
  return parseInt(localStorage.getItem(ANON_SPEND_KEY) || '0', 10);
}
function addAnonSpent(cents) {
  localStorage.setItem(ANON_SPEND_KEY, String(getAnonSpent() + cents));
}

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
  const [model, setModel] = useState('haiku');
  const [contextEnabled, setContextEnabled] = useState(false);
  const [spent, setSpent] = useState(isAnon ? getAnonSpent() : 0);
  const [cap, setCap] = useState(isAnon ? ANON_CAP_CENTS : 0);
  const [tier, setTier] = useState(isAnon ? 'anon' : 'free');
  const [modelHint, setModelHint] = useState(null);
  const [panelSize, setPanelSize] = useState('normal'); // 'minimized' | 'normal' | 'expanded'
  const [cardFlash, setCardFlash] = useState(null); // flash message for card creation
  const scrollRef = useRef(null);

  // Load chat info on mount
  useEffect(() => {
    if (isAnon) {
      setSpent(getAnonSpent());
      setCap(ANON_CAP_CENTS);
      return;
    }
    api.getChatInfo().then(info => {
      if (info) {
        setSpent(info.spent || 0);
        setCap(info.cap || 0);
        setTier(info.tier || 'free');
      }
    });
  }, [isAnon]);

  // Load history if projectId
  useEffect(() => {
    if (projectId) {
      api.getChatHistory(projectId).then(data => {
        if (data?.messages) {
          setMessages(data.messages.map(m => ({
            role: m.role,
            content: m.content,
            costCents: m.costCents || 0,
          })));
        }
      });
    }
  }, [projectId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const contextText = contextEnabled && projectDrafts?.length
    ? projectDrafts.map(d => d.text).join('\n\n---\n\n')
    : null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Enforce anon cap client-side
    if (isAnon && centsToTokens(getAnonSpent()) >= ANON_TOKEN_CAP) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "You've used your 1000 free tokens. Sign in and upgrade to keep going!",
        costCents: 0,
        error: true,
      }]);
      return;
    }

    const userMsg = { role: 'user', content: text, costCents: 0 };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendChat({
        message: text,
        projectId,
        context: contextText,
        model,
        history: messages.slice(-10), // send last 10 for context window
      });

      if (res) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.text,
          costCents: res.costCents || 0,
          modelUsed: res.model,
        }]);
        if (isAnon) {
          addAnonSpent(res.costCents || 0);
          setSpent(getAnonSpent());
        } else {
          setSpent(res.spent || 0);
          setCap(res.cap || 0);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        costCents: 0,
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const makeCardFromText = (text, label) => {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    addDraft({ text, wordCount, projectId: projectId || null });
    setCardFlash(label);
    setTimeout(() => setCardFlash(null), 2000);
    if (onDraftCreated) onDraftCreated();
  };

  const makeMessageCard = (content) => {
    makeCardFromText(content, 'Message saved as draft!');
  };

  const makeConversationCard = () => {
    const fullText = messages
      .map(m => `${m.role === 'user' ? 'Me' : 'Writing Coach'}:\n${m.content}`)
      .join('\n\n---\n\n');
    makeCardFromText(fullText, 'Conversation saved as draft!');
  };

  const spentTokens = isAnon ? centsToTokens(spent) : centsToTokens(spent);
  const capTokens = isAnon ? ANON_TOKEN_CAP : centsToTokens(cap);
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

  return (
    <div style={{
      background: t.panel,
      border: `1px solid ${t.panelBorder}`,
      borderRadius: 10,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      marginBottom: 8,
      ...(isExpanded ? { height: '50vh', minHeight: 400 } : {}),
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: isMinimized ? 'none' : `1px solid ${t.panelBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
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
              {/* Model selector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <select
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    const opt = MODEL_OPTIONS.find(m => m.key === e.target.value);
                    setModelHint(`~${opt.avgTokens} token${opt.avgTokens !== 1 ? 's' : ''}/msg avg`);
                    setTimeout(() => setModelHint(null), 3000);
                  }}
                  style={{
                    fontSize: 10, padding: '2px 4px', borderRadius: 4,
                    background: t.statBg, color: t.text, border: `1px solid ${t.statBorder}`,
                    cursor: 'pointer',
                  }}
                >
                  {MODEL_OPTIONS.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                {modelHint && (
                  <span style={{ fontSize: 9, color: '#D4943A', fontStyle: 'italic' }}>{modelHint}</span>
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
          {/* Usage bar */}
          {(cap > 0 || isAnon) && (
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

          {/* Card creation flash */}
          {cardFlash && (
            <div style={{ padding: '4px 12px', background: 'rgba(90,143,106,0.15)', fontSize: 11, color: '#5A8F6A', fontWeight: 600, textAlign: 'center' }}>
              {cardFlash}
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1,
            overflowY: 'auto',
            padding: 8,
            maxHeight: messagesMaxHeight,
            minHeight: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
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
                  fontSize: 12,
                  lineHeight: 1.5,
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
                {/* Action buttons under each message */}
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

          {/* Conversation card button */}
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
            display: 'flex',
            gap: 6,
            alignItems: 'flex-end',
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
  );
}
