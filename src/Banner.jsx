import { useState } from 'react';
import { isBannerDismissed, dismissBanner } from './storage';

export default function Banner({ mode }) {
  const [dismissed, setDismissed] = useState(isBannerDismissed);
  if (dismissed) return null;

  const bg = mode === 'flow' ? '#EDE5D4' : mode === 'gap' ? '#DDD9D4' : '#141D2A';
  const color = mode === 'refine' ? '#8899AA' : '#8B7B6B';

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 40,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color, zIndex: 100,
      transition: 'background-color 0.6s ease, color 0.6s ease',
    }}>
      <span>Your drafts are saved in this browser. Cloud sync & login coming soon — follow @twomodes for updates.</span>
      <button onClick={() => { dismissBanner(); setDismissed(true); }} style={{
        position: 'absolute', right: 12, background: 'none', border: 'none',
        color, fontSize: 16, cursor: 'pointer', padding: 4,
      }}>×</button>
    </div>
  );
}
