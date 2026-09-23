/* ═══════════════ Browse Tileset picker — shared by Map Studio and Puzzle Studio ═══════════════
   Builds the picker overlay (Modern Interiors / Retro Interior / Modern
   Exteriors sheets, the Animated strip browser, and the Custom tab) and all of
   its selection behaviour. The host page provides the look (.overlay /
   .overlay-box / .overlay-head / .hint-text styles + theme CSS variables, and
   assets/tileset_picker.css) and one hook:

     function onTilesetUse(pick) { … }   // called by "Use Selection" — see tsUse()

   Load it with a plain <script> tag *inside <body>* (it appends its markup to
   the body), after assets/anim_manifest.js and before the host's own script.
   Everything here is a global on purpose: the markup's onclick attributes and
   the host's keyboard shortcuts (Esc / Enter / arrows) call into it. */

// ── Tileset sheets (16px tiles) ───────────────────────────────────────────────
const SHEET_TILE = 16;
const SHEETS = {
  interiors: { name: 'Modern Interiors', src: 'assets/Interiors_16x16.png' },
  retro:     { name: 'Retro Interior',   src: 'assets/Retro_Interior_16x16.png' },
  exteriors: { name: 'Modern Exteriors', src: 'assets/Exteriors_16x16.png' },
};

// "2.5" not "2.500000", "3" not "3.00" — for the selection readout
function tsFmtN(v) { return String(+(+v).toFixed(2)); }

document.body.insertAdjacentHTML('beforeend', `
<!-- Tileset picker -->
<div id="tsOverlay" class="overlay">
  <div id="tsBox" class="overlay-box">
    <div id="tsHead" class="overlay-head">
      <button class="ts-tab active" data-sheet="interiors" onclick="tsSelectSheet('interiors')">Modern Interiors</button>
      <button class="ts-tab" data-sheet="retro" onclick="tsSelectSheet('retro')">Retro Interior</button>
      <button class="ts-tab" data-sheet="exteriors" onclick="tsSelectSheet('exteriors')">Modern Exteriors</button>
      <button class="ts-tab" data-sheet="animated" onclick="tsSelectSheet('animated')">Animated ▶</button>
      <button class="ts-tab" data-sheet="custom" onclick="tsSelectSheet('custom')">Custom ★</button>
      <button id="tsCustomBack" onclick="tsCustomShowGallery()" style="display:none" title="Back to all custom images">← all custom</button>
      <span>— click &amp; drag to select</span>
      <span id="tsSel">no selection</span>
    </div>
    <div id="tsScroll">
      <img id="tsImg" src="assets/Interiors_16x16.png" draggable="false" alt="tileset">
      <div id="tsRect"></div>
      <div id="customPane">
        <div id="customBar">
          <button onclick="document.getElementById('customFile').click()" title="Upload images to the website (GitHub repo) — they show up here for everyone">⬆ Upload images…</button>
          <input id="customFile" type="file" accept="image/png,image/gif,image/webp,image/jpeg" multiple style="display:none">
          <span id="customStatus" class="hint-text"></span>
        </div>
        <div id="customGrid"></div>
      </div>
      <div id="animPane">
        <div id="animSide">
          <input id="animSearch" type="text" placeholder="search animations…" spellcheck="false" autocomplete="off">
          <div id="animItems"></div>
        </div>
        <div id="animStage">
          <canvas id="animCanvas" width="0" height="0"></canvas>
          <div id="animModeRow" style="display:flex; align-items:center; gap:6px;">
            <button id="animMode-anim" class="active" onclick="setAnimMode('anim')" style="font-size:10px;padding:3px 9px">Animation</button>
            <button id="animMode-static" onclick="setAnimMode('static')" style="font-size:10px;padding:3px 9px">Static</button>
            <span id="animFrameStep" style="display:none; align-items:center; gap:4px;">
              <button onclick="stepStaticFrame(-1)" title="Previous frame" style="font-size:10px;padding:3px 7px">◀</button>
              <span id="animFrameLabel" class="hint-text" style="min-width:32px;text-align:center">1 / 1</span>
              <button onclick="stepStaticFrame(1)" title="Next frame" style="font-size:10px;padding:3px 7px">▶</button>
            </span>
          </div>
          <div id="animInfo" class="hint-text">pick an animation from the list</div>
          <div class="hint-text">drag on the preview to crop tiles · full frame preselected</div>
        </div>
      </div>
    </div>
    <div id="tsFoot">
      <button onclick="tsZoomStep(-1)" title="Zoom out (or Ctrl+scroll)">−</button>
      <span id="tsZoomLabel">2×</span>
      <button onclick="tsZoomStep(1)" title="Zoom in (or Ctrl+scroll)">+</button>
      <button id="tsSnapBtn" onclick="tsToggleSnap()" title="Selection precision: cycles 16px → 8px → 4px">Snap: 16px</button>
      <span class="hint-text" style="margin-right:auto">arrows move · shift+arrows resize · enter = use</span>
      <button onclick="tsCancel()">Cancel</button>
      <button id="tsUseBtn" onclick="tsUse()" disabled>Use Selection</button>
    </div>
  </div>
</div>

`);

// ── Tileset picker ────────────────────────────────────────────────────────────
const tsOverlay = document.getElementById('tsOverlay');
const tsScroll  = document.getElementById('tsScroll');
const tsImgEl   = document.getElementById('tsImg');
const tsRect    = document.getElementById('tsRect');
let tsStart = null;   // {tx, ty} sheet-tile coords where drag began
let tsPick  = null;   // pending {sx, sy, sw, sh}
let tsSheet = 'interiors';   // which sheet tab is active
let tsZoom  = 2;      // display scale of the sheet (pixel-art integer steps)
let tsSnap  = 1;      // selection precision in sheet tiles: 1 (16px), 0.5 (8px) or 0.25 (4px)
let tsHover = null;   // {tx, ty} snap-unit under the cursor, for the readout
const TS_ZOOMS = [1, 2, 3, 4, 6, 8];

function openTileset() { tsOverlay.classList.add('open'); }
function tsCancel()    { tsOverlay.classList.remove('open'); tsStart = null; }

function tsSelectSheet(key) {
  if (key === 'custom' && tsSheet === 'custom') { tsCustomShowGallery(); return; }
  if (key === tsSheet) return;
  if (key !== 'animated' && key !== 'custom' && !SHEETS[key]) return;
  tsSheet = key;
  const animMode = key === 'animated';
  tsScroll.classList.toggle('anim-mode', animMode);
  tsScroll.classList.remove('custom-mode');
  document.getElementById('tsCustomBack').style.display = 'none';
  tsStart = null;
  if (animMode) {
    buildAnimList();
    if (animSel) { animUpdateSel(); drawAnimStage(); }
    else {
      document.getElementById('tsSel').textContent = 'no selection';
      document.getElementById('tsUseBtn').disabled = true;
    }
  } else if (key === 'custom') {
    tsCustomShowGallery();
  } else {
    if (tsZoom < 1) {   // a big Custom image was zoomed out to fit — sheets start at 2×
      tsZoom = 2;
      document.getElementById('tsZoomLabel').textContent = tsZoom + '×';
    }
    tsImgEl.src = SHEETS[key].src;
    tsPick = null;
    tsRect.style.display = 'none';
    document.getElementById('tsSel').textContent = 'no selection';
    document.getElementById('tsUseBtn').disabled = true;
  }
  tsScroll.scrollTop = 0;
  document.querySelectorAll('.ts-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.sheet === key));
}

// Sheets are pixel art — display at an integer zoom (the CSS width only fits
// the 256px-wide Interiors sheet; Exteriors is 2816px wide)
tsImgEl.addEventListener('load', () => {
  tsImgEl.style.width = (tsImgEl.naturalWidth * tsZoom) + 'px';
});

// Zoom keeps the sheet point under the anchor (cursor or view center) fixed
function tsSetZoom(z, cx, cy) {
  z = Math.max(TS_ZOOMS[0], Math.min(TS_ZOOMS[TS_ZOOMS.length - 1], z));
  if (z === tsZoom) return;
  const r  = tsScroll.getBoundingClientRect();
  const mx = cx != null ? cx - r.left : r.width  / 2;
  const my = cy != null ? cy - r.top  : r.height / 2;
  const px = (tsScroll.scrollLeft + mx) / tsZoom;   // sheet px at the anchor
  const py = (tsScroll.scrollTop  + my) / tsZoom;
  tsZoom = z;
  tsImgEl.style.width = (tsImgEl.naturalWidth * tsZoom) + 'px';
  tsScroll.scrollLeft = px * tsZoom - mx;
  tsScroll.scrollTop  = py * tsZoom - my;
  document.getElementById('tsZoomLabel').textContent = tsZoom + '×';
  tsPlaceRect();
}

function tsZoomStep(dir, cx, cy) {
  const i = TS_ZOOMS.indexOf(tsZoom);
  tsSetZoom(TS_ZOOMS[Math.max(0, Math.min(TS_ZOOMS.length - 1, i + dir))], cx, cy);
}

// Ctrl+scroll zooms at the cursor; plain scroll pans as usual
tsScroll.addEventListener('wheel', e => {
  if (!e.ctrlKey || tsSheet === 'animated' || tsScroll.classList.contains('custom-mode')) return;
  e.preventDefault();
  tsZoomStep(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
}, { passive: false });

function tsToggleSnap() {
  tsSnap = tsSnap === 1 ? 0.5 : tsSnap === 0.5 ? 0.25 : 1;
  document.getElementById('tsSnapBtn').textContent =
    'Snap: ' + (tsSnap === 1 ? '16px' : tsSnap === 0.5 ? '8px' : '4px');
}

// Sheet-tile coordinate under the mouse, floored to the current snap step
function tsTileAt(e) {
  const r = tsImgEl.getBoundingClientRect();
  const scale = r.width / tsImgEl.naturalWidth;
  const step = SHEET_TILE * scale * tsSnap;
  const tx = Math.floor((e.clientX - r.left) / step) * tsSnap;
  const ty = Math.floor((e.clientY - r.top)  / step) * tsSnap;
  return {
    tx: Math.max(0, Math.min(tsImgEl.naturalWidth  / SHEET_TILE - tsSnap, tx)),
    ty: Math.max(0, Math.min(tsImgEl.naturalHeight / SHEET_TILE - tsSnap, ty)),
  };
}

function tsSelLabel() {
  const hov = tsHover ? `@ ${tsFmtN(tsHover.tx)},${tsFmtN(tsHover.ty)}` : '';
  const sel = tsPick ? `${tsFmtN(tsPick.sw)}×${tsFmtN(tsPick.sh)} tiles` : 'no selection';
  document.getElementById('tsSel').textContent = hov ? `${hov} · ${sel}` : sel;
}

// Position the highlight rect from tsPick (drag, nudge and zoom all end here)
function tsPlaceRect() {
  if (!tsPick) return;
  const scale = tsImgEl.getBoundingClientRect().width / tsImgEl.naturalWidth;
  const px = SHEET_TILE * scale;
  tsRect.style.display = 'block';
  tsRect.style.left   = (tsPick.sx * px) + 'px';
  tsRect.style.top    = (tsPick.sy * px) + 'px';
  tsRect.style.width  = (tsPick.sw * px) + 'px';
  tsRect.style.height = (tsPick.sh * px) + 'px';
  tsSelLabel();
  document.getElementById('tsUseBtn').disabled = false;
}

function tsUpdateRect(a, b) {
  const sx = Math.min(a.tx, b.tx), sy = Math.min(a.ty, b.ty);
  const sw = Math.abs(a.tx - b.tx) + tsSnap, sh = Math.abs(a.ty - b.ty) + tsSnap;
  tsPick = { sx, sy, sw, sh };
  tsPlaceRect();
}

// Arrow keys move the selection one snap step; Shift+arrows resize it
function tsNudge(dx, dy, resize) {
  if (!tsPick) return;
  const maxW = tsImgEl.naturalWidth / SHEET_TILE, maxH = tsImgEl.naturalHeight / SHEET_TILE;
  if (resize) {
    tsPick.sw = Math.max(tsSnap, Math.min(maxW - tsPick.sx, tsPick.sw + dx * tsSnap));
    tsPick.sh = Math.max(tsSnap, Math.min(maxH - tsPick.sy, tsPick.sh + dy * tsSnap));
  } else {
    tsPick.sx = Math.max(0, Math.min(maxW - tsPick.sw, tsPick.sx + dx * tsSnap));
    tsPick.sy = Math.max(0, Math.min(maxH - tsPick.sh, tsPick.sy + dy * tsSnap));
  }
  tsPlaceRect();
  // Keep the selection in view while it walks off-screen
  const scale = tsImgEl.getBoundingClientRect().width / tsImgEl.naturalWidth;
  const px = SHEET_TILE * scale;
  const x0 = tsPick.sx * px, y0 = tsPick.sy * px;
  const x1 = x0 + tsPick.sw * px, y1 = y0 + tsPick.sh * px;
  if (x0 < tsScroll.scrollLeft) tsScroll.scrollLeft = x0 - px;
  if (y0 < tsScroll.scrollTop)  tsScroll.scrollTop  = y0 - px;
  if (x1 > tsScroll.scrollLeft + tsScroll.clientWidth)  tsScroll.scrollLeft = x1 - tsScroll.clientWidth  + px;
  if (y1 > tsScroll.scrollTop  + tsScroll.clientHeight) tsScroll.scrollTop  = y1 - tsScroll.clientHeight + px;
}

tsScroll.addEventListener('mousedown', e => {
  if (e.target !== tsImgEl) return;
  e.preventDefault();
  tsStart = tsTileAt(e);
  tsUpdateRect(tsStart, tsStart);
});
tsScroll.addEventListener('mousemove', e => {
  if (tsSheet === 'animated') return;
  if (e.target === tsImgEl || tsStart) tsHover = tsTileAt(e);
  if (tsStart) tsUpdateRect(tsStart, tsHover);
  else tsSelLabel();
});
tsScroll.addEventListener('mouseleave', () => { tsHover = null; tsSelLabel(); });
window.addEventListener('mouseup', () => { tsStart = null; });

// Touch (tablets): one finger drags out a selection just like the mouse; a
// second finger cancels that drag and the two fingers scroll the sheet
// instead, since a single-finger drag no longer scrolls it.
let tsTouchId  = null;   // finger doing the drag-select
let tsTouchPrev = null;  // selection before the touch, restored if it turns into a scroll
let tsPanMid   = null;   // last two-finger midpoint while scrolling
function tsMid(ts) {
  return { x: (ts[0].clientX + ts[1].clientX) / 2, y: (ts[0].clientY + ts[1].clientY) / 2 };
}
// While drag-selecting near the edge of the view, scroll toward it so
// objects bigger than the screen can still be selected in one drag
function tsEdgeScroll(t) {
  const r = tsScroll.getBoundingClientRect(), edge = 40, speed = 12;
  if (t.clientX < r.left + edge)   tsScroll.scrollLeft -= speed;
  if (t.clientX > r.right - edge)  tsScroll.scrollLeft += speed;
  if (t.clientY < r.top + edge)    tsScroll.scrollTop  -= speed;
  if (t.clientY > r.bottom - edge) tsScroll.scrollTop  += speed;
}
tsScroll.addEventListener('touchstart', e => {
  if (tsSheet === 'animated') return;
  if (e.touches.length === 2) {
    e.preventDefault();
    if (tsTouchId !== null) {          // undo the accidental one-tile pick
      tsTouchId = null; tsStart = null;
      tsPick = tsTouchPrev;
      if (tsPick) tsPlaceRect();
      else {
        tsRect.style.display = 'none';
        document.getElementById('tsUseBtn').disabled = true;
        tsSelLabel();
      }
    }
    tsPanMid = tsMid(e.touches);
    return;
  }
  if (e.touches.length !== 1 || e.target !== tsImgEl) return;
  e.preventDefault();
  const t = e.touches[0];
  tsTouchId = t.identifier;
  tsTouchPrev = tsPick ? { ...tsPick } : null;
  tsStart = tsTileAt(t);
  tsHover = tsStart;
  tsUpdateRect(tsStart, tsStart);
}, { passive: false });
tsScroll.addEventListener('touchmove', e => {
  if (tsPanMid && e.touches.length === 2) {
    e.preventDefault();
    const m = tsMid(e.touches);
    tsScroll.scrollLeft -= m.x - tsPanMid.x;
    tsScroll.scrollTop  -= m.y - tsPanMid.y;
    tsPanMid = m;
    return;
  }
  if (tsTouchId === null) return;
  const t = [...e.touches].find(t => t.identifier === tsTouchId);
  if (!t) return;
  e.preventDefault();
  tsEdgeScroll(t);
  tsHover = tsTileAt(t);
  tsUpdateRect(tsStart, tsHover);
}, { passive: false });
function tsTouchEnd(e) {
  if (tsPanMid && e.touches.length < 2) tsPanMid = null;
  if (tsTouchId !== null && ![...e.touches].some(t => t.identifier === tsTouchId)) {
    tsTouchId = null; tsStart = null;
  }
}
tsScroll.addEventListener('touchend', tsTouchEnd);
tsScroll.addEventListener('touchcancel', tsTouchEnd);

// "Use Selection": hands the host page a description of what was picked —
//   {kind:'sheet', sheet, sx, sy, sw, sh}            a region of a tilesheet (tile units)
//   {kind:'anim',  name, cat, once, sw, sh, anim}    an animation strip crop
//   {kind:'image', name, src, x, y, w, h, sw, sh}    a region of a Custom image (px)
// The host defines onTilesetUse(pick) to place it (Map Studio: object brush;
// Puzzle Studio: a sprite on the board).
function tsUse() {
  let pick = null;
  if (tsSheet === 'animated') {
    if (!animSel || !animPick) return;
    const d = animSel, isStatic = animMode === 'static';
    pick = {
      kind: 'anim', name: d.n, cat: d.cat, once: !!d.once,
      sw: animPick.w / SHEET_TILE, sh: animPick.h / SHEET_TILE,
      // Static reuses the same anim shape with frames:1, offset to the chosen
      // frame — animFrameIdx() (maps.html) always lands on index 0 % 1, so it
      // never advances. No runtime changes needed for it to render as frozen.
      anim: isStatic
        ? { src: d.src, x: animPick.x + staticFrame * d.w, y: animPick.y,
            w: animPick.w, h: animPick.h, stride: d.w, frames: 1, ms: d.ms, once: false }
        : { src: d.src, x: animPick.x, y: animPick.y, w: animPick.w, h: animPick.h,
            stride: d.w, frames: d.frames, ms: d.ms, once: !!d.once },
    };
  } else if (tsSheet === 'custom') {
    if (!customSel || !tsPick) return;
    const u = SHEET_TILE;
    pick = { kind: 'image', name: customSel.name, src: customSel.path,
             x: tsPick.sx * u, y: tsPick.sy * u, w: tsPick.sw * u, h: tsPick.sh * u,
             sw: tsPick.sw, sh: tsPick.sh };
  } else {
    if (!tsPick) return;
    pick = { kind: 'sheet', sheet: tsSheet, ...tsPick };
  }
  tsOverlay.classList.remove('open');
  if (typeof onTilesetUse === 'function') onTilesetUse(pick);
}

// ── Animated picker (entries come from assets/anim_manifest.js) ───────────────
// Left pane: searchable list of every animation strip in the Modern Exteriors
// pack, grouped by category, with lazily drawn frame-0 thumbnails. Right pane:
// live looping preview where a drag crops a tile region out of the frame (so
// a single water tile can be cut from the 3×3 autotile block).
const ANIM_LIST = typeof ANIM_DEFS !== 'undefined' ? ANIM_DEFS : [];
const animCanvasEl = document.getElementById('animCanvas');
const animCtx = animCanvasEl.getContext('2d');
let animSel = null;         // selected ANIM_LIST entry
let animPick = null;        // {x, y, w, h} px crop within one frame
let animMode = 'anim';      // 'anim' (loops in-game) | 'static' (one frozen frame)
let staticFrame = 0;        // which frame index 'static' mode freezes on
let animScale = 4;
let animDragStart = null;   // {tx, ty} crop-drag anchor in frame tiles
let animListQuery = null;

const ANIM_STRIPS = {};     // shared Image cache for strip PNGs
function stripImg(src) {
  let im = ANIM_STRIPS[src];
  if (!im) { im = new Image(); im.src = src; ANIM_STRIPS[src] = im; }
  return im;
}

// Thumbnails load their strip only once scrolled into view — the list holds
// hundreds of items and eagerly loading every PNG would hammer first open
const animThumbObs = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    animThumbObs.unobserve(en.target);
    const cv = en.target, def = ANIM_LIST[+cv.dataset.i];
    const im = stripImg(def.src);
    const draw = () => {
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      const s = Math.min(32 / def.w, 32 / def.h);
      g.drawImage(im, 0, 0, def.w, def.h,
        (32 - def.w * s) / 2, (32 - def.h * s) / 2, def.w * s, def.h * s);
    };
    if (im.complete && im.naturalWidth) draw();
    else im.addEventListener('load', draw, { once: true });
  }
});

function buildAnimList() {
  const q = document.getElementById('animSearch').value.trim().toLowerCase();
  if (animListQuery === q) return;
  animListQuery = q;
  const box = document.getElementById('animItems');
  box.innerHTML = '';
  let cat = null;
  ANIM_LIST.forEach((def, i) => {
    if (q && !def.n.toLowerCase().includes(q)) return;
    if (def.cat !== cat) {
      cat = def.cat;
      const h = document.createElement('div');
      h.className = 'anim-cat';
      h.textContent = cat.toUpperCase();
      box.appendChild(h);
    }
    const item = document.createElement('div');
    item.className = 'anim-item' + (animSel === def ? ' active' : '');
    item.title = `${def.w / 16}×${def.h / 16} tiles · ${def.frames} frames` +
                 (def.once ? ' · plays on E' : ' · loops');
    const cv = document.createElement('canvas');
    cv.width = 32; cv.height = 32; cv.dataset.i = i;
    const nm = document.createElement('span');
    nm.textContent = def.n;
    item.append(cv, nm);
    item.onclick = () => selectAnim(def, item);
    box.appendChild(item);
    animThumbObs.observe(cv);
  });
  if (!box.childElementCount) {
    const empty = document.createElement('div');
    empty.className = 'hint-text';
    empty.style.padding = '8px 4px';
    empty.textContent = ANIM_LIST.length ? 'no animations match' : 'anim_manifest.js missing';
    box.appendChild(empty);
  }
}
document.getElementById('animSearch').addEventListener('input', buildAnimList);

function selectAnim(def, itemEl) {
  animSel = def;
  animPick = { x: 0, y: 0, w: def.w, h: def.h };   // full frame preselected
  staticFrame = 0;
  animScale = Math.max(2, Math.min(8, Math.floor(288 / Math.max(def.w, def.h))));
  animCanvasEl.width  = def.w * animScale;
  animCanvasEl.height = def.h * animScale;
  document.querySelectorAll('.anim-item').forEach(el =>
    el.classList.toggle('active', el === itemEl));
  animUpdateSel();
  refreshAnimModeUI();
  drawAnimStage();
}

function animUpdateSel() {
  document.getElementById('tsSel').textContent =
    `${animPick.w / 16}×${animPick.h / 16} tiles · ${animSel.frames} frames`;
  document.getElementById('tsUseBtn').disabled = false;
  document.getElementById('animInfo').textContent =
    `${animSel.n} · ${animSel.ms} ms/frame · ` +
    (animSel.once ? 'plays once on E (door-style)' : 'loops forever');
}

// Animation places the full loop (or the once-off swing); Static freezes on
// one chosen frame — same anim data, just frames:1 so it never advances
function setAnimMode(m) {
  animMode = m;
  refreshAnimModeUI();
  drawAnimStage();
}

function refreshAnimModeUI() {
  document.getElementById('animMode-anim').classList.toggle('active', animMode === 'anim');
  document.getElementById('animMode-static').classList.toggle('active', animMode === 'static');
  document.getElementById('animFrameStep').style.display = animMode === 'static' ? 'inline-flex' : 'none';
  updateStaticFrameLabel();
}

function updateStaticFrameLabel() {
  if (!animSel) return;
  document.getElementById('animFrameLabel').textContent = (staticFrame + 1) + ' / ' + animSel.frames;
}

function stepStaticFrame(dir) {
  if (!animSel) return;
  staticFrame = (staticFrame + dir + animSel.frames) % animSel.frames;
  updateStaticFrameLabel();
  drawAnimStage();
}

function drawAnimStage() {
  if (!animSel) return;
  const d = animSel, im = stripImg(d.src);
  const W = animCanvasEl.width, H = animCanvasEl.height;
  animCtx.clearRect(0, 0, W, H);
  if (im.complete && im.naturalWidth) {
    const idx = animMode === 'static'
      ? Math.min(staticFrame, d.frames - 1)
      : Math.floor(performance.now() / d.ms) % d.frames;
    animCtx.imageSmoothingEnabled = false;
    animCtx.drawImage(im, idx * d.w, 0, d.w, d.h, 0, 0, W, H);
  }
  if (!animPick) return;
  const px = animPick.x * animScale, py = animPick.y * animScale;
  const pw = animPick.w * animScale, ph = animPick.h * animScale;
  if (px || py || pw !== W || ph !== H) {   // dim everything outside the crop
    animCtx.fillStyle = 'rgba(0,0,0,0.55)';
    animCtx.fillRect(0, 0, W, py);
    animCtx.fillRect(0, py + ph, W, H - py - ph);
    animCtx.fillRect(0, py, px, ph);
    animCtx.fillRect(px + pw, py, W - px - pw, ph);
  }
  animCtx.strokeStyle = typeof CANVAS_THEME !== 'undefined' ? CANVAS_THEME.accent : '#c8a84b';
  animCtx.lineWidth = 2;
  animCtx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
}

function animTileAt(e) {
  const r = animCanvasEl.getBoundingClientRect();
  const px = SHEET_TILE * animScale;
  return {
    tx: Math.max(0, Math.min(animSel.w / 16 - 1, Math.floor((e.clientX - r.left) / px))),
    ty: Math.max(0, Math.min(animSel.h / 16 - 1, Math.floor((e.clientY - r.top) / px))),
  };
}
function animApplyDrag(b) {
  const a = animDragStart;
  animPick = {
    x: Math.min(a.tx, b.tx) * 16, y: Math.min(a.ty, b.ty) * 16,
    w: (Math.abs(a.tx - b.tx) + 1) * 16, h: (Math.abs(a.ty - b.ty) + 1) * 16,
  };
  animUpdateSel();
  drawAnimStage();
}
animCanvasEl.addEventListener('mousedown', e => {
  if (!animSel) return;
  e.preventDefault();
  animDragStart = animTileAt(e);
  animApplyDrag(animDragStart);
});
animCanvasEl.addEventListener('mousemove', e => {
  if (animDragStart) animApplyDrag(animTileAt(e));
});
window.addEventListener('mouseup', () => { animDragStart = null; });

// Keep the animated preview moving while the picker shows it
setInterval(() => {
  if (tsOverlay.classList.contains('open') && tsSheet === 'animated') drawAnimStage();
}, 60);

// ── Custom tab ────────────────────────────────────────────────────────────────
// Images uploaded from the picker, plus ones added to the repo by hand, live
// in assets/custom/ and are listed in assets/custom/manifest.json
// ({items:[{file, name}]}). Picking one opens it like a sheet — drag to take
// all or part of it. Uploads commit straight to the GitHub repo (same token
// Map Studio's My Maps uses, kept in this browser's localStorage), so they
// show up for everyone once the site redeploys; until then this browser shows
// them from memory so they're usable right away.
const CUSTOM_DIR = 'assets/custom';
const TS_GH = { owner: 'mbuhadi', repo: 'Puzzle_Game', branch: 'main' };
let customItems = null;      // [{file, name, path}] once loaded
let customSel = null;        // item currently open for selecting
const customLocal = {};      // path → data: URL for images uploaded this session

function customSrc(it) { return customLocal[it.path] || it.path; }

async function customLoad(force) {
  if (customItems && !force) return customItems;
  const tries = [
    CUSTOM_DIR + '/manifest.json',
    `https://raw.githubusercontent.com/${TS_GH.owner}/${TS_GH.repo}/${TS_GH.branch}/${CUSTOM_DIR}/manifest.json`,
  ];
  let data = null;
  for (const url of tries) {
    try {
      const r = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { data = await r.json(); break; }
    } catch (e) { /* try the next source */ }
  }
  const seen = new Set((customItems || []).map(i => i.file));
  const list = ((data && data.items) || []).map(i => ({ ...i, path: CUSTOM_DIR + '/' + i.file }));
  // keep this session's uploads even if the deployed manifest doesn't have them yet
  for (const it of customItems || [])
    if (customLocal[it.path] && !list.some(i => i.file === it.file)) list.push(it);
  customItems = list;
  return customItems;
}

function customStatus(msg, ok) {
  const el = document.getElementById('customStatus');
  el.textContent = msg || '';
  el.style.color = ok ? '#4a9a60' : ok === false ? '#cc7070' : '';
}

async function tsCustomShowGallery() {
  customSel = null;
  tsPick = null;
  tsRect.style.display = 'none';
  tsScroll.classList.add('custom-mode');
  document.getElementById('tsCustomBack').style.display = 'none';
  document.getElementById('tsSel').textContent = 'no selection';
  document.getElementById('tsUseBtn').disabled = true;
  const grid = document.getElementById('customGrid');
  if (!customItems) grid.innerHTML = '<div class="hint-text">loading…</div>';
  const items = await customLoad();
  if (tsSheet !== 'custom' || customSel) return;   // user moved on while loading
  grid.innerHTML = '';
  if (!items.length) {
    grid.innerHTML = '<div class="hint-text">no custom images yet — upload some, or ask for new ones to be made</div>';
    return;
  }
  for (const it of items) {
    const el = document.createElement('div');
    el.className = 'custom-item';
    el.title = it.name;
    const img = document.createElement('img');
    img.src = customSrc(it); img.alt = it.name; img.draggable = false;
    const nm = document.createElement('span');
    nm.textContent = it.name;
    el.append(img, nm);
    el.onclick = () => tsCustomOpen(it);
    grid.appendChild(el);
  }
}

// Open one custom image in the normal sheet view, whole image preselected
function tsCustomOpen(it) {
  customSel = it;
  tsScroll.classList.remove('custom-mode');
  document.getElementById('tsCustomBack').style.display = '';
  tsScroll.scrollTop = 0; tsScroll.scrollLeft = 0;
  const pickAll = () => {
    // Pixel-art sized images open at 2× like the sheets; anything bigger is
    // zoomed out to fit the view (the zoom buttons step back up to 1×–8×)
    const nw = tsImgEl.naturalWidth, nh = tsImgEl.naturalHeight;
    const fit = Math.min(tsScroll.clientWidth / nw, tsScroll.clientHeight / nh);
    tsZoom = fit >= 2 ? 2 : fit >= 1 ? 1 : Math.max(0.05, fit);
    tsImgEl.style.width = (nw * tsZoom) + 'px';
    document.getElementById('tsZoomLabel').textContent = tsFmtN(tsZoom) + '×';
    tsPick = { sx: 0, sy: 0, sw: nw / SHEET_TILE, sh: nh / SHEET_TILE };
    tsPlaceRect();
  };
  tsImgEl.addEventListener('load', pickAll, { once: true });
  tsImgEl.src = customSrc(it);
  if (tsImgEl.complete && tsImgEl.naturalWidth) {   // cached — load may not fire
    tsImgEl.removeEventListener('load', pickAll);
    pickAll();
  }
}

// ── Uploading ─────────────────────────────────────────────────────────────────
function tsGhToken() { return localStorage.getItem('ghToken') || ''; }
function tsGhApi(path) {
  return `https://api.github.com/repos/${TS_GH.owner}/${TS_GH.repo}/contents/${path}`;
}
function tsGhHeaders() {
  return { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + tsGhToken() };
}
async function tsGhFail(r) {
  let m = r.statusText || ('HTTP ' + r.status);
  try { m = (await r.json()).message || m; } catch (e) {}
  return new Error(m);
}
function tsReadDataUrl(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
}

document.getElementById('customFile').addEventListener('change', async e => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length) return;
  if (!tsGhToken()) {
    const t = (prompt('Uploading saves the images to the website (GitHub repo).\n' +
      'Paste your GitHub token — the same one Map Studio → My Maps uses:') || '').trim();
    if (!t) { customStatus('upload cancelled — no token', false); return; }
    localStorage.setItem('ghToken', t);
  }
  try {
    // Read the manifest through the API (not the deployed site) so the sha and
    // list are current even if an upload a minute ago hasn't deployed yet
    let manifest = { items: [] }, mSha = null;
    const mr = await fetch(tsGhApi(CUSTOM_DIR + '/manifest.json') + '?ref=' + TS_GH.branch,
                           { headers: tsGhHeaders(), cache: 'no-store' });
    if (mr.ok) {
      const j = await mr.json();
      mSha = j.sha;
      manifest = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\s/g, '')))));
      if (!Array.isArray(manifest.items)) manifest.items = [];
    } else if (mr.status !== 404) throw await tsGhFail(mr);

    const taken = new Set(manifest.items.map(i => i.file));
    const added = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      customStatus(`uploading ${i + 1} / ${files.length}…`, true);
      const ext = (f.name.match(/\.(png|gif|webp|jpe?g)$/i) || ['.png'])[0].toLowerCase();
      const base = f.name.replace(/\.[^.]+$/, '');
      const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
      let file = slug + ext;
      for (let n = 2; taken.has(file); n++) file = `${slug}-${n}${ext}`;
      taken.add(file);
      const dataUrl = await tsReadDataUrl(f);
      const r = await fetch(tsGhApi(CUSTOM_DIR + '/' + file), {
        method: 'PUT', headers: tsGhHeaders(),
        body: JSON.stringify({ message: `Add custom image "${base}" from the tileset picker`,
                               content: dataUrl.split(',')[1], branch: TS_GH.branch }),
      });
      if (!r.ok) throw await tsGhFail(r);
      const it = { file, name: base };
      manifest.items.push(it);
      added.push({ ...it, path: CUSTOM_DIR + '/' + file, dataUrl });
    }

    customStatus('updating the custom list…', true);
    const body = { message: `Add ${added.length} custom image${added.length > 1 ? 's' : ''} to the tileset picker`,
                   content: btoa(unescape(encodeURIComponent(JSON.stringify(manifest, null, 2) + '\n'))),
                   branch: TS_GH.branch };
    if (mSha) body.sha = mSha;
    const wr = await fetch(tsGhApi(CUSTOM_DIR + '/manifest.json'),
                           { method: 'PUT', headers: tsGhHeaders(), body: JSON.stringify(body) });
    if (!wr.ok) throw await tsGhFail(wr);

    // Usable immediately: the page (and Map Studio's canvas, via stripImg)
    // draws them from memory until the site redeploys with the real files
    customItems = customItems || [];
    for (const a of added) {
      customLocal[a.path] = a.dataUrl;
      const im = new Image(); im.src = a.dataUrl; ANIM_STRIPS[a.path] = im;
      customItems.push({ file: a.file, name: a.name, path: a.path });
    }
    customStatus(`uploaded ${added.length} ✓`, true);
    if (tsSheet === 'custom' && !customSel) tsCustomShowGallery();
  } catch (err) {
    if (/bad credentials|not accessible|401|403/i.test(err.message)) localStorage.removeItem('ghToken');
    customStatus('upload failed: ' + err.message, false);
  }
});
