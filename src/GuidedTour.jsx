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
    body: 'This is your writing space. In "Strict" mode, you can\'t delete — just write forward. Type a few sentences now.',
    action: 'Type anything — keep moving forward.',
    waitFor: 'hasText',
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
    body: 'Stuck? The Draft Tips button gives you creative prompts you can insert directly into your text.',
    action: 'Click Next to continue.',
    waitFor: 'next',
    page: 'flow',
    highlightText: ['Draft Tips'],
  },
  {
    title: 'End Your Session',
    body: 'When you\'re done, click "End Session & Save to Browser" to save. Your draft enters a 12-hour rest period.',
    action: 'Click "End Session & Save to Browser" when ready, or Next to skip ahead.',
    waitFor: 'next',
    page: 'flow',
    highlightText: ['End Session'],
  },
  {
    title: '🌙 My Drafts Page',
    body: 'This is where your resting drafts live. After 12 hours, they\'re ready to sharpen. You can organize them into projects.',
    action: 'Click Next to see the Sharpen page.',
    waitFor: 'next',
    page: 'gap',
  },
  {
    title: 'Ready to Sharpen',
    body: 'When a draft is ready, you\'ll see a gold "Ready to Sharpen" button. Click it to enter the side-by-side editor.',
    action: 'Click Next to see the Sharpen & Edit page.',
    waitFor: 'next',
    page: 'gap',
    highlightText: ['Ready to sharpen'],
  },
  {
    title: '✏️ The Sharpen & Edit Page',
    body: 'This is where you refine your work. Your original draft stays on the left (read-only). Your sharpened edit is on the right. You can drag cards from left to paste text into the right.',
    action: 'Look around, then click Next.',
    waitFor: 'next',
    page: 'refine',
  },
  {
    title: 'Saving Your Sharpened Work',
    body: 'When done editing, click "Done & Save to Browser/Account" to save. You can also copy your sharpened text or download it.',
    action: 'Click Next to finish the tour.',
    waitFor: 'next',
    page: 'refine',
    highlightText: ['Done & Save', 'Copy Sharpened', 'Save Sharpened'],
  },
  {
    title: 'You\'re All Set!',
    body: 'That\'s the Draft, Stop & Sharpen method: write freely, rest your draft, then sharpen with fresh eyes. The best creative work happens in stages.',
    action: 'Click "Finish Tour" to start writing!',
    waitFor: 'finish',
    page: 'flow',
  },
];

export default function GuidedTour({ sessionActive, hasText, showTimePicker, currentPage, onNavigatePage, onEnd }) {
  const [step, setStep] = useState(0);
  const highlightIntervalRef = useRef(null);

  const current = STEPS[step];

  // Navigate to the correct page for this step
  useEffect(() => {
    if (current.page && current.page !== currentPage && onNavigatePage) {
      onNavigatePage(current.page);
    }
  }, [step, current.page, currentPage, onNavigatePage]);

  // Highlight target elements
  useEffect(() => {
    const addPulse = () => {
      // Remove old pulses
      document.querySelectorAll('.tour-pulse').forEach(el => {
        el.classList.remove('tour-pulse');
        el.style.removeProperty('animation');
        el.style.removeProperty('box-shadow');
      });

      if (!current.highlightText) return;

      // Find and highlight matching elements
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

    // Initial highlight + periodic refresh (elements may mount later)
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

  // Auto-advance
  useEffect(() => {
    if (current.waitFor === 'timePicker' && showTimePicker) setStep(s => s + 1);
  }, [showTimePicker, current.waitFor]);

  useEffect(() => {
    if (current.waitFor === 'sessionStart' && sessionActive) setStep(s => s + 1);
  }, [sessionActive, current.waitFor]);

  useEffect(() => {
    if (current.waitFor === 'hasText' && hasText) {
      setTimeout(() => setStep(s => s + 1), 1500);
    }
  }, [hasText, current.waitFor]);

  const handleNext = () => {
    if (current.waitFor === 'finish') {
      clearTour();
      onEnd();
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleSkip = () => {
    clearTour();
    onEnd();
  };

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 900, maxWidth: 500, width: '90%',
      background: '#FDF6EC', borderRadius: 16, padding: '20px 24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 2px #D4943A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      animation: 'tourSlideUp 0.3s ease-out',
    }}>
      <style>{`
        @keyframes tourSlideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
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
        <div style={{
          height: '100%', background: '#D4943A', borderRadius: 2,
          width: `${((step + 1) / STEPS.length) * 100}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#5C4A32', marginBottom: 6, fontFamily: "'Source Serif 4', serif" }}>
        {current.title}
      </h3>
      <p style={{ fontSize: 13, color: '#6B5D4A', lineHeight: 1.6, marginBottom: 8 }}>{current.body}</p>
      <p style={{ fontSize: 12, color: '#D4943A', fontWeight: 600, marginBottom: 14 }}>👉 {current.action}</p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {step > 0 && (
          <button onClick={() => {
            const prevStep = STEPS[step - 1];
            if (prevStep && prevStep.page !== current.page && onNavigatePage) {
              onNavigatePage(prevStep.page);
            }
            setStep(step - 1);
          }} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 600,
            background: 'transparent', border: '1px solid #D4C4A8',
            borderRadius: 8, color: '#8B7B6B', cursor: 'pointer',
          }}>← Back</button>
        )}
        {(current.waitFor === 'next' || current.waitFor === 'finish') && (
          <button onClick={handleNext} style={{
            padding: '8px 20px', fontSize: 12, fontWeight: 700,
            background: '#D4943A', color: '#FFF', border: 'none',
            borderRadius: 8, cursor: 'pointer',
            textShadow: '0 0 10px rgba(212,148,58,0.5)',
          }}>{current.waitFor === 'finish' ? 'Finish Tour ✓' : 'Next →'}</button>
        )}
      </div>
    </div>
  );
}
