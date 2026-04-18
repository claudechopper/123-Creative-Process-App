// Provider-agnostic AI service
// Supports: Anthropic (Claude), OpenAI, or stub fallback
// Users choose their model per-request; cost is tracked per-response

const MODELS = {
  'haiku': { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', label: 'Haiku 4.5', inputPer1M: 100, outputPer1M: 500 },
  'sonnet': { id: 'claude-sonnet-4-5', provider: 'anthropic', label: 'Sonnet 4.5', inputPer1M: 300, outputPer1M: 1500 },
  'opus': { id: 'claude-opus-4-5', provider: 'anthropic', label: 'Opus 4.5', inputPer1M: 1500, outputPer1M: 7500 },
};

const SYSTEM_PROMPT = `You are a Writing Coach embedded in a creative writing app called "Draft, Stop & Sharpen." You help writers refine and sharpen their work. You are encouraging but honest. Keep responses concise and actionable — writers want to get back to writing, not read essays. When given the writer's original draft as context, reference specific passages. Never rewrite their entire draft unless explicitly asked.`;

function estimateCostCents(model, inputTokens, outputTokens) {
  const m = MODELS[model];
  if (!m) return 0;
  return Math.ceil((inputTokens * m.inputPer1M + outputTokens * m.outputPer1M) / 1_000_000);
}

async function chatAnthropic(messages, model, context) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  let systemPrompt = SYSTEM_PROMPT;
  if (context) {
    systemPrompt += `\n\nThe writer's original draft:\n---\n${context.slice(0, 12000)}\n---`;
  }

  const body = {
    model: MODELS[model].id,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const usage = data.usage || {};
  return {
    text,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
  };
}

function chatStub(messages, model, context) {
  const stubs = [
    "Try reading your draft aloud. Awkward spots will jump out immediately.",
    "Your opening is doing a lot of work. Consider whether the real start is hiding a paragraph or two down.",
    "Look for places where you're telling the reader what to feel instead of showing them.",
    "Strong verbs do more than adjectives ever can. Hunt for 'was' and 'were' and see what you can replace.",
    "Every paragraph should earn its place. If you can cut it without losing meaning, cut it.",
    "What's the one thing you want the reader to walk away with? Make sure it's unmissable.",
  ];
  const text = stubs[Math.floor(Math.random() * stubs.length)];
  return { text, inputTokens: 100, outputTokens: 50 };
}

export async function chat(messages, { model = 'haiku', context = null } = {}) {
  const modelInfo = MODELS[model];
  if (!modelInfo) throw new Error(`Unknown model: ${model}`);

  let result;
  if (process.env.ANTHROPIC_API_KEY) {
    result = await chatAnthropic(messages, model, context);
  } else {
    result = chatStub(messages, model, context);
  }

  result.costCents = estimateCostCents(model, result.inputTokens, result.outputTokens);
  result.model = model;
  return result;
}

export { MODELS };
