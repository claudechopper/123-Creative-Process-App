// AI Coach backend + key storage. Lives entirely in localStorage — keys never
// hit our server. Same-origin policy protects these from other sites.
//
// Security notes:
//   - Any XSS on our origin could read these. We harden via CSP (server-side)
//     and by never using dangerouslySetInnerHTML.
//   - Use type="password" for input fields and never log these values.
//   - User can purge via clearAllKeys() (hooked to a button in SettingsModal).

const K = {
  BACKEND: 'dss_ai_backend',
  ANTHROPIC_KEY: 'dss_ai_key_anthropic',
  OPENAI_KEY: 'dss_ai_key_openai',
  GEMINI_KEY: 'dss_ai_key_gemini',
  OLLAMA_URL: 'dss_ai_ollama_url',
  OLLAMA_MODEL: 'dss_ai_ollama_model',
};

export const BACKENDS = ['free', 'anthropic', 'openai', 'gemini', 'ollama'];

export function getBackend() {
  const v = localStorage.getItem(K.BACKEND);
  return BACKENDS.includes(v) ? v : 'free';
}

export function setBackend(b) {
  if (BACKENDS.includes(b)) localStorage.setItem(K.BACKEND, b);
}

const KEY_STORE = {
  anthropic: K.ANTHROPIC_KEY,
  openai: K.OPENAI_KEY,
  gemini: K.GEMINI_KEY,
};

export function getApiKey(provider) {
  const k = KEY_STORE[provider];
  return k ? (localStorage.getItem(k) || '') : '';
}

export function setApiKey(provider, key) {
  const k = KEY_STORE[provider];
  if (!k) return;
  if (key && key.trim()) localStorage.setItem(k, key.trim());
  else localStorage.removeItem(k);
}

export function getOllamaConfig() {
  return {
    url: localStorage.getItem(K.OLLAMA_URL) || 'http://localhost:11434',
    model: localStorage.getItem(K.OLLAMA_MODEL) || 'llama3.2',
  };
}

export function setOllamaConfig({ url, model }) {
  if (url !== undefined) localStorage.setItem(K.OLLAMA_URL, url || 'http://localhost:11434');
  if (model !== undefined) localStorage.setItem(K.OLLAMA_MODEL, model || 'llama3.2');
}

export function clearAllKeys() {
  Object.values(K).forEach(k => localStorage.removeItem(k));
}

// Friendly label for a backend
export function backendLabel(backend) {
  switch (backend) {
    case 'free': return 'Free (Haiku)';
    case 'anthropic': return 'Your Claude';
    case 'openai': return 'Your GPT';
    case 'gemini': return 'Your Gemini';
    case 'ollama': return 'Local model';
    default: return 'Free';
  }
}

// Is this backend actually ready to send a request?
export function isBackendConfigured(backend) {
  if (backend === 'free') return true;
  if (backend === 'ollama') {
    const { url, model } = getOllamaConfig();
    return !!(url && model);
  }
  return !!getApiKey(backend);
}
