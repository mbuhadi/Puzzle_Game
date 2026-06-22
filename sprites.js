// ─────────────────────────────────────────────────────────────────────────────
// Game Sprites & Palettes — SNES Aladdin × Undertale top-down aesthetic
//
// Each sprite is an off-screen canvas created via makeSprite(ROWS, PAL, px).
// Drop this file before game.html's <script> tag:
//   <script src="sprites.js"></script>
//
// Shared palette constants are also exported so room-drawing code can import
// the same colours for consistent tiles and walls.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared colour palette ─────────────────────────────────────────────────────
const PALETTE = {
  // character colours
  SKIN_LIGHT : '#e8b88a',
  SKIN_SHADOW: '#c9935f',
  HAIR_DARK  : '#1a0d05',
  EYE_DARK   : '#0d0d1e',
  RED_FEZ    : '#c0211a',
  RED_SHADOW : '#7a1210',
  GOLD       : '#f0c030',
  GOLD_SHADOW: '#b88a18',
  TEAL       : '#1a9c8e',
  TEAL_DARK  : '#0d5c55',
  PURPLE     : '#6b30a0',
  PURPLE_DARK: '#3d1a60',
  CREAM      : '#f0e6c8',
  BROWN      : '#4a2c10',
  BROWN_DARK : '#2c1808',

  // environment / room colours  (Undertale dungeon × Aladdin desert)
  SAND_LIGHT : '#dfc07a',
  SAND_MID   : '#c8a050',
  SAND_DARK  : '#9a7030',
  STONE_LIGHT: '#8a8090',
  STONE_MID  : '#5a5068',
  STONE_DARK : '#2a2040',
  DUNGEON_BG : '#100c1e',
  DUNGEON_TILE:'#1e1830',
  DUNGEON_TRIM:'#3a2868',
  PALACE_FLOOR:'#e8d8a0',
  PALACE_TRIM : '#c8a050',
  PALACE_ACCENT:'#1a9c8e',
  WATER      : '#1870c0',
  WATER_LIGHT: '#38a8e8',
};

// ── Utility: build a sprite canvas from a row-string array ────────────────────
function makeSprite(rows, pal, px = 2) {
  const w = rows[0].length, h = rows.length;
  const cv = document.createElement('canvas');
  cv.width = w * px; cv.height = h * px;
  const g = cv.getContext('2d');
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const col = pal[row[c]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(c * px, r * px, px, px);
    }
  });
  return cv;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER — top-down Aladdin (red fez, teal vest, purple pants)
// 13 × 16 @ px=2  →  26 × 32 canvas pixels
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_PLAYER = makeSprite([
  '....FFFFF....',  // fez crown
  '...FFFFFFF...',  // fez body
  '..FFFFFFFGF..',  // fez brim + gold tassel tip
  '..SSSSSSSSS..',  // forehead
  '.SSSSSSSSSSS.',  // upper face
  '.SSeSSSSSeSS.',  // eyes (e)
  '.SSSmSSSSSSS.',  // mouth (m)
  '..GGGGGGGGG..',  // gold collar
  '.VTTTGBGTTTV.',  // vest open, belt buckle (B)
  '.VTTPPPPPTV..',  // vest–pants seam
  'PPPPPPPPPPPP.',  // upper pants
  'PPPPPPPPPPPP.',  // mid pants
  '.PPbPPPPPbPP.',  // lower pants + boot tops (b)
  '..bbbb..bbbb.',  // boots
  '..bBbb..bBbb.',  // boot shadow
  '.............',  // ground clearance
], {
  F: '#c0211a',  // red fez
  G: '#f0c030',  // gold (tassel, collar)
  S: '#e8b88a',  // skin
  e: '#0d0d1e',  // eyes
  m: '#c9935f',  // mouth line (skin shadow)
  V: '#1a9c8e',  // teal vest
  T: '#e8d8a0',  // cream shirt / chest
  B: '#f0c030',  // belt buckle gold
  P: '#6b30a0',  // purple pants
  p: '#3d1a60',  // pants shadow
  b: '#4a2c10',  // boot brown
}, 2);

// ─────────────────────────────────────────────────────────────────────────────
// NPC — MERCHANT  (round, jolly shopkeeper with turban and beard)
// 13 × 16 @ px=2
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_MERCHANT = makeSprite([
  '....TTTTT....',  // turban top (cream)
  '...TTTTTTT...',
  '..TTTTTTTTT..',  // turban wrap
  '.GTTTTTTTTG.',  // turban gold band
  '.SSSSSSSSSSS.',  // face wide (merchant is chubby)
  '.sSeSSSSesSs.',  // eyes with brow shadow
  '.SSSSdSSSSSS.',  // nose dot (d)
  '.SswSSSSSwSS.',  // smile wrinkles (w)
  '..WWWWWWWWW..',  // beard top (white)
  '.WWWWWWWWWWW.',  // beard
  '.WVRRRRRRVW.',  // robe chest with vest (V=orange)
  '.VVRRRRRRRVV.',
  '.VVRRRRRRRV..',
  '..VRRRRRRV...',
  '...VVVVVVV...',
  '.............',
], {
  T: '#e8d8c0',  // cream turban
  G: '#f0c030',  // gold turban band
  S: '#c98858',  // merchant skin (darker, sun-weathered)
  s: '#a06838',  // skin shadow
  e: '#0d0d1e',  // eyes
  d: '#a06838',  // nose
  w: '#a06838',  // wrinkle
  W: '#f0ece0',  // white beard
  R: '#c83820',  // red robe
  V: '#e87820',  // orange vest
}, 2);

// ─────────────────────────────────────────────────────────────────────────────
// NPC — GUARD  (tall palace guard, spear not drawn — separate prop)
// 13 × 16 @ px=2
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_GUARD = makeSprite([
  '....HHHHHH...',  // helmet dome
  '...HHHHHHHH..',  // helmet
  '..HHhHHHHhHH.',  // helmet with visor rim (h)
  '..HSSSSSSSh..',  // visor opening, skin inside
  '.hSSeSSSeSh..',  // eyes (guard stern)
  '.hSSSSSSSSh..',  // face
  '..hSSSSSSh...',  // chin
  '..AAAAAAAAA..',  // armour gorget
  '.AAAAAAAAAA..',  // chestplate
  '.AaAAGAAAAa.',  // armour detail + gold badge (a=shadow)
  '.AaAAAAAAAA.',
  'AAAAAAAAAAAAA',  // full armour torso
  '.AAAAAaAAAAA.',
  '..LLLLaLLL..',  // legs (dark)
  '..lLll..lLll.',  // boots
  '.............',
], {
  H: '#2a2040',  // dark helmet
  h: '#1a1030',  // helmet shadow / visor
  S: '#e8b88a',  // skin
  e: '#0d0d1e',  // eyes
  A: '#8898c0',  // silver armour
  a: '#5060a0',  // armour shadow
  G: '#f0c030',  // gold badge
  L: '#3d1a60',  // leg purple
  l: '#2a1040',  // boot shadow
}, 2);

// ─────────────────────────────────────────────────────────────────────────────
// NPC — GENIE  (blue, swirling lower half — top half only for dialog portrait)
// 13 × 16 @ px=2
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_GENIE = makeSprite([
  '..gGGGGGGGG..',  // genie blue head top
  '.gGGGGGGGGGg.',
  '.GGGeGGGGGGG.',  // earring (e)
  '.GGGGGGGGGGg.',
  '.GGGEGGGEGGg.',  // eyes (E=white, large expressive)
  '.GGGEGGGEGGg.',
  '.GGGgGGGGGGg.',  // nose
  '.GGGoooooGGg.',  // big grin (o)
  '..GGGoGGoGG..',  // teeth (oG alternating)
  '..gGGGGGGGg..',  // chin/neck
  '...GGGGGGG...',  // upper wisp
  '..GGGgGGGG...',  // wisp
  '.GGGGgGGGGG..',  // wisp spreads
  '..GGgggGGG...',  // tail start
  '...GgggGG....',  // tail
  '....gggg.....',  // wisp tip
], {
  G: '#1870c0',  // genie blue
  g: '#0d4888',  // genie shadow
  e: '#f0c030',  // gold earring
  E: '#f0f0f8',  // white of eyes
  o: '#0d0d1e',  // mouth/pupils
}, 2);

// ─────────────────────────────────────────────────────────────────────────────
// PROP — LAMP  (magic lamp, small, 10 × 8)
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_LAMP = makeSprite([
  '....GG....',
  '...GGGG...',
  '..GGggGG..',
  '.GGggggGG.',
  'GGGggggGGG',
  '.GGGggGGG.',
  '..GGGGGGG.',
  '...lllll..',
], {
  G: '#f0c030',  // gold lamp
  g: '#b88a18',  // lamp shadow
  l: '#c88010',  // spout
}, 2);

// ─────────────────────────────────────────────────────────────────────────────
// PROP — CHEST  (treasure chest, top-down angled, 12 × 8)
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_CHEST = makeSprite([
  '.BBBBBBBBBB.',
  'BBBBbBBbBBBB',
  'BBBGGGGGGbBB',
  'BBGgggggGGBB',
  'BBGgGGGgGGBB',
  'BBBGGGGGGbBB',
  'BBBBBBBBBBB.',
  '............',
], {
  B: '#4a2c10',  // chest brown wood
  b: '#2c1808',  // wood shadow
  G: '#f0c030',  // gold trim + lock
  g: '#b88a18',  // gold shadow
}, 2);

// ─────────────────────────────────────────────────────────────────────────────
// PROP — DOOR (palace arch door, 16 × 20 @ px=2)
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_DOOR = makeSprite([
  '....GGGGGGGGG....',
  '...GGGgGGGgGGG...',
  '..GGGGGGGGGGGGg..',
  '.GGGTTTTTTTTTGGg.',
  '.GTTTTTTTTTTTTGg.',
  '.GTTtTTTTTTtTTGg.',
  '.GTTTTtTTtTTTTGg.',
  '.GTTtTTTTTTtTTGg.',
  '.GTTTTtTTtTTTTGg.',
  '.GTTtTTTTTTtTTGg.',
  '.GTTTTTTTTTTTTGg.',
  '.GTTTTkkkTTTTTGg.',  // door handle (k)
  '.GTTTTkkkTTTTTGg.',
  '.GTTTTTTTTTTTTGg.',
  '.GTTTTTTTTTTTTGg.',
  '.GTTTTTTTTTTTTGg.',
  '.GGGGGGGGGGGGGGg.',
  '..GGGgGGGgGGGGg..',
  '.................',
  '.................',
], {
  G: '#f0c030',  // gold arch frame
  g: '#b88a18',  // arch shadow
  T: '#1a9c8e',  // teal door panel
  t: '#0d5c55',  // teal detail / pattern
  k: '#2c1808',  // dark iron handle
}, 2);

// ─────────────────────────────────────────────────────────────────────────────
// TILE DRAWING FUNCTIONS
// Call these inside your room rendering to paint floor/wall sections.
// All take a canvas 2D context and a top-left (x, y) position.
// ─────────────────────────────────────────────────────────────────────────────

// Desert sand floor tile — 40 × 40
function drawSandTile(g, x, y) {
  const W = 40, H = 40;
  g.fillStyle = PALETTE.SAND_LIGHT;
  g.fillRect(x, y, W, H);
  // criss-cross crack lines
  g.strokeStyle = PALETTE.SAND_MID;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y + H/2); g.lineTo(x + W, y + H/2);
  g.moveTo(x + W/2, y); g.lineTo(x + W/2, y + H);
  g.stroke();
  // corner dots
  g.fillStyle = PALETTE.SAND_DARK;
  [[2,2],[W-4,2],[2,H-4],[W-4,H-4]].forEach(([dx,dy]) =>
    g.fillRect(x+dx, y+dy, 2, 2));
}

// Ornate palace floor tile — 40 × 40 (checkerboard inlay + border)
function drawPalaceTile(g, x, y, variant = 0) {
  const W = 40, H = 40;
  g.fillStyle = variant === 0 ? PALETTE.PALACE_FLOOR : PALETTE.CREAM;
  g.fillRect(x, y, W, H);
  // gold border
  g.strokeStyle = PALETTE.PALACE_TRIM;
  g.lineWidth = 1.5;
  g.strokeRect(x + 2, y + 2, W - 4, H - 4);
  // teal centre diamond
  g.fillStyle = variant === 0 ? PALETTE.PALACE_ACCENT : PALETTE.SAND_MID;
  g.beginPath();
  g.moveTo(x + W/2, y + 6);
  g.lineTo(x + W - 6, y + H/2);
  g.lineTo(x + W/2, y + H - 6);
  g.lineTo(x + 6, y + H/2);
  g.closePath();
  g.fill();
}

// Dungeon stone tile — 40 × 40 (Undertale underground feel)
function drawDungeonTile(g, x, y) {
  const W = 40, H = 40;
  g.fillStyle = PALETTE.DUNGEON_TILE;
  g.fillRect(x, y, W, H);
  // mortar lines
  g.strokeStyle = PALETTE.DUNGEON_BG;
  g.lineWidth = 1;
  g.strokeRect(x + 1, y + 1, W - 2, H - 2);
  // subtle inner highlight
  g.strokeStyle = PALETTE.DUNGEON_TRIM;
  g.lineWidth = 0.5;
  g.beginPath();
  g.moveTo(x + 3, y + 3); g.lineTo(x + W - 3, y + 3);
  g.moveTo(x + 3, y + 3); g.lineTo(x + 3, y + H - 3);
  g.stroke();
}

// Desert wall section — 40 × 40
function drawDesertWall(g, x, y) {
  const W = 40, H = 40;
  g.fillStyle = PALETTE.SAND_MID;
  g.fillRect(x, y, W, H);
  g.fillStyle = PALETTE.SAND_DARK;
  // brick rows
  for (let row = 0; row < 3; row++) {
    const oy = y + 4 + row * 12;
    const offset = (row % 2) * 20;
    for (let col = -1; col < 3; col++) {
      const ox = x + offset + col * 20;
      g.strokeStyle = PALETTE.SAND_DARK;
      g.lineWidth = 1;
      g.strokeRect(ox + 1, oy + 1, 18, 10);
    }
  }
}

// Palace wall — 40 × 40 (teal + gold trim)
function drawPalaceWall(g, x, y) {
  const W = 40, H = 40;
  g.fillStyle = PALETTE.TEAL_DARK;
  g.fillRect(x, y, W, H);
  g.fillStyle = PALETTE.GOLD;
  g.fillRect(x, y + H - 4, W, 4);           // gold baseboard
  g.fillRect(x, y, W, 3);                   // gold crown
  g.strokeStyle = PALETTE.GOLD_SHADOW;
  g.lineWidth = 1;
  // vertical pillar marks every 20px
  for (let i = 0; i <= 2; i++) {
    g.beginPath();
    g.moveTo(x + i * 20, y + 3);
    g.lineTo(x + i * 20, y + H - 4);
    g.stroke();
  }
}

// Dungeon wall — 40 × 40
function drawDungeonWall(g, x, y) {
  const W = 40, H = 40;
  g.fillStyle = PALETTE.STONE_DARK;
  g.fillRect(x, y, W, H);
  g.strokeStyle = PALETTE.STONE_MID;
  g.lineWidth = 0.8;
  // horizontal courses
  for (let row = 0; row < 3; row++) {
    const oy = y + row * 13;
    g.beginPath();
    g.moveTo(x, oy + 10); g.lineTo(x + W, oy + 10);
    g.stroke();
    // vertical joints (staggered)
    const jx = x + (row % 2 === 0 ? 20 : 10);
    g.beginPath();
    g.moveTo(jx, oy); g.lineTo(jx, oy + 10);
    g.stroke();
  }
  // purple magic glow crack (Undertale signature)
  g.strokeStyle = PALETTE.DUNGEON_TRIM;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x + 8, y + 5);
  g.lineTo(x + 15, y + 20);
  g.lineTo(x + 10, y + 35);
  g.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM FILL HELPERS
// Paint an entire rectangular region with repeating tiles.
// ─────────────────────────────────────────────────────────────────────────────
function fillWithTiles(g, x, y, w, h, tileFn, tileSize = 40) {
  for (let row = 0; row < Math.ceil(h / tileSize); row++) {
    for (let col = 0; col < Math.ceil(w / tileSize); col++) {
      tileFn(g, x + col * tileSize, y + row * tileSize);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT  (attach to window so game.html can access without module bundler)
// ─────────────────────────────────────────────────────────────────────────────
window.GAME_SPRITES = {
  player  : SPRITE_PLAYER,
  merchant: SPRITE_MERCHANT,
  guard   : SPRITE_GUARD,
  genie   : SPRITE_GENIE,
  lamp    : SPRITE_LAMP,
  chest   : SPRITE_CHEST,
  door    : SPRITE_DOOR,
};

window.GAME_TILES = {
  drawSandTile,
  drawPalaceTile,
  drawDungeonTile,
  drawDesertWall,
  drawPalaceWall,
  drawDungeonWall,
  fillWithTiles,
  PALETTE,
};
