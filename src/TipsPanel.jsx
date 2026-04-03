import { useState } from 'react';

// ─── CATEGORIES ───
const CATEGORIES = [
  { id: 'novel', label: 'Novel / Fiction', emoji: '📖' },
  { id: 'report', label: 'Report / Business / School', emoji: '📊' },
  { id: 'lyrics', label: 'Song Lyrics / Poetry', emoji: '🎵' },
  { id: 'app', label: 'App / SaaS Idea', emoji: '💡' },
  { id: 'blog', label: 'Blog / Article / Essay', emoji: '✍️' },
  { id: 'script', label: 'Script / Screenplay', emoji: '🎬' },
  { id: 'email', label: 'Email / Letter / Pitch', emoji: '📧' },
  { id: 'journal', label: 'Journal / Personal', emoji: '📓' },
  { id: 'general', label: 'General / Other', emoji: '🌀' },
];

// ─── FLOW (DRAFTING) TIPS BY CATEGORY ───
const FLOW_TIPS = {
  general: [
    { title: "Don't stop moving", body: "Peter Elbow's freewriting rule: if you're stuck, write \"I don't know what to write\" until something comes.", prompt: "***[Tip: I don't know what to write yet, but I'm going to keep going because...]***" },
    { title: "Start with a question", body: "Begin with \"What am I trying to say?\" and answer it. Questions activate your brain's search mode.", prompt: "***[Tip: What am I really trying to say? The answer is...]***" },
    { title: "Lower the stakes", body: "Natalie Goldberg: \"Give yourself permission to write the worst junk in America.\" No one sees this but you.", prompt: "***[Tip: This is going to be terrible and that's completely fine. Here goes...]***" },
    { title: "Follow the energy", body: "If a tangent excites you, follow it. The best material hides in detours. You can always reorganize later.", prompt: "***[Tip: The thing that excites me most right now is...]***" },
    { title: "Engage your senses", body: "Describe what you see, hear, smell, taste, touch. Sensory detail unlocks creative flow.", prompt: "***[Tip: Right now I can see... I can hear... I can feel...]***" },
    { title: "Use a prompt", body: "A single sentence can unlock thousands of words. Just start with something simple.", prompt: "***[Tip: The thing I can't stop thinking about is...]***" },
  ],
  novel: [
    { title: "Start in the middle", body: "Don't worry about the perfect opening. Drop into a scene that excites you. You can rearrange chapters later.", prompt: "***[Tip: The scene I'm most excited to write starts when...]***" },
    { title: "Let characters talk", body: "When stuck, write dialogue. Characters often know what they want to say before you do.", prompt: "***[Tip: \"What do you want?\" she asked. He said...]***" },
    { title: "Write the argument", body: "Every interesting scene has tension. What do two characters disagree about right now?", prompt: "***[Tip: The conflict in this scene is about...]***" },
    { title: "Describe the room", body: "Ground your reader. What does this place look, sound, and smell like? Details build worlds.", prompt: "***[Tip: The room smelled like... The walls were... Outside, you could hear...]***" },
    { title: "Skip ahead", body: "Stuck on a scene? Skip it. Write the next one you're excited about. You can fill gaps later.", prompt: "***[Tip: Meanwhile, in the next scene...]***" },
    { title: "What's the worst thing?", body: "What's the worst thing that could happen to your character right now? Write that.", prompt: "***[Tip: Everything was going fine until...]***" },
  ],
  report: [
    { title: "Start with the conclusion", body: "Write your main finding or recommendation first. Then work backward to support it.", prompt: "***[Tip: The key takeaway of this report is...]***" },
    { title: "Bullet point dump", body: "Don't write sentences yet. Just dump every point you want to make as bullet points. Organize later.", prompt: "***[Tip: Key points to cover: 1)... 2)... 3)...]***" },
    { title: "Who's reading this?", body: "Picture your reader. What do they need to know? What decision will this help them make?", prompt: "***[Tip: The reader needs to understand that...]***" },
    { title: "Use the 'so what?' test", body: "After every point, ask \"so what?\" If you can't answer, the point might not belong.", prompt: "***[Tip: This matters because...]***" },
    { title: "Data first, narrative second", body: "State the fact, then explain what it means. Don't bury your numbers in paragraphs.", prompt: "***[Tip: The data shows... This means...]***" },
    { title: "Executive summary first", body: "Write the executive summary now, even if it changes. It forces you to know your argument.", prompt: "***[Tip: In summary, we recommend... because...]***" },
  ],
  lyrics: [
    { title: "Sing nonsense first", body: "Hum the melody and write whatever syllables come out. Real words will replace them later.", prompt: "***[Tip: Da da da da... the feeling is... da da da...]***" },
    { title: "Start with the hook", body: "What's the one line that keeps repeating in your head? That's your chorus. Build from there.", prompt: "***[Tip: The hook/chorus is...]***" },
    { title: "Write the emotion", body: "Don't describe the situation — describe how it feels. Metaphors are your friend.", prompt: "***[Tip: It feels like... It's as if...]***" },
    { title: "Steal a structure", body: "Pick a song you love. Use its verse/chorus/bridge structure as a skeleton. Fill with your words.", prompt: "***[Tip: VERSE 1:... CHORUS:... VERSE 2:...]***" },
    { title: "Sensory snapshots", body: "Great lyrics paint pictures. What one image captures the whole feeling?", prompt: "***[Tip: The image that captures this feeling is...]***" },
    { title: "Write the letter first", body: "Write what you want to say as a letter to someone. Then turn it into lyrics.", prompt: "***[Tip: Dear..., what I want to say is...]***" },
  ],
  app: [
    { title: "One sentence pitch", body: "If you can't explain it in one sentence, you don't understand it yet. Start there.", prompt: "***[Tip: This app/product helps [who] do [what] by [how]...]***" },
    { title: "Start with the pain", body: "What problem is so annoying that people will pay to make it go away? Write that frustration.", prompt: "***[Tip: The problem is... and it's painful because...]***" },
    { title: "User story dump", body: "Write every \"As a user, I want to...\" you can think of. Don't filter. Prioritize later.", prompt: "***[Tip: As a user, I want to... so that I can...]***" },
    { title: "Describe the magic moment", body: "What's the moment when a user says \"wow, this is amazing\"? Describe that exact experience.", prompt: "***[Tip: The magic moment is when the user...]***" },
    { title: "Why now?", body: "What changed in the world that makes this idea possible or necessary right now?", prompt: "***[Tip: This is possible/necessary now because...]***" },
    { title: "Competitor teardown", body: "What do existing solutions get wrong? Write everything you'd fix if you could.", prompt: "***[Tip: Current solutions fail because... We'd fix this by...]***" },
  ],
  blog: [
    { title: "Write the headline first", body: "Your headline is a promise to the reader. What will they learn or feel after reading?", prompt: "***[Tip: The headline/thesis is...]***" },
    { title: "Start with a story", body: "The best articles open with a specific moment, anecdote, or scene — not a definition.", prompt: "***[Tip: It started when...]***" },
    { title: "The contrarian take", body: "What does everyone believe about this topic that's wrong? That's your angle.", prompt: "***[Tip: Everyone thinks... but actually...]***" },
    { title: "List your subheadings", body: "Write 3-5 subheadings first. Now you have a skeleton. Fill in each section.", prompt: "***[Tip: Section 1:... Section 2:... Section 3:...]***" },
    { title: "Write for one person", body: "Picture one specific reader. What would you explain to them over coffee?", prompt: "***[Tip: If I were explaining this to my friend, I'd say...]***" },
    { title: "End with a question", body: "Great essays don't just inform — they provoke. What question should the reader walk away with?", prompt: "***[Tip: The question I want to leave them with is...]***" },
  ],
  script: [
    { title: "Write the logline", body: "One sentence: who is the main character, what do they want, and what's stopping them?", prompt: "***[Tip: When [character] wants to [goal], they must [obstacle]...]***" },
    { title: "Start with dialogue", body: "Drop into a conversation. Don't describe the scene yet — let the characters reveal it through what they say.", prompt: "***[Tip: INT. SOMEWHERE - DAY\n\nCHARACTER: ...]***" },
    { title: "What's the scene about?", body: "Every scene needs a purpose: reveal character, advance plot, or raise stakes. Which is this?", prompt: "***[Tip: This scene is about... and by the end, the audience knows...]***" },
    { title: "Write the climax", body: "You probably know the big moment already. Write it first, then build everything toward it.", prompt: "***[Tip: The climax of this story is when...]***" },
    { title: "Subtext is everything", body: "Characters rarely say what they mean. What's the real conversation under the surface?", prompt: "***[Tip: They're saying... but they really mean...]***" },
    { title: "Visual storytelling", body: "Film is visual. What does the audience SEE that tells the story without a single word?", prompt: "***[Tip: The camera shows... which tells us...]***" },
  ],
  email: [
    { title: "Lead with the ask", body: "Don't bury the request. What do you need from this person? Say it in the first two sentences.", prompt: "***[Tip: I'm writing because I need... by...]***" },
    { title: "One email, one purpose", body: "If your email has two asks, send two emails. Clarity beats convenience.", prompt: "***[Tip: The one thing I need from this email is...]***" },
    { title: "Write the subject line last", body: "Summarize the whole email in 6 words. That's your subject line.", prompt: "***[Tip: Subject: ...]***" },
    { title: "The 'why should they care' test", body: "Read from the recipient's perspective. What's in it for them?", prompt: "***[Tip: This benefits them because...]***" },
    { title: "Draft the pitch arc", body: "Problem → Solution → Proof → Ask. This structure works for pitches, proposals, and cold emails.", prompt: "***[Tip: The problem is... Our solution... Proof it works... We're asking for...]***" },
    { title: "Kill the preamble", body: "Delete \"I hope this email finds you well\" and everything before the point.", prompt: "***[Tip: Getting straight to the point:...]***" },
  ],
  journal: [
    { title: "Start with right now", body: "What are you feeling in this exact moment? Don't think about it — just describe it.", prompt: "***[Tip: Right now I'm feeling... because...]***" },
    { title: "The unsent letter", body: "Write a letter to someone you can't or won't send. Say everything you're holding back.", prompt: "***[Tip: Dear..., I need to tell you...]***" },
    { title: "Gratitude dump", body: "List 10 things you're grateful for today. Be specific — not \"family\" but \"the way my kid laughed at breakfast.\"", prompt: "***[Tip: Today I'm grateful for: 1)... 2)... 3)...]***" },
    { title: "What's bothering you?", body: "Name the thing that's been sitting in the back of your mind. Writing it down shrinks it.", prompt: "***[Tip: The thing I haven't said out loud is...]***" },
    { title: "Future self letter", body: "Write a letter to yourself one year from now. What do you hope has changed?", prompt: "***[Tip: Dear future me, I hope that by now you've...]***" },
    { title: "Stream of consciousness", body: "Set a timer for 5 minutes. Don't lift your pen (or fingers). Whatever comes, write it.", prompt: "***[Tip: Starting now, whatever comes to mind...]***" },
  ],
};

// ─── REFINE (SHARPENING) TIPS BY CATEGORY ───
const REFINE_TIPS = {
  general: [
    { title: "Read it aloud", body: "Your ear catches what your eye misses. If you stumble, your reader will too.", prompt: "***[TIP: Read the text above out loud. Where did you stumble?]***\n" },
    { title: "Cut the first paragraph", body: "Most drafts start with throat-clearing. The real beginning is usually paragraph 2 or 3.", prompt: "***[TIP: Try starting from paragraph 2. Delete the opening.]***\n" },
    { title: "Kill your darlings", body: "If a sentence exists only because you're proud of it, it probably should go.", prompt: "***[TIP: Which sentence are you most proud of? Consider cutting it.]***\n" },
    { title: "One idea per paragraph", body: "If a paragraph does two things, split it. Clarity comes from separation.", prompt: "***[TIP: Find a paragraph doing two things. Split it here.]***\n" },
    { title: "Active over passive", body: "\"She wrote the letter\" beats \"The letter was written by her.\"", prompt: "***[TIP: Find every \"was\" and \"were.\" Rewrite those sentences.]***\n" },
    { title: "Hemingway's question", body: "For every sentence, ask: \"Is this true?\" Delete what isn't.", prompt: "***[TIP: For each sentence, ask: \"Is this true?\"]***\n" },
  ],
  novel: [
    { title: "Show, don't tell", body: "Replace \"she was angry\" with what anger looks like: clenched fists, clipped words, slammed doors.", prompt: "***[TIP: Find every emotion word (angry, sad, happy). Replace with action.]***\n" },
    { title: "Cut adverbs", body: "Stephen King: \"The road to hell is paved with adverbs.\" Find a stronger verb instead of verb+adverb.", prompt: "***[TIP: Search for 'ly' words. Can you replace with a stronger verb?]***\n" },
    { title: "Dialogue tags", body: "\"Said\" is invisible. \"Exclaimed, muttered, opined\" are distracting. Use \"said\" and let the words do the work.", prompt: "***[TIP: Replace fancy dialogue tags with 'said' or action beats.]***\n" },
    { title: "Tighten the timeline", body: "Does every scene earn its place? If a scene doesn't change a character or advance the plot, cut it.", prompt: "***[TIP: What happens if you delete this scene entirely? Does the story still work?]***\n" },
    { title: "Check your pacing", body: "Short sentences = fast. Long sentences = slow. Match sentence length to the energy of the moment.", prompt: "***[TIP: Find the most intense moment. Are the sentences short enough?]***\n" },
    { title: "Character voice check", body: "Cover the dialogue tags. Can you tell who's speaking just from how they talk?", prompt: "***[TIP: Read each character's dialogue separately. Do they sound distinct?]***\n" },
  ],
  report: [
    { title: "Cut jargon", body: "If your grandmother wouldn't understand a word, replace it. Clarity beats sophistication.", prompt: "***[TIP: Find industry jargon. Replace with plain language.]***\n" },
    { title: "Lead with numbers", body: "\"Revenue increased 23%\" is stronger than \"Revenue showed significant improvement.\"", prompt: "***[TIP: Find vague words (significant, substantial). Replace with specific data.]***\n" },
    { title: "Shorten every sentence", body: "Business writing should be ruthlessly short. If a sentence has more than 20 words, split it.", prompt: "***[TIP: Find your longest sentence. Can you split it into two?]***\n" },
    { title: "Action items clear?", body: "Does every recommendation clearly state who should do what by when?", prompt: "***[TIP: Check each recommendation: Who? What? By when?]***\n" },
    { title: "Visual hierarchy", body: "Add headers, bullet points, and bold text so a skimmer can get the gist in 30 seconds.", prompt: "***[TIP: Can someone understand the key points by only reading bold text and headers?]***\n" },
    { title: "So what?", body: "After every data point or finding, make the implication explicit.", prompt: "***[TIP: After each finding, add 'This means...' or 'Therefore...']***\n" },
  ],
  lyrics: [
    { title: "Syllable count", body: "Sing your lyrics. Do awkward syllables break the rhythm? Swap words to match the melody.", prompt: "***[TIP: Sing each line. Where do syllables feel forced? Fix those.]***\n" },
    { title: "Cut clichés", body: "\"Heart on fire,\" \"rain on my parade\" — if you've heard it a thousand times, find a fresher image.", prompt: "***[TIP: Find every cliché. Replace with an original image.]***\n" },
    { title: "Rhyme check", body: "Are you forcing rhymes at the expense of meaning? The idea always beats the rhyme.", prompt: "***[TIP: Read without the rhyme scheme. Does every line still make sense?]***\n" },
    { title: "One emotion per section", body: "A verse should feel one way. If the mood shifts mid-verse, you might need a new section.", prompt: "***[TIP: Label the emotion of each section. Are there unwanted shifts?]***\n" },
    { title: "Bridge test", body: "The bridge should say what the verses and chorus can't. Does yours add a new perspective?", prompt: "***[TIP: Does the bridge reveal something new, or just repeat?]***\n" },
    { title: "First listen test", body: "What's the feeling after hearing it once? A listener won't study your lyrics — they'll feel them.", prompt: "***[TIP: Read it once, fast. What's the emotional takeaway?]***\n" },
  ],
  app: [
    { title: "Feature audit", body: "List every feature. Now cut half. What's the smallest version that still solves the core problem?", prompt: "***[TIP: List all features. Star the 3 that matter most. Cut the rest.]***\n" },
    { title: "User flow check", body: "Walk through each screen as a new user. Where would you get confused or give up?", prompt: "***[TIP: Trace the path from signup to 'aha moment'. How many steps?]***\n" },
    { title: "Naming matters", body: "Every button, label, and heading should be instantly clear. \"Submit\" is vague. \"Send message\" is clear.", prompt: "***[TIP: Check every button label. Would a new user know what it does?]***\n" },
    { title: "Kill the settings page", body: "Every option you add is a decision you're pushing to the user. Can you just pick the right default?", prompt: "***[TIP: For each setting, ask: can we just choose the best default?]***\n" },
    { title: "Competitive advantage", body: "Reread your pitch. Is it clear why someone would choose this over alternatives?", prompt: "***[TIP: Complete this: 'Unlike [competitor], we...' Is it compelling?]***\n" },
    { title: "Revenue model clarity", body: "How does this make money? If the answer is vague, sharpen it now.", prompt: "***[TIP: Who pays? How much? Why is that price fair?]***\n" },
  ],
  blog: [
    { title: "Hook in 2 seconds", body: "Your reader decides in 2 seconds. Does the first sentence create curiosity or promise value?", prompt: "***[TIP: Read only the first sentence. Would YOU keep reading?]***\n" },
    { title: "Cut 30%", body: "Most first drafts are 30% too long. Challenge every paragraph: does this earn its place?", prompt: "***[TIP: Highlight any paragraph you could remove without losing the argument.]***\n" },
    { title: "Transition check", body: "Read the first sentence of each paragraph in sequence. Does the article flow logically?", prompt: "***[TIP: Read only the first sentence of each paragraph. Does the logic flow?]***\n" },
    { title: "Subheading test", body: "A reader who only reads subheadings should understand the entire article.", prompt: "***[TIP: Read only your subheadings. Do they tell the full story?]***\n" },
    { title: "Link and cite", body: "Every claim needs a source. Every reference needs a link. Build trust.", prompt: "***[TIP: Find unsupported claims. Add evidence or soften the language.]***\n" },
    { title: "Strong close", body: "End with a call to action, a question, or a memorable line — not a summary.", prompt: "***[TIP: Is your ending memorable? Or does it just trail off?]***\n" },
  ],
  script: [
    { title: "Page count check", body: "1 page ≈ 1 minute of screen time. Is your script the right length for the format?", prompt: "***[TIP: How many pages? Does it match target runtime?]***\n" },
    { title: "Enter late, leave early", body: "Start each scene as late as possible, end it as early as possible. Cut the small talk.", prompt: "***[TIP: Can you cut the first 3 lines of each scene? Probably yes.]***\n" },
    { title: "Action line cleanup", body: "Action lines should be short, punchy, visual. No inner thoughts. What does the CAMERA see?", prompt: "***[TIP: Find any action line over 3 lines. Can you trim it?]***\n" },
    { title: "Conflict per scene", body: "Every scene needs conflict. If two characters agree, why is this a scene?", prompt: "***[TIP: What's the conflict in this scene? If none, cut or rewrite.]***\n" },
    { title: "On-the-nose dialogue", body: "If a character says exactly what they're feeling, it's probably too direct. Add subtext.", prompt: "***[TIP: Find dialogue that states emotions directly. Add layers.]***\n" },
    { title: "Read only dialogue", body: "Skip all action lines. Read only the dialogue. Does the story still make sense?", prompt: "***[TIP: Read only dialogue lines. Does each character sound unique?]***\n" },
  ],
  email: [
    { title: "5-sentence rule", body: "If your email is longer than 5 sentences, it should be a meeting or a document.", prompt: "***[TIP: Can you say everything in 5 sentences or fewer?]***\n" },
    { title: "Subject line check", body: "Would you open this email based on the subject line alone?", prompt: "***[TIP: Rewrite the subject line to be specific and action-oriented.]***\n" },
    { title: "Remove hedging", body: "\"I think maybe we could possibly...\" becomes \"We should...\" Be direct.", prompt: "***[TIP: Find 'I think', 'maybe', 'possibly', 'just'. Delete them.]***\n" },
    { title: "Action at the end", body: "The last line should be a clear next step. \"Let me know\" is weak. \"Can you confirm by Friday?\" is strong.", prompt: "***[TIP: Is the last sentence a clear, specific ask?]***\n" },
    { title: "Tone check", body: "Read it as if you're the recipient having a bad day. Does anything sound passive-aggressive?", prompt: "***[TIP: Read from the recipient's worst-mood perspective. Soften anything harsh.]***\n" },
    { title: "Mobile preview", body: "Most emails are read on phones. Will yours look good in 3 inches of screen width?", prompt: "***[TIP: Are paragraphs short? Are links and buttons easy to tap?]***\n" },
  ],
  journal: [
    { title: "Find the thread", body: "Reread your entry. What theme keeps coming up? That's what this is really about.", prompt: "***[TIP: What word or theme appears most? That's your real topic.]***\n" },
    { title: "Be specific", body: "\"I had a good day\" tells you nothing in a year. What specifically made it good?", prompt: "***[TIP: Replace every vague word with a specific detail.]***\n" },
    { title: "Honest check", body: "Are you writing what you think you should feel, or what you actually feel?", prompt: "***[TIP: Reread each paragraph. Are you being honest or performing?]***\n" },
    { title: "So what now?", body: "A good journal entry ends with an insight or intention, not just a recap.", prompt: "***[TIP: Add one line at the end: 'What this tells me is...' or 'Tomorrow I will...']***\n" },
    { title: "Let the mess stay", body: "Not everything needs polishing. Sometimes the raw version IS the point. Only sharpen what matters.", prompt: "***[TIP: Which parts feel alive as-is? Leave those raw. Polish the unclear parts.]***\n" },
    { title: "Time capsule test", body: "Will you understand this entry in 5 years? Add enough context that future-you gets it.", prompt: "***[TIP: Would a stranger understand the context? Add details for future you.]***\n" },
  ],
};

export default function TipsPanel({ mode, onClose, onInsertTip }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const isRefine = mode === 'refine';

  const accentColor = isRefine ? '#D4943A' : '#A8B4C4';
  const accentGlow = isRefine
    ? '0 0 12px rgba(212,148,58,0.6), 0 0 24px rgba(212,148,58,0.3), 0 0 40px rgba(212,148,58,0.15)'
    : '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(168,180,196,0.6), 0 0 40px rgba(168,180,196,0.3)';

  const tipsMap = isRefine ? REFINE_TIPS : FLOW_TIPS;
  const tips = selectedCategory ? tipsMap[selectedCategory] || tipsMap.general : null;

  const handleInsert = (prompt) => {
    if (onInsertTip) onInsertTip(prompt);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: isRefine ? '#14201A' : '#FDF6EC',
        borderRadius: 18, maxWidth: 520, width: '100%',
        maxHeight: '85vh', overflowY: 'auto', padding: '28px 26px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        border: `2px solid ${accentColor}`,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 700, margin: 0,
            color: isRefine ? '#E8EDF2' : '#5C4A32',
            fontFamily: "'Source Serif 4', serif",
          }}>
            {mode === 'flow' ? 'Draft Tips' : 'Sharpening Tips'}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: isRefine ? '#7A9A80' : '#8B7B6B', padding: 4,
          }}>x</button>
        </div>

        {/* Category selector */}
        {!selectedCategory ? (
          <>
            <p style={{
              fontSize: 14, fontWeight: 600, marginBottom: 14,
              color: isRefine ? '#E8EDF2' : '#5C4A32',
            }}>What kind of project are you working on?</p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '14px 10px', fontSize: 12, fontWeight: 600,
                    background: isRefine ? '#1A2B22' : '#F5EDD8',
                    border: `1px solid ${isRefine ? '#2A3D30' : '#EDE5D4'}`,
                    borderRadius: 10, cursor: 'pointer',
                    color: isRefine ? '#C8D4BC' : '#5C4A32',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'border-color 0.15s, transform 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isRefine ? '#2A3D30' : '#EDE5D4'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Back to categories */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => setSelectedCategory(null)} style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 600,
                background: 'transparent', border: `1px solid ${isRefine ? '#2A3D30' : '#D4C4A8'}`,
                borderRadius: 6, color: isRefine ? '#7A9A80' : '#8B7B6B', cursor: 'pointer',
              }}>← Change category</button>
              <span style={{
                fontSize: 13, fontWeight: 600, color: accentColor,
                textShadow: accentGlow,
              }}>
                {CATEGORIES.find(c => c.id === selectedCategory)?.emoji}{' '}
                {CATEGORIES.find(c => c.id === selectedCategory)?.label}
              </span>
            </div>

            <p style={{
              fontSize: 13, lineHeight: 1.6, marginBottom: 16,
              color: isRefine ? '#7A9A80' : '#8B7B6B',
            }}>
              {mode === 'flow'
                ? 'Techniques to get your ideas flowing. Click "Try this →" to insert a prompt.'
                : 'Techniques to sharpen and refine. Click "Try this →" to insert a prompt.'}
            </p>

            {/* Tips list */}
            {tips.map((tip, i) => (
              <div key={i} style={{
                background: isRefine ? '#1A2B22' : '#F5EDD8',
                borderRadius: 12, padding: '16px 18px', marginBottom: 10,
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, marginBottom: 6,
                  color: accentColor, textShadow: accentGlow,
                }}>{tip.title}</div>
                <div style={{
                  fontSize: 13, lineHeight: 1.6, marginBottom: 10,
                  color: isRefine ? '#C8D4BC' : '#6B5D4A',
                }}>{tip.body}</div>
                <button onClick={() => handleInsert(tip.prompt)} style={{
                  padding: '6px 14px', fontSize: 11, fontWeight: 600,
                  background: isRefine ? '#2A3D30' : '#EDE5D4',
                  border: `1px solid ${accentColor}`, borderRadius: 8,
                  color: accentColor, cursor: 'pointer',
                  textShadow: accentGlow,
                }}>Try this →</button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
