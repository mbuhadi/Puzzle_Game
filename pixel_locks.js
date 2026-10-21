/* Courtyard Locks — the pixel-art constant unlockers (designed in
   unlocker-preview.html). Each is a four-dial vertical lock styled as an
   artifact from an Arabic courtyard house: a pointed-arch plate with a tile
   border and an eight-point star, four ivory dials with big digits (tap the
   top / bottom half of a dial, or swipe it), and an UNLOCK button.

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

  // The four locks (C2–C5 in the preview). All share one shape; they differ
  // in colours: tile border, star, rims between the dials, studs and button.
  const BASE = { W: 60, k: .64, springY: 46, ww: 34, gs: 2, pad: 4, star: 7, edge: 3, bw: 4 };
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
  // pointed (Moorish) arch
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
  // side: the button sits to the right of the plate instead of under it
  // (short, wide screens — phones held sideways)
  const SIDE_BTN_W = 50;
  function geo(v, side) {
    const x0 = 3, x1 = v.W - 4, cx = Math.round((x0 + x1) / 2);
    const gh = 7 * v.gs, dh = gh + v.pad * 2 + 4;
    const wx = cx - Math.round(v.ww / 2), wy = v.springY - 6, wh = dh * 4 + 1;
    const yBot = wy + wh + 9;
    return { x0, x1, cx, gh, dh, wx, wy, wh, ww: v.ww, yb: v.springY, yBot, side: !!side,
      W: side ? v.W + 6 + SIDE_BTN_W : v.W, H: side ? yBot + 4 : yBot + 28 };
  }
  function plate(g, v, G, M) {
    const { x0, x1, yb, yBot } = G, k = v.k, IN = (x, y, a = 0, b = 0, c = 0) => inArch(x, y, x0 + a, x1 - a, yb + b, yBot - c, k);
    const e = v.edge, o = e + 1, bw = v.bw, tiles = v.pal.tiles;
    for (let y = 0; y < G.H; y++) for (let x = 0; x < v.W; x++) {
      if (!IN(x, y)) { if (IN(x - 1, y) || IN(x + 1, y) || IN(x, y + 1) || IN(x, y - 1)) px(g, x, y, C.ink); continue; }
      const edge = !IN(x - e, y) || !IN(x + e, y) || !IN(x, y - e) || !IN(x, y + e);
      if (edge) { px(g, x, y, !IN(x - e, y - e) ? (!IN(x - 1, y - 1) ? M.H : M.L) : M.S); continue; }
      if (!IN(x, y, o + bw, 2, o + bw) && IN(x, y, o, 0, o)) {
        const gr = (x + y) % 3 === 0 || (x - y + 300) % 3 === 0;
        const t = Math.floor((x + y) / 3) + 2 * Math.floor((x - y + 300) / 3);
        px(g, x, y, gr ? v.pal.grout : tiles[((t % tiles.length) + tiles.length) % tiles.length]);
        continue;
      }
      px(g, x, y, (x + y) % 6 === 0 || (x - y + 600) % 6 === 0 ? M.lat : M.B);
    }
  }
  // The plate is the same every frame: cache it per lock
  const plateCache = new Map();
  function plateCanvas(v) {
    if (!plateCache.has(v.id)) {
      const G = geo(v), c = document.createElement('canvas');
      c.width = v.W; c.height = G.yBot + 2;
      plate(c.getContext('2d'), v, G, MAT[v.mat]);
      plateCache.set(v.id, c);
    }
    return plateCache.get(v.id);
  }
  // Everything but the button's word, onto an art-sized context
  function drawLock(g, v, st, now, side) {
    const G = geo(v, side), M = MAT[v.mat], P = v.pal, { cx, wx, wy, ww, dh, gh } = G;
    g.clearRect(0, 0, G.W, G.H);
    g.drawImage(plateCanvas(v), 0, 0);
    const sy = Math.round(wy - v.star - 6);
    star(g, cx, sy, v.star, P.star[0], C.ink);
    star(g, cx, sy, Math.max(2, Math.round(v.star / 2)), P.star[1], P.star[2]);
    rect(g, wx - 2, wy - 2, ww + 4, G.wh + 4, C.ink);
    rect(g, wx - 1, wy - 1, ww + 2, G.wh + 2, M.D);
    rect(g, wx, wy, ww, G.wh, C.win);
    for (let i = 0; i < 4; i++) {
      const dy = wy + 1 + i * dh, h = dh - 3;
      for (let y = 0; y < h; y++) {
        const t = Math.abs(y - (h - 1) / 2) / ((h - 1) / 2);
        rect(g, wx + 1, dy + y, ww - 2, 1, t > .8 ? C.ivoryD : t > .5 ? C.ivoryS : C.ivory);
      }
      rect(g, wx + 1, dy + 2, 2, h - 4, C.cream);
      const d = st.dials[i], r = st.roll[i], gx = wx + Math.round(ww / 2) - Math.round(5 * v.gs / 2), step = gh + v.pad + 2;
      for (const kk of [-1, 0, 1]) {
        const yy = dy + Math.round((h - gh) / 2) + kk * step + Math.round(r * v.gs);
        glyph(g, st.digits, (d + kk + 10) % 10, gx, yy, v.gs, kk ? C.ivoryD : C.digit, dy, dy + h);
      }
      rect(g, cx - 1, dy + 1, 3, 1, C.caret); px(g, cx, dy, C.caret);
      rect(g, cx - 1, dy + h - 2, 3, 1, C.caret); px(g, cx, dy + h - 1, C.caret);
      rect(g, wx, dy + h, ww, 1, P.rim[0]); rect(g, wx, dy + h + 1, ww, 1, P.rim[1]);
      const mid = dy + Math.floor(h / 2);
      rect(g, wx - 5, mid - 1, 3, 3, C.ink); px(g, wx - 4, mid, P.studs);
      rect(g, wx + ww + 2, mid - 1, 3, 3, C.ink); px(g, wx + ww + 3, mid, P.studs);
    }
    for (const [rx, ry] of [[G.x0 + 6, G.yBot - 6], [G.x1 - 6, G.yBot - 6]]) { rect(g, rx - 1, ry - 1, 3, 3, C.ink); px(g, rx, ry, M.H); }
    const pressed = now - st.pressAt < 140, bad = now - st.badAt < 380;
    let bx = Math.max(2, Math.round(v.W / 2 - 34)), bw = v.W - 2 * bx, by = G.yBot + 7, bh = 15;
    if (side) { bh = 21; bx = v.W + 6; bw = SIDE_BTN_W - 2; by = G.yBot - bh - 6; }   // taller: easy to hit with a thumb
    by += pressed ? 1 : 0;
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

  // ── Mini (corner) version ──
  function miniSize(v) { const W = Math.max(14, Math.round(v.W * .3)); return { W, H: Math.round(W * 1.45) }; }
  function drawMiniArt(g, v) {
    const { W, H } = miniSize(v), M = MAT[v.mat], band = [v.pal.tiles[0], v.pal.tiles[2]];
    const x0 = 1, x1 = W - 2, yb = Math.round(H * .38), yBot = H - 2, k = v.k;
    const IN = (x, y, a = 0, b = 0) => inArch(x, y, x0 + a, x1 - a, yb + b, yBot - a, k);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!IN(x, y)) { if (IN(x - 1, y) || IN(x + 1, y) || IN(x, y + 1) || IN(x, y - 1)) px(g, x, y, C.ink); continue; }
      const edge = !IN(x - 1, y) || !IN(x + 1, y) || !IN(x, y - 1) || !IN(x, y + 1);
      const inB = !edge && !IN(x, y, 2, 1);
      px(g, x, y, edge ? (!IN(x - 1, y - 1) ? M.H : M.S) : inB ? ((x + y) % 2 ? band[0] : band[1]) : M.B);
    }
    const cx = Math.round((x0 + x1) / 2), sw = Math.max(4, W - 10), wx = cx - Math.floor(sw / 2), wy = yb - 2;
    star(g, cx, wy - 4, 1, v.pal.star[0], C.ink);
    const slot = Math.max(3, Math.floor((yBot - 6 - wy) / 4));
    rect(g, wx - 1, wy - 1, sw + 2, slot * 4 + 1, C.ink);
    for (let i = 0; i < 4; i++) {
      rect(g, wx, wy + i * slot, sw, slot - 1, C.ivory);
      rect(g, wx, wy + i * slot + slot - 2, sw, 1, C.ivoryS);
      rect(g, cx - 1, wy + i * slot + Math.max(0, Math.floor((slot - 3) / 2)), 2, Math.max(1, slot - 2), C.digit);
    }
  }
  function drawMini(canvas, design, s = 3) {
    const v = get(design); if (!v) return;
    const { W, H } = miniSize(v), art = document.createElement('canvas');
    art.width = W; art.height = H;
    drawMiniArt(art.getContext('2d'), v);
    canvas.width = W * s; canvas.height = H * s;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(art, 0, 0, W * s, H * s);
  }
  // The faint halo: main tile colour in the middle, fading through the star colour
  function glowCSS(design, alpha = .3) {
    const v = get(design); if (!v) return 'none';
    const a = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${k})`; };
    return `radial-gradient(closest-side, ${a(v.pal.tiles[0], alpha)} 0%, ${a(v.pal.star[0], alpha * .55)} 55%, ${a(v.pal.star[0], 0)} 100%)`;
  }

  // ── The big interactive lock ──
  function mount(host, design, opts = {}) {
    const v = get(design);
    host.innerHTML = '';
    if (!v) return null;
    const maxW0 = opts.maxW || host.clientWidth || 400, maxH0 = opts.maxH || innerHeight * .78;
    // pick the layout that lets the lock be drawn biggest; whole pixels when
    // there's room for at least 2×, otherwise just fit
    const fitS = G => Math.min(maxW0 / G.W, maxH0 / G.H);
    const side = opts.layout === 'side' || (opts.layout !== 'below' && fitS(geo(v, true)) > fitS(geo(v)) * 1.08);
    const G = geo(v, side);
    const st = { dials: (opts.code && opts.code.length === 4 ? opts.code : [0, 0, 0, 0]).map(n => ((+n % 10) + 10) % 10),
      roll: [0, 0, 0, 0], pressAt: -1e9, badAt: -1e9, popAt: -1e9, popWord: '', popCol: '#7ee08a', shakeAt: -1e9,
      digits: opts.digits === 'en' ? 'en' : 'ar' };
    const label = opts.submitLabel || 'UNLOCK';
    const f = fitS(G), S = f >= 2 ? Math.floor(f) : Math.max(.5, f);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:flex;justify-content:center;margin:0 auto;';
    const glow = document.createElement('div');
    glow.style.cssText = `position:absolute;left:${v.W * S / 2}px;top:50%;width:${v.W * S * 2.6}px;height:${G.H * S * 1.25}px;transform:translate(-50%,-50%);pointer-events:none;border-radius:50%;background:${glowCSS(design)}`;
    const cv = document.createElement('canvas');
    cv.width = Math.round(G.W * S); cv.height = Math.round(G.H * S);
    cv.style.cssText = 'position:relative;image-rendering:pixelated;touch-action:none;filter:drop-shadow(0 10px 0 rgba(0,0,0,.35));';
    wrap.append(glow, cv);
    host.appendChild(wrap);
    const art = document.createElement('canvas');
    art.width = G.W; art.height = G.H;
    const ag = art.getContext('2d'), g = cv.getContext('2d');
    let hit = null, raf = 0, alive = true;
    function draw(now = performance.now()) {
      hit = drawLock(ag, v, st, now, side);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.imageSmoothingEnabled = false;
      g.drawImage(art, 0, 0, cv.width, cv.height);
      const b = hit.button;
      popWord(g, label, (b.x + b.w / 2) * S, (b.y + b.h / 2 - 1) * S, fitWord(g, label, (b.w - 4) * S, Math.round(S * 6.5)), '#ffd166');
      const e = (now - st.popAt) / 1300;
      if (e >= 0 && e < 1) {
        g.save(); g.globalAlpha = e > .7 ? (1 - e) / .3 : 1;
        const sc = e < .15 ? .6 + .46 * Math.sin(e / .15 * Math.PI / 2) : 1;
        g.translate(v.W * S / 2, (G.wy - 6) * S - e * 40); g.scale(sc, sc);
        popWord(g, st.popWord, 0, 0, fitWord(g, st.popWord, v.W * S * 1.3, Math.round(S * 7)), st.popCol);
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
    function turn(i, dir) { st.dials[i] = (st.dials[i] + dir + 10) % 10; st.roll[i] = dir * (7 + v.pad + 2) / v.gs; }
    let swipe = null;
    const artXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * G.W, (e.clientY - r.top) / r.height * G.H]; };
    cv.addEventListener('pointerdown', e => {
      const [x, y] = artXY(e), b = hit.button;
      if (x >= b.x && x < b.x + b.w && y >= b.y - 1 && y < b.y + b.h + 2) {
        st.pressAt = performance.now();
        if (opts.onSubmit) opts.onSubmit([...st.dials]);
        return;
      }
      const i = Math.floor((y - G.wy) / G.dh);
      if (i < 0 || i > 3 || x < G.wx - 6 || x > G.wx + G.ww + 6) return;
      swipe = { i, y: e.clientY, mid: G.wy + 1 + i * G.dh + (G.dh - 3) / 2, moved: false };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (!swipe) return;
      const step = S * 8;
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
      layout: () => ({ S: cv.width / G.W, side, G, button: hit.button }),   // for tests
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
