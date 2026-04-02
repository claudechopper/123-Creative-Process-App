import { useState, useEffect } from 'react';

const ONBOARDED_KEY = 'twomodes_onboarded';

export default function OnboardingPopup() {
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
        border: '2px solid #D4943A',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: '#D4943A',
            letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8,
          }}>Welcome to</div>
          <div style={{
            fontSize: 32, fontWeight: 700, color: '#5C4A32',
            letterSpacing: '-0.5px',
          }}>draft<span style={{ color: '#D4943A' }}>&nbsp;& sharpen</span></div>
        </div>

        {/* Section A: The Creative 1-2-3 */}
        <div style={{
          background: '#F5EDD8', borderRadius: 14, padding: '22px 24px',
          marginBottom: 24,
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: '#5C4A32', marginBottom: 14,
            fontFamily: "'Source Serif 4', serif",
          }}>The best writing happens in stages</h2>

          <p style={{ fontSize: 14, color: '#6B5D4A', lineHeight: 1.7, marginBottom: 14 }}>
            In 1926, psychologist Graham Wallas identified four stages of creativity:
            Preparation, Incubation, Illumination, and Verification. Since then,
            studies in <em>Frontiers in Human Neuroscience</em> have confirmed that
            your brain continues solving problems during rest — subjects who slept
            on a problem were <strong>3x more likely</strong> to find the solution.
          </p>

          <p style={{ fontSize: 14, color: '#6B5D4A', lineHeight: 1.7, marginBottom: 18 }}>
            Hemingway wrote standing up every morning, then walked away. He said:
            <em> "You write until you come to a place where you still have your juice."</em>
            {' '}Anne Lamott called first drafts "shitty first drafts" — the whole
            point is getting words out before your inner critic shows up.
          </p>

          <div style={{
            fontSize: 15, fontWeight: 700, color: '#5C4A32', marginBottom: 12,
          }}>Draft & Sharpen follows this proven process:</div>

          {[
            { num: '1', label: 'Flow', desc: 'Write forward without editing. Build momentum.', color: '#D4943A' },
            { num: '2', label: 'The Gap', desc: 'Step away. Let your subconscious work.', color: '#6B8B68' },
            { num: '3', label: 'Refine', desc: 'Return with fresh eyes. Cut, shape, polish.', color: '#305040' },
          ].map(step => (
            <div key={step.num} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: step.color,
                color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>{step.num}</div>
              <div>
                <span style={{ fontWeight: 700, color: '#5C4A32' }}>{step.label}</span>
                <span style={{ color: '#6B5D4A' }}> — {step.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* AI Refine callout */}
        <div style={{
          background: '#D4943A', borderRadius: 14, padding: '18px 24px',
          marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color: '#FFF', lineHeight: 1.5,
          }}>
            Got tons of AI-generated text? Refine it here too.
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 1.5,
          }}>
            Break up your AI drafts, drop them in, and edit side-by-side with your final version.
            Make AI output truly yours.
          </div>
        </div>

        {/* Section B: How It Works */}
        <div style={{
          background: '#F5EDD8', borderRadius: 14, padding: '22px 24px',
          marginBottom: 28,
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 700, color: '#5C4A32', marginBottom: 14,
            fontFamily: "'Source Serif 4', serif",
          }}>How It Works</h2>

          {[
            { name: 'Strict / Gentle', desc: 'Strict blocks backspace entirely. Gentle allows it.' },
            { name: 'Start Session', desc: 'Pick your time, then write until the timer ends.' },
            { name: 'End Session & Save', desc: 'Saves your draft and starts the 24-hour gap.' },
            { name: 'My Drafts', desc: 'View all your resting and ready drafts.' },
            { name: 'Ready to Refine', desc: 'Opens side-by-side editing when the gap is over.' },
            { name: 'Hints & Tips', desc: 'Creative techniques to help you write and edit.' },
          ].map(item => (
            <div key={item.name} style={{
              display: 'flex', gap: 8, marginBottom: 8, fontSize: 13,
              lineHeight: 1.5,
            }}>
              <span style={{
                fontWeight: 700, color: '#D4943A', whiteSpace: 'nowrap',
              }}>{item.name}</span>
              <span style={{ color: '#6B5D4A' }}>— {item.desc}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={dismiss} style={{
            padding: '14px 40px', fontSize: 16, fontWeight: 700,
            background: '#D4943A', color: '#FFF', border: 'none',
            borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(212,148,58,0.3)',
          }}>Got it, let's write</button>
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDED_KEY);
}
