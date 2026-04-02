import { useState, useEffect } from 'react';

const ONBOARDED_KEY = 'twomodes_onboarded';
const TOUR_KEY = 'twomodes_tour_active';

const silverShimmer = {
  color: '#A8B4C4',
  textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
};

export default function OnboardingPopup({ onStartTour }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDED_KEY)) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setShow(false);
  };

  const startTour = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    localStorage.setItem(TOUR_KEY, 'true');
    setShow(false);
    if (onStartTour) onStartTour();
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div style={{
        background: '#FDF6EC', borderRadius: 20, maxWidth: 600, width: '100%',
        maxHeight: '90vh', overflowY: 'auto', padding: '36px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: '2px solid #A8B4C4',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: '#5A8F6A',
            letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8,
          }}>Welcome to</div>
          <div style={{
            fontSize: 28, fontWeight: 700,
            letterSpacing: '-0.5px',
          }}><span style={silverShimmer}>Draft</span><span style={{ color: '#5C4A32' }}>,</span> <span style={{ color: '#C0392B' }}>Stop</span><span style={{ color: '#D4943A' }}>&nbsp;& Sharpen</span></div>
        </div>

        {/* Section A: The Creative Process */}
        <div style={{
          background: '#F5EDD8', borderRadius: 14, padding: '22px 24px',
          marginBottom: 24,
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: '#5C4A32', marginBottom: 14,
            fontFamily: "'Source Serif 4', serif",
          }}>The best writing happens in stages</h2>

          <p style={{ fontSize: 14, color: '#6B5D4A', lineHeight: 1.7, marginBottom: 14 }}>
            Your first draft should be a stream of consciousness — raw, unfiltered,
            forward-moving. Get it all out.
          </p>

          <p style={{ fontSize: 14, color: '#6B5D4A', lineHeight: 1.7, marginBottom: 14 }}>
            Studies in <em>Frontiers in Human
            Neuroscience</em> show that your brain continues solving problems during
            rest — subjects who slept on a problem were <strong>3x more likely</strong>{' '}
            to discover the solution. Your best ideas don't come while staring at the
            screen. They come after you step away and sleep on it.{' '}
            <strong><em>What's more, your brain uses entirely different circuitry to create than
            it does to critique — these two modes fight each other when forced together.</em></strong>
          </p>

          <p style={{ fontSize: 14, color: '#6B5D4A', lineHeight: 1.7, marginBottom: 14 }}>
            Hemingway was fabled to have said <strong>"Write intoxicated. Edit sober."</strong> —{' '}
            <span style={{ ...silverShimmer, fontWeight: 600 }}>raw creation first</span>,{' '}
            <span style={{ color: '#D4943A', fontWeight: 600 }}>sharp refinement</span> after.
            Anne Lamott, Neil Young, Picasso, Ed Sheeran, Beethoven, and countless other
            celebrated creators across every discipline all followed the same approach.
          </p>

          <p style={{ fontSize: 14, color: '#6B5D4A', lineHeight: 1.7, marginBottom: 18 }}>
            Why? Because{' '}
            <span style={{ ...silverShimmer, fontWeight: 600 }}>drafting</span> and{' '}
            <span style={{ color: '#D4943A', fontWeight: 600 }}>sharpening</span> are
            two completely different frames of mind, and the best artists know how to
            separate them.{' '}
            <strong><em>The whole point is getting words out before your inner critic shows up.</em></strong>
            {' '}<strong style={{ color: '#D4943A' }}>THEN later Sharpening and Refining.</strong>
          </p>

          <div style={{
            fontSize: 15, fontWeight: 700, color: '#5C4A32', marginBottom: 12,
          }}><span style={silverShimmer}>Draft</span>, <span style={{ color: '#C0392B' }}>Stop</span> <span style={{ color: '#D4943A' }}>& Sharpen</span> follows this proven process:</div>

          {[
            { num: '1', stage: 'DRAFT:', label: 'Flow', desc: 'Write/Create/Brainstorm forward without editing. Build momentum.', color: '#A8B4C4' },
            { num: '2', stage: 'STOP:', label: 'The Gap', desc: 'Step away. Let your subconscious work.', color: '#C0392B' },
            { num: '3', stage: 'SHARPEN:', label: 'Refine', desc: 'Return with fresh eyes. Cut, shape, polish.', color: '#D4943A' },
          ].map(step => (
            <div key={step.num} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: step.color,
                color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
                textShadow: step.num === '1' ? '0 0 8px rgba(168,180,196,0.5)' : step.num === '2' ? '0 0 8px rgba(192,57,43,0.5)' : '0 0 8px rgba(212,148,58,0.5)',
              }}>{step.num}</div>
              <div>
                <span style={{ fontWeight: 800, color: step.color, fontSize: 13, letterSpacing: '0.5px', textShadow: step.num === '1' ? silverShimmer.textShadow : 'none' }}>{step.stage}</span>
                {' '}<span style={{ fontWeight: 700, color: '#5C4A32' }}>{step.label}</span>
                <span style={{ color: '#6B5D4A' }}> — {step.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* AI Refine callout */}
        <div style={{
          background: 'linear-gradient(135deg, #A8B4C4 0%, #BEC8D6 50%, #A8B4C4 100%)',
          borderRadius: 14, padding: '18px 24px',
          marginBottom: 24, textAlign: 'center',
          boxShadow: '0 4px 16px rgba(168,180,196,0.4), 0 0 20px rgba(168,180,196,0.15)',
        }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color: '#FFF', lineHeight: 1.5,
          }}>
            Got tons of AI-generated text? You can <span style={{ color: '#D4943A' }}>Sharpen</span> it with our process too.
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 1.5,
          }}>
            Break up your AI drafts, drop them in, and edit side-by-side with your final version.
            Make AI output truly yours.
          </div>
        </div>

        {/* Three buttons row */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24,
          flexWrap: 'wrap',
        }}>
          <button onClick={dismiss} style={{
            padding: '14px 24px', fontSize: 14, fontWeight: 700, flex: 1, minWidth: 140,
            background: 'linear-gradient(135deg, #A8B4C4 0%, #BEC8D6 50%, #A8B4C4 100%)',
            color: '#FFF', border: 'none',
            borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(168,180,196,0.5), 0 0 20px rgba(168,180,196,0.2)',
            textShadow: '0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)',
          }}>Got it, let's write</button>
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer" style={{
            padding: '14px 24px', fontSize: 14, fontWeight: 700, flex: 1, minWidth: 140,
            background: '#D4943A', color: '#FFF', border: 'none',
            borderRadius: 12, cursor: 'pointer', textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(212,148,58,0.4), 0 0 20px rgba(212,148,58,0.2)',
            textShadow: '0 0 10px rgba(212,148,58,0.6), 0 0 20px rgba(212,148,58,0.3)',
          }}>▶ Watch Video</a>
          <button onClick={startTour} style={{
            padding: '14px 24px', fontSize: 14, fontWeight: 700, flex: 1, minWidth: 140,
            background: '#D4943A', color: '#FFF', border: 'none',
            borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(212,148,58,0.4), 0 0 20px rgba(212,148,58,0.2)',
            textShadow: '0 0 10px rgba(212,148,58,0.6), 0 0 20px rgba(212,148,58,0.3)',
          }}>Take the Tour</button>
        </div>

        {/* Section B: How This Site Works */}
        <div style={{
          background: '#F5EDD8', borderRadius: 14, padding: '22px 24px',
        }}>
          <h2 style={{
            fontSize: 24, fontWeight: 700, color: '#5A8F6A', margin: 0, marginBottom: 14,
            fontFamily: "'Source Serif 4', serif",
          }}>How This Site Works:</h2>

          {[
            { name: '"Strict" / "Gentle"', desc: '"Strict" blocks backspace entirely. "Gentle" allows it.', color: '#1A1A1A' },
            { name: 'Start Session', desc: 'Pick your time, then write until the timer ends.', color: '#1A1A1A' },
            { name: 'End Session & Save', desc: 'This saves your draft to the browser (or your account if you\'re signed in) and starts the 12-hour stop period.', color: '#1A1A1A' },
            { name: 'My Drafts', desc: 'View all your resting and ready drafts.', color: '#A8B4C4' },
            { name: 'Ready to Sharpen', desc: 'Opens side-by-side editing when the stop period is over.', color: '#A8B4C4' },
            { name: 'Hints & Tips', desc: 'Creative techniques to help you write and edit.', color: '#A8B4C4' },
          ].map(item => (
            <div key={item.name} style={{
              display: 'flex', gap: 8, marginBottom: 8, fontSize: 13,
              lineHeight: 1.5,
            }}>
              <span style={{
                fontWeight: 700, color: item.color, whiteSpace: 'nowrap',
              }}>{item.name}</span>
              <span style={{ color: '#6B5D4A' }}>— {item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDED_KEY);
}

export function isTourActive() {
  return localStorage.getItem(TOUR_KEY) === 'true';
}

export function clearTour() {
  localStorage.removeItem(TOUR_KEY);
}
