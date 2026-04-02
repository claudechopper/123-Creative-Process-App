import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { setLoggedIn, syncAllDrafts } from './storage';
import FlowMode from './FlowMode';
import GapMode from './GapMode';
import RefineMode from './RefineMode';
import Banner from './Banner';

export default function App() {
  const [mode, setMode] = useState('flow');
  const [refineDraft, setRefineDraft] = useState(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    setLoggedIn(!!user);
    if (user) syncAllDrafts();
  }, [user]);

  const handleNavigate = (newMode) => {
    setMode(newMode);
    if (newMode !== 'refine') setRefineDraft(null);
  };

  const handleRefine = (draft) => {
    setRefineDraft(draft);
    setMode('refine');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FDF6EC', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8B7B6B',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      {mode === 'flow' && <FlowMode onNavigate={handleNavigate} />}
      {mode === 'gap' && <GapMode onNavigate={handleNavigate} onRefine={handleRefine} />}
      {mode === 'refine' && refineDraft && (
        <RefineMode draft={refineDraft} onNavigate={handleNavigate} />
      )}
      <Banner mode={mode} />
    </>
  );
}
