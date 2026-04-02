import { useState } from 'react';
import FlowMode from './FlowMode';
import GapMode from './GapMode';
import RefineMode from './RefineMode';
import Banner from './Banner';

export default function App() {
  const [mode, setMode] = useState('flow');
  const [refineDraft, setRefineDraft] = useState(null);

  const handleNavigate = (newMode) => {
    setMode(newMode);
    if (newMode !== 'refine') setRefineDraft(null);
  };

  const handleRefine = (draft) => {
    setRefineDraft(draft);
    setMode('refine');
  };

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
