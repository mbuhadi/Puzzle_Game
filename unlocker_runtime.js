/* Constant unlocker engine — shared by unlocker-studio.html (design) and
   blueprint-studio.html (attach to a blueprint, play/test).

   A design (unlockers/<slug>.json, wrapped as {updated, data}) looks like:
   {
     version: 1, name, w, h,            // stage size in design units
     bg: 'unlocker_assets/x.png' | '',  // background picture (cropped upload)
     bgColor: '#1e1a12',
     icon: 'unlocker_assets/y.png' | '',// small corner icon in play mode
     arrowImg: '' | path,               // an UP-pointing arrow picture; rotated
                                        // automatically for down/left/right
     arrowColor: '#ffffff',
     submit: { x, y, w, h, label, img, color },
     dials: [{ id, x, y, w, h, orient: 'v'|'h',
               symbols: [{ t: '7' } | { img: path }],
               color, font: 'serif'|'mono'|'sans', box: 'none'|'dark'|'light' }]
   }
   A code is an array with one symbol index per dial. Pictures live in the repo
   as unlocker_assets/*.png; until GitHub Pages has published a freshly
   uploaded file, it is fetched through the GitHub API instead. */
const UL = (() => {
  const OWNER = 'mbuhadi', REPO = 'Puzzle_Game';
  const PRESETS = {
    digits: '0123456789'.split(''),
    binary: ['0', '1'],
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    shapes: ['●', '▲', '■', '◆', '★', '♥', '✚', '☾'],
  };
  const FONTS = { serif: "'Cinzel', Georgia, serif", mono: 'ui-monospace, Menlo, Consolas, monospace', sans: 'system-ui, sans-serif' };

  function token() { try { return localStorage.getItem('ghToken') || ''; } catch (e) { return ''; } }
  function apiUrl(path) { return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`; }
  async function raw(path) {
    const h = { Accept: 'application/vnd.github.raw' };
    if (token()) h.Authorization = 'Bearer ' + token();
    const r = await fetch(apiUrl(path), { headers: h, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  }

  // Picture loading: site path first, GitHub API as a fallback
  const srcCache = new Map();
  function prime(path, url) { srcCache.set(path, url); }
  function setImg(img, path) {
    if (!path) { img.removeAttribute('src'); return; }
    if (srcCache.has(path)) { img.src = srcCache.get(path); return; }
    if (/^(data|blob):/.test(path)) { img.src = path; return; }
    img.onerror = async () => {
      img.onerror = null;
      try {
        const u = URL.createObjectURL(await (await raw(path)).blob());
        srcCache.set(path, u);
        img.src = u;
      } catch (e) { /* leave it broken */ }
    };
    img.src = encodeURI(path);
  }

  async function listDesigns() {
    const h = { Accept: 'application/vnd.github+json' };
    if (token()) h.Authorization = 'Bearer ' + token();
    const r = await fetch(apiUrl('unlockers'), { headers: h, cache: 'no-store' });
    if (r.status === 404) return [];
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()).filter(f => f.type === 'file' && f.name.endsWith('.json')).map(f => f.name.replace(/\.json$/, ''));
  }
  async function loadDesign(slug) {
    const parsed = await (await raw('unlockers/' + slug + '.json')).json();
    return normalize(parsed.data || parsed);
  }
  function normalize(d) {
    d = Object.assign({ version: 1, name: 'Unlocker', w: 600, h: 400, bg: '', bgColor: '#1e1a12', icon: '',
      arrowImg: '', arrowColor: '#ffffff', dials: [] }, d || {});
    d.submit = Object.assign({ x: d.w / 2 - 70, y: d.h - 70, w: 140, h: 48, label: 'SUBMIT', img: '', color: '#c8a84b' }, d.submit || {});
    d.dials = (d.dials || []).map((x, i) => Object.assign({ id: 'd' + (i + 1), x: 40, y: 40, w: 90, h: 180, orient: 'v',
      symbols: PRESETS.digits.map(t => ({ t })), color: '#ffffff', font: 'serif', box: 'dark' }, x));
    return d;
  }
  function symbolText(s) { return s ? (s.img ? '▣' : s.t) : '?'; }
  function codeText(design, code) {
    return (code || []).map((v, i) => symbolText((design.dials[i] || { symbols: [] }).symbols[v])).join(' · ');
  }
  const sameCode = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  let cssDone = false;
  function injectCSS() {
    if (cssDone) return;
    cssDone = true;
    const st = document.createElement('style');
    st.textContent = `
.ul-stage { position: relative; width: 100%; overflow: hidden; border-radius: 10px; user-select: none; -webkit-user-select: none; }
.ul-stage.ul-shake { animation: ulShake .35s; }
@keyframes ulShake { 0%,100% { transform: translateX(0) } 15% { transform: translateX(-9px) } 30% { transform: translateX(8px) }
  45% { transform: translateX(-6px) } 60% { transform: translateX(5px) } 75% { transform: translateX(-3px) } }
.ul-stage.ul-ok { animation: ulOk .5s; }
@keyframes ulOk { 0% { filter: brightness(1) } 40% { filter: brightness(1.6) drop-shadow(0 0 12px #9f9) } 100% { filter: brightness(1) } }
.ul-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
.ul-dial { position: absolute; display: flex; align-items: stretch; border-radius: 6px; overflow: hidden; }
.ul-dial.v { flex-direction: column; }
.ul-dial.box-dark { background: rgba(0,0,0,.45); box-shadow: inset 0 0 0 1px rgba(255,255,255,.15); }
.ul-dial.box-light { background: rgba(255,255,255,.75); box-shadow: inset 0 0 0 1px rgba(0,0,0,.2); }
.ul-arrow { flex: 0 0 26%; display: flex; align-items: center; justify-content: center; background: none; border: none;
  padding: 0; margin: 0; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.ul-arrow:active { filter: brightness(1.5); transform: scale(.92); }
.ul-arrow svg, .ul-arrow img { width: 70%; height: 70%; object-fit: contain; pointer-events: none; }
.ul-sym { flex: 1; container-type: size; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.ul-sym span { font-size: min(72cqh, 72cqw); line-height: 1; white-space: nowrap; }
.ul-sym img { width: 86%; height: 86%; object-fit: contain; pointer-events: none; }
.ul-submit { position: absolute; container-type: size; display: flex; align-items: center; justify-content: center; border-radius: 6px;
  cursor: pointer; padding: 0; border: 1px solid; background: rgba(0,0,0,.55); touch-action: manipulation; font-family: 'Cinzel', serif; }
.ul-submit.img { background: none; border: none; }
.ul-submit span { font-size: min(42cqh, 16cqw); letter-spacing: .1em; white-space: nowrap; }
.ul-submit img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.ul-submit:active { transform: scale(.96); filter: brightness(1.3); }
.ul-static .ul-arrow, .ul-static .ul-submit { pointer-events: none; }`;
    document.head.appendChild(st);
  }
  const pct = (v, of) => (v / of * 100) + '%';
  function arrowEl(design, dir, color) {
    const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
    if (design.arrowImg) {
      const im = document.createElement('img');
      setImg(im, design.arrowImg);
      im.style.transform = `rotate(${rot}deg)`;
      return im;
    }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.style.transform = `rotate(${rot}deg)`;
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M10 4 L17 15 L3 15 Z');
    p.setAttribute('fill', color || '#fff');
    p.setAttribute('opacity', '.9');
    svg.appendChild(p);
    return svg;
  }

  // Render a design into host. opts: { code, onSubmit(code), onChange(code),
  // submitLabel (overrides the design's), static (no interaction, for the editor) }
  // Returns { getCode, setCode, shake, flashOk, el }.
  function render(host, design, opts = {}) {
    injectCSS();
    design = normalize(design);
    host.innerHTML = '';
    const stage = document.createElement('div');
    stage.className = 'ul-stage' + (opts.static ? ' ul-static' : '');
    stage.style.aspectRatio = `${design.w} / ${design.h}`;
    stage.style.background = design.bgColor;
    if (design.bg) { const bg = document.createElement('img'); bg.className = 'ul-bg'; setImg(bg, design.bg); stage.appendChild(bg); }
    const code = design.dials.map((d, i) => Math.min((opts.code || [])[i] || 0, Math.max(0, d.symbols.length - 1)));
    const symEls = [];
    function paint(i) {
      const d = design.dials[i], s = d.symbols[code[i]], el = symEls[i];
      el.innerHTML = '';
      if (!s) return;
      if (s.img) { const im = document.createElement('img'); setImg(im, s.img); el.appendChild(im); }
      else { const sp = document.createElement('span'); sp.textContent = s.t; sp.style.color = d.color; sp.style.fontFamily = FONTS[d.font] || FONTS.serif; el.appendChild(sp); }
    }
    design.dials.forEach((d, i) => {
      const el = document.createElement('div');
      el.className = `ul-dial ${d.orient === 'h' ? 'h' : 'v'} box-${d.box}`;
      Object.assign(el.style, { left: pct(d.x, design.w), top: pct(d.y, design.h), width: pct(d.w, design.w), height: pct(d.h, design.h) });
      const step = k => () => {
        const n = d.symbols.length || 1;
        code[i] = (code[i] + k + n) % n;
        paint(i);
        opts.onChange && opts.onChange(code.slice());
      };
      const mk = (dir, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ul-arrow';
        b.setAttribute('aria-label', k > 0 ? 'next' : 'previous');
        b.appendChild(arrowEl(design, dir, d.box === 'light' ? '#222' : design.arrowColor));
        b.onclick = step(k);
        return b;
      };
      const sym = document.createElement('div');
      sym.className = 'ul-sym';
      symEls[i] = sym;
      // Up / right moves forward through the symbols; down / left goes back
      if (d.orient === 'h') el.append(mk('left', -1), sym, mk('right', 1));
      else el.append(mk('up', 1), sym, mk('down', -1));
      stage.appendChild(el);
      paint(i);
    });
    const sb = design.submit;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ul-submit' + (sb.img ? ' img' : '');
    Object.assign(btn.style, { left: pct(sb.x, design.w), top: pct(sb.y, design.h), width: pct(sb.w, design.w), height: pct(sb.h, design.h) });
    if (sb.img && !opts.submitLabel) { const im = document.createElement('img'); setImg(im, sb.img); btn.appendChild(im); }
    else {
      const sp = document.createElement('span');
      sp.textContent = opts.submitLabel || sb.label || 'SUBMIT';
      btn.style.color = sb.color; btn.style.borderColor = sb.color;
      btn.appendChild(sp);
    }
    btn.onclick = () => opts.onSubmit && opts.onSubmit(code.slice());
    stage.appendChild(btn);
    host.appendChild(stage);
    function replay(cls) { stage.classList.remove(cls); void stage.offsetWidth; stage.classList.add(cls); }
    return {
      el: stage,
      getCode: () => code.slice(),
      setCode(c) { c.forEach((v, i) => { if (i < code.length) { code[i] = v; paint(i); } }); },
      shake: () => replay('ul-shake'),
      flashOk: () => replay('ul-ok'),
    };
  }

  return { PRESETS, FONTS, render, normalize, listDesigns, loadDesign, setImg, prime, codeText, symbolText, sameCode, raw };
})();
