/* ═══════════════ Custom paintable tile textures (16×16 pixel art) ═══════════════
   Shared source of truth for map-editor.html (authoring) and maps.html (the game
   runtime) — a painted map's grid is just integers, so tile index N must mean the
   exact same texture on both sides. Indices 0-8 stay the original flat-colour
   tiles (T.VOID..T.RUG, defined locally in each page, unchanged). This file adds
   39 more starting at index 9: 19 floor, 10 wall, 10 water. Every texture is
   generated procedurally (no image assets) so the editor and the game always
   agree on exactly what a tile looks like.
   Index stability matters here — saved maps store raw tile-index integers, so
   an entry's position in its array must never change once shipped. The old
   checkerboard floor tile was retired by overwriting its slot in place (same
   index, new pattern) rather than deleting it, which would have shifted every
   tile after it. New tiles always get appended, never inserted mid-array. */
const CUSTOM_TILE_BASE_INDEX = 9;

(function () {

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

// Deterministic per-pixel hash noise in [0,1) — same result every time it's
// built, so the editor and the game always render identical textures.
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2654435761) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967295;
}

// Mottles every pixel of `base` by up to ±amt — cheap organic texture for
// stone, sand, dirt, wood and water without hand-placing pixels.
function noiseShade(ctx, base, seed, amt) {
  const [r, g, b] = hexToRgb(base);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const d = (hash(x, y, seed) - 0.5) * 2 * amt;
      px(ctx, x, y, rgbToHex(r + d, g + d, b + d));
    }
}

// Scatters pixels of `color` wherever the hash falls under `density`.
function speckle(ctx, seed, density, color, alpha) {
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      if (hash(x, y, seed) < density) px(ctx, x, y, color);
  ctx.globalAlpha = 1;
}

// A short straight stroke, `len` px long, stepping (dx,dy) each pixel — used
// for marble/ice veins and water sheen streaks.
function diagLine(ctx, x0, y0, len, dx, dy, color, w) {
  w = w || 1;
  for (let i = 0; i < len; i++) {
    const x = x0 + dx * i, y = y0 + dy * i;
    if (x >= 0 && x < 16 && y >= 0 && y < 16) rect(ctx, x, y, w, 1, color);
  }
}

// Running-bond brick/block courses: `bh`-tall rows of `bw`-wide bricks,
// alternate rows offset by half a brick, with a mortar grid and an optional
// 1px highlight along each course's top edge.
function bricks(ctx, opt) {
  const bw = opt.bw, bh = opt.bh, mortar = opt.mortar, highlight = opt.highlight;
  // Every course-top and brick-side line must be drawn even at x=0/y=0 — a
  // tile's top/left edge is exactly where the *next* identical tile's
  // bottom/right edge butts up against it. Skipping the edge (as opposed to
  // only the internal joints) leaves that one seam with no mortar at all,
  // which shows up as a visible break wherever the tile repeats.
  for (let row = 0, y = 0; y < 16; row++, y += bh) {
    const off = (row % 2) ? (bw >> 1) : 0;
    rect(ctx, 0, y, 16, 1, highlight || mortar);
    for (let x = off - bw; x < 16; x += bw) {
      const vx = x + bw;
      if (vx >= 0 && vx < 16) rect(ctx, vx, y, 1, Math.min(bh, 16 - y), mortar);
    }
  }
  for (let y = bh; y < 16; y += bh) rect(ctx, 0, y, 16, 1, mortar);
}

// Plank/panel grain — bands of `bandSize` px (horizontal for a wood floor,
// vertical for a wood-panelled wall) cycling through `colors`, each band
// lightly grained, with a dark seam between bands.
function woodGrain(ctx, colors, bandSize, seed, vertical) {
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const coord = vertical ? x : y;
      const band = Math.floor(coord / bandSize) % colors.length;
      const [r, g, b] = hexToRgb(colors[band]);
      const n = (hash(vertical ? y : x, band, seed) - 0.5) * 14;
      px(ctx, x, y, rgbToHex(r + n, g + n, b + n));
    }
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let c = bandSize; c < 16; c += bandSize) {
    if (vertical) ctx.fillRect(c, 0, 1, 16); else ctx.fillRect(0, c, 16, 1);
  }
}

function buildCanvas(draw) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  draw(c.getContext('2d'));
  return c;
}

// ── Floor (10) — warm, walkable ground; a mix of stone, wood, mosaic, dirt ──
const FLOOR_DEFS = [
  { key: 'FLOOR_SANDSTONE', name: 'Sandstone Flagstone', base: '#c9a86e', draw(ctx) {
      noiseShade(ctx, '#c9a86e', 11, 12);
      rect(ctx, 0, 7, 16, 1, '#8a6f45');
      rect(ctx, 7, 0, 1, 7, '#8a6f45');
      rect(ctx, 7, 8, 1, 8, '#8a6f45');
      rect(ctx, 0, 15, 16, 1, '#6f5836');
      rect(ctx, 15, 0, 1, 16, '#6f5836');
    } },
  { key: 'FLOOR_MARBLE', name: 'Polished Marble', base: '#e6e1d2', draw(ctx) {
      noiseShade(ctx, '#e6e1d2', 22, 7);
      diagLine(ctx, 1, 2, 6, 1, 1, '#b3ab8c');
      diagLine(ctx, 9, 1, 5, 1, 1, '#b3ab8c');
      diagLine(ctx, 3, 9, 7, 1, 0, '#c2bba3');
      diagLine(ctx, 10, 11, 5, 1, 1, '#a99f80');
      diagLine(ctx, 0, 5, 4, 1, -1, '#c2bba3');
    } },
  { key: 'FLOOR_WOOD', name: 'Oak Floor Planks', base: '#a9773f', draw(ctx) {
      woodGrain(ctx, ['#b3823f', '#9c6b34', '#ad7a3d', '#956731'], 4, 31, false);
    } },
  { key: 'FLOOR_STAR8', name: 'Andalusian Star', base: '#f6e3e8', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#f6e3e8');
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          const ox = tx * 8, oy = ty * 8;
          for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++) {
              const cx = x - 3.5, cy = y - 3.5;
              const diamond = Math.abs(cx) + Math.abs(cy) <= 3.5;
              const square = Math.max(Math.abs(cx), Math.abs(cy)) <= 2.5;
              if (diamond || square) px(ctx, ox + x, oy + y, '#d29aac');
            }
          rect(ctx, ox + 3, oy + 3, 2, 2, '#9c6478');
        }
    } },
  { key: 'FLOOR_ZELLIGE', name: 'Zellige Mosaic', base: '#1f7a72', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#e8dcc0');
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          const ox = tx * 8, oy = ty * 8;
          rect(ctx, ox + 2, oy, 4, 8, '#1f7a72');
          rect(ctx, ox, oy + 2, 8, 4, '#1f7a72');
          rect(ctx, ox + 3, oy + 3, 2, 2, '#d4af37');
        }
    } },
  { key: 'FLOOR_HERRINGBONE_BRICK', name: 'Herringbone Brick', base: '#b5502e', draw(ctx) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const bx = x >> 2, by = y >> 2;
          const horiz = (bx + by) % 2 === 0;
          const within = horiz ? (y % 4) : (x % 4);
          px(ctx, x, y, within === 0 ? '#8a381e' : ((bx + by * 3) % 2 === 0 ? '#c05a34' : '#a8492a'));
        }
    } },
  { key: 'FLOOR_DIRT', name: 'Packed Dirt Path', base: '#7a5c3a', draw(ctx) {
      noiseShade(ctx, '#7a5c3a', 33, 16);
      speckle(ctx, 34, 0.06, '#8a8378', 0.9);
      speckle(ctx, 35, 0.10, '#5c4326', 0.6);
    } },
  { key: 'FLOOR_COBBLE', name: 'Cobblestone', base: '#7d8489', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#63696e');
      const stones = [[0,0],[4,0],[9,0],[13,0],[2,4],[6,4],[11,4],[0,8],[4,8],[9,8],[13,8],[2,12],[6,12],[11,12]];
      stones.forEach(([x, y], i) => {
        rect(ctx, x, y, 3, 3, i % 2 === 0 ? '#8a9198' : '#7d8489');
        px(ctx, x, y, '#a4abb1');
      });
    } },
  { key: 'FLOOR_PARQUET', name: 'Parquet Chevron', base: '#b8823f', draw(ctx) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const bx = x >> 2, by = y >> 2;
          const horiz = (bx + by) % 2 === 0;
          const within = horiz ? (y % 4) : (x % 4);
          const light = (bx + by) % 4 < 2;
          px(ctx, x, y, within === 0 ? '#7a5325' : (light ? '#c99a52' : '#a97a3a'));
        }
    } },
  { key: 'FLOOR_DIAMOND', name: 'Diamond Tile', base: '#2f7d6e', draw(ctx) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const cx = (x % 8) - 4, cy = (y % 8) - 4;
          px(ctx, x, y, Math.abs(cx) + Math.abs(cy) <= 4 ? '#2f7d6e' : '#d9c48a');
        }
    } },
];

// ── 9 more floor tiles — mandala rosettes and Arabic/Andalusian geometric
// motifs in soft pastel colourways. A separate array, assembled AFTER wall
// and water below (see CUSTOM_TILE_LIST), so it doesn't push every wall and
// water index up by 9 — those are load-bearing for already-saved maps. ────
const FLOOR_DEFS_MORE = [
  { key: 'FLOOR_ROSETTE', name: 'Sage Mandala Rosette', base: '#e9efe2', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#e9efe2');
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          const ox = tx * 8, oy = ty * 8;
          for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++) {
              const dx = x - 3.5, dy = y - 3.5, d = Math.sqrt(dx*dx + dy*dy);
              const petal = Math.cos(Math.atan2(dy, dx) * 4) * 1.6 + 2.4;
              if (d < petal && d > 0.6) px(ctx, ox + x, oy + y, '#9bb186');
            }
          rect(ctx, ox + 3, oy + 3, 2, 2, '#c9a86e');
        }
    } },
  { key: 'FLOOR_QUATREFOIL', name: 'Lavender Quatrefoil', base: '#f0e8f6', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#f0e8f6');
      const lobes = [[3.5,1.5],[3.5,5.5],[1.5,3.5],[5.5,3.5]];
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          const ox = tx * 8, oy = ty * 8;
          for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++) {
              let inside = false;
              for (const [lx, ly] of lobes) {
                const dx = x - lx, dy = y - ly;
                if (dx*dx + dy*dy <= 3.4) { inside = true; break; }
              }
              if (inside) px(ctx, ox + x, oy + y, '#b89bd4');
            }
          rect(ctx, ox + 3, oy + 3, 2, 2, '#8868a8');
        }
    } },
  { key: 'FLOOR_GIRIH', name: 'Powder Blue Girih', base: '#e2eef4', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#e2eef4');
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const cx = (x % 8) - 3.5, cy = (y % 8) - 3.5;
          const cheb = Math.max(Math.abs(cx), Math.abs(cy));
          const manh = Math.abs(cx) + Math.abs(cy);
          if (cheb <= 3 && manh <= 4.6) px(ctx, x, y, '#9dc3d8');
        }
      for (const [x, y] of [[0,0],[8,0],[0,8],[8,8]]) px(ctx, x, y, '#5f8fa8');
    } },
  { key: 'FLOOR_TRELLIS', name: 'Dusty Rose Trellis', base: '#f5e8e6', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#f5e8e6');
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d1 = (x + y) % 8, d2 = (x - y + 16) % 8;
          if (d1 <= 1 || d2 <= 1) px(ctx, x, y, '#c99590');
        }
      for (const [nx, ny] of [[3,3],[11,3],[3,11],[11,11],[7,7]]) {
        rect(ctx, nx - 1, ny - 1, 3, 3, '#8a5850');
        px(ctx, nx, ny, '#e0b8a8');
      }
    } },
  { key: 'FLOOR_SUNBURST', name: 'Honey Sunburst', base: '#fbf0dc', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#fbf0dc');
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          const ox = tx * 8, oy = ty * 8;
          for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++) {
              const dx = x - 3.5, dy = y - 3.5, d = Math.sqrt(dx*dx + dy*dy);
              const ang = ((Math.atan2(dy, dx) % (Math.PI/4)) + Math.PI/4) % (Math.PI/4);
              const ray = ang < 0.35 || ang > (Math.PI/4 - 0.35);
              if (d < 3.6 && d > 0.8 && ray) px(ctx, ox + x, oy + y, '#d9ab55');
            }
          rect(ctx, ox + 3, oy + 3, 2, 2, '#a87830');
        }
    } },
  { key: 'FLOOR_VINE', name: 'Mint Arabesque Vine', base: '#e6f2ec', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#e6f2ec');
      for (let x = 0; x < 16; x++) {
        const y1 = Math.round(4 + 3 * Math.sin(x / 16 * Math.PI * 2));
        px(ctx, x, y1, '#7cb89c'); px(ctx, x, Math.min(15, y1 + 1), '#7cb89c');
        const y2 = Math.round(12 + 3 * Math.sin((x + 8) / 16 * Math.PI * 2));
        px(ctx, x, y2, '#7cb89c'); px(ctx, x, Math.min(15, y2 + 1), '#7cb89c');
      }
      px(ctx, 2, 4, '#4f8068'); px(ctx, 10, 12, '#4f8068'); px(ctx, 6, 7, '#4f8068');
    } },
  { key: 'FLOOR_MEDALLION', name: 'Sunset Medallion', base: '#fbe6df', draw(ctx) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const cx = (x % 8) - 3.5, cy = (y % 8) - 3.5;
          const d = Math.abs(cx) + Math.abs(cy);
          let c = '#fbe6df';
          if (d < 1.2) c = '#e0855f';
          else if (d < 2.2) c = '#f6c9a8';
          else if (d < 3.2) c = '#f0a880';
          px(ctx, x, y, c);
        }
    } },
  { key: 'FLOOR_INTERLACE', name: 'Periwinkle Interlace', base: '#eaebf7', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#eaebf7');
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d1 = (x + y) % 8, d2 = (x - y + 16) % 8;
          const on1 = d1 >= 1 && d1 <= 2, on2 = d2 >= 1 && d2 <= 2;
          if (on1 && on2) px(ctx, x, y, '#7a82c8');
          else if (on1) px(ctx, x, y, '#9aa0d8');
          else if (on2) px(ctx, x, y, '#b4addf');
        }
    } },
  { key: 'FLOOR_ROSEWATER', name: 'Cream Rosewater Mosaic', base: '#f7ece2', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#f7ece2');
      for (let ty = 0; ty < 4; ty++)
        for (let tx = 0; tx < 4; tx++) {
          const ox = tx * 4, oy = ty * 4;
          for (let y = 0; y < 4; y++)
            for (let x = 0; x < 4; x++)
              if (Math.abs(x - 1.5) + Math.abs(y - 1.5) <= 1.5)
                px(ctx, ox + x, oy + y, (tx + ty) % 2 === 0 ? '#e3a6a0' : '#d4af7c');
        }
    } },
];

// ── Wall (10) — vertical surfaces; brick/block courses, panels, plaster ────
const WALL_DEFS = [
  { key: 'WALL_ADOBE', name: 'Adobe Brick Wall', base: '#a07a4a', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#a07a4a');
      bricks(ctx, { bw: 8, bh: 4, mortar: '#6a4a28', highlight: '#b68f5c' });
    } },
  { key: 'WALL_STONEBLOCK', name: 'Stone Block Wall', base: '#6f747a', draw(ctx) {
      noiseShade(ctx, '#6f747a', 41, 10);
      bricks(ctx, { bw: 8, bh: 8, mortar: '#3f4348', highlight: '#8a9096' });
    } },
  { key: 'WALL_PLASTER', name: 'Smooth Plaster Wall', base: '#d8c9a3', draw(ctx) {
      // Flat, gently mottled — no directional gradient or trim line, so a
      // whole wall of these tiles reads as one continuous plastered surface
      // instead of repeating bands at every tile edge.
      noiseShade(ctx, '#d8c9a3', 62, 6);
      speckle(ctx, 63, 0.1, '#c7b795', 0.35);
    } },
  { key: 'WALL_WOODPANEL', name: 'Wood Panel Wall', base: '#7a5232', draw(ctx) {
      woodGrain(ctx, ['#84592f', '#6e4726', '#7d5730'], 4, 51, true);
    } },
  { key: 'WALL_REDBRICK', name: 'Red Brick Wall', base: '#9c3f2e', draw(ctx) {
      noiseShade(ctx, '#9c3f2e', 52, 8);
      bricks(ctx, { bw: 8, bh: 4, mortar: '#5a2018', highlight: '#b8583f' });
    } },
  { key: 'WALL_MARBLE', name: 'Polished Marble Wall', base: '#dcd8cc', draw(ctx) {
      // No panel border — veins only, so the slab reads as one continuous
      // wall instead of a grid of separate framed tiles.
      noiseShade(ctx, '#dcd8cc', 61, 7);
      diagLine(ctx, 2, 1, 6, 1, 1, '#aca584');
      diagLine(ctx, 9, 2, 5, 1, 1, '#b3ac8c');
      diagLine(ctx, 0, 9, 5, 1, 1, '#b3ac8c');
      diagLine(ctx, 10, 11, 6, 1, 1, '#aca584');
    } },
  { key: 'WALL_SANDSTONE', name: 'Sandstone Block Wall', base: '#c9a15e', draw(ctx) {
      noiseShade(ctx, '#c9a15e', 71, 14);
      bricks(ctx, { bw: 8, bh: 4, mortar: '#8a6a3a' });
    } },
  { key: 'WALL_BASALT', name: 'Dark Basalt Wall', base: '#3a3d42', draw(ctx) {
      noiseShade(ctx, '#3a3d42', 81, 10);
      bricks(ctx, { bw: 8, bh: 8, mortar: '#212327', highlight: '#4c5056' });
    } },
  { key: 'WALL_PAINTEDBLUE', name: 'Painted Riad Blue', base: '#2f5484', draw(ctx) {
      // Flat colour with only mottling (no trim/baseboard band) — a band at
      // a fixed row repeats every tile and reads as horizontal stripes
      // instead of a single painted wall.
      noiseShade(ctx, '#2f5484', 64, 8);
    } },
  { key: 'WALL_ZELLIGE', name: 'Zellige Mosaic Wall', base: '#1f7a72', draw(ctx) {
      rect(ctx, 0, 0, 16, 16, '#e8dcc0');
      for (let ty = 0; ty < 4; ty++)
        for (let tx = 0; tx < 4; tx++) {
          if ((tx + ty) % 2 === 0) continue;
          rect(ctx, tx * 4 + 1, ty * 4 + 1, 2, 2, '#1f7a72');
        }
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++)
          rect(ctx, tx * 8 + 3, ty * 8 + 3, 2, 2, '#d4af37');
    } },
];

// ── Water (10) — decorative/obstacle tiles, not walkable ───────────────────
const WATER_DEFS = [
  { key: 'WATER_POOL', name: 'Still Pool Water', base: '#2a6898', draw(ctx) {
      noiseShade(ctx, '#2a6898', 91, 6);
      speckle(ctx, 92, 0.05, '#8fc4e8', 0.5);
    } },
  { key: 'WATER_OCEAN', name: 'Deep Ocean Water', base: '#1a3f66', draw(ctx) {
      noiseShade(ctx, '#1a3f66', 93, 6);
      for (let y = 2; y < 16; y += 5) { rect(ctx, 0, y, 16, 1, '#4a7aa8'); rect(ctx, 3, y + 1, 10, 1, '#3a6890'); }
    } },
  { key: 'WATER_RIVER', name: 'Flowing River', base: '#2e7a92', draw(ctx) {
      noiseShade(ctx, '#2e7a92', 94, 6);
      for (let y = 1; y < 16; y += 4) rect(ctx, 0, y, 16, 1, '#5aa8bf');
    } },
  { key: 'WATER_SWAMP', name: 'Murky Swamp Water', base: '#4a5a3a', draw(ctx) {
      noiseShade(ctx, '#4a5a3a', 95, 10);
      speckle(ctx, 96, 0.08, '#6a7a3a', 0.8);
      speckle(ctx, 97, 0.05, '#2c3520', 0.9);
    } },
  { key: 'WATER_FOUNTAIN', name: 'Fountain Water', base: '#5ab8d8', draw(ctx) {
      noiseShade(ctx, '#5ab8d8', 98, 8);
      speckle(ctx, 99, 0.10, '#e8f8ff', 0.85);
    } },
  { key: 'WATER_ICE', name: 'Frozen Ice', base: '#c8e4f0', draw(ctx) {
      noiseShade(ctx, '#c8e4f0', 100, 5);
      diagLine(ctx, 1, 3, 7, 1, 1, '#a8c8dc');
      diagLine(ctx, 8, 2, 6, 1, 0, '#a8c8dc');
      diagLine(ctx, 4, 10, 8, 1, -1, '#b8d4e4');
      rect(ctx, 10, 4, 4, 3, '#f0faff');
    } },
  { key: 'WATER_SHALLOW', name: 'Shallow Clear Water', base: '#7ecbc4', draw(ctx) {
      noiseShade(ctx, '#7ecbc4', 102, 6);
      speckle(ctx, 103, 0.08, '#d9c48a', 0.5);
    } },
  { key: 'WATER_ABYSS', name: 'Abyssal Deep Water', base: '#0e1e33', draw(ctx) {
      noiseShade(ctx, '#0e1e33', 104, 5);
      speckle(ctx, 105, 0.04, '#1c3a5c', 0.6);
    } },
  { key: 'WATER_LAGOON', name: 'Tropical Lagoon', base: '#2ec4c4', draw(ctx) {
      noiseShade(ctx, '#2ec4c4', 106, 7);
      speckle(ctx, 107, 0.07, '#eafcfa', 0.6);
    } },
  { key: 'WATER_MIRROR', name: 'Mirror Water', base: '#3a72a0', draw(ctx) {
      noiseShade(ctx, '#3a72a0', 108, 5);
      diagLine(ctx, 0, 10, 10, 1, -1, '#bcdcf0', 2);
      diagLine(ctx, 4, 14, 10, 1, -1, '#dcecf8', 1);
    } },
];

const CUSTOM_TILE_CATEGORIES = { floor: FLOOR_DEFS, wall: WALL_DEFS, water: WATER_DEFS };
const CUSTOM_TILE_LIST = [];
['floor', 'wall', 'water'].forEach(cat => {
  CUSTOM_TILE_CATEGORIES[cat].forEach(def => {
    def.category = cat;
    def.index = CUSTOM_TILE_BASE_INDEX + CUSTOM_TILE_LIST.length;
    CUSTOM_TILE_LIST.push(def);
  });
});
// Appended last, after every wall/water index is already assigned — see the
// comment above FLOOR_DEFS_MORE for why these can't just live in FLOOR_DEFS
FLOOR_DEFS_MORE.forEach(def => {
  def.category = 'floor';
  def.index = CUSTOM_TILE_BASE_INDEX + CUSTOM_TILE_LIST.length;
  CUSTOM_TILE_LIST.push(def);
  FLOOR_DEFS.push(def);   // keep FLOOR_DEFS as the complete floor list too
});

const canvasCache = new Map();
function getCustomTileCanvas(index) {
  if (canvasCache.has(index)) return canvasCache.get(index);
  const def = CUSTOM_TILE_LIST[index - CUSTOM_TILE_BASE_INDEX];
  if (!def) return null;
  const c = buildCanvas(def.draw);
  canvasCache.set(index, c);
  return c;
}

window.CUSTOM_TILE_BASE_INDEX = CUSTOM_TILE_BASE_INDEX;
window.CUSTOM_TILE_CATEGORIES = CUSTOM_TILE_CATEGORIES;
window.CUSTOM_TILE_LIST = CUSTOM_TILE_LIST;
window.getCustomTileCanvas = getCustomTileCanvas;

})();
