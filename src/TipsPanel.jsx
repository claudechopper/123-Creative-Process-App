const FLOW_TIPS = [
  {
    title: "Don't stop moving",
    body: "Peter Elbow's freewriting rule: if you're stuck, write \"I don't know what to write\" until something comes. The act of writing summons the words.",
  },
  {
    title: "Start with a question",
    body: "Begin with \"What am I trying to say?\" and answer it. Questions activate your brain's search mode.",
  },
  {
    title: "Use a prompt",
    body: "\"Write about a time when...\" or \"The thing I can't stop thinking about is...\" A single sentence can unlock thousands of words.",
  },
  {
    title: "Lower the stakes",
    body: "Natalie Goldberg (Writing Down the Bones): \"Give yourself permission to write the worst junk in America.\" No one sees this but you.",
  },
  {
    title: "Follow the energy",
    body: "If a tangent excites you, follow it. The best material hides in detours. You can always reorganize later in Refine mode.",
  },
  {
    title: "Engage your senses",
    body: "Describe what you see, hear, smell, taste, touch. Sensory detail activates different brain regions and unlocks creative flow.",
  },
];

const REFINE_TIPS = [
  {
    title: "Read it aloud",
    body: "Your ear catches what your eye misses. If you stumble over a sentence, your reader will too.",
  },
  {
    title: "Cut the first paragraph",
    body: "Most drafts start with throat-clearing. The real beginning is usually paragraph 2 or 3. Try deleting your opening and see if it improves.",
  },
  {
    title: "Kill your darlings",
    body: "Faulkner and Quiller-Couch both said it: if a sentence exists only because you're proud of it, it probably should go.",
  },
  {
    title: "One idea per paragraph",
    body: "If a paragraph does two things, split it. Clarity comes from separation. Your reader can only hold one thought at a time.",
  },
  {
    title: "Active over passive",
    body: "\"She wrote the letter\" beats \"The letter was written by her.\" Active voice is shorter, clearer, and more engaging.",
  },
  {
    title: "Hemingway's question",
    body: "For every sentence, ask: \"Is this true?\" Delete what isn't. Truth — emotional or literal — is what makes writing resonate.",
  },
];

export default function TipsPanel({ mode, onClose }) {
  const tips = mode === 'flow' ? FLOW_TIPS : REFINE_TIPS;
  const isRefine = mode === 'refine';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: isRefine ? '#14201A' : '#FDF6EC',
        borderRadius: 18, maxWidth: 480, width: '100%',
        maxHeight: '80vh', overflowY: 'auto', padding: '28px 26px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        border: '2px solid #D4943A',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 700, margin: 0,
            color: isRefine ? '#E8EDF2' : '#5C4A32',
            fontFamily: "'Source Serif 4', serif",
          }}>
            {mode === 'flow' ? 'Writing Tips' : 'Editing Tips'}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: isRefine ? '#7A9A80' : '#8B7B6B', padding: 4,
          }}>x</button>
        </div>

        <p style={{
          fontSize: 13, lineHeight: 1.6, marginBottom: 20,
          color: isRefine ? '#7A9A80' : '#8B7B6B',
        }}>
          {mode === 'flow'
            ? 'Proven techniques to help you build momentum and keep the words flowing.'
            : 'Techniques used by professional editors and celebrated writers to sharpen prose.'}
        </p>

        {/* Tips list */}
        {tips.map((tip, i) => (
          <div key={i} style={{
            background: isRefine ? '#1A2B22' : '#F5EDD8',
            borderRadius: 12, padding: '16px 18px', marginBottom: 10,
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, marginBottom: 6,
              color: '#D4943A',
            }}>{tip.title}</div>
            <div style={{
              fontSize: 13, lineHeight: 1.6,
              color: isRefine ? '#C8D4BC' : '#6B5D4A',
            }}>{tip.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
