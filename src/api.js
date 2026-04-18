// All non-AI data lives in localStorage (see storage.js). This module only
// exists for the AI Coach, which needs a backend to proxy Anthropic calls
// and track global spend for the daily cost cap.

async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // AI Chat (the only server-backed feature)
  getChatInfo: () => request('/api/chat/info'),
  sendChat: (payload) => request('/api/chat', { method: 'POST', body: JSON.stringify(payload) }),
};
