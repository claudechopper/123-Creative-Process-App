import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { groupDraftsByProject, updateDraft, deleteDraft, loadDrafts, loadProjects, reorderProjects, renameProject } from './storage';

export default function GapMode({ onNavigate, onRefine }) {
  const { user, login } = useAuth();
  const [groups, setGroups] = useState(groupDraftsByProject);
  const [now, setNow] = useState(Date.now());
  const [expandedProjects, setExpandedProjects] = useState({});
  const [draggedProjectId, setDraggedProjectId] = useState(null);
  const [dragOverProjectId, setDragOverProjectId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(() => setGroups(groupDraftsByProject()), []);

  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const toggleProject = (id) => {
    setExpandedProjects(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
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

  // Project drag and drop
  const handleProjectDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('application/x-project-id', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedProjectId(id);
  };

  const handleProjectDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedProjectId) setDragOverProjectId(id);
  };

  const handleProjectDrop = (e, targetId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('application/x-project-id') || draggedProjectId;
    if (!fromId || fromId === targetId) {
      setDraggedProjectId(null);
      setDragOverProjectId(null);
      return;
    }
    doProjectReorder(fromId, targetId);
    setDraggedProjectId(null);
    setDragOverProjectId(null);
  };

  const handleProjectDragEnd = () => {
    setDraggedProjectId(null);
    setDragOverProjectId(null);
  };

  const doProjectReorder = (fromId, toId) => {
    const projectIds = groups.map(g => g.project.id);
    const fromIdx = projectIds.indexOf(fromId);
    const toIdx = projectIds.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    projectIds.splice(fromIdx, 1);
    projectIds.splice(toIdx, 0, fromId);
    const realIds = projectIds.filter(id => id !== 'uncategorized');
    reorderProjects(realIds);
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

  const allDrafts = loadDrafts();
  const hasDrafts = allDrafts.length > 0;

  return (
    <div style={{
      minHeight: '100vh', background: '#E2EBE0', color: '#4A5E48',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      transition: 'background-color 0.6s ease, color 0.6s ease',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '0 20px 60px',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 700, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 0',
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
          <span style={{ color: '#A8B4C4', textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)' }}>Draft</span><span style={{ color: '#4A5E48' }}>,</span> <span style={{ color: '#C0392B' }}>Stop</span><span style={{ color: '#D4943A', textShadow: '0 0 14px rgba(212,148,58,0.7), 0 0 28px rgba(212,148,58,0.4), 0 0 50px rgba(212,148,58,0.2)' }}>&nbsp;& Sharpen</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => onNavigate('flow')} style={{
            padding: '6px 12px', fontSize: 11, border: '1px solid #B0C8AD',
            borderRadius: 8, background: 'transparent', color: '#4A5E48', cursor: 'pointer',
          }}>+ New Session</button>
          {user ? (
            <div style={{
              width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid #A8B4C4',
            }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', background: '#A8B4C4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFF', fontSize: 12, fontWeight: 700,
                }}>{user.name?.[0] || '?'}</div>
              )}
            </div>
          ) : (
            <button onClick={login} style={{
              padding: '6px 12px', fontSize: 11, border: 'none',
              borderRadius: 8, background: '#A8B4C4', color: '#FFF',
              cursor: 'pointer', fontWeight: 600,
              textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
            }}>Sign in</button>
          )}
        </div>
      </div>

      {/* Center content */}
      <div style={{ textAlign: 'center', marginTop: 30, marginBottom: 24, opacity: 0.5 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌙</div>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase',
          marginBottom: 8,
        }}>YOUR DRAFTS ARE RESTING</div>
        <p style={{ fontSize: 13, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
          Longer gaps correlate with better editing. Let it breathe.
        </p>
      </div>

      {/* Drafts list — grouped by project */}
      <div style={{ width: '100%', maxWidth: 700 }}>
        {!hasDrafts && (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
            <p style={{ fontSize: 14 }}>No drafts yet.</p>
            <button onClick={() => onNavigate('flow')} style={{
              marginTop: 16, padding: '12px 28px', fontSize: 14, fontWeight: 600,
              background: '#A8B4C4', color: '#FFF', border: 'none',
              borderRadius: 10, cursor: 'pointer',
              textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
            }}>Start Your First Flow Session</button>
          </div>
        )}

        {groups.map((group, gIdx) => {
          const isExpanded = expandedProjects[group.project.id] !== false;
          const isDraggedProject = group.project.id === draggedProjectId;
          const isDragOverProject = group.project.id === dragOverProjectId;
          const isEditing = editingProjectId === group.project.id;
          return (
            <div
              key={group.project.id}
              onDragOver={(e) => handleProjectDragOver(e, group.project.id)}
              onDrop={(e) => handleProjectDrop(e, group.project.id)}
              style={{
                marginBottom: 16,
                opacity: isDraggedProject ? 0.4 : 1,
                borderTop: isDragOverProject ? '3px solid #D4943A' : '3px solid transparent',
                transition: 'opacity 0.2s ease',
              }}
            >
              {/* Project header — always shown */}
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
                {/* Arrow buttons */}
                {groups.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveProject(group.project.id, -1); }}
                      disabled={gIdx === 0}
                      style={{
                        background: 'transparent', border: 'none',
                        color: gIdx === 0 ? '#C8D8C5' : '#4A5E48',
                        cursor: gIdx === 0 ? 'default' : 'pointer',
                        fontSize: 14, padding: '2px 6px', lineHeight: 1,
                      }}
                    >▲</button>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveProject(group.project.id, 1); }}
                      disabled={gIdx === groups.length - 1}
                      style={{
                        background: 'transparent', border: 'none',
                        color: gIdx === groups.length - 1 ? '#C8D8C5' : '#4A5E48',
                        cursor: gIdx === groups.length - 1 ? 'default' : 'pointer',
                        fontSize: 14, padding: '2px 6px', lineHeight: 1,
                      }}
                    >▼</button>
                  </div>
                )}

                <span onClick={() => toggleProject(group.project.id)} style={{ cursor: 'pointer', fontSize: 12, color: '#6B8B68' }}>
                  {isExpanded ? '▾' : '▸'}
                </span>

                {/* Editable project name — 200% bigger */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveProjectName}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveProjectName(); if (e.key === 'Escape') setEditingProjectId(null); }}
                    style={{
                      fontSize: 26, fontWeight: 700, color: '#3A4E38',
                      background: 'transparent', border: 'none', borderBottom: '2px solid #D4943A',
                      padding: '2px 4px', fontFamily: "'Source Serif 4', serif",
                      outline: 'none', width: '100%', maxWidth: 400,
                    }}
                  />
                ) : (
                  <span
                    onClick={() => startEditing(group.project)}
                    style={{
                      fontSize: 26, fontWeight: 700, color: '#3A4E38',
                      cursor: group.project.id === 'uncategorized' ? 'default' : 'pointer',
                      fontFamily: "'Source Serif 4', serif",
                      borderBottom: group.project.id === 'uncategorized' ? 'none' : '2px solid transparent',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => { if (group.project.id !== 'uncategorized') e.target.style.borderBottom = '2px dashed #B0C8AD'; }}
                    onMouseLeave={(e) => { e.target.style.borderBottom = '2px solid transparent'; }}
                  >
                    {group.project.name}
                  </span>
                )}

                <span style={{ fontSize: 13, color: '#7B9478', fontWeight: 400 }}>({group.drafts.length})</span>
              </div>

              {/* Draft cards */}
              {isExpanded && group.drafts.map(draft => {
                const remaining = draft.unlocksAt - now;
                const isReady = remaining <= 0;

                return (
                  <div key={draft.id} style={{
                    background: isReady ? '#EDF5EB' : '#D8E5D5',
                    borderRadius: 12, padding: '16px 20px', marginBottom: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    opacity: isReady ? 1 : 0.7,
                    transition: 'opacity 0.3s ease',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: isReady ? '#3A4E38' : '#4A5E48',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{getTitle(draft.text)}</div>
                      <div style={{ fontSize: 11, color: '#7B9478', marginTop: 4 }}>
                        {draft.wordCount} words · {new Date(draft.createdAt).toLocaleDateString()}
                        {draft.refined && ' · Sharpened ✓'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
                      {isReady ? (
                        <button onClick={() => onRefine(draft)} style={{
                          padding: '8px 16px', fontSize: 12, fontWeight: 600,
                          background: '#D4943A', color: '#1A5C2A', border: 'none',
                          borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(212,148,58,0.3)',
                        }}>Ready to sharpen →</button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#6B8B68', fontFamily: "'Space Mono', monospace" }}>
                            ⏳ {formatRemaining(remaining)}
                          </span>
                        </div>
                      )}
                      <button onClick={() => handleDelete(draft.id)} style={{
                        padding: '4px 8px', fontSize: 12, background: 'transparent',
                        border: 'none', color: '#9BB898', cursor: 'pointer',
                      }}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
