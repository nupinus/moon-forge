'use strict';
// ============================================================
//  후반 콘텐츠 — 돈을 쓸 곳
//  공방 시설 · E.G.O 개화 · 경매장 · 재각인 · K사 앰플 계약 · 원정(다른 구의 분점)
// ============================================================
const M_ = KRW * 1000;   // 100만 안

// ---------- 공방 시설: 단조를 직접 좋게 만든다 (원정 분점에는 없다) ----------
const FACILITIES = {
  furnace:   { name: '개량 화로',     fx: '가열할 때 내구 +1 (작업마다 단계만큼)', minW: 4, cost: [6, 18] },
  quench:    { name: '담금질 수조',   fx: '합성재료 내구 +1',  minW: 4, cost: [7] },
  anvil:     { name: '단련 모루',     fx: '두드릴수록 쌓이는 파괴 위험 감소', minW: 4, cost: [8, 22, 50] },
  bench:     { name: '정밀 작업대',   fx: '대성공 +1.5%',      minW: 5, cost: [10, 28, 60] },
};
function facLv(k) { const v = (S && S.fac && S.fac[k]) || 0, F = FACILITIES[k]; return F ? Math.min(v, F.cost.length) : v; }
function freeReheats() { return FREE_REHEATS; }
// 단련 모루: 한 번 두드릴 때마다 쌓이는 파괴 위험 (기본 1.3%p)
function strikeRisk() { return 1.3 - 0.15 * facLv('anvil'); }

// ---------- 인장: 각 구 둥지 경계의 주인을 쓰러뜨리면 얻는다 (수집) ----------
function sealsOf() { const o = S.home || S; return (o.seals = o.seals || {}); }
function sealCount() { return Object.keys(sealsOf()).length; }
const SEAL_GREAT = 0.4, SEAL_SALE = 0.02;   // 인장 하나마다 대성공 +0.4% · 판매가 +2%

// ---------- 잔흔 · 복구 ----------
// 부서진 장비는 잔흔으로 남는다 — 같은 등급대의 파편을 모아 오면 되살릴 수 있다 (장비마다 한 번). 잔흔은 시장에 팔 수도 있다.
//  · 개량하다 부서진 장비: 개량을 시작하기 전 모습으로
//  · 새로 만들다 부서진 장비: 레어 이상으로 굴려졌다면, 넣었던 재료로 (주재료·형태재료·속성재료·E.G.O 추출물)
// 파편은 장비가 부서질 때마다 그 등급대의 것이 하나 나온다.
const REMNANT_MIN_RARITY = 2, REMNANT_SELL = 0.3;
const SHARDS = [
  { id: 'shard1', name: '잔해 조각',   color: '#9a948e', from: 0 },   // 커먼 · 언커먼
  { id: 'shard2', name: '단련된 파편', color: '#5fa8ff', from: 2 },   // 레어 · 슈퍼레어
  { id: 'shard3', name: '명품의 파편', color: '#ff8a3a', from: 4 },   // 유니크 · 에픽
  { id: 'shard4', name: '전설의 파편', color: '#4af0e0', from: 6 },   // 마스터 · 그랜드마스터
];
SHARDS.forEach((T, i) => { MATERIALS[T.id] = { name: T.name, grade: i + 2, cat: 'item', color: T.color, price: 0 }; MAT_ORDER.push(T.id); });
// ---------- 불완전 개화 (공방 Lv3 이후 첫 개점) ----------
// 원작의 '불완전한 개화 E.G.O' — 확신이 덜 선 채 반쯤 피어난 자아. 이후 공방 Lv5의 개화가 온전한 발현이다.
function volatileBloom() {
  if (S.volatile || S.outskirts || S.home || S.wLevel < 3) return false;
  S.volatile = true; save();
  addLog(`✿ 「${S.workshopName}」 공방이 불안정하게 피어났다 — 불완전한 개화.`, 'gold');
  const el = document.createElement('div'); el.id = 'volatileFx';
  el.innerHTML = `<div class="vf-glow"></div><div class="vf-petals">${Array.from({ length: 24 }, (_, i) => `<i style="--x:${Math.round(rand(-45, 45))}vw;--d:${rand(0, 1.2).toFixed(2)}s;--h:${i * 15}"></i>`).join('')}</div>
    <div class="vf-box"><h2 class="vf-title"><span class="rbw" data-t="불완전 개화">불완전 개화</span></h2>
    <p>개점하려는 순간, 공방이 숨을 들이켰다 — 그리고 반쯤 피어났다.</p>
    <p class="dim">아직 온전하지 않다. 그래도 작업물 하나에 한 번, 대가를 치르면 부서지려는 것을 붙잡아 준다.</p>
    <button class="big gold" data-act="volatileOk">확인</button></div>`;
  document.body.appendChild(el); Sound.great(); Game.paused = true;
  return true;
}

// ---------- 공방 개화 ----------
// 공방 Lv5 이후 마지막 승급. 공방이 공방주의 E.G.O로 피어난다 (원작: 건물로 발현한 개화 E.G.O — 도서관·공방).
// 개화한 공방에서만 잔흔을 되살릴 수 있다.
const SHOP_BLOOM = { money: 150 * 1000 * KRW, fame: 1200 };
function shopBloomed() { return !!(S && (S.home ? S.home.bloomed : S.bloomed)); }
// 재료 하나의 값어치: 시장가 → 암시장가 → 경매 감정가(E.G.O 추출물) 순으로
function matWorth(id) {
  const M = MATERIALS[id]; if (!M) return 0;
  if (M.price > 0) return M.price;
  const bm = BM_GOODS.find(x => x.id === id); if (bm) return bm.p * KRW;
  if (M.cat === 'ego') { const k = ABNO_KEYS.find(a => ENEMIES[a].abno === id), risk = k ? ENEMIES[k].risk : 'HE'; return ({ ZAYIN: 6, TETH: 9, HE: 15, WAW: 26, ALEPH: 45 }[risk] || 10) * M_; }
  return 100 * KRW;
}
// 복구 비용 — 재료로 돌아가는 잔흔: 재료 값어치의 30% / 장비로 돌아가는 잔흔: 판매가 · 단계 · 등급 · 특성(레벨 합·개수) · E.G.O · 개화를 모두 따진다
function restoreCost(r) {
  if (r.mats) return Math.round((100 * KRW + Object.entries(r.mats).reduce((a, [id, n]) => a + matWorth(id) * n, 0) * 0.3) / 10000) * 10000;
  const g = r.gear, tr = g.traits || [], lv = tr.reduce((a, t) => a + t.lv, 0);
  const c = (300 * KRW + (g.value || 0) * 0.35) * (1 + 0.02 * (g.q || 0)) * (1 + 0.08 * (g.rarity || 0)) * (1 + 0.02 * lv) * (1 + 0.05 * tr.length)
    * (g.ego ? 1.3 : 1) * (g.manifest ? 1.5 : 1);
  return Math.round(c / 10000) * 10000;
}
function egoMatOf(ego) { return Object.keys(MATERIALS).find(k => MATERIALS[k].ego === ego); }   // E.G.O → 그 추출물 재료
function shardOf(rarity) { let r = SHARDS[0]; for (const T of SHARDS) if ((rarity || 0) >= T.from) r = T; return r.id; }
function remnantNeed(g) { return 2 + Math.floor((g.q || 0) / 15); }
// 부서진 순간 — Forge.destroy에서 부른다
function onGearDestroyed(b) {
  const rar = b.base ? (b.base.rarity || 0) : (b.preRarity != null ? b.preRarity : rollRarity(b));
  const sh = shardOf(rar);
  S.stock[sh] = (S.stock[sh] || 0) + 1;
  let note = `${MATERIALS[sh].name} 1`;
  let g = null, mats = null;
  if (b.base && !b.base.restored) g = JSON.parse(JSON.stringify(b.base));
  else if (!b.base && rar >= REMNANT_MIN_RARITY) {          // 새로 만들던 것: 어떤 장비가 될 뻔했는지 보여 주고, 복구하면 넣었던 재료로 돌아간다
    const snap = JSON.parse(JSON.stringify(Object.assign({}, b, { base: null }))); snap.preRarity = rar; snap.engraves = (b.engraves || []).slice();
    g = makeGear(snap); delete g.freshEngraves;
    if (g.contraband) g = null;                              // 금기품이 될 것은 잔흔도 남기지 않는다
    else { mats = {}; for (const id of [b.main, b.shape, b.core, b.ego ? egoMatOf(b.ego) : null]) if (id) mats[id] = (mats[id] || 0) + 1; }
  }
  if (g) {
    (S.remnants = S.remnants || []).push({ id: uid(), gear: g, mats, shard: sh, need: mats ? 2 : remnantNeed(g), day: S.day });
    note += ' · 잔흔이 남았다';
  }
  return note;
}

// ---------- 재각인 전용 재료 ----------
MATERIALS.rune = { name: '각인 인두', grade: 5, cat: 'item', color: '#ff9a4a', price: 0 };   // 암시장(재각인이 열린 뒤)·보스·경매
MAT_ORDER.push('rune');
const RUNE_BOSS_CHANCE = 0.08;   // 4번째 지역부터 보스가 떨어뜨린다

// ---------- 개화 E.G.O ----------
// 환상체에서 빌려 온 것이 아니라, 사람이 스스로 자아를 발현한 E.G.O (원작 설정).
// 무너질 듯한 순간에 찾아오는 유혹을 거부할 때 발현한다 — 이 게임에서는:
// 주인에게 귀속된 마스터 이상 무기·방어구를 지닌 채 위기(체력 25% 아래)에 빠질 때마다, 낮은 확률로.
// 발현하면 그 장비는 그 사람의 자아가 되어 능력치가 오르고, 싸우는 방식 자체가 바뀐다.
const MF_RARITY = 6, MF_HP = 0.25, MF_CHANCE = 0.03;
function mfCands(f) { return [f.weapon, f.armor].filter(g => g && !g.manifest && g.owner === f.id && (g.rarity || 0) >= MF_RARITY); }
function canManifest(f) { return !!f && mfCands(f).length > 0; }
const tr = (H, a, b, c, w) => H.tracers.push({ x1: a.x + 4, y1: a.y - 14, x2: b.x, y2: b.y - 14, life: w || 0.14, c });
function utick(u, k, sec, dt) { u.mft = u.mft || {}; u.mft[k] = (u.mft[k] || 0) + dt; if (u.mft[k] >= sec) { u.mft[k] = 0; return true; } return false; }
// 원작의 개화 E.G.O들에서 결을 따온 능력 (이름은 새로 지었다). slot: 무기·방어구
const MANIFEST_AB = {
  // ---- 무기 ----
  blood:   { slot: 'weapon', from: 'bleed', name: '피의 군주',
    desc: '피를 조종해 싸운다 — 공격이 멀리 꽂히는 피의 창이 된다(출혈 6) · 5초마다 피 흘리는 모든 적의 피를 터뜨려(출혈×4) 그 일부를 빨아들인다',
    stats(st) { st.range = 110; st.ranged = true; },
    hit(u, e, H) { e.st.bleed += 6; tr(H, u, e, '#ff2a3a', 0.16); return 1; },
    tick(u, dt, H) { if (!utick(u, 'blood', 5, dt)) return; let n = 0;
      for (const o of H.foes()) if (o.st.bleed > 0) { const d = o.st.bleed * 4; o.st.bleed = 0; tr(H, o, u, '#ff2a3a', 0.3); H.hurtEnemy(o, d, '#ff2a3a', true); u.hp = Math.min(u.maxHp, u.hp + d * 0.15); n++; }
      if (n) H.float(u.x, u.y - 50, '혈류 폭발', '#ff2a3a', true); } },
  bloom:   { slot: 'weapon', from: 'tremor', name: '만개',
    desc: '휘두를 때마다 꽃잎 폭풍이 일어 주변의 적 모두를 벤다(35% · 침잠 2) · 적을 쓰러뜨리면 꽃향기가 아군 모두를 치유한다',
    hit(u, e, H, dmg) { for (const o of H.foes()) if (o !== e && Math.abs(o.x - e.x) < 80) { H.hurtEnemy(o, Math.max(1, dmg * 0.35 - o.def * 0.6), '#ffe070', false); o.st.sinking = Math.min(25, o.st.sinking + 2); }
      e.st.sinking = Math.min(25, e.st.sinking + 2); H.float(e.x, e.y - 30, '✿', '#ffe070'); return 1; },
    kill(u, e, H) { for (const a of H.alive()) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.04); } },
  harpoon: { slot: 'weapon', from: 'charge', name: '포경 작살',
    desc: '공격이 작살 투척으로 바뀐다 — 사거리 안의 적을 한 줄로 꿰뚫고(75%) 끌어당긴다 · 다섯 번째마다 가장 큰 적에게 포경(300%)',
    stats(st) { st.range = 140; st.ranged = true; },
    hit(u, e, H, dmg) { u.mfN = (u.mfN || 0) + 1; tr(H, u, e, '#9ad0ff', 0.18);
      for (const o of H.foes()) if (o !== e && o.x > u.x && o.x <= e.x + 40) { H.hurtEnemy(o, Math.max(1, dmg * 0.75 - o.def * 0.6), '#9ad0ff', false); o.x += (u.x - o.x) * 0.25; }
      if (u.mfN % 5 === 0) { const big = H.foes().reduce((a, b) => b.maxHp > a.maxHp ? b : a, e); tr(H, u, big, '#e0f4ff', 0.3); H.hurtEnemy(big, Math.max(1, dmg * 3 - big.def * 0.6), '#e0f4ff', false, true); H.float(big.x, big.y - 50, '포경', '#e0f4ff', true); }
      return 1; } },
  wings:   { slot: 'weapon', from: 'burn', name: '밀랍 날개',
    desc: '하늘로 치솟아 내리꽂는다 — 공격 속도 +65% · 이동 +80% · 적중마다 화상 6과 불꽃 파편(주변 30%) · 날개가 녹아 매초 체력 0.6%를 잃는다',
    stats(st) { st.speed *= 1.8; },
    speed() { return 0.6; },
    hit(u, e, H, dmg) { e.st.burn += 6; for (const o of H.foes()) if (o !== e && Math.abs(o.x - e.x) < 45) { H.hurtEnemy(o, Math.max(1, dmg * 0.3), '#ff8a3a', true); o.st.burn += 2; } return 1; },
    tick(u, dt) { u.hp = Math.max(1, u.hp - u.maxHp * 0.006 * dt); } },
  proxy:   { slot: 'weapon', from: 'poise', name: '대행',
    desc: '가장 강한 적을 지령의 표적으로 삼아 그 곁으로 순간이동한다 · 표적에게 피해 +100% · 표적을 쓰러뜨리면 곧바로 다음 표적으로',
    tick(u, dt, H) { const t = H.foes().reduce((a, b) => (!a || b.maxHp > a.maxHp ? b : a), null); u.mfMark = t;
      if (t && Math.abs(t.x - u.x) > 40 && utick(u, 'blink', 4, dt)) { u.x = t.x - 18; u.cd = 0; H.float(u.x, u.y - 46, '대행', '#d8d8f4', true); } },
    hit(u, e) { return e === u.mfMark ? 2 : 1; },
    kill(u, e) { if (e === u.mfMark) { u.cd = 0; if (u.mft) u.mft.blink = 99; } } },
  harvest: { slot: 'weapon', from: 'rupture', name: '수확의 낫',
    desc: '낫처럼 휘둘러 주변을 한꺼번에 벤다(85%) · 거둔 목숨마다 공격력 +8%(최대 12)와 체력 3%',
    hit(u, e, H, dmg) { for (const o of H.foes()) if (o !== e && Math.abs(o.x - u.x) < 60) H.hurtEnemy(o, Math.max(1, dmg * 0.85 - o.def * 0.6), '#c8e070', false); return 1 + 0.08 * (u.mfStack || 0); },
    kill(u) { u.mfStack = Math.min(12, (u.mfStack || 0) + 1); u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.03); } },
  oath:    { slot: 'weapon', from: 'sinking', name: '꺾이지 않는 맹세',
    desc: '치명타 +35% · 치명타는 곧바로 한 번 더 벤다(100%) — 적을 굳게 한다',
    crit: 0.35,
    hit(u, e, H, dmg, crit) { if (crit && !e.dead) { H.hurtEnemy(e, Math.max(1, dmg - e.def * 0.6), '#ffd84a', false, true); e.st.stun = Math.max(e.st.stun, e.boss ? 0.3 : 0.8); } return 1; } },
  // ---- 방어구 ----
  armor:   { slot: 'armor', name: '불굴의 갑주',
    desc: '받는 피해 -25% · 피해 15%를 되돌려 준다 · 무너지려는 순간 한 번, 3초 동안 어떤 공격도 받지 않는다',
    taken(u, d, e, H) { if (u.mfInv > 0) return 0;
      if (!u.mfInvUsed && u.hp - d * 0.75 < u.maxHp * 0.2) { u.mfInvUsed = true; u.mfInv = 3; H.float(u.x, u.y - 50, '불굴', '#ff5a5a', true); return 0; }
      if (e && !e.dead) H.hurtEnemy(e, Math.max(1, d * 0.15), '#ff5a5a', true); return d * 0.75; },
    tick(u, dt) { if (u.mfInv > 0) u.mfInv -= dt; } },
  bond:    { slot: 'armor', name: '이어진 인연',
    desc: '아군이 살아 있는 한 쓰러지지 않는다 · 곁의 아군이 받는 피해 -20%',
    taken(u, d, e, H) { if (u.hp - d < 1 && H.alive().some(a => a !== u)) return Math.max(0, u.hp - 1); return d; },
    guard: 0.8 },
  veil:    { slot: 'armor', name: '피의 장막',
    desc: '흘린 피가 장막이 된다 — 아군이 입힌 피해의 15%가 보호막으로 쌓여(최대 체력의 50%) 피해를 대신 받는다',
    taken(u, d) { const s = u.mfShield || 0; if (s <= 0) return d; const a = Math.min(s, d); u.mfShield = s - a; return d - a; },
    dealt(u, dmg) { u.mfShield = Math.min(u.maxHp * 0.5, (u.mfShield || 0) + dmg * 0.15); } },
  thorn:   { slot: 'armor', name: '가시 정원',
    desc: '몸에서 가시가 돋는다 — 공격한 적에게 피해 40%를 가시로 돌려주고 출혈 5',
    taken(u, d, e, H) { if (e && !e.dead) { H.hurtEnemy(e, Math.max(1, d * 0.4), '#6fdc8c', true); e.st.bleed += 5; } return d; } },
};
function mfAbsOf(u) { return (u.mfAbs || []).map(k => MANIFEST_AB[k]).filter(Boolean); }
// 장비에 가장 짙게 새겨진 결을 따라 능력이 정해진다
function pickManifestAb(g) {
  const pool = Object.keys(MANIFEST_AB).filter(k => MANIFEST_AB[k].slot === g.kind);
  const top = (g.traits || []).filter(t => !TRAITS[t.id].res).sort((a, b) => b.lv - a.lv)[0];
  const base = top ? (TRAITS[top.id].strong || top.id) : null;
  const fit = pool.filter(k => MANIFEST_AB[k].from === base);
  return pick(fit.length && Math.random() < 0.75 ? fit : pool);
}
// 전투 중 발현 — Hunt에서 부른다
function manifestNow(u, H) {
  const f = u.f, g = pick(mfCands(f)); if (!g) return;
  const top = (g.traits || []).filter(t => !TRAITS[t.id].res).sort((a, b) => b.lv - a.lv)[0];
  g.manifest = f.id; g.mfTrait = top ? top.id : null; g.mfAb = pickManifestAb(g);
  g.atk = Math.round((g.atk || 0) * 1.25); g.def = Math.round((g.def || 0) * 1.25); g.hp = Math.round((g.hp || 0) * 1.25);
  if (!g.customName) g.name = '개화 E.G.O ' + g.name;
  recomputeTraits(g);
  H.refreshUnit(u);
  u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.5);
  const A = MANIFEST_AB[g.mfAb];
  H.announce = { text: `✿ 개화 — ${A.name}`, life: 3.4, color: '#ffe8a0' };
  for (let i = 0; i < 10; i++) H.tracers.push({ x1: u.x, y1: u.y - 14, x2: u.x + rand(-60, 60), y2: u.y - 14 + rand(-50, 30), life: 0.5, c: ['#ff5a6a', '#ffd84a', '#6fdc8c', '#5fd0ff', '#b07aff'][i % 5] });
  H.float(u.x, u.y - 50, '개화 E.G.O', '#ffe8a0', true);
  H.radioLog(`✿ ${f.name} — 무너지려던 순간, 유혹을 거부했다. 자아가 발현했다: 「${A.name}」`, 'good');
  addLog(`✿ ${f.name}의 개화 E.G.O 발현 — 「${g.name}」 · ${A.name}`, 'gold');
  UI.huntAlert(`✿ ${f.name} — 개화 E.G.O 발현`, 'good');
  Sound.great(); UI.mark('partyStruct', 'storage'); save();
}

// 장비 특성을 다시 계산한다 (재각인·개화 뒤)
function recomputeTraits(g) {
  const F = FORMS[g.form];
  const tm = traitLevels({ core: g.core, main: g.main, engraves: g.engraves || [] }, F, g.forgeCount || 0, g.bonus);
  if (g.ego) tm[EGO[g.ego].trait] = Math.min(TRAIT_MAX, (tm[EGO[g.ego].trait] || 0) + 3);
  if (g.manifest && g.mfTrait) tm[g.mfTrait] = Math.min(TRAIT_MAX, (tm[g.mfTrait] || 0) + 2);   // 개화 E.G.O: 가장 깊이 새겨진 것이 더 짙어진다
  g.traits = Object.keys(tm).map(id => ({ id, lv: tm[id] }));
  g.value = gearValue(g);
  iconCanvasCache.delete(iconKey(g)); iconURLCache.delete(iconKey(g));
}

// ---------- 재각인 비용 ----------
// 잠근 개수 · 장비 등급 · 주재료 등급 · 단조 횟수 · 잠근 각인의 세기에 따라 오른다
function reengraveCost(g, locks) {
  const E = g.engraves || [], lk = [...locks].filter(i => E[i]);
  const lockedLv = lk.reduce((a, i) => a + E[i].lv, 0);
  const money = (0.4 * M_ + g.value * 0.25) * (1 + 0.5 * lk.length) * (1 + 0.25 * (g.rarity || 0)) * (1 + 0.1 * MATERIALS[g.main].grade)
    * (1 + 0.02 * (g.forgeCount || 0)) * (1 + 0.1 * lockedLv);
  return { money: Math.round(money / 10000) * 10000, runes: 1 + Math.floor(lk.length / 2) };
}

// ---------- K사 관계 · 재생 앰플 계약 ----------
const K_REL_NEED = 40;
function ampuleCost() { return (10 + 3 * S.wLevel) * M_; }

// ---------- 경매장 ----------
// 마감 때 가끔 열린다. 공방 등급과 갈 수 있는 지역이 깊을수록 귀한 물건이 오른다.
const AUCTION_RIVALS = ['검은 장갑의 수집가', '휠스 인더스트리 대리인', '이름 없는 공방주', '둥지 귀족의 집사', '협회 조달 담당', '경매장 단골'];
function auctionLots() {
  const W = S.wLevel, deep = Math.max(...ZONES.map((z, i) => S.oGrade <= z.req ? zoneLv(i) : 0));
  const L = [];
  const egoOf = risk => ABNO_KEYS.filter(k => ENEMIES[k].risk === risk).map(k => ENEMIES[k].abno);
  if (W >= 2) L.push({ w: 5, items: { blackiron: 3 }, v: 1.2 }, { w: 5, items: { silk: 3 }, v: 1.1 }, { w: 3, items: { ink: 2 }, v: 1.0 }, { w: 3, items: { pendulum: 2 }, v: 1.0 }, { w: 3, items: { meteor: 2 }, v: 0.9 });
  if (W >= 3) L.push({ w: 4, items: { stigma: 2 }, v: 1.6 }, { w: 4, items: { dawn: 2 }, v: 2 }, { w: 3, items: { rune: 1 }, v: 4 }, { w: 2, items: { capacitor: 1 }, v: 1.4 });
  if (W >= 4) L.push({ w: 2, items: { rune: 3 }, v: 8 }, { w: 2, items: { scope: 1, mechcore: 1 }, v: 4 }, { w: 2, items: { servo: 1, synthskin: 1 }, v: 4 },
    { w: 2, items: { [pick(egoOf('TETH').concat(egoOf('ZAYIN')))]: 1 }, v: 9 }, { w: 1, items: { [pick(egoOf('HE'))]: 1 }, v: 15 });
  if (W >= 5 && deep >= 2.5) L.push({ w: 1, items: { [pick(egoOf('WAW'))]: 1 }, v: 26 }, { w: 1, items: { stigma: 3, dawn: 3, capacitor: 2 }, v: 6.5 });
  if (W >= 5 && deep >= 3.5) L.push({ w: 0.5, items: { [pick(egoOf('ALEPH'))]: 1 }, v: 45 });
  const minV = W >= 5 ? 3 : W >= 4 ? 1 : 0;   // 공방이 크면 싼 물건은 오르지 않는다
  return L.filter(l => l.v >= minV);
}
// 경매는 정해진 날 마감 때 열린다. 다음 경매 날짜와 출품작은 [경매] 탭에서 미리 볼 수 있다.
function pickLot() { const lots = auctionLots(); if (!lots.length) return null; const l = lots[weightedPick(Object.fromEntries(lots.map((x, i) => [i, x.w])))]; return { items: Object.assign({}, l.items), v: l.v }; }
const Auction = {
  on: false,
  // 다음 경매: 공방이 클수록 자주 (Lv2 5~8일 · Lv5 3~6일마다)
  plan() { const W = S.wLevel, lot = pickLot(); if (!lot) { S.auctionNext = null; return; } S.auctionNext = { day: S.day + randInt(5, 8) - (W >= 4 ? 1 : 0) - (W >= 5 ? 1 : 0), lot }; },
  roll() {
    if (S.outskirts || S.wLevel < 2) return false;
    if (!S.auctionNext) this.plan();
    if (!S.auctionNext || S.day < S.auctionNext.day) return false;
    const lot = S.auctionNext.lot; this.plan(); unlockFeat('auction');
    this.open(lot); return true;
  },
  open(given) {
    const lot = given || pickLot(); if (!lot) return;
    const value = Math.round(lot.v * M_ * rand(0.9, 1.15));
    const rivals = AUCTION_RIVALS.slice().sort(() => Math.random() - 0.5).slice(0, randInt(2, 4))
      .map(name => ({ name, max: Math.round(value * (Math.random() < 0.15 ? rand(1.5, 2.1) : rand(0.6, 1.45))) }));
    Object.assign(this, { on: true, lot, value, rivals, cur: Math.round(value * 0.5 / 10000) * 10000, leader: null, t: 7, total: 0 });
    if (typeof window !== 'undefined' && window.BOT_MUTE) return this.autoResolve();   // 개발용 봇: 즉시 결판
    this.render();
    Tut.run('auction', () => { clearInterval(this.iv); this.iv = setInterval(() => this.tick(0.1), 100); });
  },
  step() { return Math.max(10000, Math.round(this.cur * 0.08 / 10000) * 10000); },
  lotText() { return Object.entries(this.lot.items).map(([id, n]) => `${MATERIALS[id].name} ×${n}`).join(' · '); },
  bid() {
    if (!this.on || this.leader === 'me') return;
    const nx = this.cur + this.step();
    if (S.money < nx) return UI.toast('돈이 모자랍니다');
    this.cur = nx; this.leader = 'me'; this.t = Math.max(this.t, 2.5); Sound.click(); this.render();
  },
  pass() { this.leaderPassed = true; if (this.leader !== 'me') this.t = Math.min(this.t, 0.6); },
  tick(dt) {
    if (!this.on) return;
    this.t -= dt; this.total += dt;
    const nx = this.cur + this.step();
    const want = this.rivals.filter(r => r.name !== this.leader && r.max >= nx);
    if (want.length && Math.random() < 0.09) { const r = pick(want); this.cur = nx; this.leader = r.name; this.t = Math.max(this.t, 2.5); }
    if (this.t <= 0 || this.total > 22) return this.end();
    this.render();
  },
  render() {
    const me = this.leader === 'me', nx = this.cur + this.step();
    UI.showModal(`<div class="auction"><h2>경매장</h2>
      <div class="lot">${Object.keys(this.lot.items).map(id => matChip(id)).join(' ')}<div class="dim">${this.lotText()}</div></div>
      <div class="abid"><small>현재가</small><b>${fmtMoney(this.cur)}</b><span class="${me ? 'good' : 'bad'}">${this.leader ? (me ? '내 입찰' : this.leader) : '입찰 없음'}</span></div>
      <div class="atime"><div style="width:${Math.max(0, Math.min(100, this.t / 7 * 100))}%"></div></div>
      <div class="row"><button data-act="aucPass">포기</button><button class="gold big" data-act="aucBid" ${me || S.money < nx ? 'disabled' : ''}>입찰 ${fmtMoney(nx)}</button></div></div>`);
  },
  end() {
    clearInterval(this.iv); this.on = false;
    if (this.leader === 'me') this.win(); else { if (this.leader) addLog(`경매장 — 「${this.lotText()}」은(는) ${this.leader}에게 ${fmtMoney(this.cur)}에 낙찰되었다.`, ''); }
    UI.hideModal(); save(); if (S.phase === 'close') UI.renderClose();
  },
  win() {
    S.money -= this.cur;
    for (const [id, n] of Object.entries(this.lot.items)) S.incoming[id] = (S.incoming[id] || 0) + n;
    addLog(`경매장 낙찰 — 「${this.lotText()}」 ${fmtMoney(this.cur)}. 내일 아침 들어온다.`, 'gold');
    UI.toast('낙찰!', 'good');
  },
  // 봇: 가치의 1.2배와 가진 돈의 35% 가운데 작은 값까지 부른다 (두 번째로 높은 값 + 한 호가에 결판)
  autoResolve() {
    const mine = Math.min(this.value * 1.5, S.money * 0.5);
    const best = Math.max(...this.rivals.map(r => r.max));
    if (mine > best && mine >= this.cur) { this.cur = Math.min(mine, Math.max(this.cur, best) + this.step()); this.leader = 'me'; this.win(); }
    this.on = false;
  },
};

// ---------- 암시장 ----------
// 공방 Lv3부터, 마감 때 가끔 뒷골목 어딘가에 판이 선다 — 그날 마감에만 [암시장] 탭이 열린다.
// 일반 시장에는 없는 고급재료(공방 등급에 맞는 것까지)와, 재각인이 열린 뒤에는 각인 인두를 판다. 수량은 한정.
// 값(천 안): 4등급 ≈ 제값의 1.6배 · 5등급 ≈ 2.5배 · 인두 400만
const BM_GOODS = [
  { id: 'bloodvial', g: 3, p: 120 }, { id: 'hook', g: 3, p: 110 }, { id: 'greathilt', g: 3, p: 110 }, { id: 'sealant', g: 3, p: 110 },
  { id: 'shadecloth', g: 3, p: 90 }, { id: 'tachimount', g: 3, p: 120 }, { id: 'pivot', g: 3, p: 110 }, { id: 'armmount', g: 3, p: 120 },
  { id: 'pump', g: 3, p: 100 }, { id: 'brushtip', g: 3, p: 120 }, { id: 'vamplate', g: 3, p: 130 },
  { id: 'blackiron', g: 4, p: 205 }, { id: 'silk', g: 4, p: 310 }, { id: 'meteor', g: 4, p: 200 }, { id: 'ink', g: 4, p: 260 },
  { id: 'pendulum', g: 4, p: 260 }, { id: 'ember', g: 4, p: 270 }, { id: 'resonator', g: 4, p: 270 }, { id: 'servo', g: 4, p: 280 },
  { id: 'synthskin', g: 4, p: 280 }, { id: 'mechhinge', g: 4, p: 280 }, { id: 'scope', g: 4, p: 230 }, { id: 'mechcore', g: 4, p: 300 },
  { id: 'stigma', g: 5, p: 450 }, { id: 'dawn', g: 5, p: 650 }, { id: 'capacitor', g: 5, p: 800 },
];
const BM_MIN_W = 3, RUNE_PRICE = 4000;
const BlackMarket = {
  chance() { return 0.16 + 0.04 * (S.wLevel - BM_MIN_W); },   // Lv3 16% · Lv4 20% · Lv5 24% (마감마다)
  roll() {
    if (S.outskirts || S.wLevel < BM_MIN_W || Math.random() >= this.chance()) return false;
    const W = S.wLevel, pool = BM_GOODS.filter(x => x.g <= W && (!MATERIALS[x.id].gunpart || unlocked('gun')));
    const pickW = Object.fromEntries(pool.map((x, i) => [i, x.g === W ? 3 : x.g === W - 1 ? 2 : 1]));   // 공방 등급에 맞는 것일수록 자주
    const items = [], n = randInt(4, 6);
    for (let t = 0; t < 30 && items.length < n; t++) { const x = pool[weightedPick(pickW)]; if (!items.some(y => y.id === x.id)) items.push({ id: x.id, n: x.g >= 5 ? 1 : randInt(1, 3), price: Math.round(x.p * rand(0.9, 1.15)) * KRW }); }
    if (W >= 4) items.push({ id: 'rune', n: randInt(1, 2), price: RUNE_PRICE * KRW });   // 재각인이 열린 뒤
    S.bm = { day: S.day, items };
    unlockFeat('blackmarket');
    return true;
  },
  open() { return !!(S.bm && S.bm.day === S.day && S.phase === 'close'); },
};
function blackMarketTabHTML() {
  if (!BlackMarket.open()) return '<p class="dim">판이 걷혔다.</p>';
  return `<div class="card bmcard"><h3>암시장 <small class="dim">오늘 마감에만</small></h3>
    ${S.bm.items.map((x, i) => `<div class="mrow">${matChip(x.id)}<span class="dim">남은 ${x.n}</span><b>${fmtMoney(x.price)}</b>
      <button data-act="bmBuy" data-i="${i}" ${x.n <= 0 || S.money < x.price ? 'disabled' : ''}>사기</button></div>`).join('')}</div>`;
}

// ---------- 원정: 다른 구에 분점을 내고 해결사 한 명과 다시 시작한다 ----------
// 분점의 공방은 Lv1부터 (시설 없음). 사무소 등급·해금은 그대로. 돌아오면 그곳에서 얻은 모든 것을 가져온다.
// 동행한 해결사가 죽거나, 분점이 무너지면(세금·발톱) 원정은 실패하고 아무것도 가져오지 못한다.
const EXP_FUND = 2;   // 백만 안: 분점 시작 자금
function expCost() { return (30 + 10 * sealCount()) * M_; }
function expAvailable() { return !S.home && !S.outskirts && S.wLevel >= 5; }

const ENDGAME = {
  startExpedition(fid, dist) {
    if (!expAvailable()) return;
    const f0 = getFixer(fid); if (!f0 || !isAvailable(f0)) return UI.toast('나갈 수 있는 해결사를 고르세요');
    if (dist === S.district) return UI.toast('다른 구를 고르세요');
    const cost = expCost(); if (S.money < cost) return UI.toast('원정 비용이 모자랍니다');
    S.money -= cost;
    addLog(`${DISTRICTS[dist].name}에 분점을 냈다 — ${f0.name}이(가) 홀로 떠난다. (${fmtMoney(cost)})`, 'gold');
    save();
    const home = JSON.parse(JSON.stringify(S));
    const f = home.fixers.find(x => x.id === fid);
    home.fixers = home.fixers.filter(x => x.id !== fid); home.party = home.party.filter(id => id !== fid);
    const keep = { muted: home.muted, speed: home.speed, unlocks: home.unlocks, seen: home.seen, oGrade: home.oGrade, krw: true, valueV: home.valueV };
    applyZonesFor(false, dist);
    newGame(home.workshopName + ' 분점', home.officeName, dist);
    Object.assign(S, keep);
    S.fixers = [f]; S.party = [f.id]; S.money = EXP_FUND * M_;
    S.nextId = (home.nextId || 1) + 100000;
    S.home = home; S.exp = { dist, from: home.district };
    genOrders(); genCandidates();
    addLog(`「${S.workshopName}」 — ${district().name}에서 다시 시작한다. 동행: ${f.name}`, 'gold');
    Forge.resetAll(); UI.markAll();
    Game.startDay();
  },
  // 돌아온다: 분점에서 얻은 것을 본점으로
  returnHome() {
    if (!S.home) return;
    const home = S.home, ex = S;
    const got = [];
    for (const f of ex.fixers) { home.fixers.push(f); if (home.party.length < MAX_PARTY) home.party.push(f.id); }
    for (const g of ex.gear) home.gear.push(g);
    for (const box of [ex.stock, ex.incoming]) for (const k in box) home.stock[k] = (home.stock[k] || 0) + box[k];
    home.money += Math.max(0, ex.money); home.fame += Math.floor(ex.fame / 2);
    home.nextId = Math.max(home.nextId || 1, ex.nextId || 1);
    home.stats.crafted += ex.stats.crafted; home.stats.kills += ex.stats.kills; home.stats.bosses += ex.stats.bosses;
    got.push(`장비 ${ex.gear.length}점`, `자금 ${fmtMoney(Math.max(0, ex.money))}`);
    S = home; delete S.home;
    addLog(`원정에서 돌아왔다 — ${DISTRICTS[ex.exp.dist].name} ${ex.day - 1}일. 가져온 것: ${got.join(', ')}.`, 'gold');
    save(); Game.enterGame();
    UI.showModal(`<h2>귀환</h2><p>${DISTRICTS[ex.exp.dist].name}에서 ${ex.day - 1}일을 보내고 돌아왔다.</p><p>${got.join(' · ')}</p><button class="big gold" data-act="closeModal">확인</button>`);
  },
  failExpedition(reason) {
    if (!S.home) return false;
    const home = S.home, ex = S;
    S = home; delete S.home;
    addLog(`원정 실패 — ${DISTRICTS[ex.exp.dist].name}. ${reason} 분점에서 얻은 것은 모두 잃었다.`, 'bad');
    save(); Game.paused = false; Game.enterGame();
    UI.showModal(`<h2 class="bad">원정 실패</h2><p>${esc(reason)}</p><p class="dim">분점에서 얻은 것은 모두 잃었다.</p><button class="big" data-act="closeModal">확인</button>`);
    return true;
  },
};

// ---------- 마감 화면: [시설] 탭 (시설 · 개화 · 재각인) ----------
const RELOCK = {};   // gid → 잠근 각인 번호 Set
function engraveChips(g, lockable) {
  const L = RELOCK[g.id] || new Set();
  return (g.engraves || []).map((e, i) => { const T = TRAITS[e.id], on = L.has(i);
    return `<span class="trait ${T.strong ? 'strong' : T.res ? 'res' : ''} ${on ? 'locked' : ''}" style="--tc:${T.color}" ${lockable ? `data-act="reLock" data-gid="${g.id}" data-i="${i}"` : ''}>${on ? '🔒' : ''}${T.name} ${roman(e.lv)}</span>`; }).join('');
}
function workshopTabHTML() {
  const W = S.wLevel;
  const fac = Object.entries(FACILITIES).map(([k, F]) => {
    const lv = facLv(k), max = F.cost.length, c = lv < max ? F.cost[lv] * M_ : 0;
    const lock = W < F.minW;
    return `<div class="fac ${lv ? 'on' : ''}"><b>${F.name}</b> <small>${'■'.repeat(lv)}${'□'.repeat(max - lv)}</small><div class="dim small">${F.fx}</div>
      ${lv >= max ? '<span class="good small">완성</span>' : lock ? `<small class="dim">공방 Lv.${F.minW}</small>` : `<button data-act="buyFac" data-k="${k}" ${S.money < c ? 'disabled' : ''}>${fmtMoney(c)}</button>`}</div>`;
  }).join('');
  const bloom = '';
  const eng = S.gear.filter(g => (g.engraves || []).length);
  const re = `<div class="card"><h3>재각인 <small>보유 ${matChip('rune')} ${S.stock.rune || 0}</small></h3>${eng.length ? eng.map(g => {
    const c = reengraveCost(g, RELOCK[g.id] || new Set()), all = (RELOCK[g.id] || new Set()).size >= g.engraves.length;
    return gearHTML(g, { extra: `<div class="gtraits">${engraveChips(g, true)}</div><div class="enhrow"><span class="dim small">${fmtMoney(c.money)} · 각인 인두 ${c.runes}</span><button class="gold" data-act="reengrave" data-gid="${g.id}" ${all || S.money < c.money || (S.stock.rune || 0) < c.runes ? 'disabled' : ''}>재각인</button></div>` });
  }).join('') : '<div class="empty">각인이 있는 장비가 없습니다.</div>'}</div>`;
  return `<div class="card"><h3>공방 시설</h3><div class="facs">${fac}</div></div>${bloom}${re}`;
}

// ---------- 마감 화면: [원정] 탭 ----------
function expeditionTabHTML() {
  const so = sealsOf();
  const seals = `<div class="seals">${DISTRICTS.map((D, i) => `<span class="seal ${so[i] ? 'on' : ''}" title="${D.name}">${so[i] ? '◆' : '◇'} ${D.wing}</span>`).join('')}</div>
    <p class="small">인장 ${sealCount()}/${DISTRICTS.length} · 대성공 +${(sealCount() * SEAL_GREAT).toFixed(1)}% · 판매가 +${Math.round(sealCount() * SEAL_SALE * 100)}%</p>`;
  if (S.home) return `<div class="card"><h3>원정 중 — ${district().name}</h3>
    <p>본점: 「${esc(S.home.workshopName)}」 · ${DISTRICTS[S.exp.from].name}</p>${seals}
    <button class="gold big" data-act="expReturn">본점으로 돌아가기</button></div>`;
  if (!expAvailable()) return `<div class="card"><h3>원정</h3>${seals}<p class="dim">공방 Lv.5부터</p></div>`;
  const fs = S.fixers.filter(isAvailable), c = expCost();
  UI.expDist = UI.expDist != null && UI.expDist !== S.district ? UI.expDist : DISTRICTS.findIndex((D, i) => i !== S.district && !so[i]);
  if (UI.expDist < 0) UI.expDist = (S.district + 1) % DISTRICTS.length;
  UI.expFid = fs.some(f => f.id === UI.expFid) ? UI.expFid : (fs[0] && fs[0].id);
  return `<div class="card"><h3>원정 — 다른 구에 분점</h3>${seals}
    <div class="row wrap">${DISTRICTS.map((D, i) => i === S.district ? '' : `<button class="small ${UI.expDist === i ? 'on' : ''}" data-act="expPick" data-d="${i}">${so[i] ? '◆ ' : ''}${D.name.replace(' 뒷골목', '')} ${D.wing}</button>`).join('')}</div>
    <div class="row wrap">${fs.map(f => `<button class="small ${UI.expFid === f.id ? 'on' : ''}" data-act="expFixer" data-fid="${f.id}">${esc(f.name)} Lv.${f.lv}</button>`).join('') || '<span class="dim">나갈 수 있는 인원이 없습니다</span>'}</div>
    <p>${DISTRICTS[UI.expDist].name} · ${fs.length ? esc((getFixer(UI.expFid) || {}).name || '') : '-'} 홀로 · 분점 공방 Lv.1 · 시작 자금 ${fmtMoney(EXP_FUND * M_)}</p>
    <button class="gold big" data-act="expGo" ${S.money < c || !fs.length ? 'disabled' : ''}>출발 ${fmtMoney(c)}</button></div>`;
}

// ---------- 아침: K사 앰플 계약 ----------
function ampuleHTML() {
  if (S.outskirts || (S.kRel || 0) < K_REL_NEED) return '';
  return `<div class="ampule">💉 K사 재생 앰플 ${S.ampuleToday ? '<b class="good">오늘 계약됨</b>' : `<button class="small" data-act="ampule" ${S.money < ampuleCost() ? 'disabled' : ''}>계약 ${fmtMoney(ampuleCost())}</button>`}</div>`;
}

// ---------- 개량 탭: 잔흔 목록 ----------
function remnantsHTML() {
  const L = S.remnants || []; if (!L.length) return '<p class="dim">남은 잔흔이 없습니다.</p>';
  const open = shopBloomed();
  return `<div class="card remnants"><h3>잔흔 <small class="dim">${L.length}개</small></h3>${L.map(r => { const have = S.stock[r.shard] || 0, cost = restoreCost(r);
    return gearHTML(r.gear, { cls: 'remnant', extra: `${r.mats ? `<div class="small dim">복구하면 재료로: ${Object.entries(r.mats).map(([id, n]) => matChip(id, n)).join(' ')}</div>` : '<div class="small dim">복구하면 개량 전 모습으로</div>'}${open ? `<div class="enhrow"><span class="dim small">${matChip(r.shard)} ${have}/${r.need} · ${fmtMoney(cost)}</span><button class="gold" data-act="restoreGear" data-id="${r.id}" ${have >= r.need && S.money >= cost ? '' : 'disabled'}>복구</button></div>` : ''}` }); }).join('')}</div>`;
}
function remnantPrice(r) { return Math.max(1000, Math.round(r.gear.value * REMNANT_SELL)); }
function remnantSellHTML() {
  const L = S.remnants || []; if (!L.length) return '';
  return `<hr><h3>잔흔 팔기 <small class="dim">장비 판매가의 ${Math.round(REMNANT_SELL * 100)}%</small></h3>${L.map(r => `<div class="mrow sellrow"><span style="color:${RARITIES[r.gear.rarity || 0].color}">${esc(r.gear.name)} +${r.gear.q}</span><b>${fmtMoney(remnantPrice(r))}</b><button data-act="sellRemnant" data-id="${r.id}">팔기</button></div>`).join('')}`;
}

// ---------- 행동 ----------
Object.assign(ACT, {
  volatileOk() { const el = document.getElementById('volatileFx'); if (el) el.remove(); Game.paused = false; UI.mark('forge', 'top'); setTimeout(() => Tut.check('open'), 60); },
  ward() {
    const b = Forge.blank; if (!b || b.ward || b.wardUsed || !wardOpen() || !Forge.canWork()) return;
    const c = wardCost(b); if (S.money < c) return;
    S.money -= c; b.ward = true;
    Forge.flash = { text: '파괴 방지', color: '#d8a0ff', life: 1 };
    addLog(`불완전한 개화가 작업물을 감쌌다 — 파괴 방지 (${fmtMoney(c)})`, ''); Sound.synth(); save(); UI.mark('forge', 'top');
  },
  toggleBuffer() { S.useBuffer = !useBuffer(); save(); UI.mark('forge'); },
  bloomWorkshop() {
    if (S.bloomed || S.home || S.wLevel < 5 || S.money < SHOP_BLOOM.money || S.fame < SHOP_BLOOM.fame) return;
    S.money -= SHOP_BLOOM.money; S.bloomed = true;
    addLog(`✿ 「${S.workshopName}」 공방이 개화했다 — 이 공방은 이제 공방주의 E.G.O다.`, 'gold');
    Sound.great(); save(); UI.renderClose(); UI.mark('top');
    UI.showModal(`<h2><span class="rbw" data-t="공방 개화">공방 개화</span></h2><p>망치 소리가 멎은 밤, 공방이 숨을 쉬기 시작했다.</p>
      <p>「${esc(S.workshopName)}」은 이제 당신의 E.G.O다. 부서진 것의 잔흔을 되살릴 수 있다.</p><button class="big gold" data-act="closeModal">확인</button>`);
  },
  sellRemnant(d) {
    const L = S.remnants || [], r = L.find(x => x.id === Number(d.id)); if (!r) return;
    const p = remnantPrice(r); S.money += p; S.remnants = L.filter(x => x !== r);
    addLog(`「${r.gear.name}」의 잔흔을 팔았다 — ${fmtMoney(p)}`, ''); Sound.coin(); save(); UI.renderClose(); UI.mark('top');
  },
  restoreGear(d) {
    const L = S.remnants || [], r = L.find(x => x.id === Number(d.id)); if (!r || !shopBloomed()) return;
    const cost = restoreCost(r);
    if ((S.stock[r.shard] || 0) < r.need || S.money < cost) return;
    S.stock[r.shard] -= r.need; if (!S.stock[r.shard]) delete S.stock[r.shard];
    S.money -= cost;
    S.remnants = L.filter(x => x !== r);
    const g = r.gear;
    if (r.mats) {                                            // 새로 만들던 것 → 넣었던 재료로
      for (const [id, n] of Object.entries(r.mats)) S.stock[id] = (S.stock[id] || 0) + n;
      addLog(`잔흔을 녹여 「${g.name}」에 들어갔던 재료를 되찾았다.`, 'gold');
      UI.showModal(`<h2>복구 완료</h2><p>「${esc(g.name)}」이(가) 될 뻔했던 잔흔을 녹여, 넣었던 재료를 되찾았다.</p>
        <div class="chips">${Object.entries(r.mats).map(([id, n]) => matChip(id, n)).join('')}</div><p class="dim small">재료는 창고에 들어갔다.</p>
        <button class="big gold" data-act="closeModal">확인</button>`);
    } else {                                                 // 개량하다 부서진 것 → 개량 전 모습으로
      g.restored = true; S.gear.push(g);
      addLog(`잔흔에서 「${g.name}」 +${g.q}을(를) 되살렸다. 두 번째 잔흔은 남지 않는다.`, 'gold');
      UI.showModal(`<h2>복구 완료</h2><p>개량하기 전의 모습으로 되살아났다. 보관함에 들어갔다.</p>${gearHTML(g, { big: true })}
        <p class="dim small">한 번 되살린 장비는 다시 부서지면 잔흔이 남지 않는다.</p><button class="big gold" data-act="closeModal">확인</button>`);
    }
    Sound.great(); save(); UI.mark('forge', 'storage', 'stock'); if (S.phase === 'close') UI.renderClose();
  },
  buyFac(d) {
    const F = FACILITIES[d.k], lv = facLv(d.k); if (!F || lv >= F.cost.length || S.wLevel < F.minW) return;
    const c = F.cost[lv] * M_; if (S.money < c) return;
    S.money -= c; S.fac = S.fac || {}; S.fac[d.k] = lv + 1;
    addLog(`공방 시설 — ${F.name} ${lv + 1}단계 (${fmtMoney(c)})`, 'gold'); Sound.coin(); save(); UI.renderClose(); UI.mark('top');
  },
  reLock(d) {
    const s = RELOCK[d.gid] = RELOCK[d.gid] || new Set(), i = Number(d.i);
    s.has(i) ? s.delete(i) : s.add(i); UI.renderClose();
  },
  reengrave(d) {
    const g = S.gear.find(x => x.id === Number(d.gid)); if (!g || !(g.engraves || []).length) return;
    const L = RELOCK[g.id] || new Set(); if (L.size >= g.engraves.length) return;
    const c = reengraveCost(g, L); if (S.money < c.money || (S.stock.rune || 0) < c.runes) return;
    S.money -= c.money; S.stock.rune -= c.runes; if (!S.stock.rune) delete S.stock.rune;
    const F = FORMS[g.form], grade = MATERIALS[g.main].grade, out = [];
    g.engraves = g.engraves.map((e, i) => {
      if (L.has(i)) return e;
      let id; do { id = rollTrait(F.kind, F.kind === 'weapon' ? 0.35 : 0.5); } while (F.gun && id === 'collapse');   // 총에 붕괴는 금기품 — 새기지 않는다
      const n = { id, lv: rollEngraveLv(g.rarity, grade) }; out.push(`${TRAITS[id].name} ${roman(n.lv)}`); return n;
    });
    recomputeTraits(g);
    addLog(`재각인 — 「${g.name}」: ${out.join(', ')} (${fmtMoney(c.money)})`, 'gold'); Sound.great(); save(); UI.renderClose();
  },
  bmBuy(d) {
    if (!BlackMarket.open()) return;
    const x = S.bm.items[Number(d.i)]; if (!x || x.n <= 0 || S.money < x.price) return;
    S.money -= x.price; x.n--; S.stock[x.id] = (S.stock[x.id] || 0) + 1; S.seen = S.seen || {}; S.seen[x.id] = 1;
    addLog(`암시장에서 ${MATERIALS[x.id].name}을(를) 샀다 — ${fmtMoney(x.price)}`, ''); Sound.coin(); save(); UI.renderClose(); UI.mark('stock', 'top');
  },
  aucBid() { Auction.bid(); },
  aucPass() { Auction.pass(); },
  ampule() {
    if ((S.kRel || 0) < K_REL_NEED || S.ampuleToday) return;
    const c = ampuleCost(); if (S.money < c) return;
    S.money -= c; S.ampuleToday = true; S.ampuleUsed = false;
    addLog(`K사 재생 앰플 계약 — 오늘 하루, 한 번의 죽음을 막는다. (${fmtMoney(c)})`, 'gold'); save(); UI.showMorning(); UI.mark('top');
  },
  expPick(d) { UI.expDist = Number(d.d); UI.renderClose(); },
  expFixer(d) { UI.expFid = Number(d.fid); UI.renderClose(); },
  expGo() { ENDGAME.startExpedition(UI.expFid, UI.expDist); },
  expReturn() { ENDGAME.returnHome(); },
});
