// Tiny persistent attribution tag — the whole point of keeping this app free.
// It's a lead magnet for other projects. When users finish a session feeling
// good about their writing, this is the quiet nudge back to the author.
//
// TODO (claudechopper): swap MADE_BY_URL for wherever you want to send traffic —
// your personal site, Twitter, a links-hub like bio.link, or whichever app you're
// pushing hardest right now. Update MADE_BY_LABEL to match.

const MADE_BY_URL = 'https://github.com/JCodesMore'; // TODO: replace with your lead-magnet target
const MADE_BY_LABEL = 'Built by Claudechopper';

export default function MadeBy() {
  return (
    <a
      href={MADE_BY_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: 6,
        right: 8,
        fontSize: 10,
        color: 'rgba(139, 123, 107, 0.55)',
        textDecoration: 'none',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        letterSpacing: '0.3px',
        padding: '2px 6px',
        borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(2px)',
        zIndex: 99, // below banner (100) so it tucks out of the way when banner is up
        transition: 'color 0.2s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#D4943A'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(139, 123, 107, 0.55)'; }}
    >
      {MADE_BY_LABEL} →
    </a>
  );
}
