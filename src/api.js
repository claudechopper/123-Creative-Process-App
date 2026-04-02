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
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getDrafts: () => request('/api/drafts'),
  createDraft: (draft) => request('/api/drafts', { method: 'POST', body: JSON.stringify(draft) }),
  updateDraft: (id, updates) => request(`/api/drafts/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteDraft: (id) => request(`/api/drafts/${id}`, { method: 'DELETE' }),
  syncDrafts: (drafts) => request('/api/drafts/sync', { method: 'POST', body: JSON.stringify({ drafts }) }),
  getProjects: () => request('/api/projects'),
  createProject: (name, id) => request('/api/projects', { method: 'POST', body: JSON.stringify({ name, id }) }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),
};
