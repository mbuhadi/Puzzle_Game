/* Tile thumbnails — shared by Thumbnail Studio (makes them), the Puzzle
   Guide (shows them) and Blueprint Studio (puts them on tiles).

   A thumbnail is a static picture for one puzzle / given chunk (p1p1, p3g6…),
   built from the same tileset sprites as Map Studio. Every thumbnail has the
   same size: TH.W × TH.H pixels (TH.COLS × TH.ROWS cells of 16px).

   Saved as thumbnails/<chunk>.json:
     { version: 1, bg: '#rrggbb', items: [ { pick, x, y, w, h } … ] }
   where pick is a tileset-picker pick (sheet / image / anim — animations use
   their first frame) and x, y, w, h are in thumbnail pixels, back to front. */
const TH = (() => {
  const CELL = 16, COLS = 16, ROWS = 12, W = COLS * CELL, H = ROWS * CELL;
  const GH = { owner: 'mbuhadi', repo: 'Puzzle_Game', branch: 'main', dir: 'thumbnails' };
  const SHEET_SRC = {
    interiors: 'assets/Interiors_16x16.png',
    retro: 'assets/Retro_Interior_16x16.png',
    exteriors: 'assets/Exteriors_16x16.png',
  };

  const imgCache = new Map();
  function img(src) {
    if (!imgCache.has(src)) {
      const im = new Image();
      im.src = src;
      imgCache.set(src, im);
    }
    return imgCache.get(src);
  }
  const loaded = im => im.complete && im.naturalWidth
    ? Promise.resolve(im)
    : new Promise(res => { im.addEventListener('load', () => res(im), { once: true }); im.addEventListener('error', () => res(null), { once: true }); });

  // Where a pick's pixels come from: { src, x, y, w, h } (first frame for animations)
  function source(pick) {
    if (!pick) return null;
    if (pick.kind === 'sheet') {
      return { src: SHEET_SRC[pick.sheet], x: pick.sx * CELL, y: pick.sy * CELL, w: pick.sw * CELL, h: pick.sh * CELL };
    }
    if (pick.kind === 'anim') { const a = pick.anim; return { src: a.src, x: a.x, y: a.y, w: a.w, h: a.h }; }
    return { src: pick.src, x: pick.x, y: pick.y, w: pick.w, h: pick.h };
  }

  function normalize(d) {
    d = d || {};
    return {
      version: 1,
      bg: /^#[0-9a-f]{6}$/i.test(d.bg || '') ? d.bg : '#2a2620',
      items: (d.items || []).filter(it => it && it.pick && source(it.pick))
        .map(it => ({ pick: it.pick, x: +it.x || 0, y: +it.y || 0, w: +it.w || CELL, h: +it.h || CELL })),
    };
  }

  // Draw a thumbnail onto context g at (0,0), W × H. Images that haven't
  // loaded yet are skipped — use render() to wait for them.
  function paint(g, d) {
    g.save();
    g.imageSmoothingEnabled = false;
    g.fillStyle = d.bg;
    g.fillRect(0, 0, W, H);
    for (const it of d.items) {
      const s = source(it.pick), im = img(s.src);
      if (im.complete && im.naturalWidth) g.drawImage(im, s.x, s.y, s.w, s.h, it.x, it.y, it.w, it.h);
    }
    g.restore();
  }

  // A W × H canvas of the thumbnail, once all its images have loaded
  async function render(d) {
    d = normalize(d);
    await Promise.all(d.items.map(it => loaded(img(source(it.pick).src))));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    paint(c.getContext('2d'), d);
    return c;
  }

  // Dark greyscale copy (solved / locked tiles)
  function darkGrey(c, k = .42) {
    const o = document.createElement('canvas');
    o.width = c.width; o.height = c.height;
    const g = o.getContext('2d');
    g.drawImage(c, 0, 0);
    const id = g.getImageData(0, 0, o.width, o.height), p = id.data;
    for (let i = 0; i < p.length; i += 4) {
      const l = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) * k;
      p[i] = p[i + 1] = p[i + 2] = l;
    }
    g.putImageData(id, 0, 0);
    return o;
  }

  const token = () => { try { return localStorage.getItem('ghToken') || ''; } catch (e) { return ''; } };
  const api = path => `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}`;
  const headers = () => {
    const h = { Accept: 'application/vnd.github+json' };
    if (token()) h.Authorization = 'Bearer ' + token();
    return h;
  };
  const fileOf = id => `${GH.dir}/${id}.json`;

  // The saved thumbnail for a chunk, or null. Reading never uses the GitHub
  // API (it allows only 60 requests an hour without a token): a copy this
  // browser saved in the last few minutes (the site takes a minute or two to
  // catch up), else the site itself, else GitHub's plain-file address.
  const RECENT_MS = 10 * 60 * 1000;
  const recentKey = id => 'thumbSaved:' + id;
  function recent(id) {
    try {
      const j = JSON.parse(localStorage.getItem(recentKey(id)) || 'null');
      return j && Date.now() - j.at < RECENT_MS ? j.data : null;
    } catch (e) { return null; }
  }
  async function fetchData(id) {
    const mine = recent(id);
    if (mine) return normalize(mine);
    for (const url of [fileOf(id), `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/${fileOf(id)}`]) {
      try {
        const r = await fetch(url, { cache: 'no-cache' });
        if (r.ok) return normalize(await r.json());
      } catch (e) { /* try the next one */ }
    }
    return null;
  }

  // Cache: id → { promise, data, canvas, grey } (canvas null = no thumbnail)
  const cache = new Map();
  function load(id) {
    if (!id) return Promise.resolve(null);
    if (!cache.has(id)) {
      const e = { data: null, canvas: null, grey: null, ready: false };
      e.promise = fetchData(id).then(async d => {
        e.data = d;
        if (d) { e.canvas = await render(d); e.grey = darkGrey(e.canvas); }
        e.ready = true;
        return e;
      });
      cache.set(id, e);
    }
    return cache.get(id).promise;
  }
  // Synchronous: the cached entry if it has finished loading, else null
  function get(id) { const e = cache.get(id); return e && e.ready ? e : null; }
  function forget(id) { cache.delete(id); }

  async function save(id, d) {
    if (!token()) throw new Error('no GitHub token');
    d = normalize(d);
    const path = fileOf(id);
    let sha = null;
    const r = await fetch(api(path) + '?ref=' + GH.branch, { headers: headers(), cache: 'no-store' });
    if (r.ok) sha = (await r.json()).sha;
    const body = { message: `Save thumbnail ${id}`, branch: GH.branch,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(d, null, 1) + '\n'))) };
    if (sha) body.sha = sha;
    const w = await fetch(api(path), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
    if (!w.ok) { let m = w.statusText; try { m = (await w.json()).message || m; } catch (e) {} throw new Error(m); }
    try { localStorage.setItem(recentKey(id), JSON.stringify({ at: Date.now(), data: d })); } catch (e) {}
    forget(id);
  }

  return { CELL, COLS, ROWS, W, H, source, img, normalize, paint, render, darkGrey, load, get, forget, save };
})();
