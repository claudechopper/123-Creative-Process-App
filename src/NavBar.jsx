export default function NavBar({ currentPage, onNavigate }) {
  const pages = [
    { id: 'flow', label: '✍️ Draft', color: '#A8B4C4', glow: '0 0 10px rgba(168,180,196,0.5)' },
    { id: 'gap', label: '🌙 Drafts/Stop', color: '#C0392B', glow: 'none' },
    { id: 'refine', label: '✏️ Sharpen', color: '#5A8F6A', glow: 'none' },
    { id: 'done', label: '✭ Polished', color: '#D4943A', glow: '0 0 10px rgba(212,148,58,0.4)' },
  ];

  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap',
    }}>
      {pages.map(p => {
        const isActive = currentPage === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onNavigate(p.id)}
            style={{
              padding: '5px 12px', fontSize: 10, fontWeight: isActive ? 700 : 500,
              border: `1.5px solid ${p.color}`,
              borderRadius: 7, cursor: 'pointer',
              background: isActive ? p.color : 'transparent',
              color: isActive ? '#FFF' : p.color,
              textShadow: isActive ? p.glow : 'none',
              opacity: isActive ? 1 : 0.8,
              transition: 'all 0.15s ease',
              letterSpacing: '0.3px',
            }}
          >{p.label}</button>
        );
      })}
    </div>
  );
}
