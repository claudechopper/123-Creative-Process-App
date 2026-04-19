import { useState } from 'react';
import * as settings from './settings';

// Tabbed settings modal for the AI Coach.
// Tabs: Free | Your key | Local model
// All data persists to localStorage via ./settings.

export default function SettingsModal({ theme: t, initialTab = 'free', onClose, onSaved }) {
  const [tab, setTab] = useState(initialTab);
  const [anthropicKey, setAnthropicKey] = useState(settings.getApiKey('anthropic'));

  const save = () => {
    settings.setApiKey('anthropic', anthropicKey);
    onSaved?.();
    onClose?.();
  };

  const handleClearKeys = () => {
    if (!window.confirm('Delete all saved API keys from this browser? You can always paste them back in.')) return;
    settings.clearAllKeys();
    setAnthropicKey('');
    onSaved?.();
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        flex: 1,
        padding: '10px 8px',
        border: 'none',
        background: tab === key ? t.statBg : 'transparent',
        color: tab === key ? '#D4943A' : t.text,
        fontSize: 12,
        fontWeight: tab === key ? 700 : 500,
        cursor: 'pointer',
        borderBottom: tab === key ? '2px solid #D4943A' : '2px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.panel || '#1a2a22',
          border: `1px solid ${t.panelBorder || '#2a3a32'}`,
          borderRadius: 10,
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          color: t.text,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${t.panelBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#D4943A' }}>
            ✨ AI Coach Settings
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: t.mutedText,
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${t.panelBorder}` }}>
          {tabBtn('free', 'Free tier')}
          {tabBtn('byok', 'Your key')}
          {tabBtn('local', 'Local model')}
        </div>

        {/* Body */}
        <div style={{ padding: 18, fontSize: 12, lineHeight: 1.6 }}>
          {tab === 'free' && (
            <>
              <p style={{ marginTop: 0 }}>
                The free tier uses <b>Claude Haiku 4.5</b> via our server.
              </p>
              <ul style={{ paddingLeft: 18, marginBottom: 14 }}>
                <li>No account, no signup</li>
                <li>~40 messages/day per IP</li>
                <li>Free forever</li>
              </ul>
              <div
                style={{
                  padding: 12,
                  background: t.statBg,
                  border: `1px solid ${t.statBorder}`,
                  borderRadius: 6,
                  color: t.mutedText,
                  fontSize: 11,
                }}
              >
                <b style={{ color: '#D4943A' }}>Want more?</b> The free tier is locked
                to Haiku (the fastest, cheapest Claude model). For <b>Sonnet</b>,{' '}
                <b>Opus</b>, <b>GPT-4</b>, or <b>Gemini</b>, add your own API key in
                the next tab — unlimited messages, your costs, keys never leave your
                browser.
              </div>
            </>
          )}

          {tab === 'byok' && (
            <>
              <p style={{ marginTop: 0, marginBottom: 14 }}>
                Bring your own API key. Stored <b>only in this browser's
                localStorage</b>. Never sent to our server — your messages go directly
                from your browser to the AI provider.
              </p>

              <label
                style={{
                  fontWeight: 600,
                  fontSize: 11,
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Anthropic API key
              </label>
              <input
                type="password"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: `1px solid ${t.statBorder}`,
                  background: t.statBg,
                  color: t.text,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 10, color: t.mutedText, marginTop: 6 }}>
                Don't have one? Get it at{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#D4943A' }}
                >
                  console.anthropic.com
                </a>
                . Uses <b>Claude Sonnet 4.5</b> (more capable than the free Haiku).
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: 10,
                  background: 'rgba(192,57,43,0.08)',
                  border: '1px solid rgba(192,57,43,0.2)',
                  borderRadius: 6,
                  fontSize: 10,
                  color: t.mutedText,
                  lineHeight: 1.5,
                }}
              >
                <b style={{ color: '#C0392B' }}>⚠ Shared computer?</b> Anyone with
                access to this browser can read the saved key. Use the "Clear all
                saved keys" button when you're done, or don't save keys on shared
                machines.
              </div>

              <p
                style={{
                  marginTop: 16,
                  fontSize: 11,
                  color: t.mutedText,
                  fontStyle: 'italic',
                }}
              >
                OpenAI and Google Gemini support coming soon.
              </p>

              <button
                onClick={handleClearKeys}
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  fontSize: 10,
                  background: 'none',
                  border: `1px solid ${t.statBorder}`,
                  color: t.mutedText,
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Clear all saved keys
              </button>
            </>
          )}

          {tab === 'local' && (
            <>
              <p style={{ marginTop: 0 }}>
                Run an LLM locally with <b>Ollama</b>. Zero cost, zero data leaves
                your machine.
              </p>
              <div
                style={{
                  padding: 12,
                  background: t.statBg,
                  border: `1px solid ${t.statBorder}`,
                  borderRadius: 6,
                  color: t.mutedText,
                  fontSize: 11,
                }}
              >
                Coming in the next update. In the meantime you can{' '}
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#D4943A' }}
                >
                  install Ollama
                </a>{' '}
                and pull a model like <code>llama3.2</code> — we'll wire up the UI
                soon.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: `1px solid ${t.panelBorder}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              background: 'none',
              border: `1px solid ${t.statBorder}`,
              color: t.text,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              background: '#D4943A',
              border: 'none',
              color: '#FFF',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
