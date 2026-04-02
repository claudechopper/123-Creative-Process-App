import { useState, useEffect } from 'react';
import { clearTour } from './OnboardingPopup';

const STEPS = [
  {
    title: 'Welcome to Your Tour!',
    body: 'We\'ll walk you through your first writing session step by step. Let\'s start by picking how long you want to write.',
    action: 'Click "Continue without signing in" or "Start Session" to begin.',
    waitFor: 'timePicker',
  },
  {
    title: 'Pick a Duration',
    body: 'Choose how long your writing session will be. For this tour, try picking 5 minutes — you can always end early.',
    action: 'Click any time duration to start.',
    waitFor: 'sessionStart',
  },
  {
    title: 'Start Writing!',
    body: 'This is your writing space. In "Strict" mode, you can\'t delete — just write forward. Try typing a few sentences now.',
    action: 'Type anything — just keep moving forward.',
    waitFor: 'hasText',
  },
  {
    title: 'Strict vs Gentle Mode',
    body: 'See the toggle at the top? "Strict" blocks your backspace key to keep you moving forward. Switch to "Gentle" if you want backspace. Try toggling it!',
    action: 'Try switching between Strict and Gentle.',
    waitFor: 'next',
  },
  {
    title: 'Draft Tips',
    body: 'Stuck? Click "💡 Draft Tips" for creative writing prompts you can insert directly into your text.',
    action: 'Click Next to continue.',
    waitFor: 'next',
  },
  {
    title: 'Save to Computer',
    body: 'The "↓ Save to Computer" button downloads your draft as a text file — a backup outside the browser.',
    action: 'Click Next to continue.',
    waitFor: 'next',
  },
  {
    title: 'End Your Session',
    body: 'When you\'re done writing, click "End Session & Save to Browser" to save your draft. It will then enter a 12-hour rest period before you can sharpen it.',
    action: 'Click "End Session & Save to Browser" when ready, or click Next to skip ahead.',
    waitFor: 'next',
  },
  {
    title: 'My Drafts Page',
    body: 'After saving, you land on "My Drafts" — your resting drafts live here. Once the 12-hour stop period ends, you\'ll see "Ready to Sharpen" on each draft.',
    action: 'Click Next to continue.',
    waitFor: 'next',
  },
  {
    title: 'Sharpen & Edit',
    body: 'When a draft is ready, click "Ready to Sharpen" to open the side-by-side editor. The left shows your original, the right is where you sharpen and refine.',
    action: 'Click Next to continue.',
    waitFor: 'next',
  },
  {
    title: 'You\'re All Set!',
    body: 'That\'s the Draft, Stop & Sharpen method: write freely, rest your draft, then return with fresh eyes to sharpen it. The best creative work happens in stages.',
    action: 'Click "Finish Tour" to start writing!',
    waitFor: 'finish',
  },
];

export default function GuidedTour({ sessionActive, hasText, showTimePicker, onEnd }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const current = STEPS[step];

  // Auto-advance for certain steps
  useEffect(() => {
    if (current.waitFor === 'timePicker' && showTimePicker) {
      setStep(s => s + 1);
    }
  }, [showTimePicker, current.waitFor]);

  useEffect(() => {
    if (current.waitFor === 'sessionStart' && sessionActive) {
      setStep(s => s + 1);
    }
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
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    clearTour();
    onEnd();
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 900, maxWidth: 500, width: '90%',
      background: '#FDF6EC', borderRadius: 16, padding: '20px 24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 2px #D4943A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      animation: 'slideUp 0.3s ease-out',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Step indicator */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#D4943A',
          letterSpacing: '1px', textTransform: 'uppercase',
        }}>Step {step + 1} of {STEPS.length}</span>
        <button onClick={handleSkip} style={{
          background: 'none', border: 'none', color: '#8B7B6B',
          fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
        }}>Skip Tour</button>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3, background: '#EDE5D4', borderRadius: 2, marginBottom: 14,
      }}>
        <div style={{
          height: '100%', background: '#D4943A', borderRadius: 2,
          width: `${((step + 1) / STEPS.length) * 100}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      <h3 style={{
        fontSize: 16, fontWeight: 700, color: '#5C4A32', marginBottom: 6,
        fontFamily: "'Source Serif 4', serif",
      }}>{current.title}</h3>

      <p style={{ fontSize: 13, color: '#6B5D4A', lineHeight: 1.6, marginBottom: 8 }}>
        {current.body}
      </p>

      <p style={{ fontSize: 12, color: '#D4943A', fontWeight: 600, marginBottom: 14 }}>
        👉 {current.action}
      </p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} style={{
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
