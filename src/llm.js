// Unified message sender. The chat UI never touches fetch() directly — it
// calls sendMessage() and we route to the right backend (our server for the
// free tier, direct browser → provider for BYO keys).
//
// Security:
//   - `referrerPolicy: 'no-referrer'` on every call so the user's key can
//     never leak via Referer header.
//   - Errors are scrubbed of the raw key before being thrown to the UI.
//   - We never log request/response bodies.

import * as settings from './settings';

const SYSTEM_PROMPT = `You are a thoughtful writing coach helping a user refine creative drafts. Give concise, practical feedback. Ask clarifying questions when useful. When suggesting changes, briefly explain the why.`;

function buildSystem(context) {
  if (!context) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\nThe user's draft(s) for context:\n---\n${context}\n---`;
}

function scrubError(err, ...secrets) {
  let msg = String(err?.message || err || 'Request failed');
  for (const s of secrets) {
    if (s) msg = msg.split(s).join('***');
  }
  const out = new Error(msg);
  out.cause = err;
  return out;
}

/**
 * Send a chat message.
 *   backend: 'free' | 'anthropic' | 'openai' | 'gemini' | 'ollama'
 *   message: current user message (string)
 *   context: optional draft text to pin in system prompt
 *   history: prior [{role, content}] messages (NOT including the new one)
 * Returns: { text, costCents, model, inputTokens?, outputTokens?, spent?, cap? }
 */
export async function sendMessage({ backend, message, context, history = [] }) {
  const allHistory = [
    ...history.map(m => ({ role: m.role, content: String(m.content || '') })),
    { role: 'user', content: message },
  ];
  switch (backend) {
    case 'free':      return sendFreeTier({ message, context, history });
    case 'anthropic': return sendAnthropic({ context, history: allHistory });
    case 'openai':    return sendOpenAI({ context, history: allHistory });
    case 'gemini':    return sendGemini({ context, history: allHistory });
    case 'ollama':    return sendOllama({ context, history: allHistory });
    default:          throw new Error('Unknown backend. Check settings.');
  }
}

// Quick connectivity check for Ollama (used by the "Test" button in settings).
// Returns { ok: true, models: [...] } or { ok: false, error: 'msg' }.
export async function testOllama(url) {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/tags`, {
      method: 'GET',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) return { ok: false, error: `Ollama returned ${res.status}. Is it running?` };
    const data = await res.json();
    return { ok: true, models: (data.models || []).map(m => m.name) };
  } catch (e) {
    return {
      ok: false,
      error:
        `Couldn't reach Ollama at ${url}. Make sure Ollama is running, and that you started it with OLLAMA_ORIGINS=* ` +
        `(open a terminal, quit Ollama, then run: OLLAMA_ORIGINS='*' ollama serve). ` +
        `Browser error: ${String(e?.message || e)}`,
    };
  }
}

// -----------------------------------------------------------------------------
// Free tier — through our server
// -----------------------------------------------------------------------------

async function sendFreeTier({ message, context, history }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    referrerPolicy: 'no-referrer',
    body: JSON.stringify({
      message,
      context,
      history: history.slice(-10),
      model: 'haiku',
    }),
  });
  if (res.status === 429 || res.status === 503) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || 'Daily free limit reached.');
    err.limitReached = true;
    err.spent = body.spent;
    err.cap = body.cap;
    throw err;
  }
  if (!res.ok) throw new Error('AI request failed. Please try again.');
  return res.json();
}

// -----------------------------------------------------------------------------
// BYO Anthropic — direct browser → Anthropic
// -----------------------------------------------------------------------------

// Sonnet 4.5 pricing (USD per million): $3 input / $15 output.
// Converted to "cents per token" for our UI's token display (rough estimate).
const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';
const ANTHROPIC_INPUT_PER_M = 3;    // USD per 1M input tokens
const ANTHROPIC_OUTPUT_PER_M = 15;  // USD per 1M output tokens

async function sendAnthropic({ context, history }) {
  const key = settings.getApiKey('anthropic');
  if (!key) throw new Error('No Anthropic key set. Open Settings → Your key to add one.');

  const messages = history
    .filter(m => m.content.trim())
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: buildSystem(context),
        messages,
      }),
    });
  } catch (e) {
    throw scrubError(e, key);
  }

  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch { /* ignore */ }
    const msg = body?.error?.message || `Anthropic error ${res.status}`;
    if (res.status === 401) throw scrubError(new Error('Your Anthropic key was rejected. Check it in Settings → Your key.'), key);
    if (res.status === 429) throw scrubError(new Error('Anthropic rate-limited your key. Wait a moment and try again.'), key);
    throw scrubError(new Error(msg), key);
  }

  let data;
  try { data = await res.json(); } catch (e) { throw scrubError(e, key); }

  const text = data.content?.[0]?.text || '';
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  const costCents = Math.round(
    (inputTokens * ANTHROPIC_INPUT_PER_M + outputTokens * ANTHROPIC_OUTPUT_PER_M) / 10000
  );

  return { text, model: data.model || ANTHROPIC_MODEL, costCents, inputTokens, outputTokens };
}

// -----------------------------------------------------------------------------
// BYO OpenAI — direct browser → OpenAI
// -----------------------------------------------------------------------------

// gpt-4o pricing (USD per 1M): $2.50 input / $10 output.
const OPENAI_MODEL = 'gpt-4o';
const OPENAI_INPUT_PER_M = 2.5;
const OPENAI_OUTPUT_PER_M = 10;

async function sendOpenAI({ context, history }) {
  const key = settings.getApiKey('openai');
  if (!key) throw new Error('No OpenAI key set. Open Settings → Your key to add one.');

  const messages = [
    { role: 'system', content: buildSystem(context) },
    ...history
      .filter(m => m.content.trim())
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 1024,
        messages,
      }),
    });
  } catch (e) {
    throw scrubError(e, key);
  }

  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch {}
    const msg = body?.error?.message || `OpenAI error ${res.status}`;
    if (res.status === 401) throw scrubError(new Error('Your OpenAI key was rejected. Check it in Settings → Your key.'), key);
    if (res.status === 429) throw scrubError(new Error('OpenAI rate-limited your key. Wait a moment and try again.'), key);
    throw scrubError(new Error(msg), key);
  }

  let data;
  try { data = await res.json(); } catch (e) { throw scrubError(e, key); }

  const text = data.choices?.[0]?.message?.content || '';
  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;
  const costCents = Math.round(
    (inputTokens * OPENAI_INPUT_PER_M + outputTokens * OPENAI_OUTPUT_PER_M) / 10000
  );

  return { text, model: data.model || OPENAI_MODEL, costCents, inputTokens, outputTokens };
}

// -----------------------------------------------------------------------------
// BYO Gemini — direct browser → Google Generative Language API
// -----------------------------------------------------------------------------

// gemini-2.0-flash pricing (USD per 1M): $0.10 input / $0.40 output (very cheap).
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_INPUT_PER_M = 0.10;
const GEMINI_OUTPUT_PER_M = 0.40;

async function sendGemini({ context, history }) {
  const key = settings.getApiKey('gemini');
  if (!key) throw new Error('No Google Gemini key set. Open Settings → Your key to add one.');

  // Gemini wants role = 'user' | 'model' (not 'assistant'), and uses "parts".
  const contents = history
    .filter(m => m.content.trim())
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = { parts: [{ text: buildSystem(context) }] };

  let res;
  try {
    // NOTE: Gemini auth is a query param. We pass via x-goog-api-key header
    // (also supported) so the key never appears in URLs, logs, or Referer.
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );
  } catch (e) {
    throw scrubError(e, key);
  }

  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch {}
    const msg = body?.error?.message || `Gemini error ${res.status}`;
    if (res.status === 401 || res.status === 403) throw scrubError(new Error('Your Gemini key was rejected. Check it in Settings → Your key.'), key);
    if (res.status === 429) throw scrubError(new Error('Gemini rate-limited your key. Wait a moment and try again.'), key);
    throw scrubError(new Error(msg), key);
  }

  let data;
  try { data = await res.json(); } catch (e) { throw scrubError(e, key); }

  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
  const costCents = Math.round(
    (inputTokens * GEMINI_INPUT_PER_M + outputTokens * GEMINI_OUTPUT_PER_M) / 10000
  );

  return { text, model: GEMINI_MODEL, costCents, inputTokens, outputTokens };
}

// -----------------------------------------------------------------------------
// Local Ollama — direct browser → localhost:11434
// -----------------------------------------------------------------------------
// Uses Ollama's OpenAI-compatible endpoint (/v1/chat/completions) so the
// response shape matches the OpenAI path. User must start Ollama with
// OLLAMA_ORIGINS='*' for browser CORS to work.

async function sendOllama({ context, history }) {
  const { url, model } = settings.getOllamaConfig();
  if (!url || !model) throw new Error('Ollama URL or model missing. Open Settings → Local model to configure.');

  const messages = [
    { role: 'system', content: buildSystem(context) },
    ...history
      .filter(m => m.content.trim())
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];

  const endpoint = `${url.replace(/\/$/, '')}/v1/chat/completions`;

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ model, messages, max_tokens: 1024 }),
    });
  } catch (e) {
    throw new Error(
      `Couldn't reach Ollama at ${url}. Make sure Ollama is running and started with OLLAMA_ORIGINS='*'. ` +
      `(Open a terminal, quit Ollama, then run: OLLAMA_ORIGINS='*' ollama serve.) ` +
      `Browser error: ${String(e?.message || e)}`
    );
  }

  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch {}
    if (res.status === 404) {
      throw new Error(`Model "${model}" not found. Run: ollama pull ${model}`);
    }
    throw new Error(body?.error?.message || body?.error || `Ollama error ${res.status}`);
  }

  let data;
  try { data = await res.json(); } catch (e) { throw new Error('Ollama returned an unreadable response.'); }

  const text = data.choices?.[0]?.message?.content || '';
  // Local = free. Report costCents: 0.
  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;

  return { text, model, costCents: 0, inputTokens, outputTokens };
}
