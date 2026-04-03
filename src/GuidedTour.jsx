import { useState, useEffect, useRef } from 'react';
import { clearTour } from './OnboardingPopup';

const STEPS = [
  {
    title: 'Welcome to Your Tour!',
    body: 'Let\'s walk through your first writing session. Start by clicking the button below to begin.',
    action: 'Click "Continue without signing in" or "Start Session".',
    waitFor: 'timePicker',
    page: 'flow',
    highlightText: ['Continue without signing in', 'Start Session'],
  },
  {
    title: 'Pick a Duration',
    body: 'Choose how long your writing session will be. Try 5 minutes for this tour — you can always end early.',
    action: 'Click any time duration.',
    waitFor: 'sessionStart',
    page: 'flow',
    highlightText: ['5 min'],
  },
  {
    title: 'Start Writing!',
    body: 'This is your writing space. In "Strict" mode, you can\'t delete — just write forward. Try typing a few sentences, or click Next to skip ahead.',
    action: 'Type anything or click Next.',
    waitFor: 'next',
    page: 'flow',
  },
  {
    title: '"Strict" vs "Gentle" Mode',
    body: 'See the toggle at the top right? "Strict" blocks backspace to keep you moving forward. "Gentle" allows it.',
    action: 'Try switching between Strict and Gentle, then click Next.',
    waitFor: 'next',
    page: 'flow',
    highlightText: ['Strict', 'Gentle'],
  },
  {
    title: '💡 Draft Tips',
    body: 'Stuck? The Draft Tips button gives you category-specific creative prompts you can insert directly into your text.',
    action: 'Click Next to continue.',
    waitFor: 'next',
    page: 'flow',
    highlightText: ['Draft Tips'],
  },
  {
    title: 'Finish Your Session',
    body: 'When you\'re done, click "Finish Session & Save to Browser" to save your draft. It will then enter a 12-hour incubation period on the Stop & Incubate page. You can override this wait and start editing right away, but we don\'t recommend it.',
    action: 'Click the button when ready, or Next to skip ahead.',
    waitFor: 'sessionEnd',
    page: 'flow',
    highlightText: ['Finish Session'],
    position: 'center',
  },
  {
    title: 'Save Your Draft',
    body: 'Choose to save as a new draft, save to a project, or create a new project for it.',
    action: 'Save your draft, or click Next to continue.',
    waitFor: 'next',
    page: 'flow',
    highlightText: ['Save as New'],
  },
  {
    title: '🌙 The Drafts/Stop Page',
    body: 'This is your Stop & Incubate page — where your drafts rest and live. You can organize them into projects, drag them between projects, and create new projects here.',
    action: 'Click Next to continue.',
    waitFor: 'next',
    page: 'gap',
  },
  {
    title: '⏳ The 12-Hour Incubation',
    body: 'Research shows sleeping on your work dramatically improves your editing ability. Your brain uses different neural pathways for creation vs. critique. That\'s why we suggest a 12-hour incubation. You CAN override this with the silver "Override" button if you need to, but we don\'t recommend it — your sharpening will be better after rest.',
    action: 'Click Next to see the Sharpen & Edit page.',
    waitFor: 'next',
    page: 'gap',
    highlightText: ['Ready to sharpen', 'Override'],
  },
  {
    title: '✏️ The Sharpen & Edit Page',
    body: 'This is where you refine your work. Your original draft stays on the left (read-only). Your "Final" sharpened edit is on the right. You can drag cards from the left and drop them into the right column.',
    action: 'Look around, then click Next.',
    waitFor: 'next',
    page: 'refine',
  },
  {
    title: 'Saving Your Sharpened Work',
    body: 'When done editing, click "Finish & Save to Browser/Account" to save. OR just hit "← Back to Drafts" and it will also automatically save to your browser. You can also copy your sharpened text or download it to your computer for extra safe keeping.',
    action: 'Try clicking "Finish & Save" or "← Back to Drafts", or click Next.',
    waitFor: 'leaveRefine',
    page: 'refine',
    highlightText: ['Finish & Save', 'Copy Sharpened', 'Save Sharpened', 'Back to Drafts'],
  },
  {
    title: 'You\'re All Set!',
    body: 'That\'s the Draft, Stop & Sharpen method: write freely, rest your draft, then sharpen with fresh eyes. The best creative work happens in stages.',
    action: 'Click "Finish Tour" to start writing!',
    waitFor: 'finish',
    page: null,
  },
];

export default function GuidedTour({ sessionActive, hasText, showTimePicker, showSaveModal, currentPage, onNavigatePage, onEnd }) {
  const [step, setStep] = useState(0);
  const prevStepRef = useRef(0);
  const highlightIntervalRef = useRef(null);

  const current = STEPS[step];

  // Navigate to the correct page for this step
  // Skip navigation if we just auto-advanced from leaveRefine (page already changed)
  useEffect(() => {
    if (current.page && current.page !== currentPage && onNavigatePage) {
      // Don't force navigation on the final step — user is already where they need to be
      if (current.waitFor === 'finish') return;
      onNavigatePage(current.page);
    }
  }, [step, current.page, currentPage, onNavigatePage]);

  // Highlight target elements
  useEffect(() => {
    const addPulse = () => {
      document.querySelectorAll('.tour-pulse').forEach(el => {
        el.classList.remove('tour-pulse');
        el.style.removeProperty('animation');
        el.style.removeProperty('box-shadow');
      });
      if (!current.highlightText) return;
      const allButtons = document.querySelectorAll('button, a');
      allButtons.forEach(btn => {
        const text = btn.textContent || '';
        if (current.highlightText.some(t => text.includes(t))) {
          btn.classList.add('tour-pulse');
          btn.style.animation = 'tourPulse 1.5s ease-in-out infinite';
          btn.style.boxShadow = '0 0 0 3px #D4943A, 0 0 20px rgba(212,148,58,0.6), 0 0 40px rgba(212,148,58,0.3)';
          btn.style.position = 'relative';
          btn.style.zIndex = '50';
        }
      });
    };
    addPulse();
    highlightIntervalRef.current = setInterval(addPulse, 500);
    return () => {
      clearInterval(highlightIntervalRef.current);
      document.querySelectorAll('.tour-pulse').forEach(el => {
        el.classList.remove('tour-pulse');
        el.style.removeProperty('animation');
        el.style.removeProperty('box-shadow');
        el.style.removeProperty('z-index');
      });
    };
  }, [step, current.highlightText]);

  // Auto-advance: time picker opened
  useEffect(() => {
    if (current.waitFor === 'timePicker' && showTimePicker) setStep(s => s + 1);
  }, [showTimePicker, current.waitFor]);

  // Auto-advance: session started
  useEffect(() => {
    if (current.waitFor === 'sessionStart' && sessionActive) setStep(s => s + 1);
  }, [sessionActive, current.waitFor]);

  // Auto-advance: session ended (user clicked finish session)
  useEffect(() => {
    if (current.waitFor === 'sessionEnd' && !sessionActive && prevStepRef.current === step) {
      setStep(s => s + 1);
    }
  }, [sessionActive, current.waitFor, step]);

  // Auto-advance: save modal appeared
  useEffect(() => {
    if (current.waitFor === 'savedDraft' && showSaveModal) {
      // Wait for save modal to close (draft was saved)
    }
    if (current.waitFor === 'savedDraft' && !showSaveModal && currentPage === 'gap') {
      setStep(s => s + 1);
    }
  }, [showSaveModal, current.waitFor, currentPage]);

  // Auto-advance: left the refine page (user clicked Back to Drafts or Finish & Save)
  useEffect(() => {
    if (current.waitFor === 'leaveRefine' && currentPage !== 'refine') {
      setStep(s => s + 1);
    }
  }, [currentPage, current.waitFor]);

  // Auto-advance: page changed and matches next step's page
  // But NOT if current step has its own waitFor handler (leaveRefine, sessionEnd, etc.)
  useEffect(() => {
    if (step < STEPS.length - 1 && current.waitFor === 'next') {
      const nextStep = STEPS[step + 1];
      if (current.page && current.page !== currentPage && nextStep.page === currentPage) {
        setStep(s => s + 1);
      }
    }
  }, [currentPage, step, current.page, current.waitFor]);

  // Track previous step for auto-advance logic
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);

  const handleNext = () => {
    if (current.waitFor === 'finish') { clearTour(); onEnd(); return; }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      const newStep = step - 1;
      const prevStepData = STEPS[newStep];
      if (prevStepData.page !== current.page && onNavigatePage) {
        onNavigatePage(prevStepData.page);
      }
      setStep(newStep);
    }
  };

  const handleSkip = () => { clearTour(); onEnd(); };

  const isCentered = current.position === 'center';
  const showNext = current.waitFor === 'next' || current.waitFor === 'finish' || current.waitFor === 'sessionEnd' || current.waitFor === 'savedDraft' || current.waitFor === 'leaveRefine';

  return (
    <div style={{
      position: 'fixed',
      ...(isCentered ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } : { bottom: 20, left: '50%', transform: 'translateX(-50%)' }),
      zIndex: 900, maxWidth: 500, width: '90%',
      background: '#FDF6EC', borderRadius: 16, padding: '20px 24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 2px #D4943A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <style>{`
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 0 3px #D4943A, 0 0 20px rgba(212,148,58,0.6), 0 0 40px rgba(212,148,58,0.3); }
          50% { box-shadow: 0 0 0 6px #D4943A, 0 0 30px rgba(212,148,58,0.8), 0 0 60px rgba(212,148,58,0.5); }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#D4943A', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Step {step + 1} of {STEPS.length}
        </span>
        <button onClick={handleSkip} style={{
          background: 'none', border: 'none', color: '#8B7B6B',
          fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
        }}>Skip Tour</button>
      </div>

      <div style={{ height: 3, background: '#EDE5D4', borderRadius: 2, marginBottom: 14 }}>
        <div style={{ height: '100%', background: '#D4943A', borderRadius: 2, width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#5C4A32', marginBottom: 6, fontFamily: "'Source Serif 4', serif" }}>{current.title}</h3>
      <p style={{ fontSize: 13, color: '#6B5D4A', lineHeight: 1.6, marginBottom: 8 }}>{current.body}</p>
      <p style={{ fontSize: 12, color: '#D4943A', fontWeight: 600, marginBottom: 14 }}>👉 {current.action}</p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {step > 0 && (
          <button onClick={handleBack} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 600,
            background: 'transparent', border: '1px solid #D4C4A8',
            borderRadius: 8, color: '#8B7B6B', cursor: 'pointer',
          }}>← Back</button>
        )}
        {showNext && (
          <button onClick={handleNext} style={{
            padding: '8px 20px', fontSize: 12, fontWeight: 700,
            background: '#D4943A', color: '#FFF', border: 'none',
            borderRadius: 8, cursor: 'pointer',
          }}>{current.waitFor === 'finish' ? 'Finish Tour ✓' : 'Next →'}</button>
        )}
      </div>
    </div>
  );
}
