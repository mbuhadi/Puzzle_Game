/* Courtyard Locks — the pixel-art constant unlockers (designed in
   unlocker-preview.html). Each is a four-dial vertical lock styled as an
   artifact from an Arabic courtyard house, laid out for a landscape screen and
   mirror-symmetric left to right: a long plate with a pointed arch at each
   end, a tile border and an eight-point star in each end, four ivory dials
   side by side with big digits (each rolls: tap the top / bottom half of a
   dial, or swipe it), and an UNLOCK button underneath.

   A blueprint refers to one by its design id, 'px:saffron' etc.

     PL.LOCKS                       the locks: [{ id, name, … }]
     PL.isPixel(design)             true for a 'px:…' design id
     PL.get(design)                 the lock for a design id (or null)
     PL.drawMini(canvas, design, s) the small corner version, s× pixels
     PL.glowCSS(design, alpha)      CSS background for its faint halo
     PL.codeText(code, digits)      '١٩٤٧' / '1947'
     PL.mount(host, design, opts)   the big interactive lock inside host
       opts: { code, digits: 'ar'|'en', submitLabel, maxW, maxH, onSubmit(code) }
       returns { shake(), flashOk(word), code(), destroy() } */
const PL = (() => {
  const C = {
    ink: '#1a1008', win: '#140c05', cream: '#fff6d8',
    ivory: '#efe3c4', ivoryS: '#c9b98f', ivoryD: '#8f7d57', digit: '#3a2410', caret: '#a8956a',
  };
  const MAT = {
    brass:  { D: '#5a3a12', S: '#8a5d1c', B: '#bb8a34', L: '#e2bb63', H: '#fff0b0', lat: '#8a5d1c' },
    copper: { D: '#4a2414', S: '#7c3c22', B: '#a95a35', L: '#d48a5a', H: '#f6c79a', lat: '#7c3c22' },
  };
  const GLYPHS = {
    ar: [
      ['.....','.....','..#..','.#.#.','..#..','.....','.....'],
      ['.#...','..#..','..#..','..#..','..#..','..#..','..#..'],
      ['.#.##','.#.#.','.##..','.#...','.#...','.#...','.#...'],
      ['#.#.#','#####','#....','#....','#....','#....','#....'],
      ['.###.','#....','.##..','#....','#....','.####','.....'],
      ['.....','.###.','#...#','#...#','#...#','.###.','.....'],
      ['####.','...#.','...#.','...#.','...#.','...#.','...#.'],
      ['#...#','#...#','.#.#.','.#.#.','.#.#.','..#..','..#..'],
      ['..#..','..#..','.#.#.','.#.#.','.#.#.','#...#','#...#'],
      ['.##..','#..#.','#..#.','.###.','...#.','...#.','...#.'],
    ],
    en: [
      ['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.'],
      ['..#..','.##..','..#..','..#..','..#..','..#..','.###.'],
      ['.###.','#...#','....#','...#.','..#..','.#...','#####'],
      ['####.','....#','....#','.###.','....#','....#','####.'],
      ['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'],
      ['#####','#....','####.','....#','....#','#...#','.###.'],
      ['.###.','#....','#....','####.','#...#','#...#','.###.'],
      ['#####','....#','...#.','..#..','.#...','.#...','.#...'],
      ['.###.','#...#','#...#','.###.','#...#','#...#','.###.'],
      ['.###.','#...#','#...#','.####','....#','....#','.###.'],
    ],
  };
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

  // The four locks. All share one shape; they differ in colours: tile border,
  // stars, rims between the dials and button.
  const BASE = {};
  const LOCKS = [
    { ...BASE, id: 'saffron', name: 'Saffron Lock', mat: 'brass',
      pal: { tiles: ['#2a9d8f', '#efe3c4', '#e0a030', '#efe3c4'], grout: '#17594f', star: ['#b0392c', '#f2c14e', '#6e1f17'],
        btn: ['#17594f', '#2a9d8f', '#7fdccd'], rim: ['#6e1f17', '#d0564a'], studs: '#e0a030' } },
    { ...BASE, id: 'garden', name: 'Garden Lock', mat: 'brass',
      pal: { tiles: ['#2f8f55', '#efe3c4', '#d47a8c', '#efe3c4'], grout: '#1b4f30', star: ['#2f8f55', '#f5d0d8', '#1b4f30'],
        btn: ['#8a3a4a', '#d47a8c', '#f5c4cf'], rim: ['#1b4f30', '#5cbf83'], studs: '#d47a8c' } },
    { ...BASE, id: 'majlis', name: 'Majlis Lock', mat: 'brass',
      pal: { tiles: ['#2f5fa8', '#efe3c4', '#2a9d8f', '#d79a35'], grout: '#1d3a68', star: ['#d79a35', '#fff0b0', '#7a4f12'],
        btn: ['#1d3a68', '#2f5fa8', '#7fa6e0'], rim: ['#1d3a68', '#5b8bd6'], studs: '#2a9d8f' } },
    { ...BASE, id: 'sunset', name: 'Sunset Lock', mat: 'copper',
      pal: { tiles: ['#c4553a', '#f3e2bf', '#2a9d8f', '#f3e2bf'], grout: '#6e2a1a', star: ['#2a9d8f', '#bff0e6', '#17594f'],
        btn: ['#6e2a1a', '#c4553a', '#f0a080'], rim: ['#17594f', '#4cc2b2'], studs: '#2a9d8f' } },
  ];
  const isPixel = d => typeof d === 'string' && d.startsWith('px:');
  const get = d => isPixel(d) ? LOCKS.find(l => l.id === d.slice(3)) || null : null;
  const codeText = (code, digits) => (code || []).map(n => digits === 'ar' ? AR_DIGITS[n] : String(n)).join('');

  // ── Pixel helpers (1 unit = 1 art pixel) ──
  const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  function glyph(g, set, d, x, y, s, c, y0, y1) {
    const G = GLYPHS[set][d];
    for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++)
      if (G[j][i] === '#') for (let b = 0; b < s; b++) { const yy = y + j * s + b; if (yy >= y0 && yy < y1) rect(g, x + i * s, yy, s, 1, c); }
  }
  // pointed (Moorish) arch, standing up (used by the design previews)
  function inArch(x, y, x0, x1, yb, yBot, k) {
    if (x < x0 || x > x1 || y > yBot) return false;
    if (y >= yb) return true;
    const R = k * (x1 - x0), cA = x0 + R, cB = x1 - R;
    return Math.hypot(x - cA, y - yb) <= R && Math.hypot(x - cB, y - yb) <= R;
  }
  // eight-point star (two overlapping squares)
  function star(g, cx, cy, r, fill, edge) {
    const inS = (x, y) => (Math.abs(x) <= r * .72 && Math.abs(y) <= r * .72) || (Math.abs(x + y) <= r && Math.abs(x - y) <= r);
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      if (inS(x, y)) px(g, cx + x, cy + y, fill);
      else if (inS(x + 1, y) || inS(x - 1, y) || inS(x, y + 1) || inS(x, y - 1)) px(g, cx + x, cy + y, edge);
    }
  }

  // ── Geometry (art px) ──
  // A long plate, mirror-symmetric left to right: each end is a pointed arch
  // lying on its side. Four dials side by side in the middle (each rolls up /
  // down), a star in each end, the button centred underneath.
  const DW = 20, DH = 25, GAP = 3, CAP = 17;
  function geo() {
    const winW = DW * 4 + GAP * 3 + 2, winH = DH + 2;
    const bodyW = winW + 16, plateH = winH + 18;
    const W = bodyW + CAP * 2 + 2, cx = W / 2, top = 1, bot = top + plateH - 1;
    const xa = Math.round(cx - bodyW / 2), xb = W - 1 - xa;
    const wx = Math.round(cx - winW / 2), wy = top + Math.round((plateH - winH) / 2);
    const dial = i => ({ x: wx + 1 + i * (DW + GAP), y: wy + 1, w: DW, h: DH });
    return { W, H: bot + 22, cx, xa, xb, top, bot, winW, winH, wx, wy, dial };
  }
  function inPlate(G, x, y, inset = 0, k = .72) {
    const t0 = G.top + inset, t1 = G.bot - inset;
    if (y < t0 || y > t1) return false;
    if (x >= G.xa && x <= G.xb) return true;
    const half = (t1 - t0) / 2 + .5, t = Math.abs(y - (t0 + t1) / 2);
    const d = x < G.xa ? G.xa - x : x - G.xb, len = CAP - inset;
    if (d > len) return false;
    const R = k * 2 * half, Hh = Math.sqrt(R * R - (R - half) * (R - half)), yy = d * Hh / len;
    return t <= Math.sqrt(Math.max(0, R * R - yy * yy)) - (R - half);
  }
  function plate(g, G, L) {
    const M = MAT[L.mat], P = L.pal, tiles = P.tiles, e = 3, bw = 4, o = e + 1;
    const IN = (x, y, i = 0) => inPlate(G, x, y, i);
    const mir = x => x < G.cx ? x : G.W - 1 - x;      // mirror the patterns
    for (let y = 0; y <= G.bot + 1; y++) for (let x = 0; x < G.W; x++) {
      if (!IN(x, y)) { if (IN(x - 1, y) || IN(x + 1, y) || IN(x, y - 1) || IN(x, y + 1)) px(g, x, y, C.ink); continue; }
      const edge = !IN(x - e, y) || !IN(x + e, y) || !IN(x, y - e) || !IN(x, y + e);
      if (edge) { px(g, x, y, !IN(x, y - e) ? (!IN(x, y - 1) ? M.H : M.L) : M.S); continue; }
      const xm = mir(x);
      if (!IN(x, y, o + bw) && IN(x, y, o)) {
        const gr = (xm + y) % 3 === 0 || (xm - y + 300) % 3 === 0;
        const t = Math.floor((xm + y) / 3) + 2 * Math.floor((xm - y + 300) / 3);
        px(g, x, y, gr ? P.grout : tiles[((t % tiles.length) + tiles.length) % tiles.length]);
        continue;
      }
      px(g, x, y, (xm + y) % 6 === 0 || (xm - y + 600) % 6 === 0 ? M.lat : M.B);
    }
    const sy = Math.round((G.top + G.bot) / 2);
    for (const sx of [Math.round(G.xa - CAP * .3), Math.round(G.xb + CAP * .3)]) {
      star(g, sx, sy, 6, P.star[0], C.ink); star(g, sx, sy, 3, P.star[1], P.star[2]);
    }
  }
  // The plate never changes: cache it per lock
  const plateCache = new Map();
  function plateCanvas(L) {
    if (!plateCache.has(L.id)) {
      const G = geo(), c = document.createElement('canvas');
      c.width = G.W; c.height = G.bot + 2;
      plate(c.getContext('2d'), G, L);
      plateCache.set(L.id, c);
    }
    return plateCache.get(L.id);
  }
  // Everything but the button's word, onto an art-sized context
  function drawLock(g, L, st, now) {
    const G = geo(), M = MAT[L.mat], P = L.pal, { wx, wy, winW, winH } = G;
    g.clearRect(0, 0, G.W, G.H);
    g.drawImage(plateCanvas(L), 0, 0);
    rect(g, wx - 2, wy - 2, winW + 4, winH + 4, C.ink);
    rect(g, wx - 1, wy - 1, winW + 2, winH + 2, M.D);
    rect(g, wx, wy, winW, winH, C.win);
    for (let i = 0; i < 4; i++) {
      const { x: dx, y: dy, w, h } = G.dial(i);
      for (let y = 0; y < h; y++) {
        const t = Math.abs(y - (h - 1) / 2) / ((h - 1) / 2);
        rect(g, dx, dy + y, w, 1, t > .8 ? C.ivoryD : t > .5 ? C.ivoryS : C.ivory);
      }
      rect(g, dx, dy + 2, 1, h - 4, C.cream); rect(g, dx + w - 1, dy + 2, 1, h - 4, C.ivoryS);
      const d = st.dials[i], r = st.roll[i], gx = dx + w / 2 - 5, step = 14 + 3;
      for (const kk of [-1, 0, 1]) {
        const yy = dy + Math.round((h - 14) / 2) + kk * step + Math.round(r * 2);
        glyph(g, st.digits, (d + kk + 10) % 10, gx, yy, 2, kk ? C.ivoryD : C.digit, dy, dy + h);
      }
      const mx = dx + w / 2 - 1;
      rect(g, mx - 1, dy + 1, 3, 1, C.caret); px(g, mx, dy, C.caret);
      rect(g, mx - 1, dy + h - 2, 3, 1, C.caret); px(g, mx, dy + h - 1, C.caret);
      if (i < 3) { rect(g, dx + w, dy, 1, h, P.rim[0]); rect(g, dx + w + 1, dy, 1, h, P.rim[1]); rect(g, dx + w + 2, dy, 1, h, P.rim[0]); }
    }
    const pressed = now - st.pressAt < 140, bad = now - st.badAt < 380;
    const bw = 64, bh = 15, bx = Math.round(G.cx - bw / 2), by = G.bot + 5 + (pressed ? 1 : 0);
    if (!pressed) rect(g, bx, by + 2, bw, bh, C.ink);
    rect(g, bx, by, bw, bh, C.ink);
    const B = bad ? ['#5a1a14', '#b0392c', '#e88070'] : P.btn;
    rect(g, bx + 1, by + 1, bw - 2, bh - 2, B[0]); rect(g, bx + 1, by + 1, bw - 2, bh - 4, B[1]); rect(g, bx + 2, by + 2, bw - 4, 1, B[2]);
    return { G, button: { x: bx, y: by, w: bw, h: bh } };
  }
  // Pop-text lettering (Silkscreen, dark outline) — the LOCKED / DONE! style
  function fitWord(g, text, maxW, size) {
    g.font = `700 ${size}px 'Silkscreen', monospace`;
    while (size > 6 && g.measureText(text).width > maxW) { size--; g.font = `700 ${size}px 'Silkscreen', monospace`; }
    return size;
  }
  function popWord(g, text, x, y, size, fill) {
    g.font = `700 ${size}px 'Silkscreen', monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * .28); g.strokeStyle = C.ink;
    g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
  }

  // ── Mini (corner) version: a small plaque with pointed ends and four slots ──
  const MINI_W = 38, MINI_H = 17;
  function drawMiniArt(g, L) {
    const W = MINI_W, H = MINI_H, M = MAT[L.mat], P = L.pal, top = 1, bot = H - 2, xa = 9, xb = W - 10;
    const IN = (x, y, i = 0) => {
      const t0 = top + i, t1 = bot - i;
      if (y < t0 || y > t1) return false;
      if (x >= xa && x <= xb) return true;
      const half = (t1 - t0) / 2, t = y - (t0 + t1) / 2, d = x < xa ? xa - x : x - xb;
      return d <= 8 - i && Math.abs(t) <= half * (1 - d / (9 - i)) + .5;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!IN(x, y)) { if (IN(x - 1, y) || IN(x + 1, y) || IN(x, y - 1) || IN(x, y + 1)) px(g, x, y, C.ink); continue; }
      const edge = !IN(x - 1, y) || !IN(x + 1, y) || !IN(x, y - 1) || !IN(x, y + 1);
      const band = !edge && !IN(x, y, 2);
      px(g, x, y, edge ? (!IN(x, y - 1) ? M.H : M.S) : band ? ((x + y) % 2 ? P.tiles[0] : P.tiles[2]) : M.B);
    }
    rect(g, 11, 4, 16, 9, C.ink);
    for (let i = 0; i < 4; i++) { rect(g, 12 + i * 4, 5, 3, 7, C.ivory); rect(g, 12 + i * 4, 10, 3, 1, C.ivoryS); rect(g, 13 + i * 4, 6, 1, 3, C.digit); }
    px(g, 5, 8, P.star[0]); px(g, W - 6, 8, P.star[0]);
  }
  function drawMini(canvas, design, s = 3) {
    const L = get(design); if (!L) return;
    const art = document.createElement('canvas');
    art.width = MINI_W; art.height = MINI_H;
    drawMiniArt(art.getContext('2d'), L);
    canvas.width = MINI_W * s; canvas.height = MINI_H * s;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(art, 0, 0, canvas.width, canvas.height);
  }
  // The faint halo: main tile colour in the middle, fading through the star colour
  function glowCSS(design, alpha = .3) {
    const L = get(design); if (!L) return 'none';
    const a = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${k})`; };
    return `radial-gradient(closest-side, ${a(L.pal.tiles[0], alpha)} 0%, ${a(L.pal.star[0], alpha * .55)} 55%, ${a(L.pal.star[0], 0)} 100%)`;
  }

  // ── The big interactive lock ──
  function mount(host, design, opts = {}) {
    const L = get(design);
    host.innerHTML = '';
    if (!L) return null;
    const G = geo();
    const maxW = opts.maxW || host.clientWidth || 400, maxH = opts.maxH || innerHeight * .78;
    // whole pixels when there's room for at least 2×, otherwise just fit
    const f = Math.min(maxW / G.W, maxH / G.H), S = f >= 2 ? Math.floor(f) : Math.max(.5, f);
    const st = { dials: (opts.code && opts.code.length === 4 ? opts.code : [0, 0, 0, 0]).map(n => ((+n % 10) + 10) % 10),
      roll: [0, 0, 0, 0], pressAt: -1e9, badAt: -1e9, popAt: -1e9, popWord: '', popCol: '#7ee08a', shakeAt: -1e9,
      digits: opts.digits === 'en' ? 'en' : 'ar' };
    const label = opts.submitLabel || 'UNLOCK';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:flex;justify-content:center;margin:0 auto;';
    const cv = document.createElement('canvas');
    cv.width = Math.round(G.W * S); cv.height = Math.round(G.H * S);
    const glow = document.createElement('div');
    glow.style.cssText = `position:absolute;left:50%;top:50%;width:${cv.width * 1.6}px;height:${cv.height * 2.2}px;transform:translate(-50%,-50%);pointer-events:none;border-radius:50%;background:${glowCSS(design)}`;
    cv.style.cssText = 'position:relative;image-rendering:pixelated;touch-action:none;filter:drop-shadow(0 8px 0 rgba(0,0,0,.35));';
    wrap.append(glow, cv);
    host.appendChild(wrap);
    const art = document.createElement('canvas');
    art.width = G.W; art.height = G.H;
    const ag = art.getContext('2d'), g = cv.getContext('2d');
    let hit = null, raf = 0, alive = true;
    function draw(now = performance.now()) {
      hit = drawLock(ag, L, st, now);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.imageSmoothingEnabled = false;
      g.drawImage(art, 0, 0, cv.width, cv.height);
      const b = hit.button;
      popWord(g, label, (b.x + b.w / 2) * S, (b.y + b.h / 2 - 1) * S, fitWord(g, label, (b.w - 6) * S, Math.round(S * 7)), '#ffd166');
      // pop-up word over the dials (UNLOCK! / SAVED!)
      const e = (now - st.popAt) / 1300;
      if (e >= 0 && e < 1) {
        g.save(); g.globalAlpha = e > .7 ? (1 - e) / .3 : 1;
        const sc = e < .15 ? .6 + .46 * Math.sin(e / .15 * Math.PI / 2) : 1;
        g.translate(cv.width / 2, (G.wy + G.winH / 2) * S - e * 30 * S / 4); g.scale(sc, sc);
        popWord(g, st.popWord, 0, 0, fitWord(g, st.popWord, cv.width * .8, Math.round(S * 9)), st.popCol);
        g.restore();
      }
    }
    function loop(now) {
      if (!alive) return;
      let busy = false;
      for (let i = 0; i < 4; i++) if (st.roll[i]) { st.roll[i] *= .72; if (Math.abs(st.roll[i]) < .3) st.roll[i] = 0; busy = true; }
      const sh = (now - st.shakeAt) / 380;
      cv.style.transform = sh >= 0 && sh < 1 ? `translateX(${Math.sin(sh * Math.PI * 7) * (1 - sh) * 9}px)` : '';
      if (busy || now - st.pressAt < 200 || now - st.popAt < 1300 || now - st.badAt < 400 || sh < 1) draw(now);
      raf = requestAnimationFrame(loop);
    }
    function turn(i, dir) { st.dials[i] = (st.dials[i] + dir + 10) % 10; st.roll[i] = dir * 8.5; }
    let swipe = null;
    const artXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * G.W, (e.clientY - r.top) / r.height * G.H]; };
    cv.addEventListener('pointerdown', e => {
      const [x, y] = artXY(e), b = hit.button;
      if (x >= b.x && x < b.x + b.w && y >= b.y - 1 && y < b.y + b.h + 2) {
        st.pressAt = performance.now();
        if (opts.onSubmit) opts.onSubmit([...st.dials]);
        return;
      }
      const i = Math.floor((x - G.wx - 1 + GAP / 2) / (DW + GAP));
      if (i < 0 || i > 3 || y < G.wy - 6 || y > G.wy + G.winH + 6) return;
      swipe = { i, y: e.clientY, mid: G.wy + 1 + DH / 2, moved: false };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (!swipe) return;
      const step = S * 9;
      while (e.clientY - swipe.y > step) { turn(swipe.i, -1); swipe.y += step; swipe.moved = true; }
      while (swipe.y - e.clientY > step) { turn(swipe.i, 1); swipe.y -= step; swipe.moved = true; }
    });
    const up = e => {
      if (swipe && !swipe.moved) { const [, y] = artXY(e); turn(swipe.i, y < swipe.mid ? -1 : 1); }
      swipe = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => { swipe = null; });
    if (document.fonts) document.fonts.load("700 20px 'Silkscreen'").then(() => alive && draw());
    draw(); raf = requestAnimationFrame(loop);
    return {
      code: () => [...st.dials],
      // for tests: screen-relative (canvas px) spots to tap
      layout: () => ({ S: cv.width / G.W, button: hit.button,
        dial: i => { const d = G.dial(i); return { x: d.x + d.w / 2, top: d.y + d.h * .25, bottom: d.y + d.h * .75 }; } }),
      shake() { st.shakeAt = st.badAt = performance.now(); },
      flashOk(word = 'UNLOCK!') { st.popWord = word; st.popCol = '#7ee08a'; st.popAt = performance.now(); },
      pop(word, col) { st.popWord = word; st.popCol = col || '#ffd166'; st.popAt = performance.now(); },
      destroy() { alive = false; cancelAnimationFrame(raf); host.innerHTML = ''; },
    };
  }

  // drawing pieces, shared with the design previews (unlocker-preview*.html)
  const parts = { C, MAT, GLYPHS, px, rect, glyph, inArch, star, popWord, fitWord };
  return { parts, LOCKS, isPixel, get, drawMini, glowCSS, codeText, mount, sameCode: (a, b) => a.length === b.length && a.every((x, i) => +x === +b[i]) };
})();
