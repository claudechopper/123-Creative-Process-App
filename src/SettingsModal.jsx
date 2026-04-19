import { useState } from 'react';
import * as settings from './settings';
import { testOllama } from './llm';

// Tabbed settings modal for the AI Coach.
// Tabs: Free | Your key (Anthropic / OpenAI / Gemini) | Local model (Ollama)
// All data persists to localStorage via ./settings. Keys never hit our server.

export default function SettingsModal({ theme: t, initialTab = 'free', onClose, onSaved }) {
  const [tab, setTab] = useState(initialTab);
  const [anthropicKey, setAnthropicKey] = useState(settings.getApiKey('anthropic'));
  const [openaiKey, setOpenaiKey] = useState(settings.getApiKey('openai'));
  const [geminiKey, setGeminiKey] = useState(settings.getApiKey('gemini'));

  const initialOllama = settings.getOllamaConfig();
  const [ollamaUrl, setOllamaUrl] = useState(initialOllama.url);
  const [ollamaModel, setOllamaModel] = useState(initialOllama.model);
  const [ollamaTestStatus, setOllamaTestStatus] = useState(null); // { ok, message, models? }
  const [testing, setTesting] = useState(false);

  const save = () => {
    settings.setApiKey('anthropic', anthropicKey);
    settings.setApiKey('openai', openaiKey);
    settings.setApiKey('gemini', geminiKey);
    settings.setOllamaConfig({ url: ollamaUrl, model: ollamaModel });
    onSaved?.();
    onClose?.();
  };

  const handleClearKeys = () => {
    if (!window.confirm('Delete ALL saved API keys and Ollama config from this browser? You can always paste them back in.')) return;
    settings.clearAllKeys();
    setAnthropicKey('');
    setOpenaiKey('');
    setGeminiKey('');
    setOllamaUrl('http://localhost:11434');
    setOllamaModel('llama3.2');
    setOllamaTestStatus(null);
    onSaved?.();
  };

  const runOllamaTest = async () => {
    setTesting(true);
    setOllamaTestStatus(null);
    const result = await testOllama(ollamaUrl);
    setOllamaTestStatus(result);
    setTesting(false);
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        flex: 1, padding: '10px 8px', border: 'none',
        background: tab === key ? t.statBg : 'transparent',
        color: tab === key ? '#D4943A' : t.text,
        fontSize: 12, fontWeight: tab === key ? 700 : 500, cursor: 'pointer',
        borderBottom: tab === key ? '2px solid #D4943A' : '2px solid transparent',
        transition: 'all 0.15s',
      }}
    >{label}</button>
  );

  const keyInputStyle = {
    width: '100%', padding: '8px 10px',
    borderRadius: 6, border: `1px solid ${t.statBorder}`,
    background: t.statBg, color: t.text,
    fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
  };

  const KeyField = ({ label, value, onChange, placeholder, href, hrefLabel, modelNote }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontWeight: 600, fontSize: 11, display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type="password"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={keyInputStyle}
      />
      <div style={{ fontSize: 10, color: t.mutedText, marginTop: 4 }}>
        Get a key at{' '}
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#D4943A' }}>{hrefLabel}</a>
        {modelNote && <> — uses <b>{modelNote}</b></>}
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.panel || '#1a2a22',
        border: `1px solid ${t.panelBorder || '#2a3a32'}`, borderRadius: 10,
        maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto',
        color: t.text, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${t.panelBorder}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#D4943A' }}>✨ AI Coach Settings</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: t.mutedText,
            cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0,
          }}>×</button>
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
              <p style={{ marginTop: 0 }}>The free tier uses <b>Claude Haiku 4.5</b> via our server.</p>
              <ul style={{ paddingLeft: 18, marginBottom: 14 }}>
                <li>No account, no signup</li>
                <li>~40 messages/day per IP</li>
                <li>Free forever</li>
              </ul>
              <div style={{
                padding: 12, background: t.statBg, border: `1px solid ${t.statBorder}`,
                borderRadius: 6, color: t.mutedText, fontSize: 11,
              }}>
                <b style={{ color: '#D4943A' }}>Want more?</b> The free tier is locked to
                Haiku. For <b>Sonnet 4.5</b>, <b>GPT-4o</b>, <b>Gemini 2.0</b>, or a
                fully-offline <b>local model</b>, use the next tabs — unlimited messages,
                your costs (or zero for local), keys never leave your browser.
              </div>
            </>
          )}

          {tab === 'byok' && (
            <>
              <p style={{ marginTop: 0, marginBottom: 14 }}>
                Bring your own API key. Stored <b>only in this browser</b>. Messages go
                directly from your browser to the AI provider — our server never sees
                them.
              </p>

              <KeyField
                label="Anthropic API key (Claude Sonnet 4.5)"
                value={anthropicKey}
                onChange={setAnthropicKey}
                placeholder="sk-ant-api03-..."
                href="https://console.anthropic.com/settings/keys"
                hrefLabel="console.anthropic.com"
                modelNote="Claude Sonnet 4.5"
              />
              <KeyField
                label="OpenAI API key (GPT-4o)"
                value={openaiKey}
                onChange={setOpenaiKey}
                placeholder="sk-proj-..."
                href="https://platform.openai.com/api-keys"
                hrefLabel="platform.openai.com"
                modelNote="GPT-4o"
              />
              <KeyField
                label="Google Gemini API key (Gemini 2.0 Flash)"
                value={geminiKey}
                onChange={setGeminiKey}
                placeholder="AIza..."
                href="https://aistudio.google.com/apikey"
                hrefLabel="aistudio.google.com"
                modelNote="Gemini 2.0 Flash"
              />

              <div style={{
                marginTop: 4, padding: 10,
                background: 'rgba(192,57,43,0.08)',
                border: '1px solid rgba(192,57,43,0.2)',
                borderRadius: 6, fontSize: 10, color: t.mutedText, lineHeight: 1.5,
              }}>
                <b style={{ color: '#C0392B' }}>⚠ Shared computer?</b> Anyone with
                access to this browser can read saved keys. Use "Clear all saved keys"
                when you're done, or don't save keys on shared machines.
              </div>

              <button onClick={handleClearKeys} style={{
                marginTop: 12, padding: '6px 10px', fontSize: 10, background: 'none',
                border: `1px solid ${t.statBorder}`, color: t.mutedText,
                borderRadius: 4, cursor: 'pointer',
              }}>Clear all saved keys</button>
            </>
          )}

          {tab === 'local' && (
            <>
              <p style={{ marginTop: 0 }}>
                Run an LLM fully offline with <b>Ollama</b>. Zero cost, zero data leaves
                your machine.
              </p>

              <ol style={{ paddingLeft: 18, fontSize: 11, color: t.mutedText, lineHeight: 1.6, marginBottom: 14 }}>
                <li>
                  Install <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: '#D4943A' }}>Ollama</a>.
                </li>
                <li>
                  Pull a model: <code style={{ background: t.statBg, padding: '1px 5px', borderRadius: 3 }}>ollama pull llama3.2</code>
                </li>
                <li>
                  Start Ollama with browser CORS enabled:<br />
                  <code style={{ background: t.statBg, padding: '2px 6px', borderRadius: 3, display: 'inline-block', marginTop: 3 }}>
                    OLLAMA_ORIGINS='*' ollama serve
                  </code>
                </li>
              </ol>

              <label style={{ fontWeight: 600, fontSize: 11, display: 'block', marginBottom: 4 }}>
                Ollama server URL
              </label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                spellCheck={false}
                style={keyInputStyle}
              />
              <div style={{ fontSize: 10, color: t.mutedText, marginTop: 4, marginBottom: 12 }}>
                Default works for most. Change only if you moved Ollama.
              </div>

              <label style={{ fontWeight: 600, fontSize: 11, display: 'block', marginBottom: 4 }}>
                Model name
              </label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="llama3.2"
                spellCheck={false}
                style={keyInputStyle}
              />
              <div style={{ fontSize: 10, color: t.mutedText, marginTop: 4, marginBottom: 12 }}>
                Whatever you pulled — e.g. <code>llama3.2</code>, <code>mistral</code>,
                <code>qwen2.5</code>.
              </div>

              <button
                onClick={runOllamaTest}
                disabled={testing}
                style={{
                  padding: '6px 12px', fontSize: 11, background: t.statBg,
                  border: `1px solid ${t.statBorder}`, color: t.text,
                  borderRadius: 4, cursor: testing ? 'wait' : 'pointer',
                  opacity: testing ? 0.6 : 1,
                }}
              >{testing ? 'Testing…' : 'Test connection'}</button>

              {ollamaTestStatus && (
                <div style={{
                  marginTop: 10, padding: 10, borderRadius: 6, fontSize: 11, lineHeight: 1.5,
                  background: ollamaTestStatus.ok ? 'rgba(90,143,106,0.1)' : 'rgba(192,57,43,0.08)',
                  border: `1px solid ${ollamaTestStatus.ok ? 'rgba(90,143,106,0.3)' : 'rgba(192,57,43,0.3)'}`,
                  color: ollamaTestStatus.ok ? '#5A8F6A' : '#C0392B',
                }}>
                  {ollamaTestStatus.ok ? (
                    <>
                      <b>Connected ✓</b>
                      {ollamaTestStatus.models?.length > 0 && (
                        <div style={{ color: t.mutedText, marginTop: 4 }}>
                          Models available: {ollamaTestStatus.models.join(', ')}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{ollamaTestStatus.error}</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', borderTop: `1px solid ${t.panelBorder}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onClose} style={{
            padding: '7px 14px', fontSize: 12, background: 'none',
            border: `1px solid ${t.statBorder}`, color: t.text,
            borderRadius: 6, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={save} style={{
            padding: '7px 14px', fontSize: 12, background: '#D4943A',
            border: 'none', color: '#FFF', borderRadius: 6, cursor: 'pointer',
            fontWeight: 600,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}
