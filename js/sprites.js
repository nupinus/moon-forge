'use strict';
// ============================================================
//  도트 스프라이트 정의 & 렌더링
// ============================================================

const H_TOP = [
  '...kkkk...',
  '..khhhhk..',
  '.khhhhhhk.',
  '.khssesek.',
  '.kssssssk.',
  '..kcccck..',
  '.kccccccck',
  '.scccccccs',
  '..kcccck..',
  '..kppppk..',
];
const D_TOP = [
  '...........kk.',
  '..........kddk',
  'k........kddde',
  '.k.kkkkkkkdddk',
  '.dddddddddddk.',
  '.ddddddddddk..',
];
const B_TOP = [
  '..kkkkkkkk..',
  '..kmmmmmmk..',
  '..kmrmmrmk..',
  '..kmmmmmmk..',
  '...kkkkkk...',
  '.kkmmmmmmkk.',
  'kmmkmmmmkmmk',
  'km.kmmmmk.mk',
  '.k.kmmmmk.k.',
  '...kkkkkk...',
];
const C_TOP = [
  '...kkkk...',
  '..kmmmmk..',
  '.kmmmmmmk.',
  '.kmyymyyk.',
  '.kmmmmmmk.',
  '..kmmmmk..',
  '.kmmmmmmk.',
  'kmmmmmmmmk',
  'kmmmmmmmmk',
  'kmmmmmmmmk',
  '.kmmmmmmk.',
  '.kmmmmmmk.',
  '..kmmmmk..',
];

const SPR = {
  human: {
    hand: [9, 7],
    idle:  H_TOP.concat(['..kp..pk..', '..kp..pk..', '..kk..kk..']),
    walkA: H_TOP.concat(['.kpk..kp..', '.kp....pk.', '.kk....kk.']),
    walkB: H_TOP.concat(['...kppk...', '...kppk...', '...kkkk...']),
  },
  dog: {
    hand: null,
    idle:  D_TOP.concat(['.dk.dk..dk.dk.', '.kk.kk..kk.kk.']),
    walkA: D_TOP.concat(['dk..dk.dk..dk.', 'kk..kk.kk..kk.']),
    walkB: D_TOP.concat(['.dk.dk..dk.dk.', '.kk.kk..kk.kk.']),
  },
  bot: {
    hand: [11, 7],
    idle:  B_TOP.concat(['...km..mk...', '..kkk..kkk..']),
    walkA: B_TOP.concat(['..km....mk..', '.kkk....kkk.']),
    walkB: B_TOP.concat(['....kmmk....', '....kkkk....']),
  },
  // ---- 환상체 전용 모양 ----
  bird: {     // 작은 새 (징벌 새 · 불새 · 심판 새)
    hand: null,
    idle:  ['....kkk.....', '...kwwwk....', '..kwwewkrr..', '..kwwwwkrk..', '.kwwwwwwk...', 'kwwmwwwwwk..', 'kwmmmwwwwk..', '.kwwwwwwk...', '..kk..kk....', '..k....k....'],
    walkA: ['....kkk.....', '...kwwwk....', '..kwwewkrr..', 'kkkwwwwkrk..', 'kwmmwwwwk...', '.kwmwwwwwk..', '..kwwwwwwk..', '.kwwwwwwk...', '..kk..kk....', '.k......k...'],
    walkB: ['....kkk.....', '...kwwwk....', '..kwwewkrr..', '..kwwwwkrk..', '.kwwwwwwkkk.', 'kwwwwwwwmmk.', 'kwwwwwwwmk..', '.kwwwwwwk...', '..kk..kk....', '...k..k.....'],
  },
  skull: {    // 떠 있는 가시 왕관 해골과 십자가 (단 한번의 악과 수백 가지의 선행)
    hand: null,
    idle:  ['..r.r..r.r..', '.krkrkkrkrk.', '.kwwwwwwwwk.', 'kwwwwwwwwwwk', 'kwkkwwwwkkwk', 'kwkekwwkekwk', 'kwwwwkkwwwwk', '.kwwwwwwwwk.', '..kwkwkwkk..', '...kwkwkw...', '.....kk.....', '...kkyykk...', '.....yy.....', '.....yy.....'],
    walkA: null, walkB: null,
  },
  blob: {     // 눈과 입이 박힌 덩어리 (거미봉오리 · 벌거벗은 둥지 · 웃는 시체들의 산 · 아무 것도 없는)
    hand: null,
    idle:  ['....kkkkk.....', '..kkmmmmmkk...', '.kmmememmmmk..', 'kmmmmmmmmemmk.', 'kmemmmrrrmmmk.', 'kmmmmmrrrmmemk', 'kmmmmmmmmmmmk.', '.kmmemmmmemmk.', '.kmmmmmmmmmmk.', 'kkmmkkmmkkmmk.'],
    walkA: ['.....kkkk.....', '..kkkmmmmkk...', '.kmmmemmmmmk..', 'kmmemmmmmmemk.', 'kmmmmmrrrmmmk.', 'kmemmmrrrmmmk.', 'kmmmmmmmmmemk.', '.kmmmmemmmmk..', 'kkmmmmmmmmmkk.', 'kmmkkmmkkmmk..'],
    walkB: null,
  },
  flower: {   // 밝은 꽃 아래 숨은 아귀 (고기 초롱)
    hand: null,
    idle:  ['....kyyk....', '...kyyyyk...', '....kyyk....', '.....kk.....', '.....gk.....', '.....gk.....', '..kkkgkkk...', '.kmmmmmmmk..', 'kmwkwkwkwmk.', 'kmmmmmmmmmk.', '.kmrmrmrmk..', '..kkkkkkk...'],
    walkA: null, walkB: null,
  },
  sheep: {    // 눈알 박힌 잠든 양 (공허한 꿈)
    hand: null,
    idle:  ['...kkkk.....', '..kwwwwk.kk.', '.kwwewwwkwwk', 'kwwwwwwwwwek', 'kwewwwwwwwwk', 'kwwwwwewwwk.', '.kwwwwwwwwk.', '..kmk..kmk..', '..kk....kk..'],
    walkA: ['...kkkk.....', '..kwwwwk.kk.', '.kwwewwwkwwk', 'kwwwwwwwwwek', 'kwewwwwwwwwk', 'kwwwwwewwwk.', '.kwwwwwwwwk.', '.kmk....kmk.', '.kk......kk.'],
    walkB: null,
  },
  bear: {     // 낡은 곰인형 (행복한 테디)
    hand: null,
    idle:  ['.kk....kk.', 'kmmk..kmmk', '.kmmmmmmk.', 'kmkmmmmemk', 'kmmmwwmmmk', '.kmmkkmmk.', 'kmmmmmmmmk', 'kmwwwwwwmk', 'kmmmmmmmmk', '.kmk..kmk.', '.kk....kk.'],
    walkA: ['.kk....kk.', 'kmmk..kmmk', '.kmmmmmmk.', 'kmkmmmmemk', 'kmmmwwmmmk', '.kmmkkmmk.', 'kmmmmmmmmk', 'kmwwwwwwmk', 'kmmmmmmmmk', 'kmk....kmk', 'kk......kk'],
    walkB: null,
  },
  box: {      // 길쭉한 기계 (노래하는 기계)
    hand: null,
    idle:  ['.kkkkkkkk.', 'kmmmmmmmmk', 'kmyyyyyymk', 'kmmmmmmmmk', 'kmkkkkkkmk', 'kmkrrrrkmk', 'kmkkkkkkmk', 'kmmmmmmmmk', 'kmmmmmmmmk', 'kmmmmmmmmk', '.kk....kk.'],
    walkA: null, walkB: null,
  },
  shark: {    // 두 턱 상어 · 사람 다리 (꿈꾸는 해류)
    hand: null,
    idle:  ['......kk......', '.....kmmk.....', '..kkkmmmmkkk..', '.kmmmmmmmmemk.', 'kmmwwwwwwwwwmk', 'kmkwkwkwkwkwmk', 'kmmmmmmmmmmmk.', '.kmmkwkwkwmk..', '..kkkkkkkkk...', '....kp..kp....', '....kk..kk....'],
    walkA: ['......kk......', '.....kmmk.....', '..kkkmmmmkkk..', '.kmmmmmmmmemk.', 'kmmwwwwwwwwwmk', 'kmkwkwkwkwkwmk', 'kmmmmmmmmmmmk.', '.kmmkwkwkwmk..', '..kkkkkkkkk...', '...kp....kp...', '...kk....kk...'],
    walkB: null,
  },
  plant: {    // 사과 머리 · 덩굴 몸 (백설공주의 사과)
    hand: null,
    idle:  ['.....kgk....', '...kkrrkk...', '..krrrrrrk..', '..krrerrrk..', '..krrrrrrk..', '...kkrrkk...', '....kgk.....', '..kgkgkgk...', '.kg.kgk.gk..', '....kgk.....', '...kg.gk....', '..kg...gk...'],
    walkA: null, walkB: null,
  },
  cloak: {
    hand: [9, 7],
    idle:  C_TOP.concat(['..km..mk..', '..kk..kk..']),
    walkA: C_TOP.concat(['.km....mk.', '.kk....kk.']),
    walkB: C_TOP.concat(['...kmmk...', '...kkkk...']),
  },
};

const BASE_PAL = { k: '#120e14', e: '#120e14' };
const spriteCache = new Map();

function getSprite(type, frame, pal, scale, flip, white) {
  const key = type + '|' + frame + '|' + JSON.stringify(pal) + '|' + scale + '|' + (flip ? 1 : 0) + (white ? 'w' : '');
  let c = spriteCache.get(key);
  if (c) return c;
  const rows = SPR[type][frame] || SPR[type].idle;   // 걷기 그림이 없는 모양은 서 있는 그림으로
  const w = rows[0].length, h = rows.length;
  c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const x = c.getContext('2d');
  const P = Object.assign({}, BASE_PAL, pal);
  for (let r = 0; r < h; r++) {
    for (let col = 0; col < w; col++) {
      const ch = rows[r][col];
      if (ch === '.') continue;
      const color = white ? '#ffffff' : P[ch];
      if (!color) continue;
      x.fillStyle = color;
      const cx = flip ? (w - 1 - col) : col;
      x.fillRect(cx * scale, r * scale, scale, scale);
    }
  }
  spriteCache.set(key, c);
  return c;
}

function spriteURL(type, pal, scale) {
  return getSprite(type, 'idle', pal, scale || 3, false).toDataURL();
}

// ---------- 색 유틸 ----------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = c => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function pixLine(plot, x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ---------- 장비 아이콘 (16x16 절차 생성) ----------
const iconCanvasCache = new Map();
const iconURLCache = new Map();
const HANDLE = '#6a4428';

const iconKey = g => `${g.id}|${g.form}|${g.tier}|${g.color}|${g.accent}|${g.rarity || 0}`;   // 모양을 바꾸는 값이 달라지면 새로 그린다
// ---------- 장비 그림 아틀라스 (PixAI로 그려 32px 도트로 줄인 그림) ----------
// 한 줄 = 장비 종류, 칸 = 형태 단계 0~4. 그림이 있는 종류는 그림을 쓰고, 없으면 직접 그린 아이콘을 쓴다.
const gearAtlasImg = new Image();
let gearAtlasReady = false;
if (typeof GEAR_ATLAS !== 'undefined' && GEAR_ATLAS.forms.length) {
  gearAtlasImg.onload = () => {
    gearAtlasReady = true; iconCanvasCache.clear(); iconURLCache.clear();
    if (typeof UI !== 'undefined' && UI.mark) for (const k of ['storage', 'forge', 'orders', 'stock', 'party', 'partyStruct']) { try { UI.mark(k); } catch (e) {} }
    if (typeof UI !== 'undefined' && UI.closeTab && document.getElementById('closeWrap')) { try { UI.renderClose(); } catch (e) {} }
  };
  gearAtlasImg.src = 'assets/gear_atlas.png?n=' + GEAR_ATLAS.forms.length;
}
const egoAtlasImg = new Image(); let egoAtlasReady = false;
if (typeof EGO_ATLAS !== 'undefined' && EGO_ATLAS.length) { egoAtlasImg.onload = () => { egoAtlasReady = true; iconCanvasCache.clear(); iconURLCache.clear(); }; egoAtlasImg.src = 'assets/ego_atlas.png?n=' + EGO_ATLAS.length; }
function egoIcon(g) {
  if (!g.ego || !egoAtlasReady) return null;
  const i = EGO_ATLAS.indexOf(g.ego); if (i < 0) return null;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  c.getContext('2d').drawImage(egoAtlasImg, i * 32, 0, 32, 32, 0, 0, 32, 32);
  return decorateIcon(c, g);
}
function atlasIcon(g) {
  if (!gearAtlasReady) return null;
  const row = GEAR_ATLAS.forms.indexOf(g.form); if (row < 0) return null;
  const C = GEAR_ATLAS.cell, col = Math.max(0, Math.min(4, g.tier || 0));
  const c = document.createElement('canvas'); c.width = c.height = C;
  const x = c.getContext('2d');
  x.drawImage(gearAtlasImg, col * C, row * C, C, C, 0, 0, C, C);
  const d = x.getImageData(0, 0, C, C).data;
  let any = false; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { any = true; break; }
  return any ? decorateIcon(c, g) : null;
}
// 희귀도 광채(에픽 이상) · 최종 형태 반짝임 — 그린 아이콘과 같은 규칙
function decorateIcon(c, g) {
  const W = c.width, x = c.getContext('2d');
  const R = typeof RARITIES !== 'undefined' ? RARITIES[g.rarity || 0] : null;
  if (R && (g.rarity || 0) >= 5) {
    const img = x.getImageData(0, 0, W, W), p = img.data;
    const sd = (a, b) => a >= 0 && b >= 0 && a < W && b < W && p[(b * W + a) * 4 + 3] > 0;
    const col = [parseInt(R.color.slice(1, 3), 16), parseInt(R.color.slice(3, 5), 16), parseInt(R.color.slice(5, 7), 16)];
    const add = [];
    for (let b = 0; b < W; b++) for (let a = 0; a < W; a++) {
      if (sd(a, b)) continue;
      if (sd(a - 1, b) || sd(a + 1, b) || sd(a, b - 1) || sd(a, b + 1) || sd(a - 1, b - 1) || sd(a + 1, b + 1) || sd(a + 1, b - 1) || sd(a - 1, b + 1)) add.push((b * W + a) * 4);
    }
    for (const i of add) { p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]; p[i + 3] = 120; }
    x.putImageData(img, 0, 0);
  }
  if (g.tier >= 4) {
    const star = (a, b, cl, s) => { x.fillStyle = cl; x.fillRect(a, b - s, 1, s * 2 + 1); x.fillRect(a - s, b, s * 2 + 1, 1); x.fillStyle = '#ffffff'; x.fillRect(a, b, 1, 1); };
    star(4, 4, '#ffd890', 2); star(28, 9, '#ff9a5a', 1); star(26, 27, '#ffd890', 1);
  }
  return c;
}

function gearIconCanvas(g) {
  let c = iconCanvasCache.get(iconKey(g));
  if (c) return c;
  const eg = egoIcon(g);   // E.G.O 장비는 그 환상체의 무기 그림
  if (eg) { iconCanvasCache.set(iconKey(g), eg); return eg; }
  const at = atlasIcon(g);
  if (at) { iconCanvasCache.set(iconKey(g), at); return at; }
  c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d');
  const P = (px, py, col) => { if (px < 0 || py < 0 || px > 15 || py > 15) return; x.fillStyle = col; x.fillRect(px, py, 1, 1); };
  const L = (x0, y0, x1, y1, col) => pixLine((a, b) => P(a, b, col), x0, y0, x1, y1);
  const R = (x0, y0, x1, y1, col) => { for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) P(i, j, col); };
  const main = g.color, light = shade(main, 0.4), dark = shade(main, -0.45);
  const acc = g.accent || '#c0a060';
  const t = Math.min(3, g.tier);

  switch (g.form) {
    case 'sword': {
      const len = [5, 7, 9, 10][t];
      for (let i = 1; i <= len; i++) {
        P(4 + i, 11 - i, main);
        if (t >= 1) P(5 + i, 11 - i, light);
        if (t >= 2) P(4 + i, 12 - i, dark);
      }
      P(4 + len, 11 - len, '#ffffff');
      L(3, 10, 5, 12, t >= 2 ? acc : '#5a5a60');
      if (t >= 2) { P(2, 9, acc); P(6, 13, acc); }
      L(3, 12, 1, 14, HANDLE);
      P(0, 15, t >= 1 ? acc : HANDLE);
      if (t >= 3) P(4, 11, '#ffffff');
      break;
    }
    case 'mace': {
      L(2, 14, 8, 8, HANDLE);
      const s = [1, 1, 2, 2][t];
      const cx = 10, cy = 6;
      R(cx - s, cy - s, cx + s, cy + s, main);
      P(cx - s, cy - s, light);
      if (t >= 1) { P(cx + s, cy + s, dark); P(cx, cy, light); }
      if (t >= 2) { P(cx, cy - s - 1, acc); P(cx + s + 1, cy, acc); P(cx, cy + s + 1, acc); P(cx - s - 1, cy, acc); }
      if (t >= 3) { P(cx - s - 1, cy - s - 1, acc); P(cx + s + 1, cy - s - 1, acc); P(cx + s + 1, cy + s + 1, acc); P(cx - s - 1, cy + s + 1, acc); }
      break;
    }
    case 'spear': {
      L(1, 15, 10, 6, t >= 3 ? shade(acc, -0.3) : HANDLE);
      const tip = [2, 3, 4, 4][t];
      L(11, 5, 10 + tip, 6 - tip, main);
      L(12, 5, 10 + tip + 1, 6 - tip, light);
      P(10, 4, main); P(12, 6, main);
      if (t >= 1) { P(9, 4, dark); P(12, 7, dark); }
      if (t >= 2) { P(9, 7, acc); P(8, 8, acc); P(8, 7, acc); }
      P(10 + tip, 6 - tip, '#ffffff');
      break;
    }
    case 'gun': {
      R(3, 6, 10, 8, main);
      L(3, 6, 10, 6, light);
      const bl = [2, 3, 4, 5][t];
      L(11, 7, 10 + bl, 7, dark);
      R(4, 9, 5, 12, HANDLE);
      P(7, 9, dark);
      if (t >= 1) P(9, 7, acc);
      if (t >= 2) { R(6, 4, 9, 5, dark); P(9, 4, acc); }
      if (t >= 3) R(0, 6, 2, 8, HANDLE);
      break;
    }
    case 'coat': {
      R(4, 3, 11, 13, main);
      R(2, 4, 3, 11, dark);
      R(12, 4, 13, 11, dark);
      R(6, 2, 9, 3, light);
      L(7, 4, 7, 13, dark);
      if (t >= 1) L(4, 9, 11, 9, HANDLE);
      if (t >= 2) { L(4, 3, 4, 13, acc); L(11, 3, 11, 13, acc); }
      if (t >= 3) { P(5, 6, acc); P(10, 6, acc); R(4, 14, 6, 15, main); R(9, 14, 11, 15, main); }
      break;
    }
    case 'knuckle': {
      R(4, 6, 11, 10, main); L(4, 6, 11, 6, light);
      for (const k of [4, 6, 8, 10]) P(k + 1, 5, t >= 2 ? acc : light);
      if (t >= 1) R(4, 11, 11, 12, HANDLE);
      if (t >= 3) R(12, 7, 13, 10, dark);
      break;
    }
    case 'chain': {
      const n = 4 + Math.min(t, 2);
      for (let i = 0; i < n; i++) { P(2 + i * 2, 13 - i * 2, main); P(3 + i * 2, 13 - i * 2, dark); P(2 + i * 2, 12 - i * 2, light); }
      if (t >= 2) { R(12, 1, 14, 3, main); P(14, 1, '#ffffff'); P(11, 4, acc); }
      break;
    }
    case 'axe': {
      L(2, 14, 10, 6, HANDLE);
      R(9, 2, 12, 7, main); L(13, 2, 13, 7, light); L(9, 2, 12, 2, light);
      if (t >= 1) R(7, 3, 8, 5, dark);
      if (t >= 2) { P(13, 1, acc); P(13, 8, acc); }
      if (t >= 3) R(10, 4, 11, 5, acc);
      break;
    }
    case 'katana': {
      const len = [6, 8, 9, 10][t];
      for (let i = 1; i <= len; i++) { P(4 + i, 11 - i + (i > len - 2 ? 0 : 0), main); P(5 + i, 11 - i, i % 2 ? light : main); }
      P(4 + len, 11 - len, '#ffffff');
      R(3, 10, 4, 11, acc);
      for (let k = 0; k < 3; k++) P(2 - k + 1, 12 + k, k % 2 ? '#c8b890' : '#2a2a34');
      break;
    }
    case 'rapier': {
      const len = [7, 9, 10, 11][t];
      for (let i = 1; i <= len; i++) P(4 + i, 11 - i, i === len ? '#ffffff' : light);
      R(2, 10, 5, 12, t >= 2 ? acc : '#b8a070'); P(3, 11, dark);
      L(2, 13, 1, 14, HANDLE);
      break;
    }
    case 'scythe': {
      L(3, 15, 9, 4, HANDLE);
      L(9, 3, 14, 6, main); L(9, 2, 13, 3, light); P(14, 7, main); P(15, 8, '#ffffff');
      if (t >= 2) { P(8, 4, acc); P(8, 5, acc); }
      if (t >= 3) L(10, 4, 13, 6, dark);
      break;
    }
    case 'greatsword': {
      const len = [6, 8, 9, 10][t];
      for (let i = 1; i <= len; i++) { P(3 + i, 12 - i, main); P(4 + i, 12 - i, light); P(4 + i, 13 - i, dark); }
      P(4 + len, 12 - len, '#ffffff');
      L(1, 10, 5, 14, t >= 2 ? acc : '#5a5a60');
      L(2, 13, 0, 15, HANDLE);
      break;
    }
    // ---- 무기 종류 확장 (등급 t=0~3에 따라 커지고 장식이 붙는다) ----
    case 'dagger': {
      const len = [4, 5, 6, 7][t];
      for (let i = 0; i < len; i++) { P(6 + i, 9 - i, main); P(7 + i, 9 - i, light); if (t >= 1) P(6 + i, 10 - i, dark); }
      P(6 + len, 9 - len, '#ffffff');
      L(4, 9, 6, 11, t >= 2 ? acc : '#5a5a60');
      L(4, 11, 2, 13, HANDLE); L(5, 11, 3, 13, HANDLE);
      P(1, 14, t >= 3 ? acc : HANDLE);
      break;
    }
    case 'dualblade': {
      const len = [4, 5, 6, 6][t];
      for (let i = 1; i <= len; i++) { P(4 + i, 11 - i, main); P(5 + i, 11 - i, light); P(11 - i, 11 - i, main); P(10 - i, 11 - i, light); }
      P(5 + len, 11 - len, '#ffffff'); P(10 - len, 11 - len, '#ffffff');
      const gc = t >= 2 ? acc : '#5a5a60';
      P(3, 10, gc); P(5, 12, gc); P(12, 10, gc); P(10, 12, gc);
      L(4, 12, 2, 14, HANDLE); L(11, 12, 13, 14, HANDLE);
      if (t >= 3) { P(1, 15, acc); P(14, 15, acc); }
      break;
    }
    case 'hwando': case 'tachi': {
      const len = [7, 8, 9, 10][t], b0 = (i, n, c) => (c && i > n * 0.6 ? 1 : 0);   // 태도: 끝이 살짝 휜다
      for (let i = 1; i <= len; i++) { const bend = b0(i, len, g.form === 'tachi'); P(4 + i, 11 - i - bend, main); P(5 + i, 11 - i - bend, light); if (t >= 1) P(4 + i, 12 - i - bend, dark); }
      P(4 + len, 11 - len - (g.form === 'tachi' ? 1 : 0), '#ffffff');
      R(3, 10, 4, 11, g.form === 'tachi' ? acc : (t >= 2 ? acc : '#8a6a3a'));
      L(2, 12, 0, 14, g.form === 'tachi' ? '#2a2a34' : HANDLE);
      if (t >= 3) P(0, 15, acc);
      break;
    }
    case 'armblade': {
      R(1, 10, 5, 14, dark); L(1, 10, 5, 10, light); L(1, 12, 5, 12, shade(main, -0.6));
      const len = [5, 6, 7, 8][t];
      for (let i = 1; i <= len; i++) { P(5 + i, 10 - i, main); P(6 + i, 10 - i, light); }
      P(6 + len, 10 - len, '#ffffff');
      if (t >= 2) { P(2, 11, acc); P(4, 13, acc); }
      if (t >= 3) { P(6, 12, main); P(7, 13, light); }
      break;
    }
    case 'glaive': {
      L(1, 15, 9, 7, HANDLE); L(2, 15, 10, 7, HANDLE);
      const s = [3, 4, 5, 5][t];
      R(10, 8 - s, 12, 8, main); L(13, 8 - s, 13, 7, light); L(10, 8 - s, 10, 8, t >= 1 ? dark : main);
      P(13, 7 - s, '#ffffff'); P(9, 9 - s, main);
      if (t >= 2) { P(8, 9, acc); P(8, 10, acc); P(7, 10, acc); }
      if (t >= 3) { P(14, 8 - s, light); P(14, 9 - s, main); }
      break;
    }
    case 'lance': {
      L(1, 15, 5, 11, HANDLE); L(2, 15, 6, 11, HANDLE);
      R(4, 9, 7, 12, t >= 2 ? acc : light); P(4, 9, dark); P(7, 12, dark);
      const len = [5, 6, 7, 8][t];
      for (let i = 1; i <= len; i++) { P(7 + i, 9 - i, main); if (i < len - 1) { P(7 + i, 10 - i, dark); P(8 + i, 9 - i, light); } }
      P(7 + len, 9 - len, '#ffffff');
      if (t >= 3) { P(3, 13, acc); }
      break;
    }
    case 'harpoon': {
      L(1, 15, 10, 6, HANDLE); L(2, 15, 11, 6, HANDLE);
      const tip = [3, 3, 4, 4][t];
      L(11, 5, 11 + tip, 5 - tip, main); L(12, 5, 11 + tip, 4 - tip + 1, light); P(11 + tip, 5 - tip, '#ffffff');
      for (let k = 0; k <= Math.min(t, 2); k++) { P(10 + k, 3 + k, main); P(13 + k, 6 + k, main); }
      if (t >= 2) { P(4, 12, acc); P(5, 12, acc); }
      if (t >= 3) L(1, 13, 3, 15, '#c8b890');
      break;
    }
    case 'staff': {
      const wood = shade(main, -0.25);
      L(2, 15, 11, 6, wood); L(3, 15, 12, 6, shade(wood, 0.2));
      const r = [1, 1, 2, 2][t];
      R(12 - r, 4 - r, 13 + r - 1, 5 + r - 1, main); P(12 - r, 4 - r, light);
      if (t >= 1) { P(11, 7, light); P(12, 7, light); }
      if (t >= 2) P(12, 4, acc);
      if (t >= 3) { P(10, 1, acc); P(15, 6, acc); P(15, 1, light); }
      break;
    }
    case 'hammer': {
      L(2, 14, 8, 8, HANDLE); L(3, 14, 9, 8, HANDLE);
      const w = [4, 5, 5, 6][t], h = [3, 4, 4, 5][t];
      R(7, 6 - h, 7 + w, 6, main); L(7, 6 - h, 7 + w, 6 - h, light); L(7 + w, 6 - h + 1, 7 + w, 6, dark);
      if (t >= 1) L(8, 6 - h + 1, 8, 6, dark);
      if (t >= 2) L(9 + Math.floor(w / 2), 6 - h, 9 + Math.floor(w / 2), 6, acc);
      if (t >= 3) { P(6, 6 - h, main); P(5, 6 - h - 1, light); }
      break;
    }
    case 'club': {
      L(1, 15, 5, 11, HANDLE); L(2, 15, 6, 11, HANDLE);
      const s = [0, 1, 1, 2][t];
      R(5, 8, 8, 11, main); R(7, 5 - s, 10, 9, main); R(9, 2 - s, 12 + s, 6, main);
      P(10, 2 - s, light); P(11, 3 - s, light); P(8, 5 - s, light);
      if (t >= 1) { L(5, 10, 8, 7, dark); }
      if (t >= 2) { P(13 + s, 3, acc); P(11, 7, acc); P(8, 11, acc); }
      if (t >= 3) { P(14, 1, light); P(13, 6, light); }
      break;
    }
    case 'gauntlet': {
      R(3, 6, 12, 12, main); L(3, 6, 12, 6, light);
      R(12, 7, 14, 11, main); P(14, 7, light);
      for (let k = 4; k <= 11; k += 2) P(k, 5, t >= 1 ? light : main);
      L(3, 9, 12, 9, dark); L(3, 12, 12, 12, dark);
      if (t >= 2) R(6, 10, 9, 11, acc);
      if (t >= 3) { P(4, 4, light); P(7, 4, light); P(10, 4, light); }
      break;
    }
    case 'claw': {
      R(1, 9, 7, 14, dark); L(1, 9, 7, 9, light);
      const len = [4, 5, 6, 7][t];
      for (let k = 0; k < 3; k++) for (let i = 1; i <= len; i++) P(7 + i, 9 + k * 2 - i - Math.floor(k / 2), i === len ? '#ffffff' : (k === 1 ? light : main));
      if (t >= 2) { P(3, 11, acc); P(5, 12, acc); }
      if (t >= 3) L(1, 14, 7, 14, acc);
      break;
    }
    case 'whip': {
      R(1, 12, 3, 15, HANDLE); P(1, 12, light);
      const pts = [[4, 11], [5, 10], [6, 10], [7, 9], [8, 9], [9, 8], [10, 7], [11, 6], [11, 5], [12, 4], [13, 3], [14, 3], [15, 2]];
      const n = [8, 10, 11, 13][t];
      pts.slice(0, n).forEach(([a, c], i) => { P(a, c, i % 2 ? light : main); P(a, c + 1, dark); });
      if (t >= 2) { P(6, 9, acc); P(9, 7, acc); P(12, 3, acc); }
      if (t >= 3) P(2, 11, acc);
      break;
    }
    case 'fan': {
      const r = [9, 10, 11, 12][t];
      for (let k = 0; k <= 6; k++) { const a = -1.5 + k * 0.25; L(2, 14, 2 + Math.round(Math.cos(a) * r), 14 + Math.round(Math.sin(a) * r), k % 2 ? light : main); }
      if (t >= 1) for (let k = 0; k < 6; k++) { const a = -1.375 + k * 0.25; P(2 + Math.round(Math.cos(a) * (r - 2)), 14 + Math.round(Math.sin(a) * (r - 2)), dark); }
      if (t >= 2) for (let k = 0; k <= 6; k++) { const a = -1.5 + k * 0.25; P(2 + Math.round(Math.cos(a) * r), 14 + Math.round(Math.sin(a) * r), acc); }
      P(2, 14, HANDLE); P(1, 15, t >= 3 ? acc : HANDLE);
      break;
    }
    case 'shield': {
      const top = [3, 3, 2, 2][t];
      R(4, top, 11, 10, main); R(5, 11, 10, 12, main); R(6, 13, 9, 13, main); P(7, 14, main); P(8, 14, main);
      if (t >= 1) { L(4, top, 11, top, light); L(4, top + 1, 4, 10, light); L(11, top + 1, 11, 10, dark); }
      R(7, 6, 8, 8, t >= 2 ? acc : dark);
      if (t >= 3) { L(7, top + 1, 7, 12, acc); L(5, 7, 10, 7, acc); R(7, 6, 8, 8, '#ffffff'); }
      break;
    }
    case 'brush': {
      L(1, 15, 8, 8, HANDLE); L(2, 15, 9, 8, HANDLE);
      if (t >= 1) { P(4, 12, acc); P(5, 12, acc); }
      R(8, 6, 10, 8, main); P(8, 6, light);
      const tuft = [2, 3, 3, 4][t];
      for (let i = 0; i < tuft; i++) { P(11 + i, 5 - i, '#2a2024'); P(10 + i, 5 - i, '#4a3a40'); P(11 + i, 6 - i, '#4a3a40'); }
      P(11 + tuft, 5 - tuft, '#1a1418');
      if (t >= 3) { P(14, 7, '#1a1418'); P(14, 8, '#2a2024'); }
      break;
    }
    case 'scissors': {
      const len = [8, 9, 10, 11][t];
      for (let i = 0; i < len; i++) { P(5 + i, 10 - i, main); P(5 + i, 6 + Math.floor(i * 0.7), i % 2 ? light : main); }
      R(1, 10, 4, 13, dark); R(2, 11, 3, 12, '#120e14'); R(1, 3, 4, 6, dark); R(2, 4, 3, 5, '#120e14');
      if (t >= 1) { P(1, 10, light); P(1, 3, light); }
      P(8, 8, t >= 2 ? acc : '#ffffff');
      if (t >= 3) { P(5 + len - 1, 10 - len + 1, '#ffffff'); }
      break;
    }
    case 'tfaxe': {
      L(1, 15, 9, 7, shade(main, -0.35)); L(2, 15, 10, 7, shade(main, -0.2));
      P(4, 12, '#3a3a42'); P(6, 10, '#3a3a42');
      const s = [4, 5, 6, 6][t];
      R(9, 8 - s, 12, 7, main); L(13, 8 - s, 13, 7, light); L(9, 8 - s, 12, 8 - s, light); P(14, 7 - s, '#ffffff');
      if (t >= 1) R(9, 8, 11, 9, main);
      R(10, 5, 11, 6, t >= 2 ? acc : '#2a2a30');
      if (t >= 3) { P(8, 3, main); P(8, 4, light); }
      break;
    }
    case 'tfgreat': {
      const len = [7, 8, 9, 10][t];
      for (let i = 1; i <= len; i++) { P(3 + i, 12 - i, main); P(4 + i, 12 - i, i % 3 ? light : '#2a2a30'); P(4 + i, 13 - i, dark); }
      P(4 + len, 12 - len, '#ffffff');
      L(1, 10, 5, 14, t >= 2 ? acc : '#5a5a60'); L(2, 13, 0, 15, HANDLE);
      if (t >= 3) { P(6, 10, acc); P(9, 7, acc); }
      break;
    }
    case 'bow': {
      const amp = [5, 6, 6, 7][t];
      for (let j = 1; j <= 14; j++) { const x0 = 3 + Math.round(Math.sin(j / 15 * Math.PI) * amp); P(x0, j, main); P(x0 + 1, j, j % 3 ? dark : light); }
      L(3, 1, 3, 14, '#e8dcc0');
      if (t >= 1) { P(3 + amp, 7, HANDLE); P(4 + amp, 7, HANDLE); P(3 + amp, 8, HANDLE); P(4 + amp, 8, HANDLE); }
      if (t >= 2) { P(2, 1, acc); P(2, 14, acc); }
      if (t >= 3) { P(4, 0, light); P(4, 15, light); }
      break;
    }
    case 'crossbow': {
      L(2, 14, 11, 5, HANDLE); L(3, 14, 12, 5, HANDLE); L(2, 13, 10, 5, shade(HANDLE, 0.2));
      L(6, 3, 13, 10, main); L(7, 3, 14, 10, light);
      L(6, 3, 10, 8, '#e8dcc0');
      if (t >= 1) { P(12, 4, dark); P(13, 3, dark); }
      if (t >= 2) { P(10, 7, acc); P(1, 15, acc); }
      if (t >= 3) { P(5, 2, light); P(14, 11, light); }
      break;
    }
    case 'revolver': {
      R(3, 9, 5, 13, HANDLE); P(3, 9, shade(HANDLE, 0.3)); P(2, 13, HANDLE);
      R(3, 6, 8, 8, main); L(3, 6, 8, 6, light); P(3, 5, dark);
      R(6, 6, 8, 9, dark); P(7, 7, light);
      const bl = [4, 5, 6, 7][t];
      L(9, 6, 8 + bl, 6, main); L(9, 7, 8 + bl, 7, dark); P(8 + bl, 5, light);
      P(6, 10, dark);
      if (t >= 2) { P(4, 11, acc); P(5, 7, acc); }
      if (t >= 3) L(3, 13, 5, 13, acc);
      break;
    }
    case 'rifle': case 'sniper': case 'bayonet': {
      R(0, 7, 3, 9, HANDLE); P(0, 10, HANDLE); P(1, 10, HANDLE); L(0, 7, 3, 7, shade(HANDLE, 0.3));
      R(4, 6, 8, 8, main); L(4, 6, 8, 6, light);
      R(6, 9, 7, 11, dark);
      const end = g.form === 'bayonet' ? 12 : [12, 13, 14, 15][t];
      L(9, 7, end, 7, dark); L(9, 6, end - 1, 6, shade(main, -0.2));
      R(9, 8, 11, 8, HANDLE);
      if (g.form === 'sniper') { R(4, 4, 9, 4, '#2a2a32'); P(3, 4, light); P(10, 4, light); P(6, 5, '#2a2a32'); if (t >= 1) { L(11, 9, 10, 12, dark); L(12, 9, 13, 12, dark); } }
      if (g.form === 'bayonet') { L(12, 8, 15, 8, '#e0e0e8'); P(15, 7, '#ffffff'); P(12, 9, dark); }
      if (t >= 1 && g.form !== 'sniper') P(end - 1, 5, dark);
      if (t >= 2) { P(5, 7, acc); P(2, 8, acc); }
      if (t >= 3) L(4, 9, 5, 9, acc);
      break;
    }
    case 'shotgun': {
      R(0, 7, 3, 10, HANDLE); L(0, 7, 3, 7, shade(HANDLE, 0.3));
      R(4, 6, 7, 9, main); L(4, 6, 7, 6, light);
      const end = [12, 13, 14, 15][t];
      L(8, 6, end, 6, light); L(8, 7, end, 7, main); L(8, 8, end, 8, dark);
      R(9, 9, 12, 10, HANDLE);
      if (t >= 1) P(end, 5, dark);
      if (t >= 2) { P(5, 8, acc); P(2, 9, acc); }
      if (t >= 3) { P(1, 11, '#e04040'); P(2, 11, '#e04040'); P(3, 11, '#e04040'); }
      break;
    }
    case 'robe': case 'lightarmor': case 'vest': case 'chainmail': case 'heavyarmor': case 'hazmat': case 'powerarmor': case 'cyberskin': {
      const f = g.form;
      R(4, 3, 11, f === 'robe' ? 15 : 13, main); R(2, 4, 3, 11, dark); R(12, 4, 13, 11, dark);
      if (f === 'robe') { R(3, 13, 12, 15, main); R(6, 1, 9, 3, dark); L(7, 4, 7, 15, t >= 1 ? acc : dark); }
      if (f === 'lightarmor') for (let j = 5; j <= 12; j += 3) L(4, j, 11, j, dark);
      if (f === 'vest') { R(5, 8, 6, 10, dark); R(9, 8, 10, 10, dark); L(7, 3, 7, 13, '#2a2a30'); R(6, 2, 9, 2, dark); }
      if (f === 'chainmail') for (let i = 4; i <= 11; i++) for (let j = 4; j <= 12; j++) if ((i + j) % 2) P(i, j, light);
      if (f === 'heavyarmor') { R(1, 3, 4, 6, light); R(11, 3, 14, 6, light); L(4, 9, 11, 9, dark); }
      if (f === 'hazmat') { R(5, 1, 10, 4, '#9ad8e8'); L(5, 1, 10, 1, light); }
      if (f === 'powerarmor') { R(0, 2, 4, 7, light); R(11, 2, 15, 7, light); R(6, 6, 9, 9, '#120e14'); R(7, 7, 8, 8, t >= 1 ? acc : '#ffb040'); }
      if (f === 'cyberskin') { L(6, 3, 6, 13, dark); L(9, 3, 9, 13, dark); L(4, 8, 11, 8, dark); if (t >= 2) P(7, 5, acc); }
      if (t >= 2 && f !== 'powerarmor' && f !== 'robe') { L(4, 3, 4, 13, acc); L(11, 3, 11, 13, acc); }
      break;
    }
    case 'suit': {
      R(4, 3, 11, 13, main); R(2, 4, 3, 11, dark); R(12, 4, 13, 11, dark);
      R(6, 3, 9, 6, '#e8e4dc'); L(7, 4, 7, 9, acc); L(8, 4, 8, 9, acc);
      L(5, 3, 6, 7, dark); L(10, 3, 9, 7, dark);
      if (t >= 2) { P(5, 9, acc); P(10, 9, acc); }
      break;
    }
    case 'cloak': {
      for (let j = 3; j <= 14; j++) { const w = 1 + Math.floor((j - 3) / 2); R(7 - w, j, 8 + w, j, main); }
      R(6, 1, 9, 3, dark); L(7, 4, 7, 14, dark);
      if (t >= 2) L(2, 14, 13, 14, acc);
      if (t >= 3) P(7, 5, acc);
      break;
    }
    case 'pbag': {
      R(3, 5, 12, 14, main); R(4, 6, 11, 7, light); L(5, 3, 10, 3, dark); P(4, 4, dark); P(11, 4, dark);
      R(7, 9, 8, 10, '#7ad8b0'); if (t >= 2) { P(5, 12, acc); P(10, 12, acc); }
      break;
    }
    case 'pglove': {
      R(4, 7, 11, 13, main); R(4, 3, 5, 7, main); R(6, 2, 7, 7, main); R(8, 2, 9, 7, main); R(10, 3, 11, 7, main); R(12, 7, 13, 10, main);
      L(4, 8, 11, 8, light); R(7, 10, 8, 11, '#7ad8b0'); if (t >= 2) L(4, 13, 11, 13, acc);
      break;
    }
    case 'plate': {
      R(4, 4, 11, 12, main);
      R(2, 3, 4, 6, light);
      R(11, 3, 13, 6, light);
      L(6, 5, 6, 10, light);
      L(4, 12, 11, 12, dark);
      if (t >= 1) { P(5, 5, dark); P(10, 5, dark); P(5, 11, dark); P(10, 11, dark); }
      if (t >= 2) L(4, 8, 11, 8, acc);
      if (t >= 3) { R(7, 5, 8, 6, acc); R(6, 2, 9, 3, '#ffcf4a'); }
      break;
    }
  }
  c = detailIcon(c, g);   // 32×32 고해상 마감
  iconCanvasCache.set(iconKey(g), c);
  return c;
}

// ---------- 아이콘 고해상 처리 (16→32) ----------
// 16×16 밑그림을 픽셀아트 확대(Scale2x)로 대각선을 매끄럽게 한 뒤
// 입체 음영(왼쪽 위 빛·오른쪽 아래 그림자)·재질 결·외곽선·그림자·등급 광채를 덧입힌다.
function detailIcon(src, g) {
  const S16 = src.getContext('2d').getImageData(0, 0, 16, 16).data;
  const W = 32, out = new Uint8ClampedArray(W * W * 4);
  const px = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 0 : ((S16[(y * 16 + x) * 4] << 24) | (S16[(y * 16 + x) * 4 + 1] << 16) | (S16[(y * 16 + x) * 4 + 2] << 8) | S16[(y * 16 + x) * 4 + 3]) >>> 0;
  const put = (x, y, v) => { const i = (y * W + x) * 4; out[i] = v >>> 24; out[i + 1] = (v >>> 16) & 255; out[i + 2] = (v >>> 8) & 255; out[i + 3] = v & 255; };
  // Scale2x (EPX)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const P = px(x, y), A = px(x, y - 1), B = px(x + 1, y), C = px(x - 1, y), D = px(x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (C === A && C !== D && A !== B) e0 = A;
    if (A === B && A !== C && B !== D) e1 = B;
    if (D === C && D !== B && C !== A) e2 = C;
    if (B === D && B !== A && D !== C) e3 = D;
    put(x * 2, y * 2, e0); put(x * 2 + 1, y * 2, e1); put(x * 2, y * 2 + 1, e2); put(x * 2 + 1, y * 2 + 1, e3);
  }
  const op = (x, y) => x >= 0 && y >= 0 && x < W && y < W && out[(y * W + x) * 4 + 3] > 0;
  const solid = new Uint8Array(W * W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) solid[y * W + x] = op(x, y) ? 1 : 0;
  const sd = (x, y) => x >= 0 && y >= 0 && x < W && y < W && solid[y * W + x] === 1;
  const armor = g.kind === 'armor' || (FORMS[g.form] && FORMS[g.form].kind === 'armor');
  const res = new Uint8ClampedArray(out);
  const tone = (i, f) => { for (let k = 0; k < 3; k++) res[i + k] = f > 0 ? res[i + k] + (255 - res[i + k]) * f : res[i + k] * (1 + f); };
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (!sd(x, y)) continue;
    const i = (y * W + x) * 4;
    // 입체: 빛은 왼쪽 위에서
    if (!sd(x, y - 1) || !sd(x - 1, y)) tone(i, 0.28);
    else if (!sd(x, y + 1) || !sd(x + 1, y)) tone(i, -0.3);
    else tone(i, 0.06 - (x + y) / (W * 2) * 0.16);
    // 재질 결: 방어구는 직조 무늬, 무기는 금속 결
    if (armor) { if ((x + y) % 4 === 0) tone(i, -0.08); else if ((x - y + 64) % 4 === 0) tone(i, 0.04); }
    else if ((x * 7 + y * 13) % 11 === 0) tone(i, 0.12);
  }
  // 그림자(오른쪽 아래) → 외곽선 → 등급 광채
  const R = typeof RARITIES !== 'undefined' ? RARITIES[g.rarity || 0] : null;
  const glow = R && (g.rarity || 0) >= 5 ? R.color : null;
  const gl = glow ? [parseInt(glow.slice(1, 3), 16), parseInt(glow.slice(3, 5), 16), parseInt(glow.slice(5, 7), 16)] : null;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (sd(x, y)) continue;
    const i = (y * W + x) * 4;
    const edge = sd(x - 1, y) || sd(x + 1, y) || sd(x, y - 1) || sd(x, y + 1);
    if (edge) { res[i] = 14; res[i + 1] = 10; res[i + 2] = 16; res[i + 3] = 235; continue; }
    if (sd(x - 2, y - 2) || sd(x - 1, y - 2) || sd(x - 2, y - 1)) { res[i] = 0; res[i + 1] = 0; res[i + 2] = 0; res[i + 3] = 80; }
    if (gl && (sd(x - 2, y) || sd(x + 2, y) || sd(x, y - 2) || sd(x, y + 2) || sd(x - 1, y - 1) || sd(x + 1, y + 1) || sd(x - 1, y + 1) || sd(x + 1, y - 1))) {
      res[i] = gl[0]; res[i + 1] = gl[1]; res[i + 2] = gl[2]; res[i + 3] = 110;
    }
  }
  const c = document.createElement('canvas'); c.width = c.height = W;
  const cx = c.getContext('2d');
  cx.putImageData(new ImageData(res, W, W), 0, 0);
  // 전설(최종 형태): 네 갈래 반짝임
  if (g.tier >= 4) {
    const star = (x, y, col, s) => { cx.fillStyle = col; cx.fillRect(x, y - s, 1, s * 2 + 1); cx.fillRect(x - s, y, s * 2 + 1, 1); cx.fillStyle = '#ffffff'; cx.fillRect(x, y, 1, 1); };
    star(4, 4, '#ffd890', 2); star(28, 9, '#ff9a5a', 2); star(25, 28, '#ffd890', 1); star(6, 20, '#ffb070', 1);
  }
  return c;
}


function gearIconURL(g) {
  let u = iconURLCache.get(iconKey(g));
  if (!u) { u = gearIconCanvas(g).toDataURL(); iconURLCache.set(iconKey(g), u); }
  return u;
}

// ---------- 들고 있는 무기 그리기 (현장 화면) ----------
// 무기마다 오른쪽을 향한 작은 도트 그림(손잡이 = 손 위치 o)을 두고,
// 대기 자세에서는 비스듬히 세워 들고(기울임), 공격할 때는 앞으로 내지른다. 모든 무기에 어두운 외곽선.
// 글자: m 금속 · l 밝은 금속 · d 어두운 금속 · h 손잡이 · b 나무 · a 장식(금) · k 검정 · w 흰빛 · s 시위 · r 붉은 술 · g 총철
const HELD = {
  sword:     { o: [2, 2], r: ['...a.........', '...a.........', 'dhhammmmmmmlw', '...addddddd..', '...a.........'] },
  dagger:    { o: [1, 1], r: ['..a....', 'dhammlw', '..addd.', '..a....'] },
  knife:     { o: [1, 1], r: ['dhlllw', '.hddd.'] },
  dualblade: { o: [1, 1], r: ['..a.....', 'dhammmlw', '..addd..', '..a.....', '.a......', 'hammmlw.', '.addd...'] },
  katana:    { o: [3, 1], r: ['............lw', 'kkkkammmmmmmd.', '....dddddddd..'] },
  tachi:     { o: [3, 1], r: ['...........llw', 'kakkammmmmmmmd.', '....ddddddddd..'] },
  hwando:    { o: [2, 1], r: ['r..a.........', 'rhhammmmmmmlw', '...addddddd..'] },
  rapier:    { o: [2, 1], r: ['..aa..........', 'dhaalllllllllw', '..aa..........'] },
  armblade:  { o: [2, 1], r: ['ddd.........', 'dlddmmmmmmlw', 'ddd..ddddd..'] },
  greatsword:{ o: [3, 2], r: ['....a...........', '...ammmmmmmmmmm.', 'dhhalllllllllllw', '...addddddddddd.', '....a...........'] },
  tfgreat:   { o: [3, 2], r: ['....a...........', '...ammkmmmkmmmm.', 'dhhallkllllkllll', '...addkddddkdddd', '....a...........'] },
  mace:      { o: [0, 2], r: ['.......a..', '......mmm.', 'hhhhhhmlma', '......mmm.', '.......a..'] },
  pipe:      { o: [0, 1], r: ['.......gg', 'ggggggggg', '.......gg'] },
  hammer:    { o: [0, 2], r: ['.......lm', '.......mm', 'hhhhhhhmm', '.......mm', '.......dd'] },
  club:      { o: [0, 1], r: ['.....bbbb', 'hhhbbbbabb', '.....dbdb.'] },
  staff:     { o: [3, 1], r: ['............aa', 'bbbbbbbbbbbbla', '............aa'] },
  spear:     { o: [2, 1], r: ['............m.', 'hhhhhhhhhhhamlw', '............m.'] },
  lance:     { o: [2, 2], r: ['.....a.......', '.....ammm....', 'hhhhhallllllw', '.....addd....', '.....a.......'] },
  glaive:    { o: [2, 2], r: ['..........lw', '.........mmm', 'hhhhhhhhhmmm', '.........dd.'] },
  harpoon:   { o: [2, 1], r: ['...........m.m.', 'hhhhhhhhhhhlllw', '...........m.m.'] },
  scythe:    { o: [2, 0], r: ['hhhhhhhhhhha', '......lmmmmm', '........mmd.', '..........d.'] },
  axe:       { o: [0, 2], r: ['......lmm', '......mmm', 'hhhhhhmmm', '......dd.'] },
  tfaxe:     { o: [0, 2], r: ['.......lmm', '.......mmm', 'hhkhhkhmmm', '.......dd.'] },
  knuckle:   { o: [0, 1], r: ['aml', 'mmm', 'aml'], fixed: true },
  gauntlet:  { o: [0, 1], r: ['mmml', 'mlmm', 'mmmm', 'dddd'], fixed: true },
  claw:      { o: [0, 2], r: ['...ll', 'dmmm.', '...ll', 'dmmm.', '...ll'], fixed: true },
  chain:     { o: [0, 1], r: ['.m.m.m.m.ml', 'm.l.m.l.m.m', '.m.m.m.m.ml'] },
  whip:      { o: [0, 1], r: ['......ll...l', 'hh..ll..l.l.', '..ll.....l..'] },
  brush:     { o: [1, 1], r: ['.........kk.', 'bbbbbbbbaakkk', '.........kk.'] },
  scissors:  { o: [3, 2], r: ['kk.......ll', 'k.k...lll..', 'kk..aa.....', 'k.k...ddd..', 'kk.......dd'], fixed: true },
  fan:       { o: [0, 3], r: ['..lmlml', '.mlmlm.', 'amlml..', 'hml....'], fixed: true },
  shield:    { o: [0, 3], r: ['.mmm.', 'mlllm', 'mlalm', 'mlllm', 'mlllm', '.mdm.', '..d..'], fixed: true },
  bow:       { o: [1, 4], r: ['.m..', 's.m.', 's..m', 's..m', 's.ha', 's..m', 's..m', 's.m.', '.m..'], fixed: true, shot: 'arrow' },
  crossbow:  { o: [1, 2], r: ['........m', 'sss.....m', 'hhbbbbbbml', 'sss.....m', '........m'], fixed: true, shot: 'arrow' },
  gun:       { o: [0, 1], r: ['.mmmmmd', 'hh.....', 'hh.....'], fixed: true, shot: 'flash' },
  revolver:  { o: [0, 1], r: ['.mddmmmd', 'hhdd....', 'hh......'], fixed: true, shot: 'flash' },
  rifle:     { o: [3, 1], r: ['bbbbmmmmmmmmd', 'bb..hh.bbb...'], fixed: true, shot: 'flash' },
  sniper:    { o: [3, 1], r: ['.....kkkk......', 'bbbbmmmmmmmmmmd', 'bb..hh.bb..d.d.'], fixed: true, shot: 'flash' },
  shotgun:   { o: [3, 1], r: ['bbbbmmmmmmmmd', 'bb..hhbbbmmmd'], fixed: true, shot: 'flash' },
  bayonet:   { o: [3, 1], r: ['bbbbmmmmmmmmd...', 'bb..hh.bbb..llllw'], fixed: true, shot: 'flash' },
};
function drawHeldWeapon(ctx, form, hx, hy, s, color, pose, dir) {
  const col = color || '#9a9aa0';
  const D = HELD[form];
  const put = (x, y, c, sz) => { ctx.fillStyle = c; ctx.fillRect(Math.round(hx + x * s * dir - (dir < 0 ? s : 0)) - (sz || 0), Math.round(hy + y * s) - (sz || 0), s + (sz || 0) * 2, s + (sz || 0) * 2); };
  if (!D) { if (pose) put(1, 0, '#f0c8a0'); return; }   // 맨주먹
  const pal = { m: col, l: shade(col, 0.45), d: shade(col, -0.38), h: HANDLE, b: '#8a5c38', a: '#c8a040', k: '#1e1a22', w: '#ffffff', s: '#e8dcc0', r: '#c03030', g: '#5a5a64' };
  const cells = [];
  D.r.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; const x = i - D.o[0], y = j - D.o[1]; cells.push([x, (!pose && !D.fixed) ? y - x : y, pal[ch] || col]); } });
  for (const [x, y] of cells) put(x, y, 'rgba(14,10,16,0.9)', 1);          // 외곽선 (1px)
  for (const [x, y, c] of cells) put(x, y, c);
  if (pose && D.shot === 'flash') { const fx = Math.max(...D.r.map(r => r.length)) - D.o[0]; put(fx, -D.o[1] + 0, '#ffe08a'); put(fx + 1, -D.o[1] - 1, '#ffb040'); put(fx + 1, -D.o[1] + 1, '#ffb040'); }
  if (pose && D.shot === 'arrow') { for (let k = 0; k < 6; k++) put(1 + k, 0, k === 5 ? '#ffffff' : '#c8b890'); }
}
