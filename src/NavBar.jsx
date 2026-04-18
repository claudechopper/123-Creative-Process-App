import useIsMobile from './useIsMobile';

export default function NavBar({ currentPage, onNavigate, onSharpen }) {
  const isMobile = useIsMobile();

  const pages = [
    { id: 'flow', label: '✍️ 1st Draft', mobileLabel: '✍️ Draft', color: '#A8B4C4', glow: '0 0 10px rgba(168,180,196,0.5)' },
    { id: 'gap', label: '🌙 All Drafts/Incubation', mobileLabel: '🌙 Drafts', color: '#C0392B', glow: 'none' },
    { id: 'refine', label: '✏️ Sharpen & Edit', mobileLabel: '✏️ Edit', color: '#5A8F6A', glow: 'none', needsDraft: true },
    { id: 'done', label: '✭ Finished Works', mobileLabel: '✭ Done', color: '#D4943A', glow: '0 0 10px rgba(212,148,58,0.4)' },
  ];

  return (
    <div style={{
      display: 'flex', gap: isMobile ? 4 : 6, flexWrap: 'wrap',
    }}>
      {pages.map(p => {
        const isActive = currentPage === p.id;
        const handleClick = () => {
          if (isActive) return;
          if (p.needsDraft) {
            if (onSharpen) {
              onSharpen();
            } else {
              onNavigate('gap');
            }
            return;
          }
          onNavigate(p.id);
        };
        return (
          <button
            key={p.id}
            onClick={handleClick}
            style={{
              padding: isMobile ? '5px 8px' : '5px 12px',
              fontSize: isMobile ? 9 : 10, fontWeight: isActive ? 700 : 500,
              border: `1.5px solid ${p.color}`,
              borderRadius: 7, cursor: 'pointer',
              background: isActive ? p.color : 'transparent',
              color: isActive ? '#FFF' : p.color,
              textShadow: isActive ? p.glow : 'none',
              opacity: isActive ? 1 : 0.8,
              transition: 'all 0.15s ease',
              letterSpacing: '0.3px',
            }}
          >{isMobile ? p.mobileLabel : p.label}</button>
        );
      })}
    </div>
  );
}
