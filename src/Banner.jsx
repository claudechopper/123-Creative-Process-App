import { useState } from 'react';
import { useAuth } from './AuthContext';
import { isBannerDismissed, dismissBanner, loadDrafts, downloadTextFile, formatDate } from './storage';
import useIsMobile from './useIsMobile';

export default function Banner({ mode }) {
  const [dismissed, setDismissed] = useState(isBannerDismissed);
  const { user, login, logout } = useAuth();
  const isMobile = useIsMobile();

  if (dismissed) return null;

  const bg = mode === 'done' ? '#F0E8D0' : mode === 'flow' ? '#EDE5D4' : mode === 'gap' ? '#E5D8D5' : '#14201A';
  const color = mode === 'done' ? '#8B7B6B' : mode === 'refine' ? '#7A9A80' : mode === 'gap' ? '#5E4A48' : '#8B7B6B';

  const handleDownloadAll = () => {
    const drafts = loadDrafts();
    if (drafts.length === 0) { alert('No drafts to save yet.'); return; }
    const content = drafts.map((d, i) =>
      `--- Draft ${i + 1} (${d.wordCount} words, ${new Date(d.createdAt).toLocaleString()}) ---\n\n${d.text}\n${d.refinedText ? `\n--- Sharpened ---\n\n${d.refinedText}\n` : ''}`
    ).join('\n\n');
    downloadTextFile(content, `draft-stop-sharpen-all-drafts-${formatDate()}.txt`);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      minHeight: isMobile ? 40 : 48,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: isMobile ? 10 : 12, color, zIndex: 100, borderTop: '2px solid #A8B4C4',
      transition: 'background-color 0.6s ease, color 0.6s ease',
      padding: isMobile ? '6px 36px 6px 12px' : '0 40px',
      textAlign: 'center', lineHeight: 1.4,
      flexWrap: 'wrap',
    }}>
      {user ? (
        <span>
          Signed in as {user.name}. Drafts sync automatically.
          {' '}<button onClick={logout} style={{
            background: 'none', border: 'none', color: '#A8B4C4',
            cursor: 'pointer', textDecoration: 'underline', fontSize: isMobile ? 10 : 12,
          }}>Sign out</button>
        </span>
      ) : (
        <span>
          Your drafts live only in this browser.
          {' '}<button onClick={login} style={{
            background: 'none', border: 'none', color: '#A8B4C4',
            fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: isMobile ? 10 : 12,
          }}>Sign in</button> to save to the cloud, or
          {' '}<button onClick={handleDownloadAll} style={{
            background: 'none', border: 'none', color: '#A8B4C4',
            fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: isMobile ? 10 : 12,
          }}>download your drafts</button> now.
        </span>
      )}
      <button onClick={() => { dismissBanner(); setDismissed(true); }} style={{
        position: 'absolute', right: 8, background: 'none', border: 'none',
        color, fontSize: 16, cursor: 'pointer', padding: 4,
      }}>x</button>
    </div>
  );
}
