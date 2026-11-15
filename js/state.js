'use strict';
// ============================================================
//  게임 상태 · 저장 · 공용 유틸
// ============================================================
const SAVE_KEY = 'limbusforge_save_v1';
let S = null;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function weightedPick(obj) {
  let t = 0;
  for (const k in obj) t += obj[k];
  let r = Math.random() * t;
  for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
  return Object.keys(obj)[0];
}
function uid() { return S.nextId++; }
const NAME_RARITY = 6;   // 마스터 이상은 이름을 지을 수 있다
function findGear(id) {
  for (const g of S.gear) if (g.id === id) return g;
  for (const f of S.fixers) for (const g of [f.weapon, f.armor, f.pack].concat(f.pack ? f.pack.items || [] : [])) if (g && g.id === id) return g;
  return null;
}
function fmtMoney(n) { return Math.round(n).toLocaleString('ko-KR') + '안'; }
function fmtTime(m) {
  const h = Math.floor(m / 60), mm = Math.floor((m % 60) / 10) * 10;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- 해결사 ----------
function makeFixer(lv) {
  const f = {
    id: uid(), name: pick(SURNAMES) + pick(GIVEN), lv: lv || 1, exp: 0,
    talent: +rand(0.9, 1.2).toFixed(2), curHp: 0, injuredUntil: 0,
    weapon: null, armor: null, kills: 0, joined: S.day,
    pal: { h: pick(HAIR), c: pick(COATS), p: pick(PANTS), s: pick(SKINS) },
  };
  f.curHp = unitStats(f).maxHp;
  return f;
}
function fixerBase(f) {
  const t = f.talent, l = f.lv - 1;
  const b = { hp: (60 + 8 * l) * t, atk: (4 + 0.9 * l) * t, def: (1 + 0.4 * l) * t };   // 레벨은 거들 뿐 — 힘의 중심은 장비
  for (const k in (f.aug || {})) { const A = AUGMENTS[k]; if (A) b[A.stat] *= A.mult; }   // 증강 시술
  if (f.colorTitle) { b.hp *= 1.08; b.atk *= 1.08; b.def *= 1.08; }                     // 색
  if (f.scar) { b.hp *= f.scar; b.atk *= f.scar; b.def *= f.scar; }                     // 환의 영구 손상
  if (f.blackwater) { const X = BLACKWATER[f.blackwater]; b.hp *= 1.05 * (X.hp || 1); b.atk *= 1.05 * (X.atk || 1); b.def *= 1.05 * (X.def || 1); }
  return { hp: Math.round(b.hp), atk: +b.atk.toFixed(1), def: +b.def.toFixed(1) };
}
// 금기: 구역마다 고정
function district() { return DISTRICTS[Math.min(S.district || 0, DISTRICTS.length - 1)]; }
function districtTaboo() { return district().taboo; }
// 지금 시각이 구의 금기 시간대인가 (시계 표시용)
function tabooTimeNow() {
  const t = districtTaboo().id;
  if (t === 'noon') return S.time >= 720 && S.time < 780;
  if (t === 'dusk') return S.time >= 1020;
  return false;
}
function taxAmount() { return Math.max(100 * KRW, Math.round(Math.max(0, S.money) * 0.08) + ((9 - S.oGrade) * 60 + S.wLevel * 40) * KRW); }
// 핑거 관계 (-100 ~ 100)
function rel(k) { return (S.fingers || {})[k] || 0; }
function addRel(k, d, why) {
  if (!S.fingers) S.fingers = { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
  const before = relLabel(rel(k));
  S.fingers[k] = Math.max(-100, Math.min(100, rel(k) + d));
  const after = relLabel(rel(k));
  if (before !== after) addLog(`${FINGERS[k].name}과(와)의 관계: ${before} → ${after}${why ? ' (' + why + ')' : ''}`, d > 0 ? 'good' : 'bad');
}
function assoc() { return S && S.assoc ? S.assoc : null; }
function workshopClass() { return WORKSHOP_CLASS[Math.min(WORKSHOP_CLASS.length, S.wLevel) - 1]; }
function patentMax() { return Math.max(0, S.wLevel - 1) + (assoc() === 'tres' ? 1 : 0); }
function saleTax() { return assoc() === 'tres' ? 0 : SALE_TAX; }
function marketPrice(id) { return Math.round(MATERIALS[id].price * (assoc() === 'tres' ? 0.85 : 1)); }
function expNeed(lv) { return Math.round(20 + lv * 18 + lv * lv * 1.5); }
function gainExp(f, x) {
  f.exp += x;
  let ups = 0;
  while (f.exp >= expNeed(f.lv) && f.lv < 30) { f.exp -= expNeed(f.lv); f.lv++; ups++; }
  if (f.lv >= 30) f.exp = 0;
  return ups;
}
function fixerGrade(f) { return Math.max(1, 9 - Math.floor((f.lv - 1) / 3)); }
function wageOf(f) { return (40 + f.lv * 10) * KRW * (f.blackwater === 'hb_chuk' ? 2 : 1); }   // 흑수 - 축: 식욕 폭증
function isAvailable(f) { return S.day > (f.injuredUntil || 0); }
function getFixer(id) { return S.fixers.find(f => f.id === id); }
function maxMembers() { return 3 + Math.floor((9 - S.oGrade) / 2); }
const MAX_PARTY = 4;

function traitMap(g) {
  const m = {};
  if (g) for (const t of g.traits) m[t.id] = (m[t.id] || 0) + t.lv;
  return m;
}
// ---------- 장비 경험치 · 개량 · 귀속 ----------
// 개량 기회: 레어 1회, 그 위 등급마다 +1 (커먼·언커먼은 없음)
function reforgeMax(g) { return Math.max(0, (g.rarity || 0) - 1); }
function reforgeLeft(g) { return reforgeMax(g) - (g.reforgeUsed || 0) - (g.reforgeReady || 0); }
// 주인이 아닌 사람이 쓰면 능력치 60%, 특성 봉인
function isBoundElse(g, f) { return !!(g && g.owner && f && g.owner !== f.id); }
const BIND_MULT = 0.6;
function ownerName(id) {
  const f = S.fixers.find(x => x.id === id);
  if (f) return f.name;
  const m = S.memorial.find(x => x.id === id);
  return m ? `${m.name}(고인)` : '알 수 없음';
}
function gearExpGain(g, f, amt) {
  if (!g || reforgeLeft(g) <= 0) return;
  if (isBoundElse(g, f)) return;              // 남의 귀속 장비로는 성장하지 않는다
  g.lastUser = f.id;
  g.exp = (g.exp || 0) + amt / (1 + (g.reforgeUsed || 0) * 0.5);
  while (g.exp >= 100 && reforgeLeft(g) > 0) {
    g.exp -= 100;
    g.reforgeReady = (g.reforgeReady || 0) + 1;
    addLog(`${g.name} +${g.q}의 경험치가 가득 찼다 — 개량 기회 획득! (${f.name})`, 'gold');
    UI.huntAlert(`${g.name} 개량 기회 획득!`, 'good');
  }
  if (reforgeLeft(g) <= 0) g.exp = 0;
}

function masteryLv(f, form) { return ((f.mastery || {})[form] || {}).lv || 0; }
// 적중할 때마다 그 무기 종류의 숙련도가 오른다. 레벨이 오르면 true
function gainMastery(f, form, n) {
  if (!MASTERY_FORMS[form]) return false;
  f.mastery = f.mastery || {};
  const m = f.mastery[form] = f.mastery[form] || { lv: 0, exp: 0 };
  if (m.lv >= MASTERY_MAX) return false;
  m.exp += n;
  let up = false;
  while (m.lv < MASTERY_MAX && m.exp >= masteryNeed(m.lv)) { m.exp -= masteryNeed(m.lv); m.lv++; up = true; }
  if (m.lv >= MASTERY_MAX) m.exp = 0;
  return up;
}
function unitStats(f, wOverride) {
  const b = fixerBase(f), w = wOverride !== undefined ? wOverride : f.weapon, a = f.armor;
  const F = w ? FORMS[w.form] : null;
  const wBind = isBoundElse(w, f), aBind = isBoundElse(a, f);
  const wt = wBind ? {} : traitMap(w), at = aBind ? {} : traitMap(a);
  const chargeLv = (wt.charge || 0) + (at.charge || 0);
  const poiseLv = (wt.poise || 0) + (at.poise || 0);
  // 반동: 강화형 특성 레벨 - 같은 계열 내성 레벨 (0 이하면 상쇄)
  const bl = {};
  for (const base in STRONG_OF) {
    const lv = wt[STRONG_OF[base]] || 0;
    if (lv) bl[base] = Math.max(0, lv - (at['r_' + base] || 0));
  }
  const overLv = wt.overcharge || 0;
  const ml = masteryLv(f, w ? w.form : 'fist');
  const defCut = 1 - Math.min(0.6, 0.15 * (bl.sinking || 0));
  const AF = a ? FORMS[a.form] : null, ck = f.colorKey || null;   // 특색 계열
  const st = {
    bl,
    atk: +((b.atk + (w ? w.atk * (wBind ? BIND_MULT : 1) : 0)) * (assoc() === 'liu' ? 1.05 : 1) * (1 + 0.02 * ml) * (f.serum === 'r' ? 1.2 : 1)).toFixed(1),
    def: +((b.def + (a ? a.def * (aBind ? BIND_MULT : 1) : 0) + (w && w.def ? w.def * (wBind ? BIND_MULT : 1) : 0)) * defCut * (assoc() === 'zwei' ? 1.1 : 1)).toFixed(1),
    maxHp: b.hp + (a ? Math.round(a.hp * (aBind ? BIND_MULT : 1)) : 0),
    interval: +((F ? F.interval : 1.0) * Math.max(0.45, 1 - 0.07 * chargeLv) * Math.max(0.45, 1 - 0.15 * overLv) * (1 - 0.01 * ml) * (f.blackwater ? (BLACKWATER[f.blackwater].spd || 1) : 1)).toFixed(2),
    range: F ? (F.gun && !F.melee ? 22 : F.range) : 20,   // 총: 평소엔 다가가 후려치고 보스에게만 쏜다
    ranged: !!(F && F.bow),                                 // 활·석궁: 뒤에서 쏜다 (탄환 불필요)
    gun: !!(F && F.gun),
    gunMelee: !!(F && F.melee),
    sing: w && !wBind ? (w.singularity || null) : null,
    asing: a && !aBind ? (a.singularity || null) : null,
    wset: !!(w && !wBind && w.singularity === 'w' && a && !aBind && a.singularity === 'w'),
    abnoDealt: w && !wBind && w.singularity === 'm' ? 1.5 : 1,
    abnoTaken: a && !aBind && a.singularity === 'm' ? 0.5 : 1,
    regen: (w && !wBind && w.singularity === 'k' ? 0.015 : 0) + (f.serum === 'k' ? 0.012 : 0),
    bw: f.blackwater || null,
    curW: w || null,
    form: w ? w.form : 'fist',
    wColor: w ? w.color : null,
    stagger: (F && F.stagger ? F.stagger : 0) + (f.blackwater === 'hb_o' ? 0.06 : 0),
    crit: Math.min(0.7, 0.05 + 0.06 * poiseLv + (assoc() === 'shi' ? 0.1 : 0) + 0.005 * ml + (f.blackwater === 'hb_sa' ? 0.1 : 0)),
    mastery: ml,
    dodge: (AF && AF.dodge && !aBind ? AF.dodge : 0) + (F && F.dodge && !wBind ? F.dodge : 0) + (ck === 'gray' ? 0.06 : 0),
    cleave: F && F.cleave && !wBind ? F.cleave : 0,
    colorKey: ck,
    speed: 40 * (a && FORMS[a.form].slow ? 1 - FORMS[a.form].slow : 1) * (w && !wBind && w.singularity === 'w' ? 3 : 1) * (f.serum === 'w' ? 1.5 : 1) * (f.blackwater ? (BLACKWATER[f.blackwater].move || 1) : 1),
    wt, at,
  };
  if (F && F.crit && !wBind) st.crit = Math.min(0.7, st.crit + F.crit);
  // 특색 효과 (보조 — 힘의 중심은 장비)
  if (ck === 'red') st.atk = +(st.atk * 1.05).toFixed(1);
  if (ck === 'blue') st.interval = +(st.interval * 0.95).toFixed(2);
  if (ck === 'black') st.crit = Math.min(0.7, st.crit + 0.06);
  if (ck === 'white') st.maxHp = Math.round(st.maxHp * 1.08);
  if (ck === 'purple') st.abnoDealt *= 1.15;
  if (ck === 'green') st.regen += 0.004;
  if (ck === 'orange') { st.atk = +(st.atk * 1.03).toFixed(1); st.interval = +(st.interval * 0.97).toFixed(2); }
  if (ck === 'silver') st.def = +(st.def * 1.08).toFixed(1);
  return st;
}

function fixerDies(f) {
  S.fixers = S.fixers.filter(x => x.id !== f.id);
  S.party = S.party.filter(id => id !== f.id);
  if (f.weapon) S.gear.push(f.weapon);
  if (f.armor) S.gear.push(f.armor);
  if (f.pack) { (f.pack.items || []).forEach(g => S.gear.push(g)); f.pack.items = []; S.gear.push(f.pack); f.pack = null; }
  f.weapon = f.armor = null;
  S.memorial.push({ id: f.id, name: f.name, lv: f.lv, day: S.day, kills: f.kills });
  S.stats.deaths++;
}

// ---------- 의뢰 / 후보 ----------
function genOrders() {
  const W = S.wLevel;
  const forms = ['sword', 'mace', 'spear', 'coat', 'axe', 'knuckle', 'dagger', 'club', 'whip', 'robe', 'lightarmor'];
  if (W >= 2) forms.push('plate', 'suit', 'chain', 'katana', 'staff', 'hammer', 'gauntlet', 'shield', 'vest');
  if (W >= 3) forms.push('rapier', 'cloak', 'scythe', 'dualblade', 'hwando', 'bow', 'fan', 'chainmail');
  if (W >= 4) forms.push('greatsword', 'glaive', 'crossbow', 'heavyarmor', 'tachi', 'lance');
  if (W >= 2 && unlocked('gun')) forms.push('gun', 'revolver');
  if (W >= 4 && unlocked('gun')) forms.push('rifle', 'bayonet');   // 총기는 설계도로 해금한 뒤에만 의뢰가 온다
  S.orders = [];
  const n = 3 + (W >= 3 ? 1 : 0) + (assoc() === 'seven' ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const form = pick(forms), F = FORMS[form];
    const stat = F.kind === 'weapon' ? 'atk' : 'def';
    const g = randInt(1, Math.min(5, W));
    const q = randInt(1, 4) + Math.floor(W / 2);
    const req = Math.max(1, Math.round(F[stat] * (1 + 0.7 * (g - 1)) * (1 + 0.12 * q)));
    const money = Math.round((stat === 'atk' ? req * 14 : req * 26) * rand(0.9, 1.3) + 25 * g);
    const fame = 1 + g + randInt(0, 2);
    let bonus = (F.valueMult || 1) < 1 ? 0.6 : 1;   // 총은 싸다
    if (assoc() === 'zwei' && F.kind === 'armor') bonus = 1.5;
    if (assoc() === 'shi' && form === 'sword') bonus = 1.5;
    S.orders.push({ id: uid(), form, stat, req, money: Math.round(money * bonus * KRW), fame, done: false, client: pick(CLIENTS) });
  }
}
function matchGear(o) {
  return S.gear.filter(g => !g.contraband && g.form === o.form && g[o.stat] >= o.req && (!o.trait || g.traits.some(t => t.id === o.trait || TRAITS[t.id].strong === o.trait))).sort((a, b) => a.value - b.value)[0];
}
function genCandidates() {
  const maxLv = 1 + (9 - S.oGrade) * 2;
  S.candidates = [];
  for (let i = 0; i < 3; i++) {
    const lv = randInt(Math.max(1, maxLv - 3), maxLv);
    const f = makeFixer(lv);
    f.cost = Math.round((80 + lv * lv * 12 + lv * 40) * f.talent) * KRW;
    S.candidates.push(f);
  }
}

function resetReport() {
  S.report = { loot: {}, kills: 0, deaths: [], injuries: [], levelups: [], orderMoney: 0, orderFame: 0,
    orders: 0, crafted: 0, destroyed: 0, bossKills: 0, huntMoney: 0, masterworks: 0, sold: 0 };
}
function unlocked(k) { return !!(S.unlocks || {})[k]; }
// 해금 재료를 얻는 순간 해금된다
function grantUnlock(id) {
  const m = MATERIALS[id]; if (!m || !m.unlock) return;
  S.unlocks = S.unlocks || {};
  if (!S.unlocks[m.unlock]) {
    S.unlocks[m.unlock] = true;
    const what = { gun: '총기 제작', aug: '의체(증강) 시술', ego: 'E.G.O 단조' }[m.unlock];
    addLog(`✦ ${m.name}을(를) 얻었다 — ${what} 해금!`, 'gold');
    UI.toast(`✦ ${what} 해금`, 'good');
  }
}
function addIncoming(id, n) {
  grantUnlock(id);
  (S.seen = S.seen || {})[id] = 1;   // 한 번이라도 손에 넣은 재료 — 출동 지역 목록에 이름이 드러난다
  S.incoming[id] = (S.incoming[id] || 0) + n;
  S.report.loot[id] = (S.report.loot[id] || 0) + n;
  UI.mark('incoming');
}
function addLog(msg, cls) {
  S.log.unshift({ d: S.day, t: fmtTime(S.time), msg, cls: cls || '' });
  if (S.log.length > 80) S.log.length = 80;
  if (UI.view !== 'log') UI.logUnread++;
  UI.mark('log');
}

function newGame(wName, oName, dist) {
  S = {
    v: 1, workshopName: wName, officeName: oName, day: 1, phase: 'morning', time: 540,
    money: 500 * KRW, fame: 0, krw: true, wLevel: 1, oGrade: 9,
    stock: { scrap: 6, leather: 4, bone: 2, clot: 1 }, incoming: {},
    gear: [], fixers: [], memorial: [], party: [], zone: 0, zoneV: 2,
    orders: [], candidates: [], nextId: 1, report: null, log: [],
    stats: { crafted: 0, destroyed: 0, kills: 0, deaths: 0, great: 0, bosses: 0 },
    speed: 1, morning: null, won: false, muted: false, patents: [], assoc: null,
    fingers: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
    district: Math.max(0, Math.min(DISTRICTS.length - 1, dist | 0)), tabooStrikes: 0, taxWarn: 0, ammo: 1, claws: [], unlocks: { gun: false, aug: false, ego: false },
  };
  const a = makeFixer(1), b = makeFixer(2);
  for (const f of [a, b]) {
    f.weapon = makeGear({ form: 'sword', main: 'scrap', shape: null, core: null, matGrade: 1, quality: 1, greats: 0, engraves: [] });
    f.armor = makeGear({ form: 'coat', main: 'leather', shape: null, core: null, matGrade: 1, quality: 1, greats: 0, engraves: [] });
    f.curHp = unitStats(f).maxHp;
  }
  S.fixers.push(a, b);
  S.party = [a.id, b.id];
  S.seen = {}; for (const k in S.stock) S.seen[k] = 1;   // 시작 재료는 본 적 있음
  genOrders();
  genCandidates();
  resetReport();
  addLog(`「${wName}」 공방과 「${oName}」 사무소가 문을 열었다.`, 'gold');
}

function save() {
  if (!S) return;
  S.savedAt = Date.now();
  try { if (typeof Hunt !== 'undefined') Hunt.syncHp(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ }
  if (typeof Cloud !== 'undefined') Cloud.schedule();
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return null;
    return d;
  } catch (e) { return null; }
}
function hasSave() { return !!(typeof bestSave === 'function' ? bestSave() : loadSave()); }
