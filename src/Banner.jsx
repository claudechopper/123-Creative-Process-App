import { useState } from 'react';
import { useAuth } from './AuthContext';
import { isBannerDismissed, dismissBanner, loadDrafts, downloadTextFile, formatDate } from './storage';

export default function Banner({ mode }) {
  const [dismissed, setDismissed] = useState(isBannerDismissed);
  const { user, login, logout } = useAuth();

  if (dismissed) return null;

  const bg = mode === 'flow' ? '#EDE5D4' : mode === 'gap' ? '#D8E5D5' : '#14201A';
  const color = mode === 'refine' ? '#7A9A80' : mode === 'gap' ? '#4A5E48' : '#8B7B6B';

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
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 48,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color, zIndex: 100, borderTop: '2px solid #8B95A3',
      transition: 'background-color 0.6s ease, color 0.6s ease',
      padding: '0 40px',
    }}>
      {user ? (
        <span>
          Signed in as {user.name}. Drafts sync automatically.
          {' '}<button onClick={logout} style={{
            background: 'none', border: 'none', color: '#8B95A3',
            cursor: 'pointer', textDecoration: 'underline', fontSize: 12,
          }}>Sign out</button>
        </span>
      ) : (
        <span>
          Your drafts live only in this browser.
          {' '}<button onClick={login} style={{
            background: 'none', border: 'none', color: '#8B95A3',
            fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 12,
          }}>Sign in</button> to save to the cloud, or
          {' '}<button onClick={handleDownloadAll} style={{
            background: 'none', border: 'none', color: '#8B95A3',
            fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 12,
          }}>download your drafts</button> now.
        </span>
      )}
      <button onClick={() => { dismissBanner(); setDismissed(true); }} style={{
        position: 'absolute', right: 12, background: 'none', border: 'none',
        color, fontSize: 16, cursor: 'pointer', padding: 4,
      }}>x</button>
    </div>
  );
}
