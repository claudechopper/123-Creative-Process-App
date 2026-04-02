const DRAFTS_KEY = 'twomodes_drafts';
const BANNER_KEY = 'twomodes_banner_dismissed';

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || [];
  } catch { return []; }
}

export function saveDrafts(drafts) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function addDraft({ text, wordCount }) {
  const drafts = loadDrafts();
  const draft = {
    id: generateId(),
    text,
    wordCount,
    createdAt: Date.now(),
    unlocksAt: Date.now() + 24 * 60 * 60 * 1000,
    refined: false,
    refinedText: null,
  };
  drafts.unshift(draft);
  saveDrafts(drafts);
  return draft;
}

export function updateDraft(id, updates) {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx !== -1) {
    drafts[idx] = { ...drafts[idx], ...updates };
    saveDrafts(drafts);
  }
  return drafts;
}

export function deleteDraft(id) {
  const drafts = loadDrafts().filter(d => d.id !== id);
  saveDrafts(drafts);
  return drafts;
}

export function isBannerDismissed() {
  return localStorage.getItem(BANNER_KEY) === 'true';
}

export function dismissBanner() {
  localStorage.setItem(BANNER_KEY, 'true');
}

export function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatDate() {
  return new Date().toISOString().slice(0, 10);
}
