import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { setLoggedIn, syncAllDrafts } from './storage';
import FlowMode from './FlowMode';
import GapMode from './GapMode';
import RefineMode from './RefineMode';
import Banner from './Banner';
import OnboardingPopup, { isTourActive, clearTour } from './OnboardingPopup';
import GuidedTour from './GuidedTour';

export default function App() {
  const [mode, setMode] = useState('flow');
  const [refineDraft, setRefineDraft] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourFlowState, setTourFlowState] = useState({ sessionActive: false, hasText: false, showTimePicker: false });
  const { user, loading } = useAuth();

  useEffect(() => {
    setLoggedIn(!!user);
    if (user) syncAllDrafts();
  }, [user]);

  useEffect(() => {
    if (isTourActive()) setTourActive(true);
  }, []);

  const handleNavigate = (newMode) => {
    setMode(newMode);
    if (newMode !== 'refine') setRefineDraft(null);
  };

  const handleRefine = (draft) => {
    setRefineDraft(draft);
    setMode('refine');
  };

  const handleStartTour = () => setTourActive(true);

  const handleEndTour = () => {
    clearTour();
    setTourActive(false);
    setMode('flow');
  };

  const handleTourNavigate = (page) => {
    setMode(page);
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
      <OnboardingPopup onStartTour={handleStartTour} />
      {mode === 'flow' && (
        <FlowMode
          onNavigate={handleNavigate}
          tourActive={tourActive}
          onTourEnd={handleEndTour}
          onTourState={tourActive ? setTourFlowState : undefined}
        />
      )}
      {mode === 'gap' && <GapMode onNavigate={handleNavigate} onRefine={handleRefine} />}
      {mode === 'refine' && refineDraft && (
        <RefineMode draft={refineDraft} onNavigate={handleNavigate} />
      )}
      <Banner mode={mode} />
      {tourActive && (
        <GuidedTour
          sessionActive={tourFlowState.sessionActive}
          hasText={tourFlowState.hasText}
          showTimePicker={tourFlowState.showTimePicker}
          currentPage={mode}
          onNavigatePage={handleTourNavigate}
          onEnd={handleEndTour}
        />
      )}
    </>
  );
}
