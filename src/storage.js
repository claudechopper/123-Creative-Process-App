import { api } from './api';

const DRAFTS_KEY = 'twomodes_drafts';
const PROJECTS_KEY = 'twomodes_projects';
const BANNER_KEY = 'twomodes_banner_dismissed';

let _isLoggedIn = false;
export function setLoggedIn(val) { _isLoggedIn = val; }

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// --- Drafts ---

export function loadDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || [];
  } catch { return []; }
}

export function loadActiveDrafts() {
  return loadDrafts().filter(d => !d.refined);
}

export function loadDoneDrafts() {
  return loadDrafts().filter(d => d.refined);
}

export function saveDrafts(drafts) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function addDraft({ text, wordCount, projectId = null }) {
  const drafts = loadDrafts();
  const draft = {
    id: generateId(),
    text,
    wordCount,
    projectId,
    title: '',
    showTitle: false,
    createdAt: Date.now(),
    unlocksAt: Date.now() + 12 * 60 * 60 * 1000,
    refined: false,
    refinedText: null,
  };
  drafts.unshift(draft);
  saveDrafts(drafts);
  if (_isLoggedIn) {
    api.createDraft(draft).catch(err => console.warn('Cloud sync failed:', err));
  }
  return draft;
}

export function updateDraft(id, updates) {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx !== -1) {
    drafts[idx] = { ...drafts[idx], ...updates };
    saveDrafts(drafts);
  }
  if (_isLoggedIn) {
    api.updateDraft(id, updates).catch(err => console.warn('Cloud sync failed:', err));
  }
  return drafts;
}

export function deleteDraft(id) {
  const drafts = loadDrafts().filter(d => d.id !== id);
  saveDrafts(drafts);
  if (_isLoggedIn) {
    api.deleteDraft(id).catch(err => console.warn('Cloud sync failed:', err));
  }
  return drafts;
}

// --- Projects ---

export function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
  } catch { return []; }
}

export function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function addProject(name) {
  const projects = loadProjects();
  const project = { id: generateId(), name, createdAt: Date.now() };
  projects.unshift(project);
  saveProjects(projects);
  if (_isLoggedIn) {
    api.createProject(name, project.id).catch(err => console.warn('Cloud sync failed:', err));
  }
  return project;
}

export function renameProject(id, newName) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx !== -1) {
    projects[idx].name = newName;
    saveProjects(projects);
  }
}

export function deleteProject(id) {
  const projects = loadProjects().filter(p => p.id !== id);
  saveProjects(projects);
  const drafts = loadDrafts().map(d => d.projectId === id ? { ...d, projectId: null } : d);
  saveDrafts(drafts);
  if (_isLoggedIn) {
    api.deleteProject(id).catch(err => console.warn('Cloud sync failed:', err));
  }
  return { projects, drafts };
}

export function groupDraftsByProject() {
  const drafts = loadDrafts();
  const projects = loadProjects();
  const grouped = {};

  projects.forEach(p => { grouped[p.id] = { project: p, drafts: [] }; });
  grouped['uncategorized'] = { project: { id: 'uncategorized', name: 'Uncategorized' }, drafts: [] };

  drafts.forEach(d => {
    const key = d.projectId && grouped[d.projectId] ? d.projectId : 'uncategorized';
    grouped[key].drafts.push(d);
  });

  const result = projects
    .map(p => grouped[p.id]);
  if (grouped['uncategorized'].drafts.length > 0) {
    result.push(grouped['uncategorized']);
  }
  return result;
}

export function getDraftsByProject(projectId) {
  return loadDrafts().filter(d => d.projectId === projectId);
}

// --- Move Draft Between Projects ---

export function moveDraftToProject(draftId, newProjectId) {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === draftId);
  if (idx !== -1) {
    drafts[idx].projectId = newProjectId === 'uncategorized' ? null : newProjectId;
    saveDrafts(drafts);
  }
}

// --- Reorder ---

export function reorderDrafts(projectId, orderedIds) {
  const drafts = loadDrafts();
  const projectDrafts = drafts.filter(d => d.projectId === projectId);
  const otherDrafts = drafts.filter(d => d.projectId !== projectId);
  const reordered = orderedIds.map(id => projectDrafts.find(d => d.id === id)).filter(Boolean);
  saveDrafts([...reordered, ...otherDrafts]);
}

export function reorderProjects(orderedIds) {
  const projects = loadProjects();
  const reordered = orderedIds.map(id => projects.find(p => p.id === id)).filter(Boolean);
  saveProjects(reordered);
}

// --- Cloud Sync ---

export async function syncAllDrafts() {
  if (!_isLoggedIn) return;
  try {
    const localDrafts = loadDrafts();
    if (localDrafts.length > 0) {
      const result = await api.syncDrafts(localDrafts);
      if (result?.drafts) {
        saveDrafts(result.drafts);
      }
    }
  } catch (err) {
    console.warn('Initial sync failed:', err);
  }
}

// --- Banner ---

export function isBannerDismissed() {
  return localStorage.getItem(BANNER_KEY) === 'true';
}

export function dismissBanner() {
  localStorage.setItem(BANNER_KEY, 'true');
}

// --- Utilities ---

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
