/* =========================================================
   PlayLingo — script.js
   Part 1: Page UI (works even if Phaser fails to load)
   Part 2: Phaser mini games (7 scenes on one BaseScene)
   ========================================================= */

/* ---------------------------------------------------------
   PART 1 — PAGE UI
   --------------------------------------------------------- */
(function PageUI(){
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const GAME_KEYS = ['pop','catch','sentence','listen','read','memory','tense'];

  $('#year').textContent = new Date().getFullYear();

  /* Mobile nav */
  const toggle = $('.nav-toggle');
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  $$('.nav-links a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));

  /* Reveal on scroll */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12 });

    $$('.reveal').forEach(el => io.observe(el));
  } else {

    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  /* Toast */
  let toastTimer;
  window.showToast = msg => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3800);
  };

  /* Best scores */
  const readBest = k => { try { return localStorage.getItem('playlingo-best-' + k); } catch(e){ return null; } };
  window.refreshBest = () => GAME_KEYS.forEach(k => {
    const el = document.getElementById('best-' + k);
    if (el) el.textContent = readBest(k) || '—';
  });
  refreshBest();

  /* Game modal */
  const TIPS = {
    pop: 'Click or tap the bubble that matches the picture. 3 correct in a row = streak bonus!',
    catch: 'Move the basket with your mouse, finger or ← → keys. Catch only the words in the current group.',
    sentence: 'Tap words to build the sentence. Tap a placed word to send it back. Stuck? Use 💡 Hint.',
    listen: 'Listen to the word, then tap the matching picture. Press 🔊 to hear it again.',
    read: 'Read the clue and tap the picture it describes. Need help? Press 🔊 Read to me.',
    memory: 'Flip two cards at a time. Match each picture with its word in as few moves as you can.',
    tense: 'Look at the time word, then drag (or tap) the right verb form into the gap on the sign.'
  };
  const modal = $('#gameModal');
  let current = null, lastFocus = null;

  function setTab(key){ $$('[data-switch]').forEach(b => b.classList.toggle('active', b.dataset.switch === key)); }

  function openGame(key){
    if (!window.PlayLingo) { showToast('The game engine could not load. Please check your internet connection (Phaser loads from a CDN).'); return; }
    if (!modal.classList.contains('open')) lastFocus = document.activeElement;
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    current = key; setTab(key); $('#modalTip').textContent = TIPS[key] || '';
    window.PlayLingo.start(key);
    $('#closeModal').focus({ preventScroll: true });
  }
  function closeGame(){
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (window.PlayLingo) window.PlayLingo.stop();
    current = null; refreshBest();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  window.openGame = openGame;


  $$('[data-game]').forEach(b => b.addEventListener('click', () => openGame(b.dataset.game)));

  $$('[data-switch]').forEach(b => b.addEventListener('click', () => openGame(b.dataset.switch)));
  $('#closeModal').addEventListener('click', closeGame);
  modal.addEventListener('click', e => { if (e.target === modal) closeGame(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeGame(); });

  $('#soundBtn').addEventListener('click', () => {
    if (!window.PlayLingo) return;
    const on = window.PlayLingo.toggleSound();
    $('#soundBtn').textContent = on ? '🔊' : '🔇';
  });
  $('#diffSelect').addEventListener('change', e => {
    if (!window.PlayLingo) return;
    window.PlayLingo.setDifficulty(e.target.value);
    showToast('Difficulty: ' + e.target.options[e.target.selectedIndex].text);
    if (current) openGame(current);
  });

  /* "Next game" button inside the end screen */
  window.addEventListener('playlingo:next', e => {
    const i = GAME_KEYS.indexOf(e.detail);
    openGame(GAME_KEYS[(i + 1) % GAME_KEYS.length]);
  });

  /* Live event log (what an LMS would receive) */
  const logEl = $('#eventLog'); const logLines = [];
  window.addEventListener('playlingo:event', e => {
    logLines.unshift(JSON.stringify(e.detail));
    if (logLines.length > 10) logLines.length = 10;
    logEl.textContent = logLines.join('\n');
  });

  /* Content Lab */
  const PACKS = {
    animals: 'cat 🐱\ndog 🐶\ncow 🐮\npig 🐷\nlion 🦁\nfrog 🐸\nduck 🦆\nhorse 🐴',
    food: 'apple 🍎\nbanana 🍌\nbread 🍞\ncheese 🧀\negg 🥚\npizza 🍕\ncarrot 🥕\nmilk 🥛',
    classroom: 'book 📖\npencil ✏️\nbag 🎒\nruler 📏\nscissors ✂️\nclock ⏰\ncomputer 💻\npaint 🎨',
    travel: 'passport 🛂\nticket 🎫\nplane ✈️\nhotel 🏨\nmap 🗺️\nsuitcase 🧳\ntaxi 🚕\ncamera 📷'
  };
  const labInput = $('#labInput'), labChips = $('#labChips'), labStatus = $('#labStatus');

  function parsePack(text){
    const seen = new Set(), out = [];
    text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      const parts = line.split(/\s+/);
      if (parts.length < 2) return;
      const e = parts.pop(), w = parts.join(' ').toLowerCase().slice(0, 14);
      if (w && e && !seen.has(w)) { seen.add(w); out.push({ w, e }); }
    });
    return out;
  }
  function renderLab(){
    const list = parsePack(labInput.value);
    labChips.textContent = '';
    list.forEach(v => {
      const c = document.createElement('span'); c.className = 'chip';
      c.textContent = v.e + ' ' + v.w;   // textContent = safe from HTML injection
      labChips.appendChild(c);
    });
    const ok = list.length >= 6;
    labStatus.className = 'lab-status ' + (ok ? 'ok' : 'bad');
    labStatus.textContent = ok ? `✅ ${list.length} words ready to play` : `⚠️ ${list.length} words: add at least 6 (format: word emoji)`;
    return list;
  }
  function getDefaultText(){
    return window.PlayLingo ? window.PlayLingo.getVocab().map(v => v.w + ' ' + v.e).join('\n') : PACKS.animals;
  }
  labInput.value = getDefaultText();
  renderLab();
  labInput.addEventListener('input', renderLab);

  $$('[data-pack]').forEach(b => b.addEventListener('click', () => { labInput.value = PACKS[b.dataset.pack]; renderLab(); }));

  $$('[data-lab-play]').forEach(b => b.addEventListener('click', () => {
    const list = renderLab();
    if (list.length < 6) { showToast('Please add at least 6 words first 🙂'); return; }
    if (!window.PlayLingo) { openGame(b.dataset.labPlay); return; }
    window.PlayLingo.setVocab(list);
    showToast(`Loaded ${list.length} words into the games 🎉`);
    openGame(b.dataset.labPlay);
  }));
  $('#labReset').addEventListener('click', () => {
    if (window.PlayLingo) window.PlayLingo.resetVocab();
    labInput.value = getDefaultText(); renderLab();
    showToast('Default word list restored');
  });

  /* Idea generator */
  const IDEAS = {
    vocabulary: [
      { icon:'👾', name:'Monster Munch', play:"A friendly monster asks for food by name (“I want a banana!”). Learners drag the right picture into its mouth before it gets grumpy.", fb:"A happy chomp and the word spoken aloud. Wrong food is spat out with its name shown, so every mistake still teaches a word.", tech:"Drag & drop input, sprite tweens for chewing, Web Speech prompts, data-driven word lists." },
      { icon:'🃏', name:'Memory Flip', play:"Classic pairs, but each pair is a picture and its word. Bigger grids unlock as learners improve.", fb:"Matched cards glow, wiggle and say the word. Near-misses are briefly highlighted to help memory.", tech:"Card flip tweens with scaleX, a grid layout helper, a state machine for turns, localStorage for progress." },
      { icon:'🫧', name:'Word Pop', play:"Bubbles drift upward. Pop the word that matches the target picture, which changes after each hit.", fb:"A particle burst, a streak meter and an audio model. A wrong pop wobbles the bubble and shows the word.", tech:"Pooled game objects, update-loop motion, particle emitters, a timer event and a shared HUD." }
    ],
    grammar: [
      { icon:'🧺', name:'Grammar Catch', play:"Words fall from the sky, and learners catch only the target category. The rule changes every 15 seconds.", fb:"Correct catches bounce the basket. A wrong catch explains itself: “happy is an adjective”.", tech:"Keyboard + pointer control, overlap checks, timed rule changes, rising difficulty." },
      { icon:'🚂', name:'Tense Train', play:"A sentence with a time word sits on the train's sign. Learners drag the right verb form (went / go / will go) into the gap before the train leaves.", fb:"Each correct answer toots the whistle and the full sentence is read aloud. Mistakes show the rule, e.g. “Tomorrow → future”.", tech:"Draggable containers, drop-zone checks, tweened departures, sentence templates from data." },
      { icon:'🏭', name:'Plural Factory', play:"One item enters a machine. Pick the right ending (-s, -es, -ies or irregular) to make many come out the other side.", fb:"The machine whirs and multiplies the item. A wrong ending makes a funny jam, with the correct form displayed.", tech:"Particle steam, tween chains, rule-based answer checking with irregular exceptions." }
    ],
    sentence: [
      { icon:'🧩', name:'Sentence Builder', play:"Scrambled word tiles must be tapped into the right order. A picture shows the meaning.", fb:"Words in the correct position lock in green after a check, and each hint adds one correct word.", tech:"A tile layout engine with wrapping, tweened re-layout, partial-credit checking." },
      { icon:'🐍', name:'Sentence Snake', play:"The snake must eat word pellets in the correct sentence order to grow. Wrong words make it hiccup.", fb:"The completed sentence scrolls along the snake's body and is read aloud.", tech:"Grid movement, input buffering, an arcade physics overlap and a body-segment chain." },
      { icon:'❓', name:'Question Flip', play:"Learners turn a statement into a question by dragging the helper verb (is / do / can) to the front.", fb:"The sentence flips with a bounce, the full stop morphs into a question mark, and intonation audio plays.", tech:"Drag snapping, text morph tweens, template-based sentence generation." }
    ],
    listening: [
      { icon:'🎧', name:'Listen & Pick', play:"A word is spoken and learners tap the matching picture. Replay is always free.", fb:"Wrong cards reveal their word. Getting it right on the first listen earns a bonus.", tech:"Web Speech API with recorded-audio fallback, choice card components, a round manager." },
      { icon:'🦁', name:'Simon Says Safari', play:"The safari guide gives spoken commands (“Touch the blue bird!”). Learners only act when they hear “Simon says”.", fb:"Animals react to taps. Mistakes replay the command slowly with key words highlighted.", tech:"Audio sequencing, timed input windows, animated sprites, multiple-attribute targets." },
      { icon:'🔍', name:'Sound Detective', play:"Hear a word from a minimal pair (ship/sheep, bat/bad) and pick the right picture.", fb:"Both words are played back to back so learners can compare the sounds.", tech:"Audio sprite playback, pair-based content data, accuracy tracking per sound." }
    ],
    reading: [
      { icon:'📖', name:'Reading Riddles', play:"Read a short clue (“It is yellow. Monkeys love it.”) and tap the picture it describes.", fb:"First-try bonus, an optional “read to me” scaffold, and the word revealed on the answer.", tech:"Word-wrapped text panels, a shared choice-card component, speech scaffolding." },
      { icon:'🎩', name:'Read & Do', play:"Instructions like “Put the red hat on the small cat” must be carried out in a little scene.", fb:"The scene comes alive when it's done right. Errors highlight the word that was missed (red, small…).", tech:"Drop-target validation on multiple attributes, scene composition from data." },
      { icon:'🗺️', name:'Story Path', play:"Read a short story line at each fork and choose the path that matches it to reach the treasure.", fb:"A wrong path loops gently back, with a hint pointing to the key sentence.", tech:"A branching data graph, camera follow, a simple dialogue/text system." }
    ]
  };
  const AGES = {
    early: { label:'Ages 4–6', ui:"Picture-first UI with audio for every instruction and tap targets of 90px or more. Learners shouldn't need to read to start playing.", diff:"No timer. A helper hand animates after 8 seconds of inactivity. 6 items per round with lots of celebration." },
    young: { label:'Ages 7–9', ui:"Short words paired with pictures, bright characters, and stars & stickers as rewards.", diff:"Optional gentle timer, 8–10 items, and one extra distractor added after 3 correct answers in a row." },
    tween: { label:'Ages 10–13', ui:"Text-forward UI, streaks, combo meters, and class leaderboards that teachers can switch off.", diff:"Timed rounds of 10–15 items with adaptive speed and distractor count based on accuracy." },
    teen:  { label:'Teens & adults', ui:"Clean, less cartoony visuals with real-world contexts like travel, work and social media.", diff:"Speed and accuracy scoring, challenge modes and personal bests. Missed items return for spaced review." }
  };
  let genSkill = 'vocabulary', genAge = 'early', genIdx = 0;
  function renderIdea(animate){
    const list = IDEAS[genSkill];
    const idea = list[genIdx % list.length];
    const age = AGES[genAge];
    const out = $('#genOut');
    const paint = () => {
      out.innerHTML = `
        <div class="title-row"><div class="big">${idea.icon}</div><div><small>${genSkill.toUpperCase()} · ${age.label}</small><h3>${idea.name}</h3></div></div>
        <div class="gen-row"><h5>🎮 How it plays</h5><p>${idea.play}</p></div>
        <div class="gen-row"><h5>✨ Feedback & juice</h5><p>${idea.fb}</p></div>
        <div class="gen-row"><h5>🧒 Tuned for ${age.label}</h5><p>${age.ui}</p></div>
        <div class="gen-row"><h5>📈 Difficulty curve</h5><p>${age.diff}</p></div>
        <div class="gen-row"><h5>🛠️ Phaser toolkit</h5><p>${idea.tech}</p></div>`;
      out.classList.remove('flash');
    };
    if (animate) { out.classList.add('flash'); setTimeout(paint, 180); } else paint();
  }
  function bindSeg(id, cb){

    $$(id + ' button').forEach(b => b.addEventListener('click', () => {

      $$(id + ' button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); cb(b.dataset.v); renderIdea(true);
    }));
  }
  bindSeg('#genSkill', v => { genSkill = v; genIdx = 0; });
  bindSeg('#genAge', v => { genAge = v; });
  $('#genBtn').addEventListener('click', () => { genIdx++; renderIdea(true); });
  renderIdea(false);

  /* Contact form (front-end demo — connect to Formspree, Netlify Forms or your API) */
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#name').value.trim(), email = $('#email').value.trim(), msg = $('#msg').value.trim();
    if (!name || !email || !msg) { showToast('Please fill in your name, email and brief 🙂'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { showToast("That email doesn't look quite right."); return; }
    showToast(`Thanks, ${name}! Your brief is on its way. I'll reply within 24 hours. 🚀`);
    e.target.reset();
  });

  /* Warm up fonts so canvas text renders in Fredoka */
  if (document.fonts && document.fonts.load) { document.fonts.load('600 20px Fredoka').catch(() => {}); }
})();


/* ---------------------------------------------------------
   PART 2 — PHASER MINI GAMES
   --------------------------------------------------------- */
(function Games(){
  'use strict';
  if (typeof Phaser === 'undefined') return;

  const W = 800, H = 500;
  const F = (size, color) => ({ fontFamily:'Fredoka, Nunito, sans-serif', fontSize:size + 'px', color:color || '#1e1b4b', fontStyle:'bold' });
  const shuffle = a => Phaser.Utils.Array.Shuffle(a.slice());
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  /* ---------- Settings & difficulty ---------- */
  const DIFF = {
    easy:   { speed:.75, time:1.3 },
    normal: { speed:1,   time:1   },
    hard:   { speed:1.3, time:.85 }
  };
  const settings = { difficulty:'normal' };

  /* ---------- Synth sound effects (no audio files) ---------- */
  const SFX = {
    ctx:null, on:true,
    init(){
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(f, d, type = 'sine', v = .15, delay = 0, slide = 0){
      if (!this.ctx || !this.on) return;
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d + .03);
    },
    play(n){
      switch(n){
        case 'click':   this.tone(620, .06, 'square', .04); break;
        case 'correct': this.tone(660, .12, 'triangle', .18); this.tone(990, .2, 'triangle', .18, .1); break;
        case 'wrong':   this.tone(240, .28, 'sawtooth', .07, 0, 130); break;
        case 'tick':    this.tone(1200, .04, 'square', .025); break;
        case 'whoosh':  this.tone(300, .25, 'sine', .08, 0, 900); break;
        case 'flip':    this.tone(500, .07, 'triangle', .07, 0, 800); break;
        case 'whistle': this.tone(880, .35, 'square', .05); this.tone(1100, .35, 'square', .04, .05); break;
        case 'win':     [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .28, 'triangle', .16, i * .12)); break;
      }
    }
  };

  function speak(text, rate = .9){
    try {
      if (!SFX.on || !('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = rate;
      const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch(e){}
  }

  function saveBest(key, score){
    let best = 0;
    try { best = parseInt(localStorage.getItem('playlingo-best-' + key) || '0', 10); } catch(e){}
    if (score > best) { best = score; try { localStorage.setItem('playlingo-best-' + key, String(score)); } catch(e){} }
    const el = document.getElementById('best-' + key); if (el) el.textContent = best || '—';
    return best;
  }

  /* ---------- Spaced repetition (missed items come back more often) ---------- */
  const MISSES = {};
  const markMissed = w => { MISSES[w] = (MISSES[w] || 0) + 2; };
  const markHit = w => { MISSES[w] = Math.max(0, (MISSES[w] || 0) - 1); };
  function pickWeighted(list, avoid){
    const pool = (avoid && list.length > 1) ? list.filter(v => v.w !== avoid.w) : list;
    const ws = pool.map(v => 1 + (MISSES[v.w] || 0));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  /* ---------- Content data (swap freely — no game code changes needed) ---------- */
  const DEFAULT_VOCAB = [
    {w:'apple',e:'🍎'},{w:'cat',e:'🐱'},{w:'dog',e:'🐶'},{w:'sun',e:'☀️'},{w:'car',e:'🚗'},
    {w:'fish',e:'🐟'},{w:'book',e:'📖'},{w:'tree',e:'🌳'},{w:'banana',e:'🍌'},{w:'house',e:'🏠'},
    {w:'star',e:'⭐'},{w:'ball',e:'⚽'},{w:'bird',e:'🐦'},{w:'moon',e:'🌙'},{w:'cake',e:'🎂'},
    {w:'flower',e:'🌸'},{w:'train',e:'🚆'},{w:'hat',e:'🎩'}
  ];
  let VOCAB = DEFAULT_VOCAB.slice();

  const SENTENCES = [
    {s:'The cat is sleeping on the sofa', e:'🐱💤🛋️'},
    {s:'I like to eat red apples', e:'😋🍎'},
    {s:'She goes to school by bus', e:'👧🚌🏫'},
    {s:'We are playing in the park', e:'⚽🌳'},
    {s:'My brother can swim very fast', e:'👦🏊💨'},
    {s:'They watched a movie last night', e:'🎬🌙'},
    {s:'Is it raining outside today?', e:'🌧️❓'},
    {s:'There are three birds in the tree', e:'🐦🐦🐦🌳'}
  ];
  const POS = {
    VERBS:['run','jump','eat','swim','read','sing','write','play','sleep','dance','climb','cook'],
    NOUNS:['apple','teacher','school','dog','chair','city','pencil','friend','river','window','garden','bread'],
    ADJECTIVES:['happy','big','blue','tall','cold','funny','small','fast','quiet','red','hungry','brave']
  };
  const POS_ONE = {VERBS:'verb', NOUNS:'noun', ADJECTIVES:'adjective'};
  const POS_COLOR = {VERBS:0xef4444, NOUNS:0x3b82f6, ADJECTIVES:0xa855f7};
  const hex = n => '#' + n.toString(16).padStart(6, '0');

  const RIDDLES = [
    {q:'It is yellow and long. Monkeys love to eat it.', a:'🍌', w:'banana', opts:['🍎','🍌','🥕','🍇']},
    {q:'It has four legs. It says "woof" and loves to play ball.', a:'🐶', w:'dog', opts:['🐱','🐶','🐦','🐟']},
    {q:'You can see it in the sky at night. It is round and bright.', a:'🌙', w:'moon', opts:['☀️','🌙','🌈','☁️']},
    {q:'It lives in water. It cannot walk, but it can swim.', a:'🐟', w:'fish', opts:['🐟','🐘','🐴','🐔']},
    {q:'You wear them on your feet when you go outside.', a:'👟', w:'shoes', opts:['🧢','🧤','👟','👓']},
    {q:'It has pages and words. You read it at school.', a:'📖', w:'book', opts:['✏️','📖','🎒','⏰']},
    {q:'It is cold and white. Children make a man from it in winter.', a:'⛄', w:'snowman', opts:['⛄','🔥','🌻','🏖️']},
    {q:'It has wheels and a driver. It takes many children to school.', a:'🚌', w:'bus', opts:['🚲','✈️','🚌','🚀']},
    {q:'You use it to tell the time. It goes "tick tock".', a:'⏰', w:'clock', opts:['📱','⏰','🔑','💡']},
    {q:'It is hot and bright. It helps flowers grow.', a:'☀️', w:'sun', opts:['🌙','⭐','☀️','❄️']}
  ];

  const TENSE = [
    {pre:'Yesterday I', ans:'went', post:'to the park.', opts:['go','went','will go'], hint:'Yesterday → past tense'},
    {pre:'Every day she', ans:'walks', post:'to school.', opts:['walks','walked','will walk'], hint:'Every day → present simple'},
    {pre:'Tomorrow we', ans:'will visit', post:'Grandma.', opts:['visit','visited','will visit'], hint:'Tomorrow → future'},
    {pre:'Last night they', ans:'watched', post:'a movie.', opts:['watch','watched','will watch'], hint:'Last night → past tense'},
    {pre:'Next week he', ans:'will play', post:'football.', opts:['plays','played','will play'], hint:'Next week → future'},
    {pre:'Look! The baby', ans:'is sleeping', post:'now.', opts:['is sleeping','slept','will sleep'], hint:'Look! … now → present continuous'},
    {pre:'Last summer we', ans:'swam', post:'in the sea.', opts:['swim','swam','will swim'], hint:'Last summer → past tense'},
    {pre:'Every morning I', ans:'eat', post:'breakfast.', opts:['eat','ate','will eat'], hint:'Every morning → present simple'}
  ];

  /* ---------- Shared base scene ---------- */
  class BaseScene extends Phaser.Scene {
    setup(key, goals){
      this.gameKey = key; this.starGoals = goals;
      this.d = DIFF[settings.difficulty] || DIFF.normal;
      this.hits = 0; this.misses = 0; this.review = new Set(); this.onEnd = null;
      this.makeTextures();
    }
    secs(s){ return Math.round(s * this.d.time); }
    makeTextures(){
      if (!this.textures.exists('dot')) {
        const g = this.make.graphics({x:0, y:0, add:false});
        g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8); g.generateTexture('dot', 16, 16); g.destroy();
      }
    }
    bg(c1, c2){
      const g = this.add.graphics();
      g.fillGradientStyle(c1, c1, c2, c2, 1); g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) {
        const c = this.add.circle(Phaser.Math.Between(0, W), Phaser.Math.Between(70, H), Phaser.Math.Between(8, 40), 0xffffff, .13);
        this.tweens.add({targets:c, y:c.y - 30, duration:Phaser.Math.Between(2500, 5000), yoyo:true, repeat:-1, ease:'Sine.inOut'});
      }
    }
    hud(title, seconds){
      this.score = 0; this.streak = 0; this.over = false; this.timeLeft = seconds; this.clock = null;
      const bar = this.add.graphics().setDepth(20); bar.fillStyle(0x1e1b4b, .9); bar.fillRect(0, 0, W, 56);
      this.add.text(18, 28, title, F(22, '#ffffff')).setOrigin(0, .5).setDepth(21);
      this.streakText = this.add.text(W/2 + 30, 28, '', F(18, '#86efac')).setOrigin(.5).setDepth(21);
      this.scoreText = this.add.text(W - 250, 28, '⭐ 0', F(22, '#fde68a')).setOrigin(0, .5).setDepth(21);
      this.infoText = this.add.text(W - 115, 28, '', F(22, '#ffffff')).setOrigin(0, .5).setDepth(21);
      if (seconds > 0) {
        this.infoText.setText('⏱ ' + seconds);
        this.clock = this.time.addEvent({delay:1000, loop:true, callback:() => {
          if (this.over) return;
          this.timeLeft--; this.infoText.setText('⏱ ' + this.timeLeft);
          if (this.timeLeft <= 10) { this.infoText.setColor('#fca5a5'); SFX.play('tick'); }
          if (this.timeLeft <= 0) this.endGame();
        }});
      }
    }
    addPoints(n, x, y){
      this.streak++;
      const pts = n + (this.streak >= 3 ? 5 : 0);
      this.score += pts;
      this.scoreText.setText('⭐ ' + this.score);
      this.tweens.add({targets:this.scoreText, scale:1.3, duration:110, yoyo:true});
      this.streakText.setText(this.streak >= 3 ? '🔥 Streak x' + this.streak : '');
      SFX.play('correct');
      if (x !== undefined) { this.popText(x, y, '+' + pts, '#16a34a'); this.burst(x, y); }
    }
    miss(x, y, msg){
      this.streak = 0; this.streakText.setText('');
      this.cameras.main.shake(150, .006);
      SFX.play('wrong');
      if (x !== undefined) this.popText(x, y, msg || 'Try again!', '#dc2626');
    }
    track(item, correct){
      if (correct) { this.hits++; markHit(item); }
      else { this.misses++; this.review.add(item); markMissed(item); }
      emit('playlingo:event', { verb:'answered', game:this.gameKey, item, correct, difficulty:settings.difficulty, t:new Date().toISOString() });
    }
    popText(x, y, msg, color){
      x = Phaser.Math.Clamp(x, 140, W - 140);
      const t = this.add.text(x, y, msg, {...F(26, color), stroke:'#ffffff', strokeThickness:6}).setOrigin(.5).setDepth(50);
      this.tweens.add({targets:t, y:y - 60, alpha:0, duration:1300, ease:'Cubic.out', onComplete:() => t.destroy()});
    }
    burst(x, y){
      const e = this.add.particles(x, y, 'dot', {
        speed:{min:80, max:280}, scale:{start:.7, end:0}, lifespan:650, gravityY:300,
        tint:[0xfde047, 0x22c55e, 0x60a5fa, 0xf472b6, 0xffffff], emitting:false
      }).setDepth(40);
      e.explode(20);
      this.time.delayedCall(900, () => e.destroy());
    }
    button(x, y, w, h, label, color, cb, size = 22){
      const c = this.add.container(x, y).setDepth(30);
      const g = this.add.graphics();
      g.fillStyle(0x000000, .2); g.fillRoundedRect(-w/2, -h/2 + 5, w, h, 14);
      g.fillStyle(color, 1); g.fillRoundedRect(-w/2, -h/2, w, h, 14);
      const t = this.add.text(0, 0, label, F(size, '#ffffff')).setOrigin(.5);
      c.add([g, t]); c.setSize(w, h); c.setInteractive({useHandCursor:true});
      c.on('pointerover', () => c.setScale(1.05));
      c.on('pointerout', () => c.setScale(1));
      c.on('pointerdown', () => { SFX.play('click'); cb && cb(); });
      return c;
    }
    choiceCard(x, y, emoji, label, onPick){
      const c = this.add.container(x, y);
      const g = this.add.graphics(), w = 150, h = 170;
      c.paint = (fill, stroke) => {
        g.clear();
        g.fillStyle(0x000000, .15); g.fillRoundedRect(-w/2, -h/2 + 6, w, h, 20);
        g.fillStyle(fill, 1); g.fillRoundedRect(-w/2, -h/2, w, h, 20);
        g.lineStyle(4, stroke, 1); g.strokeRoundedRect(-w/2, -h/2, w, h, 20);
      };
      c.paint(0xffffff, 0xe2e8f0);
      const e = this.add.text(0, -14, emoji, {fontSize:'78px'}).setOrigin(.5);
      c.label = this.add.text(0, 58, label || '', F(22, '#1e1b4b')).setOrigin(.5).setVisible(false);
      c.add([g, e, c.label]); c.setSize(w, h); c.setInteractive({useHandCursor:true});
      c.on('pointerover', () => { if (!c.locked) c.setScale(1.05); });
      c.on('pointerout', () => c.setScale(1));
      c.on('pointerdown', () => onPick(c));
      return c;
    }
    endGame(){
      if (this.over) return;
      this.over = true;
      if (this.clock) this.clock.remove();
      if (this.onEnd) this.onEnd();
      SFX.play('win');
      const best = saveBest(this.gameKey, this.score);
      const total = this.hits + this.misses;
      const acc = total ? Math.round(this.hits / total * 100) : 0;
      emit('playlingo:event', { verb:'completed', game:this.gameKey, score:this.score, accuracy:acc, review:[...this.review], t:new Date().toISOString() });

      this.add.rectangle(W/2, H/2, W, H, 0x0f172a, .6).setDepth(100).setInteractive();
      const panel = this.add.container(W/2, H/2).setDepth(101);
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(-250, -190, 500, 380, 26);
      const stars = this.score >= this.starGoals[1] ? 3 : this.score >= this.starGoals[0] ? 2 : 1;
      const title = this.add.text(0, -140, ['Good try!', 'Great job!', 'Amazing!'][stars - 1], F(40, '#4338ca')).setOrigin(.5);
      const st = this.add.text(0, -80, '⭐'.repeat(stars) + '☆'.repeat(3 - stars), F(44, '#f59e0b')).setOrigin(.5);
      const sc = this.add.text(0, -22, 'Score: ' + this.score + '     Best: ' + best, F(24, '#334155')).setOrigin(.5);
      const reviewList = [...this.review].slice(0, 4);
      const summary = 'Accuracy: ' + acc + '%' + (reviewList.length
        ? '\nLet\'s practise: ' + reviewList.join(', ')
        : (total ? '\nNo mistakes. Brilliant!' : ''));
      const ex = this.add.text(0, 40, summary, {...F(17, '#64748b'), align:'center', wordWrap:{width:440}}).setOrigin(.5);
      panel.add([g, title, st, sc, ex]);
      panel.add(this.button(-118, 135, 210, 56, '↻ Play again', 0x22c55e, () => this.scene.restart()));
      panel.add(this.button(118, 135, 210, 56, 'Next game ➜', 0x7c3aed, () => setTimeout(() => emit('playlingo:next', this.gameKey), 0)));
      panel.setScale(.6);
      this.tweens.add({targets:panel, scale:1, duration:380, ease:'Back.out'});
    }
  }

  /* ---------- 1. Word Pop (vocabulary) ---------- */
  class WordPop extends BaseScene {
    constructor(){ super('pop'); }
    create(){
      this.setup('pop', [100, 200]);
      this.bg(0x60a5fa, 0xc4b5fd);
      this.hud('🫧 Word Pop', this.secs(60));
      const p = this.add.graphics().setDepth(10);
      p.fillStyle(0xffffff, 1); p.fillRoundedRect(16, 72, 130, 150, 18);
      this.add.text(81, 92, 'Pop the word:', F(14, '#64748b')).setOrigin(.5).setDepth(11);
      this.targetText = this.add.text(81, 160, '', {fontSize:'64px'}).setOrigin(.5).setDepth(11);
      this.bubbles = []; this.target = null; this.sinceTarget = 0;
      this.newTarget();
      this.time.addEvent({delay:900 / this.d.speed, loop:true, callback:() => this.spawn()});
      for (let i = 0; i < 3; i++) this.spawn(H - 110 * i);
    }
    newTarget(){
      this.target = pickWeighted(VOCAB, this.target);
      this.targetText.setText(this.target.e);
      this.tweens.add({targets:this.targetText, scale:{from:.4, to:1}, duration:300, ease:'Back.out'});
      this.sinceTarget = 3; // guarantee the next bubble is the target
    }
    spawn(y){
      if (this.over) return;
      this.sinceTarget++;
      const useTarget = this.sinceTarget >= 4 || Math.random() < .3;
      const v = useTarget ? this.target : pick(VOCAB.filter(x => x.w !== this.target.w));
      if (useTarget) this.sinceTarget = 0;
      const r = 46, c = this.add.container(Phaser.Math.Between(220, 750), y || H + 50).setDepth(5);
      const g = this.add.graphics();
      g.fillStyle(pick([0xf472b6, 0x34d399, 0xfbbf24, 0x60a5fa, 0xa78bfa, 0xfb923c]), 1); g.fillCircle(0, 0, r);
      g.lineStyle(3, 0xffffff, .9); g.strokeCircle(0, 0, r);
      g.fillStyle(0xffffff, .6); g.fillCircle(-18, -18, 7);
      const t = this.add.text(0, 0, v.w, {...F(v.w.length > 6 ? 16 : 20, '#ffffff'), stroke:'#1e1b4b', strokeThickness:4}).setOrigin(.5);
      c.add([g, t]); c.setSize(r * 2, r * 2).setInteractive({useHandCursor:true});
      c.v = v; c.vy = Phaser.Math.Between(55, 85) * this.d.speed; c.phase = Math.random() * 6; c.baseX = c.x;
      c.on('pointerdown', () => this.hit(c));
      this.bubbles.push(c);
    }
    update(time, dt){
      if (this.over) return;
      const s = dt / 1000;
      this.bubbles = this.bubbles.filter(b => {
        if (!b.active) return false;
        b.y -= b.vy * s;
        b.x = b.baseX + Math.sin(time / 600 + b.phase) * 14;
        if (b.y < -50) { b.destroy(); return false; }
        return true;
      });
    }
    hit(b){
      if (this.over || !b.active) return;
      if (b.v.w === this.target.w) {
        this.addPoints(10, b.x, b.y); this.track(b.v.w, true); speak(b.v.w);
        b.disableInteractive();
        this.tweens.add({targets:b, scale:1.5, alpha:0, duration:200, onComplete:() => b.destroy()});
        this.newTarget();
      } else {
        this.miss(b.x, b.y, `That's "${b.v.w}"`); this.track(this.target.w, false);
        this.tweens.add({targets:b, angle:{from:-12, to:12}, duration:70, yoyo:true, repeat:2, onComplete:() => b.setAngle(0)});
      }
    }
  }

  /* ---------- 2. Grammar Catch (parts of speech) ---------- */
  class GrammarCatch extends BaseScene {
    constructor(){ super('catch'); }
    create(){
      this.setup('catch', [80, 180]);
      this.bg(0x6ee7b7, 0x38bdf8);
      this.hud('🧺 Grammar Catch', this.secs(60));
      this.cats = Object.keys(POS);
      this.banner = this.add.text(W/2, 86, '', {...F(26, '#ffffff'), stroke:'#1e1b4b', strokeThickness:6}).setOrigin(.5).setDepth(15);
      this.setRule(pick(this.cats));
      this.basket = this.add.container(W/2, H - 40).setDepth(10);
      const g = this.add.graphics();
      g.fillStyle(0x92400e, 1); g.fillRoundedRect(-70, -22, 140, 44, 14);
      g.fillStyle(0xd97706, 1); g.fillRoundedRect(-64, -18, 128, 12, 6);
      this.basket.add([g, this.add.text(0, 6, '🧺', {fontSize:'26px'}).setOrigin(.5)]);
      this.tx = W/2;
      this.input.on('pointermove', p => { this.tx = p.x; });
      this.input.on('pointerdown', p => { this.tx = p.x; });
      this.keys = this.input.keyboard.createCursorKeys();
      this.words = [];
      this.time.addEvent({delay:1100 / this.d.speed, loop:true, callback:() => this.drop()});
      this.time.addEvent({delay:15000, loop:true, callback:() => this.setRule(pick(this.cats.filter(c => c !== this.rule)))});
    }
    setRule(r){
      this.rule = r;
      this.banner.setText('Catch the ' + r + '!').setColor(hex(POS_COLOR[r]));
      this.tweens.add({targets:this.banner, scale:{from:1.4, to:1}, duration:350, ease:'Back.out'});
      SFX.play('whoosh');
    }
    drop(){
      if (this.over) return;
      const cat = Math.random() < .45 ? this.rule : pick(this.cats);
      const t = this.add.text(Phaser.Math.Between(80, W - 80), 70, pick(POS[cat]),
        {...F(22, '#ffffff'), backgroundColor:hex(POS_COLOR[cat]), padding:{x:12, y:6}}).setOrigin(.5).setDepth(8);
      t.cat = cat; t.vy = Phaser.Math.Between(90, 130) * this.d.speed;
      this.words.push(t);
    }
    update(time, dt){
      if (this.over) return;
      const s = dt / 1000;
      if (this.keys.left.isDown) this.tx -= 520 * s;
      if (this.keys.right.isDown) this.tx += 520 * s;
      this.tx = Phaser.Math.Clamp(this.tx, 70, W - 70);
      this.basket.x += (this.tx - this.basket.x) * Math.min(1, s * 12);
      this.words = this.words.filter(w => {
        w.y += w.vy * s;
        if (w.y > H - 64 && w.y < H - 20 && Math.abs(w.x - this.basket.x) < 80) { this.catchWord(w); return false; }
        if (w.y > H + 20) { w.destroy(); return false; }
        return true;
      });
    }
    catchWord(w){
      const word = w.text, cat = w.cat; w.destroy();
      if (cat === this.rule) {
        this.addPoints(10, this.basket.x, H - 95); this.track(word, true);
        this.tweens.add({targets:this.basket, y:H - 52, duration:90, yoyo:true});
      } else {
        this.miss(this.basket.x, H - 100, `"${word}" is a ${POS_ONE[cat]}`); this.track(word, false);
      }
    }
  }

  /* ---------- 3. Sentence Builder (word order) ---------- */
  class SentenceBuilder extends BaseScene {
    constructor(){ super('sentence'); }
    create(){
      this.setup('sentence', [80, 170]);
      this.bg(0xfcd34d, 0xfb923c);
      this.hud('🧩 Sentence Builder', this.secs(150));
      this.queue = shuffle(SENTENCES);
      this.pic = this.add.text(W/2, 104, '', {fontSize:'46px'}).setOrigin(.5);
      const g = this.add.graphics(); g.fillStyle(0xffffff, .55); g.fillRoundedRect(30, 150, W - 60, 130, 20);
      this.add.text(44, 156, 'Your sentence', F(14, '#92400e'));
      this.button(W/2 - 110, H - 38, 180, 50, '💡 Hint', 0x7c3aed, () => this.hint(), 20);
      this.button(W/2 + 110, H - 38, 180, 50, '✔ Check', 0x22c55e, () => this.check(), 20);
      this.tiles = [];
      this.nextRound();
    }
    nextRound(){
      this.tiles.forEach(t => t.destroy()); this.tiles = [];
      const s = this.queue.shift();
      if (!s) { this.endGame(); return; }
      this.cur = s; this.words = s.s.split(' '); this.answer = []; this.hints = 0; this.busy = false;
      this.pic.setText(s.e);
      let order = shuffle(this.words);
      while (order.join(' ') === s.s && this.words.length > 1) order = shuffle(this.words);
      this.tiles = order.map(w => this.makeTile(w));
      this.layout();
    }
    makeTile(word){
      const c = this.add.container(W/2, 340).setDepth(5);
      const t = this.add.text(0, 0, word, F(22, '#1e1b4b')).setOrigin(.5);
      const w = t.width + 30, h = 48, g = this.add.graphics();
      c.paint = fill => {
        g.clear();
        g.fillStyle(0x000000, .15); g.fillRoundedRect(-w/2, -h/2 + 4, w, h, 12);
        g.fillStyle(fill, 1); g.fillRoundedRect(-w/2, -h/2, w, h, 12);
      };
      c.paint(0xffffff);
      c.add([g, t]); c.setSize(w, h).setInteractive({useHandCursor:true});
      c.w = w; c.word = word;
      c.on('pointerdown', () => this.tap(c));
      return c;
    }
    tap(c){
      if (this.busy || this.over || c.locked) return;
      SFX.play('click');
      const i = this.answer.indexOf(c);
      if (i >= 0) this.answer.splice(i, 1); else this.answer.push(c);
      this.layout();
      if (this.answer.length === this.words.length) this.time.delayedCall(250, () => this.check());
    }
    layout(){
      this.place(this.answer, 195);
      this.place(this.tiles.filter(t => !this.answer.includes(t)), 340);
    }
    place(list, y0){
      const rows = [[]], max = W - 100; let rw = 0;
      list.forEach(t => {
        if (rw + t.w > max && rows[rows.length - 1].length) { rows.push([]); rw = 0; }
        rows[rows.length - 1].push(t); rw += t.w + 10;
      });
      rows.forEach((r, ri) => {
        const tot = r.reduce((a, t) => a + t.w + 10, -10);
        let x = W/2 - tot/2;
        r.forEach(t => { this.tweens.add({targets:t, x:x + t.w/2, y:y0 + ri * 58, duration:180, ease:'Cubic.out'}); x += t.w + 10; });
      });
    }
    prefix(){
      let k = 0;
      while (k < this.answer.length && this.answer[k].word === this.words[k]) k++;
      return k;
    }
    check(){
      if (this.busy || this.over || !this.answer.length) return;
      const k = this.prefix();
      this.answer.slice(0, k).forEach(t => { t.locked = true; t.paint(0x86efac); });
      if (k === this.words.length) {
        this.busy = true;
        this.addPoints(Math.max(5, 20 - this.hints * 5), W/2, 215);
        this.track(this.cur.s, true); speak(this.cur.s);
        this.time.delayedCall(1700, () => this.nextRound());
      } else {
        const removed = this.answer.slice(k);
        this.answer = this.answer.slice(0, k);
        removed.forEach(t => t.paint(0xffffff));
        this.layout();
        this.miss(W/2, 140, k ? 'Almost! Green words are right' : 'Check the first word');
        this.track(this.cur.s, false);
      }
    }
    hint(){
      if (this.busy || this.over) return;
      const k = this.prefix();
      if (k >= this.words.length) return;
      this.answer.slice(k).forEach(t => t.paint(0xffffff));
      this.answer = this.answer.slice(0, k);
      const next = this.tiles.find(t => !this.answer.includes(t) && t.word === this.words[k]);
      if (!next) return;
      this.answer.push(next); next.locked = true; next.paint(0x86efac);
      this.answer.forEach(t => { t.locked = true; t.paint(0x86efac); });
      this.hints++; SFX.play('whoosh'); this.layout();
      if (this.answer.length === this.words.length) this.time.delayedCall(250, () => this.check());
    }
  }

  /* ---------- 4. Listen & Pick (listening) ---------- */
  class ListenPick extends BaseScene {
    constructor(){ super('listen'); }
    create(){
      this.setup('listen', [100, 180]);
      this.bg(0xf9a8d4, 0xa78bfa);
      this.hud('🎧 Listen & Pick', 0);
      this.round = 0; this.total = 8; this.cards = []; this.target = null;
      this.button(W/2, 118, 250, 56, '🔊 Hear again', 0xec4899, () => this.target && speak(this.target.w, .75));
      this.nextRound();
    }
    nextRound(){
      this.cards.forEach(c => c.destroy());
      this.round++;
      if (this.round > this.total) { this.endGame(); return; }
      this.infoText.setText(this.round + '/' + this.total);
      this.target = pickWeighted(VOCAB, this.target);
      const opts = shuffle([this.target, ...shuffle(VOCAB.filter(v => v.w !== this.target.w)).slice(0, 3)]);
      this.first = true; this.busy = false;
      this.cards = opts.map((v, i) => {
        const c = this.choiceCard(130 + i * 180, 310, v.e, v.w, card => this.pickCard(card));
        c.v = v; c.setScale(0);
        this.tweens.add({targets:c, scale:1, duration:300, delay:i * 70, ease:'Back.out'});
        return c;
      });
      this.time.delayedCall(450, () => speak(this.target.w));
    }
    pickCard(c){
      if (this.busy || c.locked || this.over) return;
      c.label.setVisible(true);
      if (c.v.w === this.target.w) {
        this.busy = true; c.paint(0xdcfce7, 0x22c55e);
        this.addPoints(this.first ? 15 : 5, c.x, c.y - 100); this.track(this.target.w, true); speak(c.v.w);
        this.time.delayedCall(1300, () => this.nextRound());
      } else {
        c.locked = true; c.paint(0xfee2e2, 0xef4444); this.first = false;
        this.miss(c.x, c.y - 100, 'Listen again 👂'); this.track(this.target.w, false);
        this.time.delayedCall(700, () => speak(this.target.w, .75));
      }
    }
  }

  /* ---------- 5. Reading Riddles (reading) ---------- */
  class ReadingRiddles extends BaseScene {
    constructor(){ super('read'); }
    create(){
      this.setup('read', [100, 170]);
      this.bg(0xfde68a, 0x86efac);
      this.hud('📖 Reading Riddles', 0);
      this.queue = shuffle(RIDDLES); this.total = this.queue.length; this.round = 0; this.cards = [];
      const g = this.add.graphics(); g.fillStyle(0xffffff, .92); g.fillRoundedRect(40, 72, W - 80, 110, 20);
      this.clue = this.add.text(W/2, 127, '', {...F(24, '#1e1b4b'), align:'center', wordWrap:{width:W - 130}}).setOrigin(.5);
      this.button(W/2, H - 34, 230, 50, '🔊 Read to me', 0x0ea5e9, () => this.cur && speak(this.cur.q, .85), 20);
      this.nextRound();
    }
    nextRound(){
      this.cards.forEach(c => c.destroy());
      this.cur = this.queue.shift(); this.round++;
      if (!this.cur) { this.endGame(); return; }
      this.infoText.setText(this.round + '/' + this.total);
      this.clue.setText(this.cur.q).setAlpha(0);
      this.tweens.add({targets:this.clue, alpha:1, duration:300});
      this.first = true; this.busy = false;
      this.cards = shuffle(this.cur.opts).map((e, i) => {
        const c = this.choiceCard(130 + i * 180, 310, e, e === this.cur.a ? this.cur.w : '', card => this.pickCard(card));
        c.e = e; c.setScale(0);
        this.tweens.add({targets:c, scale:1, duration:300, delay:i * 70, ease:'Back.out'});
        return c;
      });
    }
    pickCard(c){
      if (this.busy || c.locked || this.over) return;
      if (c.e === this.cur.a) {
        this.busy = true; c.paint(0xdcfce7, 0x22c55e); c.label.setVisible(true);
        this.addPoints(this.first ? 15 : 5, c.x, c.y - 100); this.track(this.cur.w, true); speak(this.cur.w);
        this.time.delayedCall(1400, () => this.nextRound());
      } else {
        c.locked = true; c.paint(0xfee2e2, 0xef4444); c.setAlpha(.6); this.first = false;
        this.miss(c.x, c.y - 100, 'Read the clue again 🔍'); this.track(this.cur.w, false);
      }
    }
  }

  /* ---------- 6. Memory Flip (vocabulary recall) ---------- */
  class MemoryFlip extends BaseScene {
    constructor(){ super('memory'); }
    create(){
      this.setup('memory', [90, 140]);
      this.bg(0xc4b5fd, 0x93c5fd);
      this.hud('🃏 Memory Flip', this.secs(90));
      this.moves = 0; this.matched = 0; this.open = []; this.busy = false;
      // Prefer words the learner has missed before (spaced repetition)
      const chosen = [];
      while (chosen.length < 6 && chosen.length < VOCAB.length) {
        const v = pickWeighted(VOCAB.filter(x => !chosen.includes(x)));
        chosen.push(v);
      }
      this.pairs = chosen.length;
      const deck = shuffle(chosen.flatMap(v => [{v, face:v.e, kind:'pic'}, {v, face:v.w, kind:'word'}]));
      const cw = 150, ch = 118, cols = 4;
      this.cards = deck.map((d, i) => this.makeCard(W/2 + (i % cols - 1.5) * (cw + 16), 135 + Math.floor(i / cols) * (ch + 14), cw, ch, d));
      this.onEnd = () => {
        if (this.matched === this.pairs && this.timeLeft > 0) { this.score += this.timeLeft; this.scoreText.setText('⭐ ' + this.score); }
      };
    }
    makeCard(x, y, w, h, d){
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      const t = this.add.text(0, 0, '?', F(40, '#ffffff')).setOrigin(.5);
      c.draw = (mode) => {
        g.clear();
        g.fillStyle(0x000000, .15); g.fillRoundedRect(-w/2, -h/2 + 5, w, h, 18);
        const fill = mode === 'back' ? 0x7c3aed : mode === 'done' ? 0xdcfce7 : 0xffffff;
        g.fillStyle(fill, 1); g.fillRoundedRect(-w/2, -h/2, w, h, 18);
        if (mode === 'back') {
          t.setText('?').setStyle(F(40, '#ffffff'));
        } else {
          t.setText(d.face).setStyle(d.kind === 'pic' ? {fontSize:'56px'} : F(d.face.length > 7 ? 20 : 26, '#1e1b4b'));
        }
      };
      c.draw('back');
      c.add([g, t]); c.setSize(w, h).setInteractive({useHandCursor:true});
      c.d = d; c.up = false; c.done = false;
      c.on('pointerdown', () => this.tapCard(c));
      return c;
    }
    flip(c, mode){
      SFX.play('flip');
      this.tweens.add({targets:c, scaleX:0, duration:110, onComplete:() => {
        c.draw(mode);
        this.tweens.add({targets:c, scaleX:1, duration:110});
      }});
    }
    tapCard(c){
      if (this.busy || this.over || c.up || c.done) return;
      c.up = true; this.flip(c, 'face');
      if (c.d.kind === 'word') speak(c.d.v.w);
      this.open.push(c);
      if (this.open.length < 2) return;
      this.moves++; this.busy = true;
      const [a, b] = this.open;
      if (a.d.v.w === b.d.v.w) {
        this.time.delayedCall(350, () => {
          [a, b].forEach(k => { k.done = true; k.draw('done'); this.tweens.add({targets:k, scale:1.08, duration:120, yoyo:true}); });
          this.addPoints(15, (a.x + b.x) / 2, (a.y + b.y) / 2); this.track(a.d.v.w, true); speak(a.d.v.w);
          this.matched++; this.open = []; this.busy = false;
          this.infoText.setText('⏱ ' + this.timeLeft);
          if (this.matched === this.pairs) this.time.delayedCall(600, () => this.endGame());
        });
      } else {
        this.time.delayedCall(850, () => {
          this.streak = 0; this.streakText.setText(''); SFX.play('wrong');
          this.track(a.d.v.w, false);
          [a, b].forEach(k => { k.up = false; this.flip(k, 'back'); });
          this.open = []; this.busy = false;
        });
      }
    }
  }

  /* ---------- 7. Tense Train (verb tenses, drag & drop) ---------- */
  class TenseTrain extends BaseScene {
    constructor(){ super('tense'); }
    create(){
      this.setup('tense', [90, 160]);
      this.bg(0xbae6fd, 0xfef08a);
      this.hud('🚂 Tense Train', this.secs(120));
      const rail = this.add.graphics();
      rail.fillStyle(0x78716c, 1); rail.fillRect(0, 334, W, 6);
      for (let x = 0; x < W; x += 34) rail.fillRect(x, 340, 18, 8);
      this.queue = shuffle(TENSE); this.tiles = []; this.train = null;
      this.input.dragDistanceThreshold = 8;
      this.input.on('drag', (p, o, x, y) => { o.x = x; o.y = y; });
      this.input.on('dragend', (p, o) => { if (this.inSign(o)) this.choose(o); else this.home(o); });
      this.nextRound();
    }
    sentence(word){ return `${this.cur.pre} ${word} ${this.cur.post}`; }
    nextRound(){
      this.tiles.forEach(t => t.destroy()); this.tiles = [];
      if (this.train) this.train.destroy();
      this.cur = this.queue.shift();
      if (!this.cur) { this.endGame(); return; }
      this.busy = false; this.tries = 0;

      // Train (container offset in x, children use absolute coordinates)
      const tr = this.add.container(-W, 0);
      const g = this.add.graphics();
      g.fillStyle(0x000000, .15); g.fillRoundedRect(W/2 - 340, 146, 680, 92, 18);
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(W/2 - 340, 140, 680, 92, 18);
      g.lineStyle(4, 0x1e1b4b, 1); g.strokeRoundedRect(W/2 - 340, 140, 680, 92, 18);
      [[W/2 - 300, 0xef4444], [W/2 - 100, 0x3b82f6], [W/2 + 100, 0x22c55e]].forEach(([x, col]) => {
        g.fillStyle(col, 1); g.fillRoundedRect(x, 256, 180, 66, 12);
        g.fillStyle(0xffffff, .6); g.fillRoundedRect(x + 20, 268, 50, 26, 6); g.fillRoundedRect(x + 105, 268, 50, 26, 6);
        g.fillStyle(0x1e1b4b, 1); g.fillCircle(x + 40, 326, 13); g.fillCircle(x + 140, 326, 13);
      });
      const engine = this.add.text(W/2 + 300, 288, '🚂', {fontSize:'70px'}).setOrigin(.5).setFlipX(true);
      this.signText = this.add.text(W/2, 186, this.sentence('_____'), {...F(28, '#1e1b4b'), align:'center', wordWrap:{width:640}}).setOrigin(.5);
      tr.add([g, engine, this.signText]);
      this.train = tr;
      this.tweens.add({targets:tr, x:0, duration:900, ease:'Cubic.out'});

      // Draggable answer tiles
      shuffle(this.cur.opts).forEach((word, i) => {
        const c = this.add.container(W/2 + (i - 1) * 230, 420).setDepth(10);
        const t = this.add.text(0, 0, word, F(24, '#ffffff')).setOrigin(.5);
        const w = Math.max(150, t.width + 36), h = 56, bg = this.add.graphics();
        c.paint = col => {
          bg.clear();
          bg.fillStyle(0x000000, .2); bg.fillRoundedRect(-w/2, -h/2 + 5, w, h, 14);
          bg.fillStyle(col, 1); bg.fillRoundedRect(-w/2, -h/2, w, h, 14);
        };
        c.paint(0x7c3aed);
        c.add([bg, t]); c.setSize(w, h).setInteractive({useHandCursor:true, draggable:true});
        c.word = word; c.homeX = c.x; c.homeY = c.y;
        c.on('pointerdown', () => { c.dragged = false; });
        c.on('dragstart', () => { c.dragged = true; c.setScale(1.08); });
        c.on('pointerup', () => { if (!c.dragged) this.choose(c); });
        c.setScale(0);
        this.tweens.add({targets:c, scale:1, duration:300, delay:500 + i * 80, ease:'Back.out'});
        this.tiles.push(c);
      });
    }
    inSign(o){ return o.y > 120 && o.y < 260 && Math.abs(o.x - W/2) < 350; }
    home(c){ c.setScale(1); this.tweens.add({targets:c, x:c.homeX, y:c.homeY, duration:220, ease:'Cubic.out'}); }
    choose(c){
      if (this.busy || this.over || !c.active) return;
      if (c.word === this.cur.ans) {
        this.busy = true;
        this.signText.setText(this.sentence(this.cur.ans)).setColor('#16a34a');
        c.destroy();
        this.addPoints(this.tries === 0 ? 15 : 5, W/2, 120); this.track(this.cur.ans, true);
        SFX.play('whistle'); speak(this.sentence(this.cur.ans));
        this.tiles.forEach(t => t.active && t.disableInteractive());
        this.time.delayedCall(1700, () => {
          this.tweens.add({targets:this.train, x:W + 100, duration:900, ease:'Cubic.in', onComplete:() => this.nextRound()});
        });
      } else {
        this.tries++;
        this.miss(W/2, 120, this.cur.hint); this.track(this.cur.ans, false);
        c.paint(0xef4444); this.time.delayedCall(500, () => c.active && c.paint(0x7c3aed));
        this.home(c);
      }
    }
  }

  /* ---------- Game manager (public API used by the page UI) ---------- */
  const SCENES = { pop:WordPop, catch:GrammarCatch, sentence:SentenceBuilder, listen:ListenPick, read:ReadingRiddles, memory:MemoryFlip, tense:TenseTrain };
  let game = null;

  window.PlayLingo = {
    start(key){
      SFX.init();
      this.stop();
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-container',
        width: W, height: H,
        backgroundColor: '#eef2ff',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [SCENES[key] || WordPop]
      });
    },
    stop(){
      try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch(e){}
      if (game) { game.destroy(true); game = null; }
    },
    toggleSound(){
      SFX.on = !SFX.on;
      if (!SFX.on) { try { speechSynthesis.cancel(); } catch(e){} }
      return SFX.on;
    },
    setDifficulty(level){ if (DIFF[level]) settings.difficulty = level; },
    getVocab(){ return VOCAB.map(v => ({...v})); },
    setVocab(list){ if (Array.isArray(list) && list.length >= 6) VOCAB = list.map(v => ({w:String(v.w), e:String(v.e)})); },
    resetVocab(){ VOCAB = DEFAULT_VOCAB.slice(); }
  };

  /* Part 1 ran before this engine existed, so fill the Content Lab with the real default list now */
  const labInput = document.getElementById('labInput');
  if (labInput) {
    labInput.value = VOCAB.map(v => v.w + ' ' + v.e).join('\n');
    labInput.dispatchEvent(new Event('input'));
  }
})();
