/* Tile thumbnails — shared by Thumbnail Studio (makes them), the Puzzle
   Guide (shows them) and Blueprint Studio (puts them on tiles).

   A thumbnail is a static picture for one puzzle / given chunk (p1p1, p3g6…),
   built from the same tileset sprites as Map Studio. Every thumbnail has the
   same size: TH.W × TH.H pixels (TH.COLS × TH.ROWS cells of 16px).

   Saved as thumbnails/<chunk>.json:
     { version: 1, bg: '#rrggbb', items: [ { pick, x, y, w, h } … ], text? }
   where pick is a tileset-picker pick (sheet / image / anim — animations use
   their first frame) and x, y, w, h are in thumbnail pixels, back to front.
   text (optional) is written across the middle — used by placeholder
   thumbnails until a real one is made.
   A picture of your own is an image pick with smooth: true (drawn smoothly,
   not as pixel art), its file in puzzle_images/thumb-<chunk>-….webp. Until
   it's saved its src is a data: URL; save() uploads it then. */
const TH = (() => {
  const CELL = 16, COLS = 16, ROWS = 12, W = COLS * CELL, H = ROWS * CELL;
  const GH = { owner: 'mbuhadi', repo: 'Puzzle_Game', branch: 'main', dir: 'thumbnails' };
  const SHEET_SRC = {
    interiors: 'assets/Interiors_16x16.png',
    retro: 'assets/Retro_Interior_16x16.png',
    exteriors: 'assets/Exteriors_16x16.png',
  };

  const RAW = `https://raw.githubusercontent.com/mbuhadi/Puzzle_Game/main/`;
  const imgCache = new Map();
  function img(src) {
    if (!imgCache.has(src)) {
      const im = new Image();
      // a picture saved a moment ago isn't on the site yet: fetch it from GitHub
      // directly, and only give up ('giveup') if that fails too
      if (/^puzzle_images\//.test(src)) {
        im.dataset.fallback = 1;
        im.addEventListener('error', () => {
          if (!im.dataset.raw) { im.dataset.raw = 1; im.crossOrigin = 'anonymous'; im.src = RAW + src; }
          else im.dispatchEvent(new Event('giveup'));
        });
      }
      im.src = src;
      imgCache.set(src, im);
    }
    return imgCache.get(src);
  }
  const loaded = im => im.complete && im.naturalWidth
    ? Promise.resolve(im)
    : new Promise(res => {
      im.addEventListener('load', () => res(im), { once: true });
      im.addEventListener(im.dataset.fallback ? 'giveup' : 'error', () => res(null), { once: true });
    });

  // Where a pick's pixels come from: { src, x, y, w, h } (first frame for animations)
  function source(pick) {
    if (!pick) return null;
    if (pick.kind === 'sheet') {
      return { src: SHEET_SRC[pick.sheet], x: pick.sx * CELL, y: pick.sy * CELL, w: pick.sw * CELL, h: pick.sh * CELL };
    }
    if (pick.kind === 'anim') { const a = pick.anim; return { src: a.src, x: a.x, y: a.y, w: a.w, h: a.h }; }
    return { src: pick.src, x: pick.x, y: pick.y, w: pick.w, h: pick.h };   // an image (incl. your own pictures)
  }

  function normalize(d) {
    d = d || {};
    return {
      version: 1,
      bg: /^#[0-9a-f]{6}$/i.test(d.bg || '') ? d.bg : '#2a2620',
      ...(d.text ? { text: String(d.text) } : {}),
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
      g.imageSmoothingEnabled = !!it.pick.smooth;   // pictures smooth, tileset sprites crisp
      if (im.complete && im.naturalWidth) g.drawImage(im, s.x, s.y, s.w, s.h, it.x, it.y, it.w, it.h);
    }
    g.imageSmoothingEnabled = false;
    if (d.text) {
      g.fillStyle = '#e8dfc8'; g.font = 'bold 30px monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(d.text, W / 2, H / 2, W - 16);
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

  // A picture file as a thumbnail item filling the whole thumbnail (cropped to
  // fit, like a cover photo), kept at twice the thumbnail's size for sharpness
  async function pictureItem(file) {
    const bmp = await createImageBitmap(file);
    const PW = W * 2, PH = H * 2, k = Math.max(PW / bmp.width, PH / bmp.height);
    const sw = PW / k, sh = PH / k;
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, PW, PH);
    return { pick: { kind: 'image', src: c.toDataURL('image/webp', .9), x: 0, y: 0, w: PW, h: PH, smooth: true }, x: 0, y: 0, w: W, h: H };
  }
  const isOwnPicture = src => /^puzzle_images\/thumb-/.test(src || '');
  async function putFile(path, b64, message, sha) {
    const body = { message, branch: GH.branch, content: b64 };
    if (sha) body.sha = sha;
    const w = await fetch(api(path), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
    if (!w.ok) { let m = w.statusText; try { m = (await w.json()).message || m; } catch (e) {} throw new Error(m); }
  }

  // Saving uploads any new pictures (data: URLs) first, and afterwards deletes
  // this thumbnail's earlier pictures it no longer uses, so puzzle_images/
  // only holds pictures in use
  async function save(id, d) {
    if (!token()) throw new Error('no GitHub token');
    d = normalize(d);
    const before = (recent(id) || (cache.get(id) || {}).data || (await fetchData(id)) || { items: [] }).items.map(it => it.pick.src);
    let n = 0;
    for (const it of d.items) {
      const m = /^data:image\/(\w+);base64,(.*)$/.exec(it.pick.src || '');
      if (!m) continue;
      const path = `puzzle_images/thumb-${id}-${Date.now()}${n++}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
      await putFile(path, m[2], `Add thumbnail picture for ${id}`);
      img(path);   // start fetching it now
      it.pick.src = path;
    }
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
    const now = new Set(d.items.map(it => it.pick.src));
    for (const src of new Set(before)) {
      if (!isOwnPicture(src) || now.has(src)) continue;
      try {
        const r = await fetch(api(src) + '?ref=' + GH.branch, { headers: headers(), cache: 'no-store' });
        if (r.ok) await fetch(api(src), { method: 'DELETE', headers: headers(), body: JSON.stringify({ message: `Delete unused thumbnail picture ${src}`, branch: GH.branch, sha: (await r.json()).sha }) });
      } catch (e) { /* a leftover file is harmless */ }
    }
    return d;
  }

  return { CELL, COLS, ROWS, W, H, source, img, normalize, paint, render, darkGrey, load, get, forget, save, pictureItem };
})();
