import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { groupDraftsByProject, updateDraft, deleteDraft, addDraft, loadDrafts, loadActiveDrafts, loadDoneDrafts, loadProjects, reorderProjects, renameProject, addProject, deleteProject, moveDraftToProject, reorderDrafts } from './storage';
import NavBar from './NavBar';
import useIsMobile from './useIsMobile';

const GAP_QUOTES = [
  { text: "Put your manuscript in a drawer for at least six weeks. When you take it out, you'll see it with fresh eyes.", author: "Stephen King" },
  { text: "Put it in a drawer and forget about it. Then, after a few weeks, take it out and pretend you've never read it before.", author: "Neil Gaiman" },
  { text: "Longer gaps correlate with better editing. Let it breathe.", author: "The Method" },
  { text: "By the time I'm nearing the end of a story, the first part will have been reread and altered at least 150 times.", author: "Roald Dahl" },
  { text: "Almost everything will work again if you unplug it for a few minutes — including you.", author: "Anne Lamott" },
  { text: "Leonardo da Vinci spent years returning to the Mona Lisa — each time with new eyes and new technique.", author: "Art History" },
];

export default function GapMode({ onNavigate, onRefine }) {
  const { user, login } = useAuth();
  const isMobile = useIsMobile();
  const [groups, setGroups] = useState(() => {
    const all = groupDraftsByProject();
    return all.map(g => ({ ...g, drafts: g.drafts.filter(d => !d.refined) })).filter(g => g.drafts.length > 0 || g.project.id !== 'uncategorized');
  });
  const [now, setNow] = useState(Date.now());
  const [overrideTaps, setOverrideTaps] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [draggedProjectId, setDraggedProjectId] = useState(null);
  const [dragOverProjectId, setDragOverProjectId] = useState(null);
  const [draggedDraftId, setDraggedDraftId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [dragOverDraftId, setDragOverDraftId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [movingDraftId, setMovingDraftId] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [addingDraftToProject, setAddingDraftToProject] = useState(null);
  const [newDraftText, setNewDraftText] = useState('');
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setQuoteIndex(i => (i + 1) % GAP_QUOTES.length), 24000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(() => {
    const all = groupDraftsByProject();
    setGroups(all.map(g => ({ ...g, drafts: g.drafts.filter(d => !d.refined) })).filter(g => g.drafts.length > 0 || g.project.id !== 'uncategorized'));
  }, []);

  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const toggleProject = (id) => {
    setExpandedProjects(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const handleOverrideTap = (id) => {
    const taps = (overrideTaps[id] || 0) + 1;
    if (taps >= 2) {
      updateDraft(id, { unlocksAt: Date.now() });
      refresh();
      setOverrideTaps(prev => ({ ...prev, [id]: 0 }));
    } else {
      setOverrideTaps(prev => ({ ...prev, [id]: taps }));
    }
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    deleteDraft(id);
    refresh();
  };

  const formatRemaining = (ms) => {
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTitle = (text) => {
    const first = text.slice(0, 40).replace(/\n/g, ' ');
    return first + (text.length > 40 ? '...' : '');
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    addProject(newProjectName.trim());
    setNewProjectName('');
    setShowNewProject(false);
    refresh();
  };

  // --- Project drag-and-drop ---
  const handleProjectDragStart = (e, id) => {
    e.dataTransfer.setData('application/x-project-id', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedProjectId(id);
  };
  const handleProjectDragEnd = () => { setDraggedProjectId(null); setDragOverProjectId(null); };

  const doProjectReorder = (fromId, toId) => {
    const projectIds = groups.map(g => g.project.id);
    const fromIdx = projectIds.indexOf(fromId);
    const toIdx = projectIds.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    projectIds.splice(fromIdx, 1);
    projectIds.splice(toIdx, 0, fromId);
    reorderProjects(projectIds.filter(id => id !== 'uncategorized'));
    refresh();
  };
  const moveProject = (id, direction) => {
    const projectIds = groups.map(g => g.project.id);
    const idx = projectIds.indexOf(id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= projectIds.length) return;
    doProjectReorder(id, projectIds[newIdx]);
  };

  // --- Draft card drag-and-drop (within + across projects) ---
  const handleDraftDragStart = (e, draftId, projectId) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/x-draft-move', draftId);
    e.dataTransfer.setData('application/x-draft-source', projectId || 'uncategorized');
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDraftId(draftId);
  };
  const handleDraftDragEnd = () => { setDraggedDraftId(null); setDragOverGroupId(null); setDragOverDraftId(null); };

  const handleDraftDragOver = (e, targetDraftId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (targetDraftId !== draggedDraftId) setDragOverDraftId(targetDraftId);
  };

  const handleDraftDrop = (e, targetDraftId, targetProjectId) => {
    e.preventDefault();
    e.stopPropagation();
    const fromDraftId = e.dataTransfer.getData('application/x-draft-move');
    const fromProjectId = e.dataTransfer.getData('application/x-draft-source');
    if (!fromDraftId || fromDraftId === targetDraftId) {
      setDraggedDraftId(null); setDragOverDraftId(null);
      return;
    }
    const effectiveTarget = targetProjectId || 'uncategorized';
    const effectiveSource = fromProjectId || 'uncategorized';
    if (effectiveSource === effectiveTarget) {
      // Within-project reorder
      const group = groups.find(g => g.project.id === effectiveTarget);
      if (group) {
        const ids = group.drafts.map(d => d.id);
        const fromIdx = ids.indexOf(fromDraftId);
        const toIdx = ids.indexOf(targetDraftId);
        if (fromIdx !== -1 && toIdx !== -1) {
          ids.splice(fromIdx, 1);
          ids.splice(toIdx, 0, fromDraftId);
          reorderDrafts(targetProjectId, ids);
          refresh();
        }
      }
    } else {
      // Cross-project move — place at top of target project
      const targetPid = targetProjectId === 'uncategorized' ? null : targetProjectId;
      moveDraftToProject(fromDraftId, targetPid);
      // Reorder to put at top
      const targetGroup = groups.find(g => g.project.id === (targetProjectId || 'uncategorized'));
      if (targetGroup) {
        const ids = [fromDraftId, ...targetGroup.drafts.map(d => d.id)];
        reorderDrafts(targetPid, ids);
      }
      refresh();
    }
    setDraggedDraftId(null); setDragOverDraftId(null); setDragOverGroupId(null);
  };

  // --- Draft arrow reorder within project ---
  const moveDraftInProject = (projectId, draftId, direction) => {
    const group = groups.find(g => g.project.id === (projectId || 'uncategorized'));
    if (!group) return;
    const ids = group.drafts.map(d => d.id);
    const idx = ids.indexOf(draftId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ids.length) return;
    ids.splice(idx, 1);
    ids.splice(newIdx, 0, draftId);
    reorderDrafts(projectId, ids);
    refresh();
  };

  // --- Group-level drop handler (for both project reorder AND draft drops) ---
  const handleGroupDragOver = (e, groupId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverProjectId(groupId);
    setDragOverGroupId(groupId);
  };
  const handleGroupDrop = (e, targetGroupId) => {
    e.preventDefault();
    const draftId = e.dataTransfer.getData('application/x-draft-move');
    const projectId = e.dataTransfer.getData('application/x-project-id');

    if (draftId) {
      // Draft card dropped on a project group — place at top
      const targetPid = targetGroupId === 'uncategorized' ? null : targetGroupId;
      moveDraftToProject(draftId, targetPid);
      const targetGroup = groups.find(g => g.project.id === targetGroupId);
      if (targetGroup) {
        const ids = [draftId, ...targetGroup.drafts.map(d => d.id)];
        reorderDrafts(targetPid, ids);
      }
      refresh();
    } else if (projectId && projectId !== targetGroupId) {
      doProjectReorder(projectId, targetGroupId);
    }
    setDraggedProjectId(null); setDragOverProjectId(null);
    setDraggedDraftId(null); setDragOverGroupId(null);
  };

  const startEditing = (project) => {
    if (project.id === 'uncategorized') return;
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };
  const saveProjectName = () => {
    if (editingProjectId && editingName.trim()) {
      renameProject(editingProjectId, editingName.trim());
      refresh();
    }
    setEditingProjectId(null);
    setEditingName('');
  };

  const allDrafts = loadActiveDrafts();
  const doneCount = loadDoneDrafts().length;
  const hasDrafts = allDrafts.length > 0;

  return (
    <div style={{
      minHeight: '100vh', background: '#F0E0DE', color: '#5E3A38',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '0 20px 60px',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 700, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: isMobile ? '12px 0' : '20px 0',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div onClick={() => onNavigate('flow')} style={{ fontSize: isMobile ? 15 : 18, fontWeight: 600, letterSpacing: '-0.5px', cursor: 'pointer' }}>
          <span style={{ color: '#A8B4C4', textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)' }}>Draft</span><span style={{ color: '#5E3A38' }}>,</span> <span style={{ color: '#C0392B' }}>Stop</span><span style={{ color: '#D4943A', textShadow: '0 0 14px rgba(212,148,58,0.7), 0 0 28px rgba(212,148,58,0.4), 0 0 50px rgba(212,148,58,0.2)' }}>&nbsp;& Sharpen</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NavBar currentPage="gap" onNavigate={onNavigate} onSharpen={() => {
            // Find first ready draft and open it for sharpening
            const readyDraft = allDrafts.find(d => d.unlocksAt <= Date.now());
            if (readyDraft) {
              onRefine(readyDraft);
            } else {
              alert('No drafts are ready to sharpen yet. Wait for the incubation period to finish.');
            }
          }} />
          {user ? (
            <div style={{
              width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: '2px solid #A8B4C4',
            }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#A8B4C4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 12, fontWeight: 700 }}>{user.name?.[0] || '?'}</div>
              )}
            </div>
          ) : (
            <button onClick={login} style={{
              padding: '6px 12px', fontSize: 11, border: 'none', borderRadius: 8,
              background: '#A8B4C4', color: '#FFF', cursor: 'pointer', fontWeight: 600,
              textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
            }}>Sign in</button>
          )}
        </div>
      </div>

      {/* Page subtitle - centered */}
      <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
        <span style={{ fontSize: 16, color: '#C0392B', fontWeight: 700, letterSpacing: '0.5px' }}>Stop & Incubate</span>
      </div>

      {/* Center content */}
      <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 24, opacity: 0.5 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌙</div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>YOUR DRAFTS ARE INCUBATING</div>
        <div style={{ maxWidth: 420, margin: '0 auto', minHeight: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontStyle: 'italic', fontSize: 13, margin: 0, lineHeight: 1.7, textAlign: 'center' }}>
            "{GAP_QUOTES[quoteIndex].text}"
          </p>
          <span style={{ fontSize: 10, letterSpacing: '0.5px', marginTop: 6, textTransform: 'uppercase' }}>
            — {GAP_QUOTES[quoteIndex].author}
          </span>
        </div>
      </div>

      {/* Drafts list — grouped by project */}
      <div style={{ width: '100%', maxWidth: 700 }}>
        {!hasDrafts && (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
            <p style={{ fontSize: 14 }}>No drafts yet.</p>
            <button onClick={() => onNavigate('flow')} style={{
              marginTop: 16, padding: '12px 28px', fontSize: 14, fontWeight: 600,
              background: '#A8B4C4', color: '#FFF', border: 'none', borderRadius: 10, cursor: 'pointer',
              textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
            }}>Start Your First Flow Session</button>
          </div>
        )}

        {groups.map((group, gIdx) => {
          const isExpanded = expandedProjects[group.project.id] !== false;
          const isDraggedProject = group.project.id === draggedProjectId;
          const isDropTarget = dragOverGroupId === group.project.id && draggedDraftId;
          return (
            <div
              key={group.project.id}
              onDragOver={(e) => handleGroupDragOver(e, group.project.id)}
              onDrop={(e) => handleGroupDrop(e, group.project.id)}
              style={{
                marginBottom: 16, opacity: isDraggedProject ? 0.4 : 1,
                border: isDropTarget ? '2px dashed #D4943A' : '2px solid transparent',
                borderRadius: 12, padding: isDropTarget ? 4 : 0,
                transition: 'all 0.15s ease',
              }}
            >
              {/* Project header */}
              <div
                draggable={group.project.id !== 'uncategorized' && groups.length > 1}
                onDragStart={(e) => handleProjectDragStart(e, group.project.id)}
                onDragEnd={handleProjectDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  userSelect: 'none',
                  cursor: groups.length > 1 && group.project.id !== 'uncategorized' ? 'grab' : 'default',
                }}
              >
                {groups.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveProject(group.project.id, -1); }} disabled={gIdx === 0} style={{ background: 'transparent', border: 'none', color: gIdx === 0 ? '#D8C8C5' : '#5E4A48', cursor: gIdx === 0 ? 'default' : 'pointer', fontSize: 14, padding: '2px 6px', lineHeight: 1 }}>▲</button>
                    <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveProject(group.project.id, 1); }} disabled={gIdx === groups.length - 1} style={{ background: 'transparent', border: 'none', color: gIdx === groups.length - 1 ? '#D8C8C5' : '#5E4A48', cursor: gIdx === groups.length - 1 ? 'default' : 'pointer', fontSize: 14, padding: '2px 6px', lineHeight: 1 }}>▼</button>
                  </div>
                )}
                <span onClick={() => toggleProject(group.project.id)} style={{ cursor: 'pointer', fontSize: 36, color: '#8B6B68', lineHeight: 0.7 }}>{isExpanded ? '▾' : '▸'}</span>
                {editingProjectId === group.project.id ? (
                  <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={saveProjectName} onKeyDown={(e) => { if (e.key === 'Enter') saveProjectName(); if (e.key === 'Escape') setEditingProjectId(null); }} style={{ fontSize: 26, fontWeight: 700, color: '#4E3A38', background: 'transparent', border: 'none', borderBottom: '2px solid #D4943A', padding: '2px 4px', fontFamily: "'Source Serif 4', serif", outline: 'none', width: '100%', maxWidth: 400 }} />
                ) : (
                  <span onClick={() => startEditing(group.project)} style={{ fontSize: 26, fontWeight: 700, color: '#4E3A38', cursor: group.project.id === 'uncategorized' ? 'default' : 'pointer', fontFamily: "'Source Serif 4', serif", borderBottom: '2px solid transparent' }} onMouseEnter={(e) => { if (group.project.id !== 'uncategorized') e.target.style.borderBottom = '2px dashed #C8B0AD'; }} onMouseLeave={(e) => { e.target.style.borderBottom = '2px solid transparent'; }}>{group.project.name}</span>
                )}
                <span style={{ fontSize: 13, color: '#94787B', fontWeight: 400 }}>({group.drafts.length})</span>
                {group.project.id !== 'uncategorized' && (
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete project "${group.project.name}"? Drafts inside will be moved to Uncategorized.`)) {
                        deleteProject(group.project.id);
                        refresh();
                      }
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#B89B98', cursor: 'pointer', fontSize: 13, padding: '0 4px', marginLeft: 4 }}
                  >×</button>
                )}
              </div>

              {/* Draft cards */}
              {isExpanded && group.drafts.map((draft, dIdx) => {
                const remaining = draft.unlocksAt - now;
                const isReady = remaining <= 0;
                const taps = overrideTaps[draft.id] || 0;
                const isDragging = draft.id === draggedDraftId;

                return (
                  <div
                    key={draft.id}
                    draggable
                    onDragStart={(e) => handleDraftDragStart(e, draft.id, draft.projectId)}
                    onDragOver={(e) => handleDraftDragOver(e, draft.id)}
                    onDrop={(e) => handleDraftDrop(e, draft.id, group.project.id)}
                    onDragEnd={handleDraftDragEnd}
                    style={{
                      background: isReady ? '#F5EDEB' : '#E5D8D5',
                      borderRadius: 12, padding: '16px 20px', marginBottom: 8,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      opacity: isDragging ? 0.4 : isReady ? 1 : 0.7,
                      cursor: 'grab',
                      borderTop: dragOverDraftId === draft.id ? '3px solid #D4943A' : '3px solid transparent',
                    }}
                  >
                    {/* Arrow buttons for within-project reorder */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginRight: 8, flexShrink: 0 }}>
                      <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); moveDraftInProject(draft.projectId, draft.id, -1); }} disabled={dIdx === 0} style={{ background: 'transparent', border: 'none', color: dIdx === 0 ? '#D8C8C5' : '#8B6B68', cursor: dIdx === 0 ? 'default' : 'pointer', fontSize: 11, padding: '1px 4px', lineHeight: 1 }}>▲</button>
                      <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); moveDraftInProject(draft.projectId, draft.id, 1); }} disabled={dIdx === group.drafts.length - 1} style={{ background: 'transparent', border: 'none', color: dIdx === group.drafts.length - 1 ? '#D8C8C5' : '#8B6B68', cursor: dIdx === group.drafts.length - 1 ? 'default' : 'pointer', fontSize: 11, padding: '1px 4px', lineHeight: 1 }}>▼</button>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title toggle + title area at top */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {draft.showTitle ? (
                          editingTitleId === draft.id ? (
                            <input
                              autoFocus
                              value={editingTitleText}
                              onChange={(e) => setEditingTitleText(e.target.value)}
                              onBlur={() => { updateDraft(draft.id, { title: editingTitleText }); setEditingTitleId(null); refresh(); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { updateDraft(draft.id, { title: editingTitleText }); setEditingTitleId(null); refresh(); } if (e.key === 'Escape') setEditingTitleId(null); }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 16, fontWeight: 700, color: '#2D8B5A', background: 'transparent', border: 'none', borderBottom: '2px solid #2D8B5A', padding: '0 2px', flex: 1, outline: 'none', fontFamily: "'Source Serif 4', serif" }}
                            />
                          ) : (
                            <div
                              onClick={(e) => { e.stopPropagation(); setEditingTitleId(draft.id); setEditingTitleText(draft.title || ''); }}
                              style={{ fontSize: 16, fontWeight: 700, color: '#2D8B5A', cursor: 'pointer', fontFamily: "'Source Serif 4', serif", flex: 1 }}
                            >
                              {draft.title || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Click to add title...</span>}
                            </div>
                          )
                        ) : null}
                        <button
                          onClick={(e) => { e.stopPropagation(); updateDraft(draft.id, { showTitle: !draft.showTitle }); refresh(); }}
                          style={{ background: 'transparent', border: 'none', color: '#A8B4C4', cursor: 'pointer', fontSize: 10, padding: 0, textDecoration: 'underline', flexShrink: 0 }}
                        >{draft.showTitle ? 'Hide title' : '+ Title'}</button>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isReady ? '#4E3A38' : '#5E4A48', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTitle(draft.text)}</div>
                      <div style={{ fontSize: 11, color: '#94787B', marginTop: 4 }}>
                        {draft.wordCount} words · {new Date(draft.createdAt).toLocaleDateString()}
                        {draft.refined && ' · Sharpened ✓'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
                      {isReady ? (
                        <button onClick={() => onRefine(draft)} style={{
                          padding: '8px 16px', fontSize: 12, fontWeight: 700,
                          background: 'transparent', color: '#1A8C3A',
                          border: '2px solid #D4943A',
                          borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                          boxShadow: '0 0 12px rgba(212,148,58,0.4), 0 0 24px rgba(212,148,58,0.2), 0 0 40px rgba(212,148,58,0.1)',
                        }}>Ready to sharpen →</button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#8B6B68', fontFamily: "'Space Mono', monospace" }}>⏳ {formatRemaining(remaining)}</span>
                            <button onClick={() => handleOverrideTap(draft.id)} style={{
                              padding: '4px 10px', fontSize: 10, fontWeight: 600,
                              border: '1px solid #A8B4C4', borderRadius: 6,
                              background: 'transparent', color: '#A8B4C4', cursor: 'pointer',
                              textShadow: '0 0 8px rgba(168,180,196,0.4)',
                            }}>{taps === 0 ? 'Override' : 'Yes, I\'m sure'}</button>
                          </div>
                          {taps === 1 && (
                            <div style={{ fontSize: 9, color: '#94787B', maxWidth: 200, lineHeight: 1.3, textAlign: 'right', fontStyle: 'italic' }}>
                              It's better to let your draft incubate. Sleep on it if you can — your editing will be sharper.
                            </div>
                          )}
                        </div>
                      )}
                      {/* Move to project */}
                      <div style={{ position: 'relative' }}>
                        <button onClick={(e) => { e.stopPropagation(); setMovingDraftId(movingDraftId === draft.id ? null : draft.id); }} style={{
                          padding: '4px 8px', fontSize: 10, background: 'transparent',
                          border: '1px solid #C8A8A6', borderRadius: 4, color: '#8B6B68', cursor: 'pointer',
                        }}>📁</button>
                        {movingDraftId === draft.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%', marginTop: 4,
                            background: '#FDF6EC', borderRadius: 8, padding: 8, minWidth: 160,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid #D4C4A8',
                            zIndex: 100,
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#8B7B6B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Move to project:</div>
                            {draft.projectId && (
                              <button onClick={(e) => { e.stopPropagation(); moveDraftToProject(draft.id, null); setMovingDraftId(null); refresh(); }} style={{
                                display: 'block', width: '100%', padding: '6px 10px', fontSize: 11, textAlign: 'left',
                                background: 'transparent', border: 'none', color: '#5E3A38', cursor: 'pointer',
                                borderRadius: 4,
                              }} onMouseEnter={e => e.target.style.background = '#F0E0DE'} onMouseLeave={e => e.target.style.background = 'transparent'}>Uncategorized</button>
                            )}
                            {loadProjects().filter(p => p.id !== draft.projectId).map(p => (
                              <button key={p.id} onClick={(e) => { e.stopPropagation(); moveDraftToProject(draft.id, p.id); setMovingDraftId(null); refresh(); }} style={{
                                display: 'block', width: '100%', padding: '6px 10px', fontSize: 11, textAlign: 'left',
                                background: 'transparent', border: 'none', color: '#5E3A38', cursor: 'pointer',
                                borderRadius: 4,
                              }} onMouseEnter={e => e.target.style.background = '#F0E0DE'} onMouseLeave={e => e.target.style.background = 'transparent'}>{p.name}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleDelete(draft.id)} style={{
                        padding: '4px 8px', fontSize: 12, background: 'transparent',
                        border: 'none', color: '#B89B98', cursor: 'pointer',
                      }}>×</button>
                    </div>
                  </div>
                );
              })}

              {/* Add new draft to this project */}
              {addingDraftToProject === group.project.id ? (
                <div style={{ padding: '10px 12px', background: '#F5EDEB', borderRadius: 10, marginBottom: 8 }}>
                  <textarea
                    autoFocus
                    value={newDraftText}
                    onChange={(e) => setNewDraftText(e.target.value)}
                    placeholder="Write or paste your draft here..."
                    style={{
                      width: '100%', minHeight: 80, padding: 10, fontSize: 13, lineHeight: 1.5,
                      border: '1px solid #C8A8A6', borderRadius: 8, background: '#FDF6EC',
                      color: '#5E3A38', resize: 'vertical', fontFamily: "'Source Serif 4', serif",
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => {
                      if (!newDraftText.trim()) return;
                      addDraft({ text: newDraftText.trim(), wordCount: newDraftText.trim().split(/\s+/).length, projectId: group.project.id === 'uncategorized' ? null : group.project.id });
                      setNewDraftText('');
                      setAddingDraftToProject(null);
                      refresh();
                    }} style={{
                      padding: '6px 14px', fontSize: 11, fontWeight: 600,
                      background: '#D4943A', color: '#FFF', border: 'none',
                      borderRadius: 6, cursor: 'pointer',
                    }}>Save Draft</button>
                    <button onClick={() => { setAddingDraftToProject(null); setNewDraftText(''); }} style={{
                      padding: '6px 14px', fontSize: 11,
                      background: 'transparent', border: '1px solid #C8A8A6',
                      borderRadius: 6, color: '#8B6B68', cursor: 'pointer',
                    }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingDraftToProject(group.project.id)} style={{
                  width: '100%', padding: '8px', fontSize: 11, fontWeight: 600,
                  background: 'transparent', border: '1px dashed #C8A8A6',
                  borderRadius: 8, color: '#8B6B68', cursor: 'pointer', marginBottom: 8,
                }}>+ Add Draft to {group.project.name}</button>
              )}
            </div>
          );
        })}

        {/* Create new project */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          {showNewProject ? (
            <>
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setShowNewProject(false); }}
                placeholder="Project name..."
                style={{
                  flex: 1, padding: '10px 14px', fontSize: 14, border: '1px solid #C8A8A6',
                  borderRadius: 8, background: '#FDF6EC', color: '#5E3A38',
                  fontFamily: "'Source Serif 4', serif",
                }}
              />
              <button onClick={handleCreateProject} style={{
                padding: '10px 16px', fontSize: 12, fontWeight: 600,
                background: '#D4943A', color: '#FFF', border: 'none',
                borderRadius: 8, cursor: 'pointer',
              }}>Create</button>
              <button onClick={() => setShowNewProject(false)} style={{
                padding: '10px 12px', fontSize: 12, background: 'transparent',
                border: '1px solid #C8A8A6', borderRadius: 8, color: '#8B6B68', cursor: 'pointer',
              }}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setShowNewProject(true)} style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              background: 'transparent', border: '1px dashed #C8A8A6',
              borderRadius: 10, color: '#8B6B68', cursor: 'pointer', width: '100%',
            }}>+ Create New Project</button>
          )}
        </div>
      </div>
    </div>
  );
}
