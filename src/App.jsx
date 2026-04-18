import { useState, useEffect } from 'react';
// Auth and cloud sync removed — app is fully local now.
import FlowMode from './FlowMode';
import GapMode from './GapMode';
import RefineMode from './RefineMode';
import DonePage from './DonePage';
import Banner from './Banner';
import OnboardingPopup, { isTourActive, clearTour } from './OnboardingPopup';
import GuidedTour from './GuidedTour';
import ErrorBoundary from './ErrorBoundary';
import MadeBy from './MadeBy';
import { loadDrafts } from './storage';

function AppInner() {
  const [mode, setMode] = useState('flow');
  const [refineDraft, setRefineDraft] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourFlowState, setTourFlowState] = useState({ sessionActive: false, hasText: false, showTimePicker: false, showSaveModal: false });

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
    if (page === 'refine') {
      // Auto-select first draft for tour
      const drafts = loadDrafts();
      if (drafts.length > 0) {
        setRefineDraft(drafts[0]);
        setMode('refine');
      }
      return;
    }
    setMode(page);
  };

  return (
    <>
      <OnboardingPopup onStartTour={handleStartTour} />
      {mode === 'flow' && (
        <FlowMode
          onNavigate={handleNavigate}
          onRefine={handleRefine}
          tourActive={tourActive}
          onStartTour={handleStartTour}
          onTourEnd={handleEndTour}
          onTourState={tourActive ? setTourFlowState : undefined}
        />
      )}
      {mode === 'gap' && <GapMode onNavigate={handleNavigate} onRefine={handleRefine} />}
      {mode === 'refine' && refineDraft && (
        <RefineMode draft={refineDraft} onNavigate={handleNavigate} />
      )}
      {mode === 'done' && <DonePage onNavigate={handleNavigate} onRefine={handleRefine} />}
      <Banner mode={mode} />
      <MadeBy />
      {tourActive && (
        <GuidedTour
          sessionActive={tourFlowState.sessionActive}
          hasText={tourFlowState.hasText}
          showTimePicker={tourFlowState.showTimePicker}
          showSaveModal={tourFlowState.showSaveModal}
          currentPage={mode}
          onNavigatePage={handleTourNavigate}
          onEnd={handleEndTour}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
