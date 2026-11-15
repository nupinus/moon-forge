'use strict';
// ============================================================
//  환상체 고유 능력 · E.G.O 장비의 (열화된) 능력
//  환상체(적)는 원작의 특징을 살린 고유 능력을 가진다.
//  그 추출물로 만든 E.G.O 장비는 같은 능력을 약하게 물려받는다.
// ============================================================

// 환상체가 부르는 작은 졸개들
Object.assign(ENEMIES, {
  spiderling: { name: '새끼 거미', sprite: 'dog', pal: { d: '#1a1418', e: '#e02020' }, hp: 60, atk: 8, def: 0, interval: 0.8, range: 14, speed: 60, exp: 4, money: 0, scale: 0.7 },
  nestworm:   { name: '둥지 벌레', sprite: 'dog', pal: { d: '#d8c8b0', e: '#4a2a1a' }, hp: 80, atk: 10, def: 0, interval: 1.0, range: 14, speed: 40, exp: 4, money: 0, scale: 0.7 },
  apostle:    { name: '사도', sprite: 'cloak', pal: { m: '#e8e4d8', y: '#ffd84a' }, hp: 900, atk: 40, def: 12, interval: 1.2, range: 24, speed: 26, exp: 60, money: 0, weapon: 'spear', scale: 1.1 },
});

// ---------- 환상체 고유 능력 (적) ----------
// tick: 매 프레임 · hit: 해결사를 칠 때(피해 배율 반환) · hurt: 맞았을 때 · spawn: 나타날 때
const ABNO_AB = {
  punishing: { name: '징벌', desc: '여러 번 맞으면 분노해 부리가 커진다',
    hurt(e, H) { const a = e.ab; a.hits = (a.hits || 0) + 1; if (a.hits >= 6 && !a.rage) { a.rage = 3; H.float(e.x, e.y - 50, '분노!', '#ff3b3b', true); H.radioLog(`${e.name}이(가) 분노했다 — 부리가 갈라진다!`, 'bad'); } },
    hit(e) { if (e.ab.rage > 0) { e.ab.rage--; if (!e.ab.rage) e.ab.hits = 0; return 2.5; } return 1; } },
  onesin: { name: '참회', desc: '때때로 주변의 모든 적을 치유한다',
    tick(e, dt, H) { if (H.every(e, 'heal', 6, dt)) { for (const o of H.foes()) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.04); H.float(e.x, e.y - 50, '참회', '#e8e0c0', true); } } },
  forsaken: { name: '구속 해제', desc: '체력이 절반 아래로 떨어지면 구속을 풀고 미쳐 날뛴다',
    tick(e, dt, H) { if (!e.ab.free && e.hp < e.maxHp * 0.5) { e.ab.free = 1; e.interval *= 0.5; H.float(e.x, e.y - 50, '구속 해제', '#ff6a6a', true); } } },
  beauty: { name: '포효', desc: '궁지에 몰리면 포효해 모두를 굳게 만든다',
    tick(e, dt, H) { if (!e.ab.roar && e.hp < e.maxHp * 0.3) { e.ab.roar = 1; for (const u of H.alive()) u.stunT = 1.5; H.float(e.x, e.y - 50, '포효!', '#a0703a', true); } } },
  spiderbud: { name: '번식', desc: '새끼 거미를 계속 낳는다',
    tick(e, dt, H) { if (H.every(e, 'brood', 7, dt) && H.foes().length < 8) { H.summon('spiderling', e.x + 10, 2); H.float(e.x, e.y - 50, '새끼 거미', '#e02020'); } } },
  meatlantern: { name: '포식', desc: '처음 무는 상대에게 세 배의 피해',
    hit(e, u) { const a = e.ab; a.ate = a.ate || {}; if (!a.ate[u.f.id]) { a.ate[u.f.id] = 1; return 3; } return 1; } },
  voiddream: { name: '잠', desc: '때때로 한 명을 깊은 잠에 빠뜨린다',
    tick(e, dt, H) { if (H.every(e, 'sleep', 8, dt)) { const u = pick(H.alive()); if (u) { u.stunT = 2.5; H.float(u.x, u.y - 46, '잠', '#9a8af0', true); } } } },
  oldlady: { name: '외로움', desc: '곁에 있는 모두를 서서히 갉아먹는다',
    tick(e, dt, H) { if (H.every(e, 'lonely', 5, dt)) for (const u of H.alive()) H.hitUnit(u, u.maxHp * 0.04, '#8a8aa0'); } },
  scorched: { name: '마지막 불꽃', desc: '쓰러지기 직전 스스로 터진다',
    tick(e, dt, H) { if (!e.ab.boom && e.hp < e.maxHp * 0.3) { e.ab.boom = 1; for (const u of H.alive()) if (Math.abs(u.x - e.x) < 80) H.hitUnit(u, e.atk * 1.6, '#ff7a2a'); H.hurtEnemy(e, e.maxHp * 0.3, '#ff7a2a', true); H.float(e.x, e.y - 50, '폭발!', '#ff7a2a', true); H.burst(e.x, '#ff7a2a'); } } },
  woodsman: { name: '벌목', desc: '네 번째 일격마다 모두를 베어 넘긴다',
    hit(e, u, H) { const a = e.ab; a.n = (a.n || 0) + 1; if (a.n % 4 === 0) { for (const o of H.alive()) if (o !== u) H.hitUnit(o, e.atk * 0.8, '#c8c0b0'); H.float(e.x, e.y - 50, '벌목', '#c8c0b0', true); } return 1; } },
  snowqueen: { name: '서리', desc: '공격이 몸을 얼려 느리게 하고, 때때로 한 명을 얼린다',
    hit(e, u) { u.slowT = 3; return 1; },
    tick(e, dt, H) { if (H.every(e, 'freeze', 9, dt)) { const u = pick(H.alive()); if (u) { u.stunT = 2; H.float(u.x, u.y - 46, '빙결', '#9ad8ff', true); } } } },
  singing: { name: '노래', desc: '살아 있는 동안 다른 적들이 더 세게 친다',
    aura: 1.25 },
  teddy: { name: '포옹', desc: '끌어안아 움직이지 못하게 한다',
    hit(e, u, H) { if (Math.random() < 0.3) { u.stunT = 2; H.float(u.x, u.y - 46, '포옹', '#b08a6a', true); return 1.3; } return 1; } },
  redshoes: { name: '춤', desc: '칠수록 점점 빨라진다',
    hit(e) { e.interval = Math.max(e.d.interval * 0.4, e.interval * 0.94); return 1; } },
  judgement: { name: '심판', desc: '때때로 가장 약한 자를 심판한다 — 버티지 못하면 쓰러진다',
    tick(e, dt, H) { if (H.every(e, 'judge', 9, dt)) { const us = H.alive(); if (!us.length) return; const u = us.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b)); H.float(u.x, u.y - 50, '심판', '#e8d8a0', true); H.radioLog(`${e.name}의 저울이 ${u.f.name}을(를) 가리켰다.`, 'bad'); H.hitUnit(u, u.hp < u.maxHp * 0.3 ? u.hp + 1 : u.maxHp * 0.25, '#e8d8a0'); } } },
  redhood: { name: '사냥', desc: '가장 약한 상대만 노린다',
    target(e, us) { return us.reduce((a, b) => (a.hp < b.hp ? a : b)); }, hit() { return 1.3; } },
  magicalgirl: { name: '사랑과 증오의 이름으로', desc: '칠 때마다 게이지가 차고, 가득 차면 현장을 가로지르는 빛줄기를 쏜다',
    hit(e, u, H) { const a = e.ab; a.g = (a.g || 0) + 1; H.float(e.x, e.y - 40, '♥'.repeat(Math.min(5, a.g)), '#ff80c0'); if (a.g >= 5) { a.g = 0; H.beam(e.x, e.y - 20, -1, '#ff80c0'); for (const o of H.alive()) H.hitUnit(o, e.atk * 1.8, '#ff80c0'); H.float(e.x, e.y - 56, '사랑과 증오의 이름으로!', '#ff80c0', true); H.radioLog(`${e.name}이(가) 빛줄기를 쏘았다!`, 'bad'); } return 1; } },
  current: { name: '해류', desc: '때때로 모두를 관통하며 돌진한다',
    tick(e, dt, H) { if (H.every(e, 'dash', 7, dt)) { for (const u of H.alive()) H.hitUnit(u, e.atk * 1.2, '#5a8ab0'); H.float(e.x, e.y - 50, '돌진', '#5a8ab0', true); H.burst(e.x, '#5a8ab0'); } } },
  snowapple: { name: '덩굴', desc: '살아 있는 동안 덩굴이 모두를 조인다',
    tick(e, dt, H) { if (H.every(e, 'vine', 2, dt)) for (const u of H.alive()) H.hitUnit(u, u.maxHp * 0.015, '#4aa04a'); } },
  nakednest: { name: '번식', desc: '칠 때마다 벌레가 기어 나온다',
    hit(e, u, H) { if (Math.random() < 0.3 && H.foes().length < 8) H.summon('nestworm', e.x + 8, 1); return 1; } },
  firebird: { name: '불꽃', desc: '주기적으로 불길을 퍼뜨리고, 스스로 다시 타오른다',
    tick(e, dt, H) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.008 * dt); if (H.every(e, 'flare', 6, dt)) { for (const u of H.alive()) H.hitUnit(u, e.atk * 0.8, '#ff9a3a'); H.float(e.x, e.y - 50, '불꽃', '#ff9a3a', true); H.burst(e.x, '#ff9a3a'); } } },
  orchestra: { name: '악장', desc: '악장이 넘어갈수록 연주가 거세진다',
    tick(e, dt, H) { if (H.every(e, 'mvt', 8, dt)) { const a = e.ab; a.m = Math.min(4, (a.m || 0) + 1); for (const u of H.alive()) H.hitUnit(u, e.atk * (0.4 + 0.25 * a.m), '#e8e8f0'); H.float(e.x, e.y - 56, `제${a.m}악장`, '#e8e8f0', true); } } },
  nothing: { name: '탈피', desc: '체력이 절반 아래로 떨어지면 껍질을 벗고 더 강해진다',
    tick(e, dt, H) { if (!e.ab.shed && e.hp < e.maxHp * 0.5) { e.ab.shed = 1; e.atk *= 1.5; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.2); H.float(e.x, e.y - 50, '껍질을 벗었다', '#c84a4a', true); } } },
  mountain: { name: '포식', desc: '친 만큼 회복하고, 누가 쓰러지면 더 커진다',
    hit(e, u, H, dmg) { e.hp = Math.min(e.maxHp, e.hp + dmg * 0.3); return 1; },
    fall(e, H) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.25); e.atk *= 1.1; H.float(e.x, e.y - 50, '웃음소리', '#8a8a8a', true); } },
  whitenight: { name: '강림', desc: '사도들을 부르고, 모든 적을 치유하며, 방어를 꿰뚫는다',
    spawn(e, H) { H.summon('apostle', e.x + 30, 2); H.radioLog('하얀 빛 속에서 사도들이 걸어 나왔다.', 'bad'); },
    tick(e, dt, H) { if (H.every(e, 'bless', 3, dt)) for (const o of H.foes()) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.02); },
    pierce: true },
};

// ---------- E.G.O 장비의 능력 (환상체 능력의 열화판) ----------
// hit(u, e, H, dmg) → 추가 배율 · kill(u, e, H) · tick(u, dt, H)
const EGO_AB = {
  beak:      { desc: '여섯 번째 일격마다 두 배', hit(u) { u.eg.n = (u.eg.n || 0) + 1; return u.eg.n % 6 === 0 ? 2 : 1; } },
  penitence: { desc: '가끔 상처를 아물게 한다', hit(u, e, H) { if (Math.random() < 0.15) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.04); } return 1; } },
  regret:    { desc: '위태로울수록 빨리 휘두른다', speed(u) { return u.hp < u.maxHp * 0.5 ? 0.75 : 1; } },
  horn:      { desc: '가끔 상대를 굳게 한다', hit(u, e) { if (Math.random() < 0.1) e.st.stun = Math.max(e.st.stun, e.boss ? 0.4 : 0.8); return 1; } },
  redeyes:   { desc: '물린 상처가 더 깊어진다', hit(u, e) { if (Math.random() < 0.2) e.st.bleed += 3; return 1; } },
  lantern:   { desc: '처음 치는 적에게 1.6배', hit(u, e) { e.lanterned = e.lanterned || {}; if (!e.lanterned[u.f.id]) { e.lanterned[u.f.id] = 1; return 1.6; } return 1; } },
  ecstasy:   { desc: '가끔 상대를 잠재운다', hit(u, e, H) { if (Math.random() < 0.08) { e.st.stun = Math.max(e.st.stun, e.boss ? 0.6 : 1.5); H.float(e.x, e.y - 40, '잠', '#9a8af0'); } return 1; } },
  solitude:  { desc: '남은 동료가 적을수록 강하다', hit(u, e, H) { return H.alive().length <= 2 ? 1.25 : 1; } },
  match:     { desc: '쓰러뜨린 적이 터진다', kill(u, e, H) { for (const o of H.foes()) if (Math.abs(o.x - e.x) < 50) { o.st.burn += 2; H.hurtEnemy(o, u.atk * 0.5, '#ff7a2a', true); } } },
  logging:   { desc: '다섯 번째 일격마다 주변을 벤다', hit(u, e, H) { u.eg.n = (u.eg.n || 0) + 1; if (u.eg.n % 5 === 0) for (const o of H.foes()) if (o !== e && Math.abs(o.x - e.x) < 60) H.hurtEnemy(o, u.atk * 0.6, '#c8c0b0', true); return 1; } },
  frost:     { desc: '맞은 적이 느려진다', hit(u, e) { e.cd += e.interval * 0.15; return 1; } },
  harmony:   { desc: '가끔 동료들의 손이 빨라진다', hit(u, e, H) { if (Math.random() < 0.2) for (const o of H.alive()) if (o !== u) o.cd -= 0.2; return 1; } },
  paw:       { desc: '가끔 끌어안아 묶는다', hit(u, e) { if (Math.random() < 0.1) { e.st.stun = Math.max(e.st.stun, e.boss ? 0.4 : 1); return 1.2; } return 1; } },
  sanguine:  { desc: '같은 적을 계속 치면 점점 세진다', hit(u, e) { if (u.eg.t === e) u.eg.c = Math.min(5, (u.eg.c || 0) + 1); else { u.eg.t = e; u.eg.c = 0; } return 1 + 0.06 * u.eg.c; } },
  justitia:  { desc: '약해진 적을 끝장낸다', hit(u, e, H) { if (!e.boss && e.hp < e.maxHp * 0.2) { H.float(e.x, e.y - 40, '심판', '#e8d8a0', true); return 99; } return e.boss && e.hp < e.maxHp * 0.1 ? 1.5 : 1; } },
  crimson:   { desc: '큰 사냥감에게 강하다', hit(u, e) { return e.boss ? 1.25 : 1; } },
  lovehate:  { desc: '게이지가 차면 모든 적에게 빛줄기', hit(u, e, H, dmg) { u.eg.g = (u.eg.g || 0) + 1; if (u.eg.g >= 12) { u.eg.g = 0; H.beam(u.x, u.y - 20, 1, '#ff80c0'); for (const o of H.foes()) H.hurtEnemy(o, dmg * 2, '#ff80c0', true); H.float(u.x, u.y - 50, '사랑과 증오의 이름으로!', '#ff80c0', true); } return 1; } },
  rapture:   { desc: '가끔 적진을 관통한다', hit(u, e, H, dmg) { if (Math.random() < 0.12) for (const o of H.foes()) if (o !== e && Math.abs(o.x - e.x) < 80) H.hurtEnemy(o, dmg * 0.5, '#5a8ab0', true); return 1; } },
  greenstem: { desc: '덩굴이 상처를 벌린다', hit(u, e) { e.st.bleed += 2; return 1; } },
  exuviae:   { desc: '쓰러뜨리면 기운을 되찾는다', kill(u) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.06); } },
  feather:   { desc: '불씨를 남기고, 스스로 조금씩 회복한다', hit(u, e) { e.st.burn += 2; return 1; }, tick(u, dt) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.005 * dt); } },
  dacapo:    { desc: '네 번째 일격마다 모든 적에게 울린다', hit(u, e, H, dmg) { u.eg.n = (u.eg.n || 0) + 1; if (u.eg.n % 4 === 0) { for (const o of H.foes()) if (o !== e) H.hurtEnemy(o, dmg * 0.35, '#e8e8f0', true); H.float(u.x, u.y - 46, '♪', '#e8e8f0', true); } return 1; } },
  mimicry:   { desc: '준 피해의 일부를 빨아들인다', hit(u, e, H, dmg) { u.hp = Math.min(u.maxHp, u.hp + dmg * 0.12); return 1; } },
  smile:     { desc: '쓰러뜨릴수록 강해진다 (그날 동안)', kill(u) { u.eg.k = Math.min(10, (u.eg.k || 0) + 1); }, hit(u) { return 1 + 0.03 * (u.eg.k || 0); } },
  paradise:  { desc: '방어를 꿰뚫고, 가끔 동료를 치유한다', pierce: true, hit(u, e, H) { if (Math.random() < 0.04) for (const o of H.alive()) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.05); return 1; } },
};
for (const k in EGO_AB) if (EGO[k]) EGO[k].desc = `${EGO[k].desc} — ${EGO_AB[k].desc}`;
for (const k of ABNO_KEYS) ENEMIES[k].ab = k.slice(3);   // 환상체마다 고유 능력
