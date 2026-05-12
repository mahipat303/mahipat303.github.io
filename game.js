/* =========================================================================
   SUPER DEV WORLD — A portfolio quest
   Original 8/16-bit style platformer. No Nintendo IP.
   ========================================================================= */
(() => {
'use strict';

// ---------- Constants ----------
const VW = 480, VH = 270;     // viewport (internal canvas resolution)
const TILE = 16;
const WORLD_TW = 210;          // world width in tiles
const WORLD_TH = 17;
const WORLD_W = WORLD_TW * TILE;
const WORLD_H = WORLD_TH * TILE;

const GRAVITY = 0.34;
const MOVE_ACC = 0.7;
const MOVE_MAX = 2.6;
const AIR_ACC = 0.6;
const FRICTION = 0.65;
const JUMP_V = -6.6;
const JUMP_HOLD = 0.22;   // extra lift while holding jump
const JUMP_HOLD_FRAMES = 13;
const MAX_FALL = 8.0;
const COYOTE_FRAMES = 6;   // grace period to jump after walking off edge
const JUMP_BUFFER_FRAMES = 8; // grace period to queue a jump pressed just before landing
const FALL_BOOST = 0.55;   // extra gravity when not holding jump during ascent (snappier feel)

const COLORS = {
  sky1: '#6BB6FF', sky2: '#A9D6FF',
  hill: '#4F9628', hillDark: '#356619',
  ground: '#84D03A', dirt: '#7C4A1F', dirtD: '#5A3415',
  brick: '#C84B3A', brickD: '#8E2E1F', brickM: '#1B1B2E',
  qBlock: '#FFC23A', qBlockD: '#C97F00', qFace: '#1B1B2E',
  qUsed: '#9C5B1A', qUsedD: '#5A3415',
  pipe: '#22A04A', pipeD: '#0D6B2F', pipeL: '#5DD679',
  coin: '#FFD93D', coinD: '#C99A2B', coinHi: '#FFF1A8',
  flagPole: '#E8E8E8', flagPoleD: '#8A8A8A',
  flag: '#C84B3A', flagD: '#8E2E1F',
  cloud: '#FFFFFF', cloudShade: '#D9E9FF',
  ink: '#1B1B2E',
};

// ---------- Canvas setup ----------
const canvas = document.getElementById('game');
canvas.width = VW; canvas.height = VH;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const stage = document.getElementById('stage');
  const sw = stage.clientWidth, sh = stage.clientHeight;
  // On narrow portrait viewports, "cover" the screen so there are no big sky bands.
  // Reserve ~120px at the bottom for touch controls so the player isn't hidden under them.
  const isPortraitMobile = sw < 820 && sh > sw;
  const reservedBottom = isPortraitMobile ? 120 : 0;
  const usableH = Math.max(sh - reservedBottom, 200);
  const scale = isPortraitMobile
    ? Math.max(sw / VW, usableH / VH)   // cover
    : Math.min(sw / VW, sh / VH);        // contain
  const w = Math.floor(VW * scale), h = Math.floor(VH * scale);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.style.left = Math.floor((sw - w) / 2) + 'px';
  canvas.style.top = Math.floor(((isPortraitMobile ? usableH : sh) - h) / 2) + 'px';
  canvas.style.position = 'absolute';
}
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 50));

// ---------- Input ----------
const keys = {};
const justPressed = {};
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Space'].includes(e.key)) e.preventDefault();
  const k = e.key === ' ' ? ' ' : e.key;
  if (!keys[k]) justPressed[k] = true;
  keys[k] = true;
  if (state.scene === 'title') { startGame(); }
  if (e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (e.key === 'Escape') closePanel();
});
window.addEventListener('keyup', (e) => {
  const k = e.key === ' ' ? ' ' : e.key;
  keys[k] = false;
});
// touch
document.querySelectorAll('.tbtn').forEach(btn => {
  const k = btn.dataset.key;
  const action = btn.dataset.action;
  if (action) {
    const fire = (e) => {
      e.preventDefault();
      if (action === 'pause') togglePause();
      else if (action === 'mute') toggleMute();
    };
    btn.addEventListener('touchstart', fire, {passive:false});
    btn.addEventListener('click', fire);
    return;
  }
  const press = (e) => { e.preventDefault(); if (!keys[k]) justPressed[k] = true; keys[k] = true; if (state.scene === 'title') startGame(); };
  const release = (e) => { e.preventDefault(); keys[k] = false; };
  btn.addEventListener('touchstart', press, {passive:false});
  btn.addEventListener('touchend', release, {passive:false});
  btn.addEventListener('touchcancel', release, {passive:false});
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
});
document.getElementById('title').addEventListener('click', () => startGame());

// ---------- Audio ----------
let audioCtx = null;
let muted = false;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function beep(freq, dur, type = 'square', gain = 0.06, slide = 0) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function sfx(name) {
  if (muted) return;
  ensureAudio();
  switch (name) {
    case 'jump': beep(380, 0.12, 'square', 0.05, 200); break;
    case 'coin': beep(987, 0.05, 'square', 0.05); setTimeout(() => beep(1318, 0.12, 'square', 0.05), 50); break;
    case 'bump': beep(180, 0.08, 'triangle', 0.06, -50); break;
    case 'powerup': [523,659,784,1046].forEach((f,i) => setTimeout(() => beep(f, 0.1, 'square', 0.05), i * 60)); break;
    case 'pause': beep(440, 0.08, 'square', 0.04); break;
    case 'win': [523,659,784,1046,1318].forEach((f,i) => setTimeout(() => beep(f, 0.15, 'square', 0.06), i * 100)); break;
    case 'die': beep(220, 0.4, 'sawtooth', 0.06, -150); break;
  }
}
function toggleMute() { muted = !muted; toast({type:'hype', text: muted ? '🔇 MUTED (rude but valid)' : '🔊 SOUND ON — brace yourself'}); }

// ---------- Sprite renderer ----------
// Pixel art via string arrays. '.' = transparent.
function makeSprite(data, palette) {
  const h = data.length, w = data[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = data[y][x];
      const col = palette[ch];
      if (col) {
        cx.fillStyle = col;
        cx.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

// Hero — 14 wide × 18 tall — modeled on Mahipat (dark hair, beard,
// mirrored shades, ear stud, blue/white striped polo).
const HERO_PAL = {
  '#': COLORS.ink,
  'h': '#1A1410', // hair dark
  'H': '#3A2A1C', // hair highlight
  's': '#D9A982', // skin warm
  'S': '#A87850', // skin shadow
  'r': '#1F1812', // beard
  'g': '#8E96A0', // sunglass frame
  'G': '#2A323E', // lens dark
  'L': '#A8C8E8', // lens reflection
  'k': '#D9D9D9', // earring stud
  'w': '#F0F0E8', // polo white
  'W': '#C9C9C2', // polo white shadow
  't': '#2E5BA8', // polo blue stripe
  'T': '#1B3F7A', // polo blue shadow
  'n': '#2A3A6B', // pants navy
  'N': '#1A2447', // pants shadow
  'c': '#3B2010', // shoes
};
const HERO_IDLE = [
  '....hhhhhh....',
  '..hhHHHHHHhh..',
  '.hhHHHHHHHHhh.',
  '.hssssssssshk.',
  '..gggggggggg..',
  '.#GLGGGGGGLG#.',
  '..#ssssssss#..',
  '..#rrrrrrrr#..',
  '..#wwwwwwww#..',
  '.#wttwwttwttw#',
  '.#wttwwttwttw#',
  '.#wwwwwwwwww#.',
  '..#tt####tt#..',
  '..#nnNnnNnn#..',
  '..#nnNnnNnn#..',
  '...#nn##nn#...',
  '...#nn..nn#...',
  '..##cc..cc##..',
];
const HERO_WALK1 = [
  '....hhhhhh....',
  '..hhHHHHHHhh..',
  '.hhHHHHHHHHhh.',
  '.hssssssssshk.',
  '..gggggggggg..',
  '.#GLGGGGGGLG#.',
  '..#ssssssss#..',
  '..#rrrrrrrr#..',
  '.#wwwwwwwwww#.',
  '#wwttwwttwttw#',
  '#wwttwwttwttw#',
  '.#wwwwwwwwww#.',
  '..#tt####tt#..',
  '..#nnNnnNnn#..',
  '..#nnNnnNn#...',
  '...#nn##n#....',
  '..##cc..#nn#..',
  '.##cc...##cc##',
];
const HERO_WALK2 = [
  '....hhhhhh....',
  '..hhHHHHHHhh..',
  '.hhHHHHHHHHhh.',
  '.hssssssssshk.',
  '..gggggggggg..',
  '.#GLGGGGGGLG#.',
  '..#ssssssss#..',
  '..#rrrrrrrr#..',
  '.#wwwwwwwwww#.',
  '#wwttwwttwttw#',
  '#wwttwwttwttw#',
  '.#wwwwwwwwww#.',
  '..#tt####tt#..',
  '..#nnNnnNnn#..',
  '...#nnNnnNn#..',
  '....#n##nn#...',
  '..#nn..cc##...',
  '##cc##...cc##.',
];
const HERO_JUMP = [
  '....hhhhhh....',
  '..hhHHHHHHhh..',
  '.hhHHHHHHHHhh.',
  '.hssssssssshk.',
  '..gggggggggg..',
  '.#GLGGGGGGLG#.',
  '..#ssssssss#..',
  '..#rrrrrrrr#..',
  '.#wwwwwwwwww#.',
  '#wwttwwttwttw#',
  '#wwttwwttwttw#',
  '.#wwwwwwwwww#.',
  '..#tt####tt#..',
  '.##nnnnnnnn##.',
  '#nnNnnNnnNnnNn',
  '##nnNnnNnnNn##',
  '..#nn..nn#....',
  '.##cc##cc##...',
];

const heroIdle = makeSprite(HERO_IDLE, HERO_PAL);
const heroWalk1 = makeSprite(HERO_WALK1, HERO_PAL);
const heroWalk2 = makeSprite(HERO_WALK2, HERO_PAL);
const heroJump = makeSprite(HERO_JUMP, HERO_PAL);

// Real face overlay — drawn on top of the pixel head
const faceImg = new Image();
let faceReady = false;
faceImg.onload = () => { faceReady = true; };
faceImg.src = 'face.png';

// Coin — 10 wide × 12 tall
const COIN_PAL = {
  '#': COLORS.ink,
  'y': COLORS.coin,
  'Y': COLORS.coinD,
  'h': COLORS.coinHi,
};
const COIN_FRAMES = [
  ['..####....','.#yyyy#...','#yhYyyy#..','#yhYyyy#..','#yhYyyy#..','#yhYyyy#..','#yhYyyy#..','#yhYyyy#..','#yhYyyy#..','#yhYyyy#..','.#yyyy#...','..####...'].map(s => s.padEnd(10, '.')),
  ['...##.....','..#yy#....','.#hYy#....','.#hYy#....','.#hYy#....','.#hYy#....','.#hYy#....','.#hYy#....','.#hYy#....','.#hYy#....','..#yy#....','...##....'].map(s => s.padEnd(10, '.')),
  ['..####....','.#YYYY#...','#YYYYYY#..','#YYYYYY#..','#YYYYYY#..','#YYYYYY#..','#YYYYYY#..','#YYYYYY#..','#YYYYYY#..','#YYYYYY#..','.#YYYY#...','..####...'].map(s => s.padEnd(10, '.')),
];
const coinSprites = COIN_FRAMES.map(d => makeSprite(d, COIN_PAL));

// Q-block — 16 × 16
function makeBlockTile(face, fill, shade) {
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  const cx = c.getContext('2d');
  // outer dark border
  cx.fillStyle = COLORS.ink;
  cx.fillRect(0,0,TILE,TILE);
  // inner fill
  cx.fillStyle = fill;
  cx.fillRect(1,1,TILE-2,TILE-2);
  // shading bevel
  cx.fillStyle = shade;
  cx.fillRect(1,TILE-3,TILE-2,2);
  cx.fillRect(TILE-3,1,2,TILE-2);
  // rivets / face character
  cx.fillStyle = COLORS.ink;
  if (face === '?') {
    // draw "?" pixels
    const Q = [
      '..####..',
      '.#....#.',
      '#......#',
      '.....##.',
      '....##..',
      '....#...',
      '........',
      '....#...',
    ];
    const ox = 4, oy = 4;
    for (let y = 0; y < Q.length; y++) for (let x = 0; x < Q[y].length; x++) {
      if (Q[y][x] === '#') { cx.fillStyle = COLORS.qFace; cx.fillRect(ox+x, oy+y, 1, 1); }
    }
  } else if (face === 'B') {
    // brick lines
    cx.fillStyle = COLORS.brickD;
    cx.fillRect(0, 5, TILE, 1);
    cx.fillRect(0, 10, TILE, 1);
    cx.fillRect(7, 1, 1, 4);
    cx.fillRect(3, 6, 1, 4);
    cx.fillRect(11, 6, 1, 4);
    cx.fillRect(7, 11, 1, 4);
  } else if (face === 'U') {
    // used block — 4 corner rivets
    cx.fillStyle = shade;
    cx.fillRect(3,3,2,2); cx.fillRect(TILE-5,3,2,2);
    cx.fillRect(3,TILE-5,2,2); cx.fillRect(TILE-5,TILE-5,2,2);
  }
  return c;
}
const tileQ = makeBlockTile('?', COLORS.qBlock, COLORS.qBlockD);
const tileBrick = makeBlockTile('B', COLORS.brick, COLORS.brickD);
const tileQUsed = makeBlockTile('U', COLORS.qUsed, COLORS.qUsedD);

// Ground tile — grass top + dirt
function makeGroundTile(top) {
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  const cx = c.getContext('2d');
  cx.fillStyle = top ? COLORS.ground : COLORS.dirt;
  cx.fillRect(0,0,TILE,TILE);
  if (top) {
    // grass texture top
    cx.fillStyle = '#A8E84F';
    cx.fillRect(0,0,TILE,3);
    cx.fillStyle = COLORS.ink;
    cx.fillRect(0,3,TILE,1);
    cx.fillStyle = COLORS.dirt;
    cx.fillRect(0,4,TILE,TILE-4);
    cx.fillStyle = '#A0612A';
    for (let i = 0; i < 6; i++) {
      const x = (i * 31 + 7) % TILE;
      const y = 5 + ((i * 17 + 3) % (TILE - 6));
      cx.fillRect(x, y, 2, 1);
    }
    cx.fillStyle = COLORS.ground;
    cx.fillRect(0,0,TILE,3);
    cx.fillStyle = '#A8E84F';
    cx.fillRect(0,0,TILE,2);
    cx.fillStyle = '#5FA92E';
    cx.fillRect(0,2,TILE,1);
    cx.fillStyle = COLORS.ink;
    cx.fillRect(0,3,TILE,1);
  } else {
    cx.fillStyle = COLORS.dirtD;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 53) + 3) % TILE;
      const y = ((i * 37) + 2) % TILE;
      cx.fillRect(x, y, 2, 1);
    }
  }
  return c;
}
const tileGrass = makeGroundTile(true);
const tileDirt = makeGroundTile(false);

// Pipe — 2 tiles wide (32px), variable height
function drawPipe(cx, px, py, h) {
  // h in tiles. Top tile is the rim (taller), rest are body.
  const w = 32;
  // body
  for (let i = 1; i < h; i++) {
    cx.fillStyle = COLORS.ink; cx.fillRect(px+2, py + i*TILE, w-4, TILE);
    cx.fillStyle = COLORS.pipe; cx.fillRect(px+3, py + i*TILE, w-6, TILE);
    cx.fillStyle = COLORS.pipeL; cx.fillRect(px+4, py + i*TILE, 3, TILE);
    cx.fillStyle = COLORS.pipeD; cx.fillRect(px+w-7, py + i*TILE, 3, TILE);
  }
  // rim
  cx.fillStyle = COLORS.ink; cx.fillRect(px, py, w, TILE);
  cx.fillStyle = COLORS.pipe; cx.fillRect(px+1, py+1, w-2, TILE-2);
  cx.fillStyle = COLORS.pipeL; cx.fillRect(px+2, py+1, 4, TILE-3);
  cx.fillStyle = COLORS.pipeD; cx.fillRect(px+w-6, py+1, 4, TILE-3);
  cx.fillStyle = COLORS.ink; cx.fillRect(px+1, py+TILE-3, w-2, 1);
}

// Clouds — drawn directly
function drawCloud(cx, x, y, size) {
  const s = size;
  cx.fillStyle = COLORS.cloudShade;
  const blob = (bx, by, w, h) => cx.fillRect(bx, by, w, h);
  // simple pixel cloud
  blob(x+2*s, y+s, 10*s, 3*s);
  blob(x+s, y+2*s, 14*s, 2*s);
  blob(x, y+3*s, 16*s, s);
  cx.fillStyle = COLORS.cloud;
  blob(x+2*s, y, 10*s, 3*s);
  blob(x+s, y+s, 14*s, 2*s);
  blob(x, y+2*s, 16*s, s);
}

// Hill — drawn directly
function drawHill(cx, x, y, w, h) {
  cx.fillStyle = COLORS.hill;
  // pyramid-ish silhouette
  const steps = h;
  for (let i = 0; i < steps; i++) {
    const ww = w - (i * (w / steps));
    cx.fillRect(x + (w - ww)/2, y - i*2, ww, 2);
  }
  cx.fillStyle = COLORS.hillDark;
  cx.fillRect(x, y, w, 2);
}

// ---------- Level ----------
// Build a 2D char grid for collisions, plus entity lists.
function buildLevel() {
  const tiles = [];
  for (let y = 0; y < WORLD_TH; y++) {
    tiles.push(new Array(WORLD_TW).fill('.'));
  }
  // Ground (rows 14, 15, 16 by default — grass top at 14)
  for (let x = 0; x < WORLD_TW; x++) {
    tiles[14][x] = 'G';
    tiles[15][x] = 'D';
    tiles[16][x] = 'D';
  }
  // Gaps (jumpable)
  const gaps = [[44, 47], [128, 130], [170, 172]];
  for (const [a,b] of gaps) {
    for (let x = a; x <= b; x++) {
      for (let y = 14; y < WORLD_TH; y++) tiles[y][x] = '.';
    }
  }
  // Stairs near end
  const stair = (sx, h, dir = 1) => {
    for (let i = 0; i < h; i++) {
      for (let yy = 0; yy <= i; yy++) {
        tiles[13 - yy][sx + (dir > 0 ? i : (h - 1 - i))] = 'B';
      }
    }
  };
  stair(176, 4, 1);

  // Brick & Q layout
  // Each entry: x, y(row), type, sectionId?
  const blocks = [];
  const addRow = (x0, y, n, t) => { for (let i = 0; i < n; i++) blocks.push({x:x0+i,y,t}); };

  // About zone — wide platform with the Q in the middle
  addRow(16, 10, 2, 'B'); blocks.push({x:18,y:10,t:'?',s:'about'}); addRow(19, 10, 2, 'B');

  // Skills zone: bricks + Q with coin cluster
  addRow(32, 10, 2, 'B'); blocks.push({x:34,y:10,t:'?',s:'skills'}); addRow(35, 10, 2, 'B');

  // Projects zone: stepped bricks + Q (Q sits on top of brick line, easy to bump from below)
  addRow(55, 10, 5, 'B');
  addRow(57, 7, 2, 'B'); blocks.push({x:59,y:7,t:'?',s:'projects'}); addRow(60, 7, 2, 'B');

  // Experience zone — wide platform around Q, above pipe
  addRow(82, 10, 2, 'B'); blocks.push({x:84,y:10,t:'?',s:'experience'}); addRow(85, 10, 2, 'B');

  // Education zone — Q on wider platform
  addRow(105, 8, 2, 'B'); blocks.push({x:107,y:8,t:'?',s:'education'}); addRow(108, 8, 2, 'B');

  // Achievements zone — Q on wider platform + decorative roof
  addRow(133, 9, 2, 'B'); blocks.push({x:135,y:9,t:'?',s:'achievements'}); addRow(136, 9, 2, 'B');
  addRow(138, 6, 4, 'B');

  // Contact zone — Q with landing platforms
  addRow(158, 10, 2, 'B'); blocks.push({x:160,y:10,t:'?',s:'contact'}); addRow(161, 10, 2, 'B');

  // Floating decorative bricks — wider so they're useful landing pads
  addRow(24, 7, 4, 'B');
  addRow(68, 6, 4, 'B');
  addRow(95, 7, 4, 'B');
  addRow(118, 9, 3, 'B');
  addRow(150, 6, 4, 'B');
  addRow(168, 8, 3, 'B');

  // Apply blocks into tiles
  const qBlocks = [];
  for (const b of blocks) {
    tiles[b.y][b.x] = b.t === '?' ? '?' : 'B';
    if (b.t === '?') qBlocks.push({x: b.x, y: b.y, section: b.s, hit: false, bumpT: 0});
  }

  // Pipes — array of {tx, ty, h, section}. Standing on top + ↓ warps to that section.
  const pipes = [
    {tx: 50, h: 2, section: 'about'},
    {tx: 78, h: 3, section: 'experience'},
    {tx: 145, h: 2, section: 'achievements'},
  ];
  for (const p of pipes) {
    const ty = 14 - p.h;
    p.ty = ty;
    for (let i = 0; i < p.h; i++) {
      tiles[ty + i][p.tx] = 'P';
      tiles[ty + i][p.tx + 1] = 'P';
    }
  }

  // Coins — pure score / encouragement. Skills live in the Skill Tree panel.
  // Each coin reveals one skill at top-right (yellow card style).
  const coinToasts = [
    {type:'skill', text:'+ JAVA'},
    {type:'skill', text:'+ SPRING BOOT'},
    {type:'skill', text:'+ PYTHON'},
    {type:'skill', text:'+ JAVASCRIPT'},
    {type:'skill', text:'+ HTML'},
    {type:'skill', text:'+ CSS'},
    {type:'skill', text:'+ AWS'},
    {type:'skill', text:'+ GIT / GITHUB'},
    {type:'skill', text:'+ PYTEST'},
    {type:'skill', text:'+ MCP (Model Context Protocol)'},
    {type:'skill', text:'+ CLAUDE / LLM INTEGRATION'},
    {type:'skill', text:'+ MITMPROXY'},
    {type:'skill', text:'+ SQLITE / VAULT DESIGN'},
    {type:'skill', text:'+ PSEUDONYMIZATION'},
    {type:'skill', text:'+ REGEX MASKING'},
    {type:'skill', text:'+ STRUCTLOG / JSONL AUDIT'},
    {type:'skill', text:'+ DEFENSE IN DEPTH'},
    {type:'skill', text:'+ ZERO-TRUST EGRESS'},
    {type:'skill', text:'+ ENTERPRISE DATA PRIVACY'},
    {type:'skill', text:'+ CONNECTOR DESIGN'},
    {type:'skill', text:'+ ENTITY MODELING'},
    {type:'skill', text:'+ POLLING'},
    {type:'skill', text:'+ ATTACHMENTS'},
    {type:'skill', text:'+ RECONCILIATION'},
    {type:'skill', text:'+ SCALE TESTING'},
    {type:'skill', text:'+ LARGE-DATASET MIGRATIONS'},
    {type:'skill', text:'+ PERFORMANCE TUNING'},
    {type:'skill', text:'+ API CACHING'},
    {type:'skill', text:'+ DB QUERY OPTIMIZATION'},
    {type:'skill', text:'+ MEMORY TUNING'},
    {type:'skill', text:'+ SDK EXTENSION'},
    {type:'skill', text:'+ AUTOMATION'},
    {type:'skill', text:'+ SYSTEM DESIGN'},
    {type:'skill', text:'+ CODE REVIEW'},
    {type:'skill', text:'+ TRIAGE'},
    {type:'skill', text:'+ SPRINT PLANNING'},
    {type:'skill', text:'+ CUSTOMER DEMOS'},
    {type:'skill', text:'+ VSTS'},
  ];
  const coinPositions = [
    {x:8,y:10},{x:9,y:10},{x:10,y:10},
    {x:21,y:6},{x:22,y:6},{x:23,y:6},
    {x:30,y:11},{x:31,y:11},{x:32,y:11},
    {x:36,y:8},{x:37,y:7},{x:38,y:6},
    {x:45,y:9},{x:46,y:8},
    {x:64,y:11},{x:65,y:11},{x:66,y:11},
    {x:71,y:5},{x:73,y:7},
    {x:90,y:11},{x:91,y:11},
    {x:96,y:6},{x:97,y:6},{x:98,y:6},{x:99,y:6},
    {x:120,y:11},{x:121,y:11},{x:122,y:11},
    {x:139,y:6},{x:140,y:6},{x:141,y:6},{x:142,y:6},
    {x:151,y:5},{x:152,y:5},{x:153,y:5},
    {x:165,y:11},{x:166,y:11},
    {x:181,y:10},{x:181,y:9},
  ];
  const coins = coinPositions.map((c, i) => ({
    x: c.x * TILE + 3, y: c.y * TILE + 2, w: 10, h: 12,
    taken: false, frame: (i % 3), msg: coinToasts[i % coinToasts.length],
    t: 0,
  }));

  // Decorative signposts (don't interact; the Q-blocks are the triggers)
  const signposts = [
    {x: 6 * TILE, label: 'START → →'},
    {x: 16 * TILE + 8, label: 'ABOUT'},
    {x: 33 * TILE, label: 'SKILLS'},
    {x: 56 * TILE, label: 'PROJECTS'},
    {x: 78 * TILE + 8, label: 'EXPERIENCE'},
    {x: 105 * TILE, label: 'EDUCATION'},
    {x: 133 * TILE, label: 'TROPHIES'},
    {x: 158 * TILE, label: 'CONTACT'},
  ];

  // Flag at the end
  const flag = {tx: 196, ty: 6, raised: 1};

  // Clouds — fixed positions, drawn with parallax
  const clouds = [
    {x: 40, y: 30, s: 1.4},
    {x: 220, y: 50, s: 1.0},
    {x: 380, y: 24, s: 1.6},
    {x: 560, y: 42, s: 1.1},
    {x: 760, y: 26, s: 1.3},
    {x: 940, y: 50, s: 1.5},
    {x: 1120, y: 30, s: 1.0},
    {x: 1320, y: 46, s: 1.4},
    {x: 1520, y: 22, s: 1.2},
    {x: 1720, y: 38, s: 1.6},
    {x: 1900, y: 30, s: 1.1},
    {x: 2080, y: 50, s: 1.4},
    {x: 2260, y: 28, s: 1.3},
    {x: 2440, y: 44, s: 1.2},
    {x: 2640, y: 26, s: 1.5},
    {x: 2840, y: 38, s: 1.0},
    {x: 3040, y: 30, s: 1.4},
    {x: 3200, y: 50, s: 1.2},
  ];

  // Hills
  const hills = [];
  for (let i = 0; i < 20; i++) {
    hills.push({x: 160 + i * 200, w: 90 + (i % 3) * 30, h: 30 + (i % 4) * 8});
  }

  return { tiles, qBlocks, pipes, coins, signposts, flag, clouds, hills };
}

// ---------- State ----------
const state = {
  scene: 'title',   // title | play | paused | win | dead
  level: null,
  player: null,
  camX: 0,
  t: 0,
  score: 0,
  coinsTaken: 0,
  coinsTotal: 0,
  lives: 3,
  panel: null,
  sectionsCleared: new Set(),
  ground: { jumpFrames: 0 },
  coyote: 0,
  jumpBuffer: 0,
};

function initPlayer() {
  return {
    x: 4 * TILE, y: 12 * TILE,
    w: 12, h: 18,
    vx: 0, vy: 0,
    onGround: false,
    facing: 1,
    walkT: 0,
    invuln: 0,
  };
}

// ---------- Collision ----------
function tileAt(tx, ty) {
  if (tx < 0 || tx >= WORLD_TW || ty < 0 || ty >= WORLD_TH) return '.';
  return state.level.tiles[ty][tx];
}
function isSolid(ch) { return ch === 'G' || ch === 'D' || ch === 'B' || ch === '?' || ch === 'U' || ch === 'P'; }

function moveAndCollide(p, ax, ay) {
  // X axis
  p.x += ax;
  if (ax !== 0) {
    const dir = ax > 0 ? 1 : -1;
    const left = Math.floor(p.x / TILE);
    const right = Math.floor((p.x + p.w - 1) / TILE);
    const top = Math.floor(p.y / TILE);
    const bot = Math.floor((p.y + p.h - 1) / TILE);
    const checkX = dir > 0 ? right : left;
    for (let ty = top; ty <= bot; ty++) {
      if (isSolid(tileAt(checkX, ty))) {
        if (dir > 0) p.x = checkX * TILE - p.w;
        else p.x = (checkX + 1) * TILE;
        p.vx = 0;
        break;
      }
    }
  }
  // Y axis
  p.y += ay;
  if (ay !== 0) {
    const dir = ay > 0 ? 1 : -1;
    const top = Math.floor(p.y / TILE);
    const bot = Math.floor((p.y + p.h - 1) / TILE);
    const left = Math.floor(p.x / TILE);
    const right = Math.floor((p.x + p.w - 1) / TILE);
    const checkY = dir > 0 ? bot : top;
    let hit = null;
    for (let tx = left; tx <= right; tx++) {
      if (isSolid(tileAt(tx, checkY))) {
        hit = { tx, ty: checkY };
        if (dir > 0) {
          p.y = checkY * TILE - p.h;
          p.onGround = true;
        } else {
          p.y = (checkY + 1) * TILE;
        }
        p.vy = 0;
        break;
      }
    }
    if (!hit && dir > 0) p.onGround = false;
    if (hit && dir < 0) {
      // bumped head — check if Q-block (active or already used)
      const ch = tileAt(hit.tx, hit.ty);
      if (ch === '?' || ch === 'U') bumpQ(hit.tx, hit.ty);
      else if (ch === 'B') sfx('bump');
    }
  }
}

function bumpQ(tx, ty) {
  const q = state.level.qBlocks.find(q => q.x === tx && q.y === ty);
  if (!q) return;
  if (!q.hit) {
    q.hit = true;
    state.level.tiles[ty][tx] = 'U';
    state.sectionsCleared.add(q.section);
    state.score += 500;
    sfx('powerup');
  } else {
    sfx('bump');
  }
  q.bumpT = 1;
  openPanel(q.section);
}

// ---------- Coins ----------
function checkCoins(p) {
  for (const c of state.level.coins) {
    if (c.taken) continue;
    if (p.x < c.x + c.w && p.x + p.w > c.x && p.y < c.y + c.h && p.y + p.h > c.y) {
      c.taken = true;
      state.coinsTaken++;
      state.score += 100;
      sfx('coin');
      toast(c.msg);
    }
  }
}

// ---------- Flag (win) ----------
function checkFlag(p) {
  const f = state.level.flag;
  const fx = f.tx * TILE + 4;
  if (p.x + p.w > fx && p.x < fx + 4 && state.scene === 'play') {
    state.scene = 'win';
    sfx('win');
    document.getElementById('win').classList.add('show');
    const totalSecs = state.level.qBlocks.filter(q => q.hit).length;
    document.getElementById('win-stats').innerHTML =
      `★ <b>${state.coinsTaken}/${state.coinsTotal}</b> coins · <b>${totalSecs}/7</b> sections · <b>${state.score}</b> points<br><br>congrats — you spent more time on a portfolio than most recruiters spend on a CV. that means something. probably. <br>let's build something together.`;
  }
}

// ---------- Update ----------
function update() {
  state.t++;
  if (state.scene !== 'play') return;
  const p = state.player;

  // Input
  let dx = 0;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
  const wantJump = keys[' '] || keys['Spacebar'] || keys['ArrowUp'] || keys['w'] || keys['W'];

  if (dx !== 0) {
    // Snappy ground control: fast acceleration to top speed, smooth feel.
    if (p.onGround) {
      p.vx += dx * 0.9;
    } else {
      p.vx += dx * AIR_ACC;
    }
    p.facing = dx > 0 ? 1 : -1;
  } else if (p.onGround) {
    p.vx *= 0.55;
    if (Math.abs(p.vx) < 0.1) p.vx = 0;
  } else {
    p.vx *= 0.985; // very mild air drag so direction holds in air
  }
  p.vx = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, p.vx));

  // Coyote time — keep "can jump" alive briefly after leaving the ground
  if (p.onGround) state.coyote = COYOTE_FRAMES;
  else if (state.coyote > 0) state.coyote--;

  // Jump buffer — queue a jump pressed just before landing
  const jumpJustPressed = !!(justPressed[' '] || justPressed['ArrowUp'] || justPressed['w'] || justPressed['W']);
  if (jumpJustPressed) state.jumpBuffer = JUMP_BUFFER_FRAMES;
  else if (state.jumpBuffer > 0) state.jumpBuffer--;

  // Initiate jump (buffered + coyote-aware)
  if (state.jumpBuffer > 0 && state.coyote > 0) {
    p.vy = JUMP_V;
    p.onGround = false;
    state.coyote = 0;
    state.jumpBuffer = 0;
    state.ground.jumpFrames = JUMP_HOLD_FRAMES;
    sfx('jump');
  }

  // Variable jump height — extra lift while holding, cut if released
  if (state.ground.jumpFrames > 0 && p.vy < 0) {
    if (wantJump) {
      p.vy -= JUMP_HOLD;
      state.ground.jumpFrames--;
    } else {
      state.ground.jumpFrames = 0;
    }
  }

  // Gravity (with snappier fall if jump released during ascent)
  p.vy += GRAVITY;
  if (!wantJump && p.vy < 0) p.vy += GRAVITY * FALL_BOOST;
  if (p.vy > MAX_FALL) p.vy = MAX_FALL;

  // Move
  moveAndCollide(p, p.vx, 0);
  moveAndCollide(p, 0, p.vy);

  // Walk anim
  if (Math.abs(p.vx) > 0.2 && p.onGround) p.walkT += Math.abs(p.vx) * 0.18;
  else p.walkT = 0;

  // Off the bottom → die
  if (p.y > WORLD_H + 80) {
    die();
  }

  // Coins
  checkCoins(p);

  // Pipe entry detection (player standing on a pipe top + ↓)
  state.onPipe = null;
  if (p.onGround) {
    const pcx = p.x + p.w / 2;
    for (const pp of state.level.pipes) {
      const x1 = pp.tx * TILE, x2 = (pp.tx + 2) * TILE;
      const topY = pp.ty * TILE;
      if (pcx >= x1 && pcx <= x2 && Math.abs((p.y + p.h) - topY) < 3) {
        state.onPipe = pp;
        break;
      }
    }
  }
  if (state.onPipe && (justPressed['ArrowDown'] || justPressed['s'] || justPressed['S'])) {
    sfx('powerup');
    state.score += 200;
    if (state.onPipe.section) openPanel(state.onPipe.section);
  }

  // Q-block bump animations
  for (const q of state.level.qBlocks) if (q.bumpT > 0) q.bumpT *= 0.85;

  // Flag check
  checkFlag(p);

  // Camera
  const targetCam = Math.max(0, Math.min(WORLD_W - VW, p.x - VW * 0.42));
  state.camX += (targetCam - state.camX) * 0.15;

  // Clear justPressed
  for (const k in justPressed) justPressed[k] = false;
}

function die() {
  if (state.scene !== 'play') return;
  state.lives--;
  sfx('die');
  updateLivesHUD();
  if (state.lives <= 0) {
    // Reset everything
    state.lives = 3;
    state.coinsTaken = 0;
    state.score = 0;
    state.sectionsCleared.clear();
    state.level = buildLevel();
    state.coinsTotal = state.level.coins.length;
    document.getElementById('coins-total').textContent = String(state.coinsTotal).padStart(2,'0');
    updateLivesHUD();
    toast({type:'hype', text:'GAME OVER — please clap'});
    setTimeout(() => toast({type:'snark', text:'respawning... try not to die immediately this time'}), 700);
  } else {
    toast({type:'snark', text:'ouch. that pit was clearly visible.'});
  }
  state.player = initPlayer();
  state.camX = 0;
}

// ---------- Render ----------
function render() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, COLORS.sky1);
  grad.addColorStop(1, COLORS.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, VH);

  // Far hills (parallax 0.3)
  for (const h of state.level.hills) {
    const sx = h.x - state.camX * 0.3;
    if (sx < -h.w || sx > VW) continue;
    drawHill(ctx, sx, 14 * TILE - 4, h.w, h.h);
  }

  // Clouds (parallax 0.5)
  for (const c of state.level.clouds) {
    const sx = c.x - state.camX * 0.5;
    if (sx < -100 || sx > VW + 20) continue;
    drawCloud(ctx, Math.floor(sx), c.y, Math.max(1, Math.floor(c.s)));
  }

  // Tiles — only visible columns
  const c0 = Math.max(0, Math.floor(state.camX / TILE) - 1);
  const c1 = Math.min(WORLD_TW - 1, Math.floor((state.camX + VW) / TILE) + 1);
  for (let tx = c0; tx <= c1; tx++) {
    for (let ty = 0; ty < WORLD_TH; ty++) {
      const ch = state.level.tiles[ty][tx];
      if (ch === '.') continue;
      const x = tx * TILE - state.camX;
      const y = ty * TILE;
      if (ch === 'G') ctx.drawImage(tileGrass, x, y);
      else if (ch === 'D') ctx.drawImage(tileDirt, x, y);
      else if (ch === 'B') ctx.drawImage(tileBrick, x, y);
      else if (ch === '?') {
        // animated bobbing if not yet hit
        const q = state.level.qBlocks.find(q => q.x === tx && q.y === ty);
        let off = 0;
        if (q && !q.hit) off = Math.sin(state.t * 0.08 + tx) * 1;
        if (q && q.bumpT > 0.02) off = -q.bumpT * 6;
        ctx.drawImage(tileQ, x, y + off);
      }
      else if (ch === 'U') ctx.drawImage(tileQUsed, x, y);
      else if (ch === 'P') { /* draw via pipe pass */ }
    }
  }

  // Pipes
  for (const pp of state.level.pipes) {
    const px = pp.tx * TILE - state.camX;
    const py = pp.ty * TILE;
    if (px < -40 || px > VW + 4) continue;
    drawPipe(ctx, px, py, pp.h);
  }

  // Pipe-entry prompt when standing on one
  if (state.onPipe) {
    const pp = state.onPipe;
    const px = pp.tx * TILE - state.camX;
    const py = pp.ty * TILE;
    const bob = Math.sin(state.t * 0.18) * 1.5;
    // speech-bubble-style hint
    ctx.font = '8px "Press Start 2P"';
    const txt = '\u2193 ENTER';
    const tw = ctx.measureText(txt).width;
    const bx = Math.floor(px + 16 - tw/2 - 4);
    const by = Math.floor(py - 22 + bob);
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(bx - 1, by - 1, tw + 10, 14);
    ctx.fillStyle = COLORS.coin;
    ctx.fillRect(bx, by, tw + 8, 12);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(txt, bx + 4, by + 9);
    // little tail pointing at pipe
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(bx + 8, by + 12, 4, 1);
    ctx.fillRect(bx + 9, by + 13, 2, 1);
    ctx.fillStyle = COLORS.coin;
    ctx.fillRect(bx + 9, by + 12, 2, 1);
  }

  // Signposts
  ctx.font = '8px "Press Start 2P"';
  for (const s of state.level.signposts) {
    const sx = s.x - state.camX;
    if (sx < -120 || sx > VW + 20) continue;
    // pole
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(sx, 14*TILE - 22, 2, 22);
    // board
    ctx.fillStyle = '#7B4B26';
    ctx.fillRect(sx - 18, 14*TILE - 30, 40, 14);
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(sx - 18, 14*TILE - 30, 40, 1);
    ctx.fillRect(sx - 18, 14*TILE - 17, 40, 1);
    ctx.fillRect(sx - 18, 14*TILE - 30, 1, 14);
    ctx.fillRect(sx + 21, 14*TILE - 30, 1, 14);
    // text
    ctx.fillStyle = '#FFF8E7';
    const txt = s.label;
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, sx + 2 - tw/2, 14*TILE - 21);
  }

  // Coins
  for (const c of state.level.coins) {
    if (c.taken) continue;
    const sx = c.x - state.camX;
    if (sx < -16 || sx > VW + 4) continue;
    c.t = (c.t || 0) + 0.12;
    const frame = Math.floor(c.t) % 3;
    const sprite = coinSprites[frame];
    ctx.drawImage(sprite, Math.floor(sx), Math.floor(c.y));
  }

  // Flag pole
  const f = state.level.flag;
  const fx = f.tx * TILE - state.camX;
  const fy = f.ty * TILE;
  // pole
  ctx.fillStyle = COLORS.ink; ctx.fillRect(fx + 3, fy, 2, (14 - f.ty) * TILE);
  ctx.fillStyle = COLORS.flagPole; ctx.fillRect(fx + 3, fy, 2, (14 - f.ty) * TILE);
  // ball top
  ctx.fillStyle = COLORS.ink; ctx.fillRect(fx + 1, fy - 4, 6, 4);
  ctx.fillStyle = COLORS.flag; ctx.fillRect(fx + 2, fy - 3, 4, 2);
  // flag triangle
  const wave = Math.sin(state.t * 0.1) * 2;
  ctx.fillStyle = COLORS.flag;
  for (let i = 0; i < 12; i++) {
    const yy = fy + 2 + i;
    const ww = 14 - Math.abs(i - 6);
    ctx.fillRect(fx + 5 + wave, yy, ww, 1);
  }
  ctx.fillStyle = COLORS.flagD;
  ctx.fillRect(fx + 5 + wave, fy + 2, 2, 12);

  // Hero
  const p = state.player;
  let sprite = heroIdle;
  if (!p.onGround) sprite = heroJump;
  else if (Math.abs(p.vx) > 0.2) sprite = Math.floor(p.walkT) % 2 === 0 ? heroWalk1 : heroWalk2;
  const px = Math.floor(p.x - state.camX) - 1;
  const py = Math.floor(p.y);
  ctx.save();
  if (p.facing < 0) {
    ctx.translate(px + 14, py);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(px, py);
  }
  ctx.drawImage(sprite, 0, 0);
  if (faceReady) {
    // overlay the real face over the pixel head (rows ~0..7 of the 14x18 sprite)
    ctx.drawImage(faceImg, 1, 0, 12, 9);
  }
  ctx.restore();

  // ground front-edge line (visual flourish)
  ctx.fillStyle = COLORS.ink;
  // No fullscreen overlay; tile rendering is sufficient

  // HUD update (text-based — done in DOM)
  document.getElementById('score').textContent = String(state.score).padStart(6, '0');
  document.getElementById('coins').textContent = String(state.coinsTaken).padStart(2, '0');
}

// ---------- HUD helpers ----------
function updateLivesHUD() {
  const el = document.getElementById('lives');
  el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const h = document.createElement('div');
    h.className = 'heart' + (i >= state.lives ? ' empty' : '');
    el.appendChild(h);
  }
}

// ---------- Panel ----------
const CONTENT = JSON.parse(document.getElementById('content').textContent);
function openPanel(id) {
  const data = CONTENT[id];
  if (!data) return;
  state.panel = id;
  document.getElementById('panel-title').textContent = data.title;
  document.getElementById('panel-lvl').textContent = data.lvl;
  document.getElementById('panel-body').innerHTML = data.html;
  document.getElementById('panel-wrap').classList.add('open');
}
function closePanel() {
  document.getElementById('panel-wrap').classList.remove('open');
  state.panel = null;
}
document.getElementById('panel-close').addEventListener('click', closePanel);
document.getElementById('panel-wrap').addEventListener('click', (e) => {
  if (e.target.id === 'panel-wrap') closePanel();
});

// ---------- Pause / Restart ----------
function togglePause() {
  if (state.scene === 'play') { state.scene = 'paused'; document.getElementById('pause').classList.add('show'); sfx('pause'); }
  else if (state.scene === 'paused') { state.scene = 'play'; document.getElementById('pause').classList.remove('show'); sfx('pause'); }
}
document.getElementById('restart').addEventListener('click', () => {
  document.getElementById('win').classList.remove('show');
  startGame(true);
});

// ---------- Toasts ----------
function toast(msg) {
  const stack = document.getElementById('toasts');
  const t = document.createElement('div');
  let type = 'plain', text = msg;
  if (msg && typeof msg === 'object') { type = msg.type || 'plain'; text = msg.text; }
  t.className = 'toast toast-' + type;
  t.textContent = text;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 2700);
  // cap toasts so screen doesn't fill up
  while (stack.children.length > 3) stack.removeChild(stack.firstChild);
}

// ---------- Start ----------
function startGame(reset = false) {
  ensureAudio();
  document.getElementById('title').classList.add('hidden');
  if (reset || !state.level) {
    state.level = buildLevel();
    state.player = initPlayer();
    state.camX = 0;
    state.coinsTaken = 0;
    state.score = 0;
    state.lives = 3;
    state.sectionsCleared.clear();
    state.coinsTotal = state.level.coins.length;
    document.getElementById('coins-total').textContent = String(state.coinsTotal).padStart(2,'0');
    updateLivesHUD();
  }
  state.scene = 'play';
  setTimeout(() => toast({type:'hype', text:'bump [?] blocks — they\'re informative AND judgmental'}), 600);
  setTimeout(() => toast({type:'skill', text:'collect coins to unlock skills (yes really)'}), 2400);
  setTimeout(() => toast({type:'snark', text:'or just walk straight to the flag. no one\'s watching.'}), 4400);
}

// ---------- Boot ----------
state.level = buildLevel();
state.coinsTotal = state.level.coins.length;
document.getElementById('coins-total').textContent = String(state.coinsTotal).padStart(2,'0');
state.player = initPlayer();
updateLivesHUD();
fitCanvas();

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
