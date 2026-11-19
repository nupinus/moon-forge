'use strict';
// ============================================================
//  단조 시스템 — 재료 선택 → 합성 → 망치질 → 완성
// ============================================================

// 등급 판정: 재료 등급이 높고, 대성공·완벽 타이밍이 많을수록 높은 등급
// 등급: 재료 등급이 오를 수 있는 상한을 정한다 (고철로는 레어까지, 속성재료를 넣으면 +1, 특이점·E.G.O +1).
// 상한 안에서 한 단계씩 굴린다 — 재료가 좋고 대성공이 많을수록 잘 오른다. 그랜드마스터는 최고 재료로도 1% 안팎.
function rarityCap(b) {
  const g = b.effGrade || 1;
  return Math.min(RARITIES.length - 1, g + 1 + (b.core ? 1 : 0) + (b.singularity || b.ego ? 1 : 0));
}
function rollRarity(b) {
  const g = b.effGrade || 1, cap = rarityCap(b);
  let p = Math.min(0.66, 0.22 + 0.08 * g + 0.04 * Math.min(4, b.greats || 0));
  let r = g >= 4 ? 1 : 0;   // 4등급 이상 재료는 커먼이 나오지 않는다
  while (r < cap && Math.random() < p) { r++; p *= 0.93; }
  return r;
}

// ---------- 특수기능 레벨 ----------
// · 속성재료 특성: 그 재료의 등급
// · 각인 특성(대성공): 주재료 등급 ÷ 2 (올림) — 같은 각인이 겹치면 누적
// · 방어구 속성재료 → 같은 계열 내성: 속성재료 등급 ÷ 2 (올림)
// · 등급 보너스 특성: 등급별 보너스
// · 모든 특성: 단조 6회마다 +1 (개량 포함 누적) · 최대 10
const TRAIT_MAX = 10, FORGE_PER_LV = 6, FREE_REHEATS = 2;
const BUFFER_HP = 4, BUFFER_COST = 3;
// 연속 성공 콤보: 성공·대성공이 이어질 때마다 대성공 확률 +3%p (최대 +12%p). 유지·손상·파괴면 끊긴다.
// 늦은 대성공: 여섯 번째 타격부터 터진 대성공은 +3 — 위험을 감수한 만큼 크게 돌려준다.
const COMBO_STEP = 3, COMBO_MAX = 12, LATE_GREAT_AT = 6;
function comboBonus(b) { return Math.min(COMBO_MAX, (b && b.combo || 0) * COMBO_STEP); }
// 합성재료 기본 내구 — 공방 Lv1부터 4라서 처음부터 파괴 보호가 켜진다 (Lv5는 5)
// 내구로 파괴를 막을지 — 플레이어가 고른다 (기본: 막는다)
function useBuffer() { return !S || S.useBuffer !== false; }
// 불완전 개화(공방 Lv3 이후): 작업물 하나에 한 번, 돈을 내고 파괴를 막는다 — 값은 완성될 장비의 예상 가치를 따른다
function wardOpen() { return !!(S && (S.volatile || shopBloomed())); }
function wardCost(b) {
  if (b.base) return Math.max(100 * KRW, Math.round(b.base.value * 0.5 / 10000) * 10000);
  const qEst = b.quality + Math.max(0, b.maxStrikes - b.strikes) * 1.2, st = gearStats(Object.assign({}, b, { quality: Math.round(qEst) }), 1);
  const v = gearValue({ form: b.form, atk: st.atk, def: st.def, hp: st.hp, traits: [], rarity: 1, q: Math.round(qEst), tier: tierOf(Math.round(qEst)), grade: b.matGrade });
  return Math.max(100 * KRW, Math.round(v * 0.6 / 10000) * 10000);
}
function baseHp(W) { return Math.max(BUFFER_HP, 2 + Math.ceil(W / 2)); }   // 내구가 4 이상이면 파괴 판정을 내구 3으로 버틴다
// 대성공 각인의 세기: 완성되는 순간 장비 등급의 범위 안에서 정해진다 (등급 상한은 재료가 정한다)
//                커먼   언커먼  레어   슈퍼레어 유니크  에픽   마스터  그랜드마스터
const ENGRAVE_RANGE = [[1, 1], [1, 2], [1, 3], [2, 3], [2, 4], [3, 5], [3, 6], [4, 7]];
// 범위: 등급이 위쪽을 넓히고, 주재료 등급(÷2 올림)이 바닥을 받친다
function engraveRange(rarity, grade) {
  const [lo0, hi0] = ENGRAVE_RANGE[Math.max(0, Math.min(ENGRAVE_RANGE.length - 1, rarity || 0))];
  const lo = Math.max(lo0, Math.ceil((grade || 1) / 2));
  return [lo, Math.max(hi0, lo)];
}
function rollEngraveLv(rarity, grade) {
  const [lo, hi] = engraveRange(rarity, grade);
  return lo + Math.min(hi - lo, Math.floor(Math.pow(Math.random(), 1.3) * (hi - lo + 1)));   // 높은 값일수록 조금 드물다
}
// engr: 아직 세기가 정해지지 않은 각인(문자열)에 쓸 레벨 — 생략하면 옛 방식(주재료 등급 ÷ 2)
function traitLevels(b, F, forgeCount, bonus, engr) {
  const tm = {}, add = (k, v) => { tm[k] = (tm[k] || 0) + v; };
  if (b.core) {
    const C = MATERIALS[b.core];
    add(C.trait, C.grade);
    if (F.kind === 'armor' && STRONG_OF[C.trait]) add('r_' + C.trait, Math.ceil(C.grade / 2));
  }
  const eg = Math.ceil(MATERIALS[b.main].grade / 2);
  for (const e of b.engraves || []) { if (typeof e === 'string') add(e, engr != null ? engr : eg); else add(e.id, e.lv); }
  if (bonus) add(bonus.id, bonus.lv);
  const fb = Math.floor(forgeCount / FORGE_PER_LV);
  for (const k in tm) tm[k] = Math.min(TRAIT_MAX, tm[k] + fb + ((assoc() === 'liu' && (k === 'burn' || k === 'scorch')) ? 1 : 0));
  return tm;
}

// 단련 1회당 능력치 상승 배율 — 재료 등급이 높을수록 한 번 두드릴 때 더 많이 오른다
function qMult(g, q) { return 1 + q * (0.065 + 0.01 * ((g || 1) - 1)); }
// 판매·특허 가치: 능력치 × 희귀도 × 단련·형태 × 특성·특이점
function gearValue(g) {
  const F = FORMS[g.form] || {};
  const base = (g.atk || 0) * 8 + (g.def || 0) * 16 + (g.hp || 0) * 1.2;
  const tsum = (g.traits || []).reduce((a, t) => a + t.lv, 0);
  const rar = 1 + 0.2 * (g.rarity || 0);
  const grd = 1 + 0.2 * Math.max(0, (g.grade || 1) - 1);   // 좋은 재료로 만든 장비는 더 비싸게 팔린다
  const enh = 1 + 0.02 * (g.q || 0) + 0.08 * (g.tier || 0);
  const eff = 1 + 0.12 * tsum + (g.singularity ? 0.6 : 0) + (g.ego ? 0.8 : 0) + (g.epithet ? 0.1 : 0);
  return Math.max(1, Math.round(base * 0.47 * rar * grd * enh * eff * (F.valueMult || 1) * KRW));
}

// 합성재료(b)가 지금 단련도로 완성되면 갖게 될 능력치 — 완성(makeGear)과 단조 화면 미리보기가 같은 식을 쓴다
function gearStats(b, rarity) {
  const F = FORMS[b.form], g = b.matGrade, q = b.quality, base0 = b.base;
  const R = RARITIES[rarity || 0];
  const gm = (1 + 0.7 * (g - 1)) * R.mult, qm = qMult(g, q);
  const sg = b.shape ? MATERIALS[b.shape].grade : 0;
  let atk = 0, def = 0, hp = 0;
  if (F.kind === 'weapon') {
    atk = Math.round((F.atk * gm * qm + sg * 1.5) * ((b.ego || (base0 && base0.ego)) ? 1.6 : 1));
    // 도시의 금기(총기 규제): 총열이 길수록 위력이 제한된다 — 장총 이상
    if (F.gun && tierOf(q) >= 2) atk = Math.round(atk * (tierOf(q) >= 3 ? 0.75 : 0.85));
    if (F.wdef) def = Math.round(F.wdef * gm * qm + sg * 0.6);   // 방패: 쥐고 있으면 방어
  } else if (F.kind === 'armor') { def = Math.round(F.def * gm * qm + sg * 0.8); hp = Math.round(F.hp * gm * qm + sg * 4); }
  // X사 특수 합금: 성능 1.4배
  if ((base0 ? base0.singularity : b.singularity) === 'x') { atk = Math.round(atk * 1.4); def = Math.round(def * 1.4); hp = Math.round(hp * 1.4); }
  if (base0 && base0.manifest) { atk = Math.round(atk * 1.25); def = Math.round(def * 1.25); hp = Math.round(hp * 1.25); }   // 개화 E.G.O
  { const rn = 1 + workshopRenown(S.wLevel); if (rn > 1) { atk = Math.round(atk * rn); def = Math.round(def * rn); hp = Math.round(hp * rn); } }   // 공방의 이름값
  return { atk, def, hp };
}

// b: 합성재료(blank). b.base 가 있으면 기존 장비를 강화한 것 — id·이명·등급을 이어받는다.
function makeGear(b) {
  const F = FORMS[b.form], M = MATERIALS[b.main];
  const g = b.matGrade, q = b.quality;
  const base0 = b.base;
  let rarity = base0 && base0.rarity != null ? base0.rarity : (b.preRarity != null ? b.preRarity : rollRarity(b));

  const R = RARITIES[rarity];
  const { atk, def, hp } = gearStats(b, rarity);
  // 이번에 새긴 각인의 세기를 정한다
  const fresh = [];
  b.engraves = (b.engraves || []).map(e => { if (typeof e !== 'string') return e; const o = { id: e, lv: rollEngraveLv(rarity, MATERIALS[b.main].grade) }; fresh.push(o); return o; });
  const tier = tierOf(q);
  // 특성 레벨 = 재료 등급 기반 + 단조 횟수 보너스 (최대 10)
  const forgeCount = (base0 ? (base0.forgeCount || 0) : 0) + (b.strikes || 0);
  // 유니크 이상: 등급 보너스 특성
  const bonus = base0 && base0.bonus ? base0.bonus : R.bonus ? { id: rollTrait(F.kind, F.kind === 'weapon' ? (rarity >= 5 ? 0.5 : 0) : 0.5), lv: R.bonus } : null;
  const tm = traitLevels(b, F, forgeCount, bonus);
  const egoId = base0 ? base0.ego : b.ego;
  if (egoId) tm[EGO[egoId].trait] = Math.min(TRAIT_MAX, (tm[EGO[egoId].trait] || 0) + 3);
  if (base0 && base0.manifest && base0.mfTrait) tm[base0.mfTrait] = Math.min(TRAIT_MAX, (tm[base0.mfTrait] || 0) + 2);
  const traits = Object.keys(tm).map(id => ({ id, lv: tm[id] }));
  const tsum = traits.reduce((a, t) => a + t.lv, 0);
  const value = gearValue({ form: b.form, atk, def, hp, traits, rarity, q, tier: tierOf(q), singularity: base0 ? base0.singularity : b.singularity, ego: base0 ? base0.ego : b.ego, epithet: base0 && base0.epithet });
  // 도시의 금기(총기 규정) — 만들 수는 있지만, 만드는 순간 머리가 반드시 인식한다
  let contraband = base0 && base0.contraband ? base0.contraband : null;
  if (!contraband && F.gun) {
    if (rarity >= 6 && S.wLevel < 5) contraband = { reason: '허가 없는 S급 총기' };
    else if (traits.some(t => t.id === 'collapse')) contraband = { reason: '강철을 꿰뚫는 탄' };
  }
  const accent = b.core ? MATERIALS[b.core].color : b.shape ? MATERIALS[b.shape].color : '#c0a060';
  const base = b.base;
  return {
    id: base ? base.id : uid(), form: b.form, kind: F.kind, tier, q, atk, def, hp, traits, value,
    name: base0 && base0.customName ? base0.customName : base0 && base0.manifest ? '개화 E.G.O ' + ((base0 ? base0.ego : b.ego) ? `E.G.O ${EGO[base0 ? base0.ego : b.ego].name}` : `${M.adj} ${F.tiers[tier]}`) : (base0 ? base0.ego : b.ego) ? `E.G.O ${EGO[base0 ? base0.ego : b.ego].name}` : `${M.adj} ${F.tiers[tier]}`,
    manifest: base0 ? base0.manifest || null : null, mfTrait: base0 ? base0.mfTrait || null : null, mfAb: base0 ? base0.mfAb || null : null,
    customName: base0 && base0.customName ? base0.customName : null, named: !!(base0 && base0.customName),
    // 별명: 대성공 횟수(개량은 누적)에 따라 등급이 정해지고, 더 높은 등급에 이르면 새 별명으로 바뀐다
    ...(() => { const et = epithetTier(b.greats), bt = base && base.epithet ? (base.epithetTier != null ? base.epithetTier : 0) : -1;
      if (et > bt) return { epithet: pick(EPITHET_TIERS[et].list), epithetTier: et };
      return { epithet: base && base.epithet ? base.epithet : '', epithetTier: bt >= 0 ? bt : null }; })(),
    color: M.color, accent, grade: g, made: base ? base.made : S.day,
    rarity, bonus, contraband,
    singularity: base0 ? (base0.singularity || null) : (b.singularity || null),
    ego: base0 ? (base0.ego || null) : (b.ego || null),
    // 경험치 · 개량 · 귀속 — 개량하면 경험치를 쌓은 해결사에게 귀속된다
    exp: base ? 0 : 0,
    reforgeUsed: base ? (base.reforgeUsed || 0) + 1 : 0,
    reforgeReady: base ? (base.reforgeReady || 0) : 0,
    owner: base ? (base.owner || base.lastUser || null) : null,
    lastUser: base ? base.lastUser || null : null,
    forgeCount,
    capacity: F.capacity || 0, items: base0 && base0.items ? base0.items : (F.kind === 'pack' ? [] : undefined),
    brand: base ? (base.brand || S.workshopName) : S.workshopName,
    // 재강화를 위한 제작 정보
    main: b.main, shape: b.shape || null, core: b.core || null, engraves: b.engraves.slice(), greats: b.greats, freshEngraves: fresh,
  };
}

// 예전 세이브의 장비(제작 정보 없음)를 강화 가능하게 보정
function migrateGear(g) {
  if (!g) return g;
  if (!g.main) {
    const adj = (g.name || '').split(' ')[0];
    const cat = g.kind === 'weapon' ? 'metal' : 'fabric';
    g.main = MAT_ORDER.find(id => MATERIALS[id].adj === adj && MATERIALS[id].cat === cat)
      || MAT_ORDER.find(id => MATERIALS[id].cat === cat && MATERIALS[id].grade === (g.grade || 1)) || (cat === 'metal' ? 'scrap' : 'leather');
    g.shape = g.shape || null; g.core = g.core || null; g.greats = g.greats || 0;
    const coreTrait = g.traits[0] ? g.traits[0].id : null;
    g.core = coreTrait ? MAT_ORDER.find(id => MATERIALS[id].trait === coreTrait) || null : null;
    g.engraves = [];
  }
  if (g.rarity == null) { g.rarity = Math.min(3, Math.max(0, (g.grade || 1) - 1)); g.bonus = null; }
  if (g.forgeCount == null) g.forgeCount = g.q || 0;
  if (g.engraves && g.engraves.some(e => typeof e === 'string')) { const eg = Math.ceil(MATERIALS[g.main].grade / 2); g.engraves = g.engraves.map(e => typeof e === 'string' ? { id: e, lv: eg } : e); }
  if (g.exp == null) { g.exp = 0; g.reforgeUsed = 0; g.reforgeReady = 0; g.owner = null; g.lastUser = null; }
  const t = tierOf(g.q);
  // 예전 세이브: 지은 이름이 별명 자리에 들어가 있었다 → 장비 이름으로 옮긴다
  if (g.named && !g.customName && g.epithet) { g.customName = g.epithet.replace(/[「」]/g, ''); g.epithet = ''; }
  if (g.customName) g.name = g.customName;
  if (g.epithet && g.epithetTier == null) g.epithetTier = Math.max(0, epithetTier(g.greats || 0));
  if (t !== g.tier) { g.tier = t; if (!g.customName) g.name = `${MATERIALS[g.main].adj} ${FORMS[g.form].tiers[t]}`; }
  return g;
}

// 단조대 배경 그림 (PixAI) — 없으면 그려 둔 배경. 위치는 그림 속 모루·화로·물통에 맞춘 값.
const FORGE_LAYOUT = {
  proc: { fire: [46, 40], embers: [16, 76, 16, 64], water: [34, 160, 19], rest: { x: 246, y: 158 } },
  img: { AX: 159, AY: 96, fire: [69, 51], embers: [52, 88, 34, 62], water: [41, 151, 14], rest: { x: 266, y: 178 } },
};
const forgeBgImg = new Image(); let forgeBgOk = false;
forgeBgImg.onload = () => { forgeBgOk = true; }; forgeBgImg.src = 'assets/bg/forge.png';
function forgeBgImage() { return forgeBgOk ? forgeBgImg : null; }

const Forge = {
  slots: { main: null, shape: null, core: null },
  blank: null, result: null,
  lock: 0, hammerT: 0, heat: 0,
  flash: null, strikeLog: [], t: 0,

  canWork() { return S && S.phase === 'open' && !S.detained; },
  reserved(id) { let n = 0; for (const k in this.slots) if (this.slots[k] === id) n++; return n; },
  avail(id) { return (S.stock[id] || 0) - this.reserved(id); },
  resetAll() { this.activeSlot = 'main'; this.slots = { main: null, shape: null, core: null }; this.blank = null; this.result = null; this.strikeLog = []; },

  // 슬롯 선택 → 그 슬롯에 맞는 재료만 재료함에 표시
  activeSlot: 'main',
  SLOT_LABEL: { main: '주재료', shape: '형태재료', core: '속성재료' },
  slotAccepts(slot, id) {
    const m = MATERIALS[id];
    if (slot === 'main') return m.cat === 'metal' || m.cat === 'fabric';
    if (slot === 'shape') {
      const main = this.slots.main ? MATERIALS[this.slots.main] : null;
      if (main && main.cat === 'fabric') return m.cat === 'metal' || !!m.ashape;
      if (main && main.cat === 'metal') return m.cat === 'metal' || !!m.shape;
      return m.cat === 'metal' || m.cat === 'shape';
    }
    return m.cat === 'core';
  },
  selectSlot(s) { this.activeSlot = s; if (this.mode !== 'craft') this.mode = 'craft'; Sound.click(); UI.mark('forge', 'stock'); },
  pickMat(id) {
    if (!this.canWork()) return UI.toast(S.detained ? '금기 사냥꾼에게 붙잡혀 오늘은 작업할 수 없습니다' : '개점 시간에만 단조할 수 있습니다');
    if (this.blank || this.result) return;
    if (this.mode !== 'craft') this.mode = 'craft';
    if (this.avail(id) <= 0) return UI.toast('재료가 부족합니다');
    let slot = this.slotAccepts(this.activeSlot, id) ? this.activeSlot : ['main', 'shape', 'core'].find(s => this.slotAccepts(s, id));
    if (!slot) return UI.toast('넣을 수 있는 슬롯이 없습니다');
    this.slots[slot] = id;
    // 주재료가 천으로 바뀌면 맞지 않는 형태재료는 뺀다
    if (slot === 'main' && this.slots.shape && !this.slotAccepts('shape', this.slots.shape)) this.slots.shape = null;
    const next = ['main', 'shape', 'core'].find(s => !this.slots[s]);
    if (next) this.activeSlot = next;
    Sound.click();
    UI.mark('forge', 'stock');
  },
  clearSlot(s) { this.slots[s] = null; this.activeSlot = s; UI.mark('forge', 'stock'); },

  resolve() {
    const { main, shape, core } = this.slots;
    if (!main) return { error: '주재료(금속 또는 천)를 선택하세요' };
    const M = MATERIALS[main], Sh = shape ? MATERIALS[shape] : null;
    let form = null;
    if (M.cat === 'metal') {
      if (!Sh) form = 'sword';
      else if (Sh.cat === 'metal') form = 'mace';
      else if (Sh.shape) form = Sh.shape;
      else if (Sh.ashape) return { error: `${Sh.name}은(는) 방어구(천)용 형태재료입니다` };
    } else if (M.cat === 'fabric') {
      if (!Sh) form = 'coat';
      else if (Sh.cat === 'metal') form = 'plate';
      else if (Sh.ashape) form = Sh.ashape;
      else return { error: `${Sh.name}은(는) 방어구의 형태재료로 쓸 수 없습니다` };
    }
    if (this.singSel === 'p' && S.wLevel >= SING_UNLOCK_W) form = M.cat === 'fabric' ? 'pbag' : 'pglove';
    if (!form) return { error: '조합할 수 없는 재료입니다' };
    if (FORMS[form].gun && !unlocked('gun')) return { error: '총기 제작은 아직 해금되지 않았습니다 — 매우 드물게 찾아오는 마침표 사무소 해결사의 「총기 설계도」가 필요합니다' };
    const grades = [M.grade, Sh ? Sh.grade : 0, core ? MATERIALS[core].grade : 0];
    return { form, matGrade: M.grade, effGrade: Math.max(...grades) };
  },

  synth() {
    if (!this.canWork()) return;
    const r = this.resolve();
    if (r.error) return UI.toast(r.error);
    let ego = null;
    if (this.egoSel && FORMS[r.form].kind === 'weapon' && (S.stock[this.egoSel] || 0) > 0) {
      S.stock[this.egoSel]--; if (S.stock[this.egoSel] <= 0) delete S.stock[this.egoSel];
      ego = MATERIALS[this.egoSel].ego; this.egoSel = null;
      addLog(`E.G.O 추출물을 녹여 넣었다 — 「${EGO[ego].name}」`, 'gold');
    }
    let sing = null;
    if (this.singSel && SINGULARITIES[this.singSel].kinds.includes(FORMS[r.form].kind) && S.wLevel >= SING_UNLOCK_W) {
      if (S.money < SING_COST) return UI.toast(`특이점 기술 사용료 ${fmtMoney(SING_COST)}이 필요합니다`);
      S.money -= SING_COST; sing = this.singSel;
      addLog(`${SINGULARITIES[sing].name} 기술 사용료 ${fmtMoney(SING_COST)}을 지불했다.`, '');
    }
    for (const k in this.slots) {
      const id = this.slots[k];
      if (id) { S.stock[id]--; if (S.stock[id] <= 0) delete S.stock[id]; }
    }
    const W = S.wLevel, hp = baseHp(W) + Math.min(1, facLv('quench'));
    this.blank = Object.assign({}, r, {
      main: this.slots.main, shape: this.slots.shape, core: this.slots.core, singularity: sing, ego,
      quality: 0, hp, maxHp: hp, strikes: 0, maxStrikes: 6 + W + facLv('anvil'), greats: 0, engraves: [],
    });
    this.slots = { main: null, shape: null, core: null };
    this.strikeLog = [];
    this.heat = 1; this.reheatT = 0;
    this.flash = { text: '합성 완료', color: '#ffb060', life: 1 };
    Sound.synth();
    UI.mark('forge', 'stock');
    setTimeout(() => Tut.check('blank'), 60);
  },

  // ---------- 강화: 보관함의 장비를 다시 모루에 올린다 ----------
  mode: 'craft',   // craft(새로 제작) | enhance(강화)
  setMode(m) { this.mode = m; UI.mark('forge', 'stock'); },
  enhanceCost(g) { return { id: g.main, n: 1 + Math.floor(g.q / 10) }; },
  startEnhance(gid) {
    if (!this.canWork() || this.blank || this.result) return;
    const g = S.gear.find(x => x.id === gid);
    if (!g) return;
    migrateGear(g);
    if (!(g.reforgeReady > 0)) return UI.toast('개량 기회가 없습니다 — 전투로 경험치를 100% 채우세요');
    const c = this.enhanceCost(g);
    if ((S.stock[c.id] || 0) < c.n) return UI.toast(`${MATERIALS[c.id].name} ${c.n}개가 필요합니다`);
    S.stock[c.id] -= c.n; if (S.stock[c.id] <= 0) delete S.stock[c.id];
    g.reforgeReady--;                              // 기회는 시작할 때 소모 (파괴돼도 돌아오지 않음)
    S.gear = S.gear.filter(x => x.id !== gid);   // 모루 위로 — 파괴되면 잃는다
    const W = S.wLevel, hp = baseHp(W) + Math.min(1, facLv('quench'));
    const grades = [MATERIALS[g.main].grade, g.shape ? MATERIALS[g.shape].grade : 0, g.core ? MATERIALS[g.core].grade : 0];
    this.blank = {
      form: g.form, matGrade: MATERIALS[g.main].grade, effGrade: Math.max(...grades),
      main: g.main, shape: g.shape, core: g.core,
      quality: g.q, startQ: g.q, hp, maxHp: hp, strikes: 0, maxStrikes: 4 + W,
      greats: g.greats || 0, engraves: (g.engraves || []).slice(), base: g,
    };
    this.strikeLog = []; this.heat = 1; this.reheatT = 0;
    this.flash = { text: '개량 시작', color: '#ffb060', life: 1 };
    Sound.synth();
    UI.mark('forge', 'stock', 'storage', 'orders');
  },

  // ---------- 열 관리 (프리 타이밍) ----------
// 가열은 작업물마다 두 번까지 무료, 그 뒤로는 할 때마다 열피로가 쌓여 파괴·손상 위험이 오른다
  // 뜨거울 때 두드릴수록 좋다. 두드리거나 시간이 지나면 식고, [가열]로 화로에 다시 달군다.
  // 공방 레벨이 높을수록 '적열' 구간이 넓다.
  heatCuts() { const W = S.wLevel; return { hot: 0.7 - 0.03 * W, warm: 0.36 - 0.02 * W }; },
  heatTier() {
    const c = this.heatCuts();
    return this.heat >= c.hot ? 'perfect' : this.heat >= c.warm ? 'good' : 'miss';
  },
  reheat() {
    if (!this.blank || this.reheatT > 0 || this.lock > 0 || !this.canWork()) return;
    if (this.heat > 0.95) return UI.toast('이미 충분히 달궈져 있습니다');
    this.reheatT = 1.4;
    // 열피로: 같은 작업물을 자주 달굴수록 쇠가 물러진다 (두 번까지는 괜찮다)
    const b = this.blank; b.reheats = (b.reheats || 0) + 1;
    if ((b.mends || 0) < facLv('furnace') && b.hp < b.maxHp) { b.mends = (b.mends || 0) + 1; b.hp++; }   // 개량 화로: 달구며 갈라진 곳을 메운다
    if (b.reheats > freeReheats()) { b.fatigue = (b.fatigue || 0) + 1; this.flash = { text: '열피로 ' + b.fatigue, color: '#ff8a5a', life: 0.9 }; }
    Sound.synth();
    UI.mark('forge');
  },
  probs(timing) {
    const b = this.blank, W = S.wLevel, n = b.strikes, over = Math.max(0, b.effGrade - (W + 1));
    const p = { destroy: 2, damage: 14, keep: 30, success: 44, great: 10 };
    p.success += W * 2.5; p.great += W * 1.2; p.damage -= W * 2; p.keep -= W * 1.5;
    p.great += 1.5 * facLv('bench') + SEAL_GREAT * sealCount();   // 정밀 작업대 · 인장
    const mg = ((b.matGrade || 1) + (b.shape ? MATERIALS[b.shape].grade : (b.matGrade || 1))) / 2 - 1;   // 재료 등급(주재료·형태재료 평균)
    p.great += mg * 1.6; p.success += mg * 1.0; p.damage -= mg * 1.4; p.keep -= mg * 1.2;
    p.destroy += n * strikeRisk() + over * 4; p.damage += n * 3.2 + over * 6; p.success -= n * 3; p.great -= n * 0.8;
    // 강화 수치가 높을수록 위험 (+30 은 전설)
    const q = b.quality;
    p.destroy += q * 0.14; p.damage += q * 0.35; p.success -= q * 0.3; p.great -= q * 0.1;
    const fz = b.fatigue || 0;                    // 열피로
    p.destroy += fz * 1.5; p.damage += fz * 2.5; p.great -= fz * 1;
    { const cb = comboBonus(b); if (cb) { p.great += cb; p.keep -= cb / 2; p.success -= cb / 2; } }   // 연속 성공 콤보
    if (timing === 'perfect') { p.great += 14; p.success += 6; p.damage -= 10; p.destroy -= 2; p.keep -= 8; }
    else if (timing === 'miss') { p.damage += 16; p.destroy += 5; p.success -= 14; p.great -= 7; }
    for (const k in p) p[k] = Math.max(k === 'destroy' ? 0.5 : 0, p[k]);
    const t = Object.values(p).reduce((a, c) => a + c, 0);
    for (const k in p) p[k] = p[k] / t * 100;
    return p;
  },

  // hx, hy: 모루 캔버스 좌표 (생략하면 장비 중앙 근처)
  strike(hx, hy) {
    if (!this.blank || this.lock > 0 || this.reheatT > 0 || !this.canWork() || Game.paused || UI.modalOpen) return;
    const b = this.blank;
    if (b.strikes >= b.maxStrikes) return UI.toast('더 이상 두드릴 수 없습니다 — 완성하세요');
      const timing = this.heatTier();
    const p = this.probs(timing);
    let r = Math.random() * 100, out = 'keep';
    for (const k of OUTCOME_ORDER) { r -= p[k]; if (r <= 0) { out = k; break; } }
    if (b.singularity === 'x' && out === 'damage') out = 'keep';   // X사 특수 합금: 내구가 깎이지 않는다
    b.strikes++; b.preRarity = null; b.contraOK = false; this.contraWarn = null;
    if (timing === 'perfect') b.perfects = (b.perfects || 0) + 1;
    // 타격 지점: 장비 몸체 위로 보정
    const L = this.blankLen(b);
    const bx = this.AX - L / 2, ex = this.AX + L / 2;
    const px = hx == null ? rand(bx + L * 0.25, ex - 4) : Math.max(bx + 4, Math.min(ex - 2, hx));
    const py = hy == null ? this.AY + rand(-3, 3) : Math.max(this.AY - 8, Math.min(this.AY + 8, hy));
    this.hit = { x: px, y: py };
    (b.marks = b.marks || []).push({ u: (px - bx) / L, v: py - this.AY, a: rand(0, 3) });
    if (b.marks.length > 24) b.marks.shift();
    this.lock = 0.38; this.hammerT = 0.001;
    this.heat = Math.max(0, this.heat - 0.17);
    const TL = { perfect: '적열', good: '달궈짐', miss: '식음' }[timing];
    let msg = OUTCOMES[out].name, sparkN = 8, sparkC = '#ffb040';
    if (out === 'great') {
      const gain = b.strikes >= LATE_GREAT_AT ? 3 : 2; b.lateGreat = gain === 3;
      b.quality += gain; b.greats++; S.stats.great++; sparkN = 30; sparkC = '#ffe070';
      if (Math.random() < 0.4) { const kind = FORMS[b.form].kind; const tr = rollTrait(kind, kind === 'weapon' ? 0.35 : 0.5); b.engraves.push(tr); msg += ` · 각인「${TRAITS[tr].name}」`; }
      msg += ` (+${gain})`;
      Sound.great();
    } else if (out === 'success') {
      b.quality += 1; sparkN = 16; msg += ' (+1)'; Sound.hit(1);
    } else if (out === 'keep') {
      sparkN = 6; Sound.hit(0);
    } else if (out === 'damage') {
      b.hp--; sparkN = 10; sparkC = '#ff7a3a'; msg += ' (내구 -1)'; Sound.bad();
    } else if (out === 'destroy' && useBuffer() && b.hp >= BUFFER_HP) {   // 내구 완충: 내구가 넉넉하면 부서지는 대신 크게 상한다 (끌 수 있다)
      b.hp -= BUFFER_COST; out = 'damage'; sparkN = 30; sparkC = '#ff5a3a'; msg = `파괴를 버텼다 (내구 -${BUFFER_COST})`; Sound.bad(); this.saved = true;
    } else if (out === 'destroy' && b.ward) {                           // 파괴 방지: 값을 치른 한 번
      b.ward = false; b.wardUsed = true; out = 'keep'; sparkN = 30; sparkC = '#d8a0ff'; msg = '파괴 방지 발동'; Sound.bad(); this.warded = true;
    } else if (out === 'destroy') {
      sparkN = 40; sparkC = '#ff4a3a'; Sound.destroy();
    }
    b.combo = (out === 'great' || out === 'success') ? (b.combo || 0) + 1 : 0;   // 콤보: 성공이 이어지면 쌓이고 아니면 끊긴다
    if (b.combo >= 2) msg += ` · 콤보 ${b.combo}`;
    this.strikeLog.unshift({ timing: TL, tcls: timing, out, msg });
    if (this.strikeLog.length > 4) this.strikeLog.length = 4;   // 칸 높이가 고정이라 4줄까지
    this.flash = { text: OUTCOMES[out].name, color: OUTCOMES[out].color, life: 1, big: out === 'great' || out === 'destroy' };
    this.spawnSparks(sparkN, sparkC, out === 'destroy', px, py);
    this.rings.push({ x: px, y: py, r: 4, life: 0.35, c: sparkC });
    this.hitFlash = { x: px, y: py, life: 0.14 };
    this.flakes = this.flakes || [];
    for (let i = 0; i < 3; i++) this.flakes.push({ x: px + rand(-16, 16), y: py + rand(-9, 9), w: i % 2 });
    if (this.flakes.length > 45) this.flakes.splice(0, this.flakes.length - 45);
    this.shake = out === 'destroy' ? 6 : out === 'great' ? 4 : 2;
    this.outcomeFx(this.warded && out === 'keep' ? 'ward' : out, px, py, b, this.saved); this.saved = false; this.warded = false;
    if (out === 'destroy') this.destroy('망치질 중 합성재료가 산산조각 났다');
    else if (b.hp <= 0 && b.ward) { b.ward = false; b.wardUsed = true; b.hp = 1; this.warded = true; this.strikeLog[0].msg += ' · 파괴 방지 발동'; this.outcomeFx('ward', px, py, b); }
    else if (b.hp <= 0) this.destroy('손상이 누적되어 합성재료가 부서졌다');
    UI.mark('forge');
  },

  destroy(reason) {
    const b = this.blank;
    S.stats.destroyed++; S.report.destroyed++;
    const nm = b.base ? `${b.base.name} +${b.startQ}` : `${MATERIALS[b.main].adj} ${FORMS[b.form].name}`;
    this.result = { destroyed: true, reason: b.base ? reason.replace('합성재료', '장비') : reason, name: nm, enhanced: !!b.base };
    this.blank = null;
    const got = onGearDestroyed(b);
    addLog(`${nm} ${b.base ? '개량 실패 — 장비가 부서졌다' : '단조 실패'} — ${b.base ? reason.replace('합성재료', '장비') : reason}. (${got})`, 'bad');
    save();
  },

  // ---------- 금기품 사전 경고 ----------
  // 완성하면 금기품(도시의 금기: 총기 규정)이 될지 미리 판정한다
  predictContraband(b) {
    if (S.outskirts) return null;                 // 외곽에는 도시의 금기가 닿지 않는다
    if (!FORMS[b.form].gun) return null;
    const F = FORMS[b.form], fc = (b.base ? (b.base.forgeCount || 0) : 0) + b.strikes;
    const tm = traitLevels(b, F, fc, b.base ? b.base.bonus : null);
    if (tm.collapse) return '강철을 꿰뚫는 탄';
    const rar = b.base ? b.base.rarity : (b.preRarity != null ? b.preRarity : (b.preRarity = rollRarity(b)));
    if (rar >= 6 && S.wLevel < 5) return `허가 없는 S급 총기 (${RARITIES[rar].name})`;
    return null;
  },
  contraHint(b) {
    if (!FORMS[b.form].gun) return '';
    const tm = traitLevels(b, FORMS[b.form], (b.base ? (b.base.forgeCount || 0) : 0) + b.strikes, b.base ? b.base.bonus : null);
    if (tm.collapse) return '<div class="contra">☠ 강철을 꿰뚫는 탄(붕괴)이 깃들었다 — 이대로 완성하면 금기품. 머리가 반드시 인식하고 발톱이 온다.</div>';
    if (S.wLevel < 5 && (b.base ? b.base.rarity >= 6 : rarityCap(b) >= 6)) return '<div class="warnline">⚠ 비S급 공방: 마스터 이상 등급이 나오면 금기품(허가 없는 S급 총기)이 된다.</div>';
    return '';
  },
  pickEgo(id) { this.egoSel = this.egoSel === id ? null : id; Sound.click(); UI.mark('forge'); },
  pickSing(k) { this.singSel = this.singSel === k ? null : k; Sound.click(); UI.mark('forge'); },
  finishForce() { if (this.blank) { this.blank.contraOK = true; this.contraWarn = null; this.finish(); } },
  finishCancel() { this.contraWarn = null; UI.mark('forge'); },
  // 금기품이 될 작업물을 녹여 없앤다 (재료는 잃는다 · 개량 중이었다면 원래 장비는 그대로 돌아온다)
  meltBlank() {
    const b = this.blank; if (!b) return;
    if (b.base) S.gear.push(b.base);
    this.blank = null; this.contraWarn = null;
    this.result = { destroyed: true, reason: b.base ? '개량을 포기하고 작업물을 녹였다 — 장비는 원래대로 돌아왔다' : '금기품이 되기 전에 화로에 녹여 버렸다', name: b.base ? b.base.name : `${MATERIALS[b.main].adj} ${FORMS[b.form].name}`, enhanced: !!b.base };
    addLog(`금기품이 될 작업물을 녹여 버렸다.`, 'warn');
    Sound.bad(); UI.mark('forge', 'storage'); save();
  },

  finish(auto) {
    if (!this.blank) return;
    const b = this.blank;
    const pc = this.predictContraband(b);
    if (pc) {
      if (auto) { this.blank = null; addLog('마감 — 금기품이 될 작업물은 완성하지 않고 녹여 버렸다.', 'warn'); return; }
      if (!b.contraOK) { this.contraWarn = pc; Sound.bad(); UI.mark('forge'); return; }
    }
    const prevTier = b.base ? b.base.tier : -1;
    const g = makeGear(b);
    iconCanvasCache.delete(iconKey(g)); iconURLCache.delete(iconKey(g));
    S.gear.push(g);
    this.result = g; this.blank = null;
    this.steam = (this.steam || []).concat(Array.from({ length: 22 }, () => ({ x: this.AX + rand(-30, 30), y: this.AY + rand(-8, 8), vx: rand(-6, 6), r: rand(3, 6), life: rand(1, 2.2) })));   // 담금질 김
    if (!b.base) { S.stats.crafted++; S.report.crafted++; }
    let extra = '';
    if (g.tier > prevTier && g.tier >= 3) {
      const f = g.tier === 4 ? 10 : 3;
      S.fame += f; S.report.masterworks++; extra = ` · ${TIER_NAMES[g.tier]} 형태! 명성 +${f}`;
    }
    if (!b.base && g.rarity >= 5) {           // 에픽 이상 신규 제작
      const f = (g.rarity - 4) * 3;
      S.fame += f; extra += ` · ${RARITIES[g.rarity].name}! 명성 +${f}`;
    }
    const R = RARITIES[g.rarity];
    if (g.freshEngraves && g.freshEngraves.length) { const er = engraveRange(g.rarity, MATERIALS[g.main].grade), top = er[1] > er[0] && g.freshEngraves.some(e => e.lv >= er[1]); extra += ` · 각인 ${g.freshEngraves.map(e => `${TRAITS[e.id].name} ${roman(e.lv)}`).join(', ')}${top ? ' (최상)' : ''}`; if (top) this.flash = { text: '최상 각인!', color: '#ffe070', life: 1.4, big: true }; }
    delete g.freshEngraves;
    const verb = b.base ? `개량 (+${b.startQ} → +${g.q})` : `+${g.q} 완성`;
    addLog(`${auto ? '[마감 직전] ' : ''}[${R.name}] ${g.epithet ? g.epithet + ' ' : ''}${g.name} ${verb}${extra}`, g.rarity >= 4 || g.tier >= 3 ? 'gold' : '');
    if (g.contraband) { save(); Game.clawRaid(g); return; }
    if (!b.base && g.rarity >= NAME_RARITY && !auto && !window.BOT_MUTE) setTimeout(() => UI.showNameGear(g.id, true), 900);
    if (!auto) setTimeout(() => Tut.check('done'), 80);
    const evolved = b.base && g.tier > prevTier;
    this.flash = b.base
      ? { text: evolved ? '형태 변화!' : '개량 완료', color: TIER_COLORS[g.tier], life: 1.2, big: true }
      : { text: R.name + '!', color: R.color, life: 1.4, big: true };
    this.spawnSparks(16 + g.rarity * 6, b.base ? TIER_COLORS[g.tier] : R.color);
    Sound.finish();
    UI.mark('forge', 'storage', 'orders', 'top');
    save();
  },
  next() { this.result = null; this.flash = null; this.flakes = []; this.fx = []; this.tint = null; this.glow = null; this.activeSlot = 'main'; UI.mark('forge', 'stock'); },

  // ---------- 탑뷰 작업대 ----------
  // 캔버스 320x200. 모루 중심(AX, AY)에 작업물이 놓인다.
  AX: 176, AY: 104, reheatT: 0, rings: [], shake: 0, hit: null, sparks: [],

  blankLen(b) { return 66 + Math.min(b.quality, 30) * 2.6; },

  // ---------- 결과별 연출: 유지 · 성공 · 대성공 · 손상 · 파괴 보호 · 파괴 ----------
  outcomeFx(out, px, py, b, saved) {
    const fx = this.fx = this.fx || [], mc = MATERIALS[b.main].color;
    const pop = (text, c, big) => fx.push({ k: 'pop', text, c, big, x: px + 26, y: py - 30, life: big ? 1.3 : 0.9, max: big ? 1.3 : 0.9 });
    const puff = (n, c) => { for (let i = 0; i < n; i++) fx.push({ k: 'puff', x: px + rand(-10, 10), y: py + rand(-4, 4), vx: rand(-14, 14), vy: rand(-16, -4), r: rand(2, 4), c, life: rand(0.4, 0.8), max: 0.8 }); };
    if (out === 'keep') {                       // 둔한 쇳소리: 잿빛 불꽃 몇 개와 먼지
      this.sparks.splice(this.sparks.length - 6, 6); this.spawnSparks(5, '#a8a0a0', false, px, py);
      this.rings[this.rings.length - 1].c = '#8a8288'; puff(4, '120,112,120'); this.shake = 1.2;
      this.flash = { text: '유지', color: '#a8a0a0', life: 0.7 };
    } else if (out === 'success') {             // 주황 불꽃이 터지고 작업물이 빛난다
      this.spawnSparks(10, '#ffd070', false, px, py);
      this.glow = { c: '255,170,80', life: 0.35, max: 0.35 }; pop('+1', '#ffe0a0'); this.shake = 2.5;
      if (b.combo >= 2) fx.push({ k: 'pop', text: `콤보 ${b.combo}`, c: '#ffb050', x: px - 30, y: py - 40, life: 0.9, max: 0.9 });
    } else if (out === 'great') {               // 순간 정지 → 금빛 섬광 · 이중 충격파 · 빛줄기 · 떠오르는 금빛 입자
      this.hitstop = 0.09;
      this.tint = { c: '255,220,120', a: 0.42, life: 0.35, max: 0.35 };
      this.rings.push({ x: px, y: py, r: 2, life: 0.55, c: '#fff4c0' }, { x: px, y: py, r: -14, life: 0.7, c: '#ffcf4a' });
      for (let i = 0; i < 12; i++) fx.push({ k: 'ray', x: px, y: py, a: i / 12 * Math.PI * 2 + rand(-0.1, 0.1), len: rand(40, 70), life: 0.45, max: 0.45 });
      for (let i = 0; i < 18; i++) fx.push({ k: 'mote', x: px + rand(-20, 20), y: py + rand(-6, 6), vx: rand(-10, 10), vy: rand(-45, -20), life: rand(0.8, 1.5), max: 1.5 });
      this.spawnSparks(26, '#ffe070', true, px, py);
      this.glow = { c: '255,215,110', life: 0.7, max: 0.7 }; pop(b.lateGreat ? '+3' : '+2', b.lateGreat ? '#fff4c0' : '#ffe070', true); this.shake = b.lateGreat ? 6 : 5;
      if (b.combo >= 2) fx.push({ k: 'pop', text: `콤보 ${b.combo}!`, c: '#ffcf4a', x: px - 30, y: py - 44, life: 1.1, max: 1.1, big: true });
      if (b.lateGreat) { this.tint.a = 0.55; for (let i = 0; i < 8; i++) fx.push({ k: 'ray', x: px, y: py, a: i / 8 * Math.PI * 2 + 0.2, len: rand(70, 100), life: 0.6, max: 0.6 }); }
      this.flash = { text: '대성공!', color: '#ffe070', life: 1.2, big: true, bounce: 1 };
    } else if (out === 'damage' && saved) {     // 파괴 보호: 푸른 방패가 깨진다
      this.hitstop = 0.07;
      this.tint = { c: '120,200,255', a: 0.3, life: 0.4, max: 0.4 };
      this.rings.push({ x: px, y: py, r: 18, life: 0.5, c: '#9ad8ff' });
      for (let i = 0; i < 14; i++) { const a = rand(0, 7); fx.push({ k: 'shard', x: px + Math.cos(a) * 16, y: py + Math.sin(a) * 10, vx: Math.cos(a) * rand(60, 130), vy: Math.sin(a) * rand(40, 90) - 30, g: 220, rot: rand(0, 6), vr: rand(-10, 10), w: 3, h: 2, c: '#bfe8ff', life: rand(0.5, 0.9), max: 0.9 }); }
      this.addCracks(px, py, 4); pop('보호!', '#9ad8ff', true); this.shake = 5;
      this.flash = { text: '파괴 보호', color: '#9ad8ff', life: 1.1, big: true, bounce: 1 };
    } else if (out === 'damage') {              // 금이 가고, 붉은 불꽃이 아래로 떨어진다
      this.tint = { c: '255,60,40', a: 0.2, life: 0.25, max: 0.25 };
      for (let i = 0; i < 10; i++) fx.push({ k: 'shard', x: px, y: py, vx: rand(-60, 60), vy: rand(-40, 10), g: 300, rot: 0, vr: 0, w: 1, h: 1, c: '#ff7a3a', life: rand(0.4, 0.8), max: 0.8 });
      this.addCracks(px, py, 3); pop('내구 -1', '#ff8a6a'); this.shake = 3.5;
    } else if (out === 'ward') {                // 파괴 방지: 불완전한 개화가 한 번 감싸 준다
      this.hitstop = 0.1;
      this.tint = { c: '200,140,255', a: 0.35, life: 0.45, max: 0.45 };
      this.rings.push({ x: px, y: py, r: 6, life: 0.6, c: '#d8a0ff' }, { x: px, y: py, r: -10, life: 0.7, c: '#9ad8ff' });
      for (let i = 0; i < 16; i++) fx.push({ k: 'mote', x: px + rand(-24, 24), y: py + rand(-8, 8), vx: rand(-20, 20), vy: rand(-40, -10), life: rand(0.8, 1.4), max: 1.4 });
      pop('방지!', '#e0b0ff', true); this.shake = 4;
      this.flash = { text: '파괴 방지', color: '#d8a0ff', life: 1.2, big: true, bounce: 1 };
    } else if (out === 'destroy') {             // 긴 정지 → 흰 섬광이 검붉게 → 조각이 날아가 바닥에서 튄다 → 검은 연기
      this.hitstop = 0.14;
      this.tint = { c: '255,240,230', a: 0.65, life: 0.18, max: 0.18, then: { c: '120,10,10', a: 0.35, life: 0.6, max: 0.6 } };
      const L = this.blankLen(b);
      for (let i = 0; i < 16; i++) fx.push({ k: 'shard', x: this.AX + rand(-L / 2, L / 2), y: this.AY + rand(-3, 3), vx: rand(-150, 150), vy: rand(-170, -40), g: 420, floor: this.AY + 24, rot: rand(0, 6), vr: rand(-16, 16), w: rand(3, 6), h: rand(2, 3), c: i % 3 ? mc : '#3a3236', life: rand(1, 1.6), max: 1.6 });
      for (let i = 0; i < 10; i++) fx.push({ k: 'puff', x: this.AX + rand(-20, 20), y: this.AY + rand(-6, 4), vx: rand(-20, 20), vy: rand(-26, -8), r: rand(4, 8), c: '30,24,30', life: rand(0.8, 1.4), max: 1.4 });
      this.rings.push({ x: px, y: py, r: 0, life: 0.6, c: '#8a1a1a' });
      this.shake = 9; this.flash = { text: '파괴', color: '#ff4a3a', life: 1.4, big: true, shakeText: 1 };
    }
  },
  addCracks(px, py, n) {
    for (let i = 0; i < n; i++) { const pts = [[px, py]]; let a = rand(0, 7); for (let j = 0; j < 4; j++) { a += rand(-0.8, 0.8); const l = pts[pts.length - 1]; pts.push([l[0] + Math.cos(a) * rand(3, 7), l[1] + Math.sin(a) * rand(1, 4)]); } (this.fx = this.fx || []).push({ k: 'crack', pts, life: 0.9, max: 0.9 }); }
  },
  spawnSparks(n, color, burst, x, y) {
    const cx = x == null ? this.AX : x, cy = y == null ? this.AY : y;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, burst ? 190 : 120);
      this.sparks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75, life: rand(0.25, 0.7), c: color });
    }
  },

  update(dt, running) {
    this.t += dt;
    this.lock = Math.max(0, this.lock - dt);
    if (this.hammerT > 0) { this.hammerT += dt; if (this.hammerT > 0.38) this.hammerT = 0; }
    this.shake = Math.max(0, this.shake - dt * 30);
    if (this.hitstop > 0) { this.hitstop -= dt; dt = 0; }   // 손맛: 크게 맞은 순간 아주 잠깐 멈춘다
    if (this.tint) { this.tint.life -= dt; if (this.tint.life <= 0) this.tint = this.tint.then || null; }
    if (this.glow) { this.glow.life -= dt; if (this.glow.life <= 0) this.glow = null; }
    for (const f of this.fx || []) {
      f.life -= dt;
      if (f.k === 'shard' || f.k === 'mote' || f.k === 'puff') { f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; if (f.vr) f.rot += f.vr * dt;
        if (f.floor && f.y > f.floor) { f.y = f.floor; f.vy *= -0.35; f.vx *= 0.6; f.vr *= 0.5; }
        if (f.k === 'puff') { f.r += 6 * dt; f.vx *= 0.95; } if (f.k === 'mote') f.vx += Math.sin((this.t + f.y) * 4) * 6 * dt; }
      if (f.k === 'pop') f.y -= 14 * dt;
    }
    if (this.fx) this.fx = this.fx.filter(f => f.life > 0);
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.94; s.vy *= 0.94; s.life -= dt; }
    this.sparks = this.sparks.filter(s => s.life > 0);
    for (const r of this.rings) { r.r += 70 * dt; r.life -= dt; }
    this.rings = this.rings.filter(r => r.life > 0);
    if (this.flash) { this.flash.life -= dt; if (this.flash.life <= 0) this.flash = null; }
    if (this.hitFlash) { this.hitFlash.life -= dt; if (this.hitFlash.life <= 0) this.hitFlash = null; }
    this.embers = this.embers || []; this.smoke = this.smoke || []; this.steam = this.steam || [];
    this.emberAcc = (this.emberAcc || 0) + dt * (this.reheatT > 0 ? 45 : 9);
    while (this.emberAcc > 1) { this.emberAcc--; const E = (this.LY || FORGE_LAYOUT.proc).embers; this.embers.push({ x: rand(E[0], E[1]), y: rand(E[2], E[3]), vx: rand(-8, 8), vy: rand(-28, -10), life: rand(0.8, 2.2) }); }
    this.smokeAcc = (this.smokeAcc || 0) + dt * (this.reheatT > 0 ? 3 : 1.2);
    while (this.smokeAcc > 1) { this.smokeAcc--; this.smoke.push({ x: rand(20, 72), y: rand(10, 40), r: rand(4, 8), life: rand(2, 3.5) }); }
    for (const m of this.embers) { m.x += (m.vx + Math.sin(this.t * 3 + m.y) * 6) * dt; m.y += m.vy * dt; m.life -= dt; }
    for (const p of this.smoke) { p.x += 6 * dt; p.y -= 9 * dt; p.r += 4 * dt; p.life -= dt; }
    for (const p of this.steam) { p.x += p.vx * dt; p.y -= 16 * dt; p.r += 7 * dt; p.life -= dt; }
    this.embers = this.embers.filter(m => m.life > 0).slice(-120);
    this.smoke = this.smoke.filter(p => p.life > 0).slice(-24);
    this.steam = this.steam.filter(p => p.life > 0);
    if (this.blank && running) {
      const before = this.heatTier();
      if (this.reheatT > 0) {
        this.reheatT -= dt;
        this.heat = Math.min(1, this.heat + dt * 0.9);
        if (this.reheatT <= 0) { this.reheatT = 0; this.heat = 1; UI.mark('forge'); }
      } else {
        this.heat = Math.max(0, this.heat - dt * 0.045);
      }
      if (this.heatTier() !== before) UI.mark('forge');
    }
    const hb = document.getElementById('heatFill');
    if (hb) {
      hb.style.left = (this.heat * 100) + '%';
      const lbl = document.getElementById('heatLabel');
      if (lbl) lbl.textContent = this.reheatT > 0 ? '가열 중…' : { perfect: '적열', good: '달궈짐', miss: '식음' }[this.heatTier()];
    }
  },

  // 열 → 금속 색
  heatColor(base, h) {
    if (h <= 0.05) return base;
    const [r, g, b] = hexToRgb(base);
    const t = Math.min(1, h);
    const hr = 255, hg = Math.round(90 + 150 * t * t), hb = Math.round(30 + 120 * Math.max(0, t - 0.7) * 3);
    const k = 0.25 + 0.7 * t;
    return `rgb(${Math.round(r + (hr - r) * k)},${Math.round(g + (hg - g) * k)},${Math.round(b + (hb - b) * k)})`;
  },

  draw(ctx) {
    const W = 320, H = 200;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (this.shake > 0) ctx.translate(Math.round(rand(-this.shake, this.shake)), Math.round(rand(-this.shake, this.shake)));
    const fl = 0.6 + 0.4 * Math.sin(this.t * 9) * Math.sin(this.t * 5.3);

    const fimg = forgeBgImage(), LY = fimg ? FORGE_LAYOUT.img : FORGE_LAYOUT.proc;   // 그림 배경(PixAI)이 있으면 그 위치에 맞춘다
    if (fimg) { ctx.drawImage(fimg, -6, 0, 333, 200); this.AX = LY.AX; this.AY = LY.AY; }
    else { if (!this.bg) this.buildBg(); ctx.drawImage(this.bg, 0, 0); }
    this.LY = LY;
    const AX = this.AX, AY = this.AY;
    const inFurnace = this.reheatT > 0;        // 가열 중이면 작업물이 화로 안에
    if (!fimg) this.drawFurnace(ctx, fl, inFurnace);
    else {                                          // 그림 속 화로: 불빛만 일렁이게
      ctx.globalCompositeOperation = 'lighter';
      const fg = ctx.createRadialGradient(LY.fire[0], LY.fire[1], 2, LY.fire[0], LY.fire[1], 26 + (inFurnace ? 10 : 0));
      fg.addColorStop(0, `rgba(255,170,80,${0.25 + 0.15 * fl + (inFurnace ? 0.2 : 0)})`); fg.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = fg; ctx.fillRect(LY.fire[0] - 40, LY.fire[1] - 40, 80, 80);
      ctx.globalCompositeOperation = 'source-over';
    }
    // 담금질 통 물: 화로 불빛이 비치고 잔물결이 인다
    { const [wx, wy, wr] = LY.water;                // 담금질 통 물: 화로 불빛이 비치고 잔물결이 인다
      ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, wr, 0, 7); ctx.clip();
      const wg = ctx.createLinearGradient(wx - wr, wy - wr, wx + wr, wy + wr); wg.addColorStop(0, `rgba(255,150,70,${0.18 + 0.08 * fl})`); wg.addColorStop(0.5, 'rgba(30,70,90,0.2)'); wg.addColorStop(1, 'rgba(10,30,40,0)');
      ctx.fillStyle = wg; ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
      for (let i = 0; i < 3; i++) { const r = ((this.t * 6 + i * 7) % wr); ctx.strokeStyle = `rgba(170,215,235,${0.25 * (1 - r / wr)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(wx - 4 + i * 3, wy - 2 + i * 2, r, r * 0.6, 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(220,240,250,0.35)'; ctx.fillRect(wx - 10 + Math.round(Math.sin(this.t * 2) * 3), wy - 8, 7, 1);
      ctx.restore(); }
    // 망치질로 떨어진 쇳비늘
    for (const k of this.flakes || []) { ctx.fillStyle = '#24202a'; ctx.fillRect(Math.round(k.x), Math.round(k.y), k.w + 1, 1); ctx.fillStyle = 'rgba(160,160,180,0.35)'; ctx.fillRect(Math.round(k.x), Math.round(k.y), 1, 1); }

    // 작업물
    const b = this.blank;
    if (b && !inFurnace) this.drawWork(ctx, b);
    if (b && inFurnace) {
      ctx.fillStyle = this.heatColor(MATERIALS[b.main].color, this.heat);
      const [fx, fy] = (this.LY || FORGE_LAYOUT.proc).fire; ctx.fillRect(fx - 16, fy - 3, 30, 6);   // 화로 입구 속 작업물
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(fx + 14, fy - 2, 40, 2); ctx.fillRect(fx + 14, fy + 1, 40, 2);   // 집게
    }
    if (!b && this.result && !this.result.destroyed) {
      const ic = gearIconCanvas(this.result);
      const bob = Math.round(Math.sin(this.t * 3) * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(AX - 30, AY - 20, 64, 48);
      ctx.drawImage(ic, AX - 34, AY - 34 + bob, 64, 64);
    } else if (!b && this.result && this.result.destroyed) {
      ctx.fillStyle = '#6a5a5a';
      [[-30, -6], [-18, 4], [-4, -3], [10, 5], [22, -5], [34, 2]].forEach(([x, y], i) => ctx.fillRect(AX + x, AY + y, 5 + (i % 3), 3));
    }

    // 결과 연출 (작업물 위)
    for (const f of this.fx || []) {
      const a = Math.max(0, f.life / f.max);
      if (f.k === 'crack') { ctx.globalAlpha = Math.min(1, a * 1.6); ctx.strokeStyle = '#1a0e0e'; ctx.lineWidth = 2; ctx.beginPath(); f.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.strokeStyle = 'rgba(255,120,60,0.6)'; ctx.beginPath(); f.pts.forEach(([x, y], i) => i ? ctx.lineTo(x + 0.5, y + 0.5) : ctx.moveTo(x + 0.5, y + 0.5)); ctx.stroke(); }
      else if (f.k === 'shard') { ctx.globalAlpha = Math.min(1, a * 2); ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillStyle = f.c; ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h); ctx.restore(); }
      else if (f.k === 'puff') { ctx.globalAlpha = a * 0.5; ctx.fillStyle = `rgb(${f.c})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // 파동 · 불꽃
    for (const r of this.rings) {
      if (r.r <= 0) continue;   // 늦게 퍼지는 두 번째 충격파
      ctx.globalAlpha = Math.max(0, r.life * 2.5); ctx.strokeStyle = r.c; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.6, 0, 0, 7); ctx.stroke();
    }
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.min(1, s.life * 2.5);
      ctx.strokeStyle = s.c; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.fillStyle = s.life > 0.35 ? '#fff6d8' : s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    }
    ctx.globalAlpha = 1;
    // 김 (완성 직후 담금질)
    for (const p of this.steam || []) { ctx.fillStyle = `rgba(220,225,235,${Math.min(0.28, p.life * 0.25)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    // 조명: 화로 · 달군 쇠 · 타격 섬광 (빛은 더해진다)
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(LY.fire[0], LY.fire[1], 6, LY.fire[0], LY.fire[1], inFurnace ? 160 : 130);
    gl.addColorStop(0, `rgba(255,130,50,${(inFurnace ? 0.3 : 0.2) + 0.07 * fl})`); gl.addColorStop(1, 'rgba(255,110,40,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    if (b && !inFurnace && this.heat > 0.15) {
      const [hr, hg, hb2] = hexToRgb(MATERIALS[b.main].color);
      const hcol = this.heatColor(MATERIALS[b.main].color, this.heat).match(/\d+/g) || [hr, hg, hb2];
      const rr = 30 + this.heat * 60;
      const hgl = ctx.createRadialGradient(AX, AY, 4, AX, AY, rr);
      hgl.addColorStop(0, `rgba(${hcol[0]},${hcol[1]},${hcol[2]},${0.28 * this.heat})`); hgl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hgl; ctx.fillRect(AX - rr, AY - rr, rr * 2, rr * 2);
    }
    if (this.glow && b && !inFurnace) {         // 성공·대성공: 작업물이 빛난다
      const g = this.glow, a = g.life / g.max, rr = 50 + 30 * (1 - a);
      const gg = ctx.createRadialGradient(AX, AY, 2, AX, AY, rr); gg.addColorStop(0, `rgba(${g.c},${0.55 * a})`); gg.addColorStop(1, `rgba(${g.c},0)`);
      ctx.fillStyle = gg; ctx.fillRect(AX - rr, AY - rr, rr * 2, rr * 2);
    }
    for (const f of this.fx || []) {
      const a = Math.max(0, f.life / f.max);
      if (f.k === 'ray') { const d = 10 + (1 - a) * 30; ctx.strokeStyle = `rgba(255,230,150,${a * 0.8})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(f.a) * d, f.y + Math.sin(f.a) * d * 0.7); ctx.lineTo(f.x + Math.cos(f.a) * (d + f.len * a), f.y + Math.sin(f.a) * (d + f.len * a) * 0.7); ctx.stroke(); }
      else if (f.k === 'mote') { ctx.fillStyle = `rgba(255,${200 + Math.round(55 * a)},120,${a})`; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
    }
    if (this.hitFlash) {
      const h = this.hitFlash, r = 26 * (1 - h.life / 0.14) + 10;
      const hf = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
      hf.addColorStop(0, `rgba(255,240,200,${h.life * 4})`); hf.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = hf; ctx.fillRect(h.x - r, h.y - r, r * 2, r * 2);
    }
    for (const m of this.embers || []) { ctx.fillStyle = m.life > 1 ? '#ffd27a' : m.life > 0.5 ? '#ff8a2a' : '#a8341a'; ctx.globalAlpha = Math.min(1, m.life); ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1); }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.smoke || []) { ctx.fillStyle = `rgba(40,34,44,${Math.min(0.18, p.life * 0.08)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }

    this.drawHammer(ctx);
    if (!this.vig) { const v = document.createElement('canvas'); v.width = W; v.height = H; const vx = v.getContext('2d'); const vg = vx.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 210); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); vx.fillStyle = vg; vx.fillRect(0, 0, W, H); this.vig = v; }
    ctx.drawImage(this.vig, 0, 0);
    if (this.tint) { const t = this.tint; ctx.fillStyle = `rgba(${t.c},${t.a * Math.max(0, t.life / t.max)})`; ctx.fillRect(-10, -10, W + 20, H + 20); }   // 화면 색: 대성공 금빛 · 손상 붉은빛 · 파괴 흰빛→검붉은빛
    for (const f of this.fx || []) if (f.k === 'pop') {            // 떠오르는 숫자
      const a = Math.min(1, f.life / f.max * 2.5), sc = f.big ? 1 + Math.max(0, (f.life - f.max + 0.2) / 0.2) * 0.6 : 1;
      ctx.font = `${Math.round((f.big ? 16 : 12) * sc)}px Galmuri14, NeoDunggeunmo, monospace`; ctx.textAlign = 'center'; ctx.globalAlpha = a;
      ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 1, f.y + 1); ctx.fillStyle = f.c; ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }

    if (this.flash) {
      const f = this.flash;
      const sc = f.bounce ? 1 + Math.max(0, (f.life - (f.bounce ? 0.95 : 0)) / 0.25) * 0.5 : 1;
      ctx.font = f.big ? `${Math.round(20 * sc)}px Galmuri14, NeoDunggeunmo, monospace` : '14px NeoDunggeunmo, Galmuri11, monospace';   // 큰 순간(등급 결과·파괴)은 Galmuri14   // 강조: 대성공·파괴 같은 연출
      ctx.textAlign = 'center';
      const y = 30 - (1 - f.life) * 10, jx = f.shakeText ? rand(-2, 2) * f.life : 0;
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.fillStyle = '#000'; ctx.fillText(f.text, AX + 1 + jx, y + 1); ctx.fillText(f.text, AX - 1 + jx, y + 1);
      ctx.fillStyle = f.color; ctx.fillText(f.text, AX + jx, y);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    if (!b && !this.result) {
      ctx.font = '11px Galmuri9, Galmuri11, monospace'; ctx.fillStyle = '#8a7f8a'; ctx.textAlign = 'center';
      ctx.fillText(this.canWork() ? (this.slots.main ? '준비되면 합성하세요' : '재료를 골라 합성하세요') : '개점 시간에만 작업 가능', AX - 10, AY + 44);
      ctx.textAlign = 'left';
    }
    if (inFurnace) {
      ctx.font = '11px Galmuri9, Galmuri11, monospace'; ctx.fillStyle = '#ffb060';
      ctx.fillText('가열 중…', 18, 90);
    }
    ctx.restore();
  },

  // ---------- 단조장 배경 (한 번만 그려 둔다) ----------
  buildBg() {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200;
    const x = c.getContext('2d');
    const AX = this.AX, AY = this.AY;
    x.fillStyle = '#120e14'; x.fillRect(0, 0, 320, 200);
    // 바닥: 크기가 제각각인 판석 + 모서리 음영 + 얼룩 + 금
    for (let y = 0, row = 0; y < 200; row++) {
      const h = 16 + Math.floor(hash1(row * 3.7) * 8);
      for (let xx = -Math.floor(hash1(row * 9.1) * 20); xx < 320;) {
        const w = 18 + Math.floor(hash1(xx * 0.71 + row * 5.3) * 16), v = hash1(xx * 1.3 + row * 7.7);
        x.fillStyle = v > 0.66 ? '#221b24' : v > 0.33 ? '#1e1820' : '#1a151c'; x.fillRect(xx + 1, y + 1, w - 2, h - 2);
        x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(xx + 1, y + 1, w - 2, 1); x.fillRect(xx + 1, y + 1, 1, h - 2);
        x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(xx + 1, y + h - 2, w - 2, 1); x.fillRect(xx + w - 2, y + 1, 1, h - 2);
        for (let k = 0; k < 4; k++) {
          const sx = xx + 2 + Math.floor(hash1(xx + k * 13 + row) * (w - 4)), sy = y + 2 + Math.floor(hash1(xx * 3 + k * 7 + row * 11) * (h - 4));
          x.fillStyle = hash1(sx + sy) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)'; x.fillRect(sx, sy, 1, 1);
        }
        if (v > 0.86) { x.fillStyle = 'rgba(0,0,0,0.45)'; let cx2 = xx + 3, cy2 = y + 3; for (let k = 0; k < 9; k++) { x.fillRect(cx2, cy2, 1, 1); cx2++; if (hash1(k * 3.1 + xx) > 0.5) cy2++; } }
        xx += w;
      }
      y += h;
    }
    // 화로 주변 그을음, 모루 주변 쇳밥
    const soot = x.createRadialGradient(46, 40, 24, 46, 40, 120); soot.addColorStop(0, 'rgba(0,0,0,0.45)'); soot.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = soot; x.fillRect(0, 0, 220, 180);
    for (let i = 0; i < 70; i++) {
      const a = hash1(i * 2.3) * Math.PI * 2, r = 50 + hash1(i * 5.1) * 46;
      const sx = Math.round(AX - 10 + Math.cos(a) * r * 1.3), sy = Math.round(AY + Math.sin(a) * r * 0.7);
      x.fillStyle = hash1(i * 7.7) > 0.5 ? '#3a3238' : '#2a2430'; x.fillRect(sx, sy, 1 + (i % 3 === 0 ? 1 : 0), 1);
      if (hash1(i) > 0.8) { x.fillStyle = 'rgba(210,210,230,0.3)'; x.fillRect(sx, sy, 1, 1); }
    }
    // 화로 벽돌 (모서리 빛·줄눈)
    x.fillStyle = '#24181a'; x.fillRect(4, 4, 84, 72);
    for (let j = 0; j < 7; j++) for (let i = 0; i < 9; i++) {
      const bx = 5 + i * 9 + (j % 2) * 4, by = 5 + j * 10;
      if (bx > 82 || (bx > 12 && bx < 76 && by > 11 && by < 64)) continue;
      const v = hash1(i * 3.3 + j * 7.1);
      x.fillStyle = v > 0.6 ? '#5a3c32' : v > 0.3 ? '#4e342c' : '#463028'; x.fillRect(bx, by, 8, 9);
      x.fillStyle = 'rgba(255,190,140,0.12)'; x.fillRect(bx, by, 8, 1);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(bx, by + 8, 8, 1);
    }
    x.fillStyle = '#0c0606'; x.fillRect(13, 13, 66, 54);
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(13, 13, 66, 3); x.fillRect(13, 13, 3, 54);
    // 숯 양동이
    x.fillStyle = '#2a2a30'; x.beginPath(); x.arc(132, 26, 11, 0, 7); x.fill();
    x.fillStyle = '#3e3e48'; x.beginPath(); x.arc(132, 26, 10, 0, 7); x.fill();
    x.fillStyle = '#141018'; x.beginPath(); x.arc(132, 26, 8, 0, 7); x.fill();
    for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? '#2a2a2e' : '#1e1e22'; x.fillRect(126 + (i % 3) * 4, 21 + Math.floor(i / 3) * 3, 3, 3); }
    x.fillStyle = "rgba(255,255,255,0.15)"; x.fillRect(123, 20, 3, 1);
    // 재료 상자
    x.fillStyle = '#2a1c12'; x.fillRect(84, 166, 44, 30);
    x.fillStyle = '#5a4028'; x.fillRect(85, 167, 42, 28);
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(85, 173 + i * 6, 42, 1); }
    x.fillStyle = '#3a2a1a'; x.fillRect(85, 167, 3, 28); x.fillRect(124, 167, 3, 28);
    x.fillStyle = '#7a6a5a'; [[90, 169, 8, 3], [101, 170, 6, 2], [110, 168, 10, 3], [96, 175, 7, 2]].forEach(([a, b2, w, h]) => x.fillRect(a, b2, w, h));
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(90, 169, 8, 1); x.fillRect(110, 168, 10, 1);
    // 공구 선반: 널빤지 + 못 + 걸린 공구들
    x.fillStyle = '#20160e'; x.fillRect(282, 10, 32, 180);
    for (let i = 0; i < 3; i++) { x.fillStyle = i % 2 ? '#4a3624' : '#43301f'; x.fillRect(284 + i * 10, 12, 9, 176); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let j = 0; j < 12; j++) x.fillRect(285 + i * 10 + (j % 3) * 2, 16 + j * 15, 1, 6); }
    for (let j = 0; j < 5; j++) { x.fillStyle = '#8a8a92'; x.fillRect(286, 18 + j * 38, 1, 1); x.fillRect(309, 18 + j * 38, 1, 1); }
    const metal = (a, b2, w, h) => { x.fillStyle = '#16141a'; x.fillRect(a - 1, b2 - 1, w + 2, h + 2); x.fillStyle = '#55555f'; x.fillRect(a, b2, w, h); x.fillStyle = '#8a8a98'; x.fillRect(a, b2, w, 1); };
    const wood = (a, b2, w, h) => { x.fillStyle = '#16100a'; x.fillRect(a - 1, b2 - 1, w + 2, h + 2); x.fillStyle = '#6a4428'; x.fillRect(a, b2, w, h); x.fillStyle = '#8a5c38'; x.fillRect(a, b2, 1, h); };
    // 집게
    metal(290, 20, 2, 40); metal(294, 20, 2, 40); metal(289, 18, 8, 3);
    // 줄칼
    metal(302, 22, 4, 26); for (let j = 0; j < 12; j++) { x.fillStyle = '#3a3a42'; x.fillRect(302, 24 + j * 2, 4, 1); } wood(302, 48, 4, 12);
    // 큰 망치
    metal(288, 74, 16, 7); wood(295, 81, 3, 34);
    // 끌 · 펀치
    metal(302, 78, 3, 20); metal(306, 80, 2, 16); x.fillStyle = '#c8c8d0'; x.fillRect(302, 97, 3, 1);
    // 캘리퍼스
    x.fillStyle = '#8a8a98'; for (let k = 0; k < 16; k++) { x.fillRect(290 + Math.floor(k / 3), 128 + k, 1, 1); x.fillRect(300 - Math.floor(k / 3), 128 + k, 1, 1); } x.fillRect(294, 126, 3, 3);
    // 걸린 사슬
    for (let k = 0; k < 7; k++) { x.fillStyle = k % 2 ? '#5a5a64' : '#7a7a86'; x.fillRect(304 + (k % 2), 124 + k * 4, 3, 4); }
    // 앞치마
    x.fillStyle = '#16100a'; x.fillRect(287, 152, 22, 32); x.fillStyle = '#5a3a22'; x.fillRect(288, 153, 20, 30); x.fillStyle = '#4a2e1a'; x.fillRect(288, 168, 20, 1); x.fillStyle = '#8a7a6a'; x.fillRect(296, 153, 4, 2);
    // 모루 받침(나무 그루터기)
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.ellipse(AX - 4, AY + 8, 66, 34, 0, 0, 7); x.fill();
    x.fillStyle = '#3a2616'; x.beginPath(); x.ellipse(AX - 8, AY + 2, 62, 31, 0, 0, 7); x.fill();
    x.strokeStyle = '#4e341e'; x.lineWidth = 1;
    for (const r of [56, 46, 36]) { x.beginPath(); x.ellipse(AX - 8, AY + 2, r, r * 0.5, 0, 0, 7); x.stroke(); }
    x.strokeStyle = '#24160c'; x.lineWidth = 2; x.beginPath(); x.ellipse(AX - 8, AY + 2, 62, 31, 0, 0, 7); x.stroke();
    // 모루 본체
    const anvil = (dx, dy, col) => {
      x.fillStyle = col;
      x.fillRect(AX - 58 + dx, AY - 20 + dy, 104, 40);
      x.beginPath(); x.moveTo(AX - 58 + dx, AY - 15 + dy); x.quadraticCurveTo(AX - 84 + dx, AY - 8 + dy, AX - 98 + dx, AY + dy); x.quadraticCurveTo(AX - 84 + dx, AY + 8 + dy, AX - 58 + dx, AY + 15 + dy); x.fill();
      x.fillRect(AX + 46 + dx, AY - 16 + dy, 14, 32);
    };
    anvil(6, 8, 'rgba(0,0,0,0.5)');
    anvil(-1, -1, '#0e0c12'); anvil(1, 1, '#0e0c12');
    anvil(0, 0, '#3a3a44');
    const face = x.createLinearGradient(AX - 56, AY - 18, AX + 44, AY + 18);
    face.addColorStop(0, '#767684'); face.addColorStop(0.45, '#5e5e6c'); face.addColorStop(1, '#484854');
    x.fillStyle = face; x.fillRect(AX - 56, AY - 18, 100, 36);
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(AX - 56, AY - 18, 100, 2); x.fillRect(AX - 56, AY - 18, 2, 36);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(AX - 56, AY + 16, 100, 2); x.fillRect(AX + 42, AY - 18, 2, 36);
    // 닳아 반들거리는 가운데
    const pol = x.createRadialGradient(AX - 6, AY - 2, 2, AX - 6, AY - 2, 40); pol.addColorStop(0, 'rgba(255,255,255,0.14)'); pol.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = pol; x.fillRect(AX - 56, AY - 18, 100, 36);
    for (let i = 0; i < 14; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.07)'; x.fillRect(AX - 50 + Math.floor(hash1(i * 4.1) * 88), AY - 14 + Math.floor(hash1(i * 6.7) * 28), 3 + (i % 4), 1); }
    // 뿔 음영
    const horn = x.createLinearGradient(0, AY - 14, 0, AY + 14); horn.addColorStop(0, '#6e6e7c'); horn.addColorStop(0.5, '#55555f'); horn.addColorStop(1, '#3a3a44');
    x.fillStyle = horn; x.beginPath(); x.moveTo(AX - 57, AY - 13); x.quadraticCurveTo(AX - 82, AY - 7, AX - 94, AY); x.quadraticCurveTo(AX - 82, AY + 7, AX - 57, AY + 13); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(AX - 80, AY - 6, 20, 1);
    // 꼬리 + 구멍 (하디·프리첼)
    x.fillStyle = '#4e4e5a'; x.fillRect(AX + 45, AY - 15, 13, 30); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(AX + 45, AY - 15, 13, 1);
    x.fillStyle = '#121016'; x.fillRect(AX + 49, AY - 5, 6, 6); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(AX + 49, AY + 1, 6, 1);
    x.fillStyle = '#121016'; x.beginPath(); x.arc(AX + 51, AY + 9, 2, 0, 7); x.fill();
    // 담금질 통: 널판 + 쇠테
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.arc(38, 164, 26, 0, 7); x.fill();
    x.fillStyle = '#4a3420'; x.beginPath(); x.arc(34, 160, 25, 0, 7); x.fill();
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(34 + Math.cos(a) * 19, 160 + Math.sin(a) * 19); x.lineTo(34 + Math.cos(a) * 25, 160 + Math.sin(a) * 25); x.stroke(); }
    x.strokeStyle = '#2a2a30'; x.lineWidth = 2; x.beginPath(); x.arc(34, 160, 24, 0, 7); x.stroke();
    x.strokeStyle = '#6a6a74'; x.lineWidth = 1; x.beginPath(); x.arc(34, 160, 24, Math.PI * 1.05, Math.PI * 1.55); x.stroke();
    x.fillStyle = '#0e1a22'; x.beginPath(); x.arc(34, 160, 19, 0, 7); x.fill();
    this.bg = c;
  },

  // 화로 불·숯 (움직이는 부분)
  drawFurnace(ctx, fl, pump) {
    if (!this.coals) { this.coals = []; for (let i = 0; i < 34; i++) this.coals.push({ x: 15 + hash1(i * 3.3) * 58, y: 15 + hash1(i * 5.9) * 46, w: 5 + Math.floor(hash1(i * 1.7) * 5), h: 4 + Math.floor(hash1(i * 2.9) * 4), s: 2 + hash1(i) * 4, p: i }); }
    for (const c of this.coals) {
      const f = 0.5 + 0.5 * Math.sin(this.t * c.s + c.p) * (pump ? 1 : 0.8) + (pump ? 0.25 : 0);
      ctx.fillStyle = '#1a0806'; ctx.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 1, c.w + 2, c.h + 2);
      ctx.fillStyle = f > 0.92 ? '#ffd27a' : f > 0.66 ? '#ff9a30' : f > 0.38 ? '#d0461a' : f > 0.18 ? '#7a2210' : '#3a120a';
      ctx.fillRect(Math.round(c.x), Math.round(c.y), c.w, c.h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(Math.round(c.x), Math.round(c.y), c.w, 1);
      ctx.fillStyle = 'rgba(30,6,2,0.6)'; ctx.fillRect(Math.round(c.x), Math.round(c.y) + c.h - 1, c.w, 1);
    }
    // 불꽃 혀 (위에서 내려다본 일렁임)
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const cx = 22 + i * 8 + Math.sin(this.t * 4 + i) * 3, cy = 40 + Math.cos(this.t * 3.3 + i * 1.7) * 12;
      const r = (8 + 4 * Math.sin(this.t * 7 + i * 2)) * (pump ? 1.5 : 1);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(255,170,80,${0.16 * fl + (pump ? 0.14 : 0)})`); g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // 풀무 (가열할 때 접혔다 펴진다)
    const k = pump ? 0.5 + 0.5 * Math.sin(this.t * 14) : 0.85;
    const bw = 16 + 8 * k;
    ctx.fillStyle = '#16100a'; ctx.fillRect(87, 30, bw + 2, 22);
    ctx.fillStyle = '#6a4428'; ctx.fillRect(88, 31, bw, 20);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(88 + i * bw / 4, 31, 1, 20); }
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(88 + bw, 29, 4, 24); ctx.fillStyle = '#55555f'; ctx.fillRect(84, 38, 5, 6);
    ctx.fillStyle = '#8a5c38'; ctx.fillRect(92 + bw, 39, 8, 3);
  },

  // 모루 위 작업물: 형태별 탑뷰 실루엣. 단련도에 따라 길이·장식이 자란다.
  drawWork(ctx, b) {
    const AX = this.AX, AY = this.AY, L = this.blankLen(b);
    const x0 = Math.round(AX - L / 2), x1 = Math.round(AX + L / 2);
    const M = MATERIALS[b.main];
    const hot = this.heatColor(M.color, this.heat), hotHi = this.heatColor(shade(M.color, 0.35), this.heat);
    const tier = tierOf(b.quality);
    const acc = b.core ? MATERIALS[b.core].color : '#b08a3a';
    // 장비 그림(PixAI 아틀라스)이 있으면: 형태 단계마다 그 단계의 모양으로 바뀌고, 단련할수록 조금씩 커지며, 열에 따라 붉게 달아오른다
    const row = typeof gearAtlasReady !== 'undefined' && gearAtlasReady ? GEAR_ATLAS.forms.indexOf(b.form) : -1;
    if (row >= 0) {
      const C = GEAR_ATLAS.cell, sz = Math.round(70 + Math.min(b.quality, 30) * 1.3);
      const off = this._wk || (this._wk = document.createElement('canvas'));
      off.width = off.height = C;
      const ox = off.getContext('2d');
      ox.clearRect(0, 0, C, C);
      ox.drawImage(gearAtlasImg, Math.min(4, tier) * C, row * C, C, C, 0, 0, C, C);
      if (this.heat > 0.05) {
        ox.globalCompositeOperation = 'source-atop';
        ox.globalAlpha = 0.2 + 0.6 * this.heat; ox.fillStyle = this.heatColor(M.color, this.heat); ox.fillRect(0, 0, C, C);
        ox.globalAlpha = 1; ox.globalCompositeOperation = 'source-over';
      }
      ctx.imageSmoothingEnabled = false;
      ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.35; ctx.drawImage(off, AX - sz / 2 + 4, AY - sz / 2 + 5, sz, sz); ctx.filter = 'none'; ctx.globalAlpha = 1;   // 그림자
      ctx.drawImage(off, Math.round(AX - sz / 2), Math.round(AY - sz / 2), sz, sz);
      return;
    }
    // 외곽선을 먼저 그려 모루 위에서도 또렷하게
    const R = (x, y, w, h, c) => {
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      ctx.fillStyle = '#120e14'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
    };
    // 집게 (왼쪽에서 잡고 있음)
    R(x0 - 46, AY - 4, 42, 2, '#26262c'); R(x0 - 46, AY + 2, 42, 2, '#26262c'); R(x0 - 6, AY - 5, 8, 10, '#33333b');
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 + 3, AY - 4 + 3, L, 9);
    const grip = 14 + tier * 2;
    switch (b.form) {
      case 'sword': {
        const w = 8 + Math.min(tier, 3) * 2;
        R(x0, AY - 3, grip, 6, '#5a3a22');                            // 손잡이
        R(x0 - 4, AY - 4, 4, 8, tier >= 1 ? acc : '#4a4a52');         // 폼멜
        R(x0 + grip, AY - 9 - tier * 2, 5, 18 + tier * 4, tier >= 2 ? acc : hot);  // 가드
        R(x0 + grip + 5, AY - w / 2, L - grip - 16, w, hot);          // 칼날
        ctx.fillStyle = hotHi; ctx.fillRect(Math.round(x0 + grip + 5), Math.round(AY - w / 2), Math.round(L - grip - 16), 2);
        ctx.fillStyle = '#120e14'; ctx.beginPath(); ctx.moveTo(x1 - 12, AY - w / 2 - 1); ctx.lineTo(x1 + 1, AY); ctx.lineTo(x1 - 12, AY + w / 2 + 1); ctx.fill();
        ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 12, AY - w / 2); ctx.lineTo(x1 - 1, AY); ctx.lineTo(x1 - 12, AY + w / 2); ctx.fill();
        if (tier >= 1) { ctx.fillStyle = shade(M.color, -0.35); ctx.fillRect(Math.round(x0 + grip + 10), AY, Math.round(L - grip - 30), 1); }  // 홈
        if (tier >= 3 && b.core) { ctx.fillStyle = acc; ctx.fillRect(Math.round(x0 + grip + 1), AY - 2, 3, 4); }  // 보석
        break;
      }
      case 'mace': {
        R(x0, AY - 2, L - 16, 4, '#5a3a22');
        const s = 9 + tier * 2;
        R(x1 - 16 - s / 2, AY - s / 2, s + 6, s, hot); R(x1 - 16 - s / 2, AY - s / 2, s + 6, 2, hotHi);
        if (tier >= 2) for (const [dx, dy] of [[0, -1], [0, 1], [1, 0]]) R(x1 - 10 + dx * (s / 2 + 3), AY + dy * (s / 2 + 2) - 1, 3, 3, acc);
        break;
      }
      case 'spear': {
        R(x0, AY - 1.5, L - 20, 3, '#6a4a2a');
        ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 22, AY - 5 - tier); ctx.lineTo(x1, AY); ctx.lineTo(x1 - 22, AY + 5 + tier); ctx.fill();
        R(x1 - 22, AY - 0.5, 18, 1, hotHi);
        if (tier >= 2) R(x1 - 28, AY - 4, 4, 8, acc);
        break;
      }
      case 'gun': {
        R(x0, AY - 3, 16, 6, '#5a3a22');
        R(x0 + 16, AY - 5, L * 0.45, 10, hot); R(x0 + 16, AY - 5, L * 0.45, 2, hotHi);
        R(x0 + 16 + L * 0.45, AY - 2, L * 0.55 - 16, 4, shade(M.color, -0.25));
        if (tier >= 2) R(x0 + 24, AY - 8, 14, 3, acc);
        break;
      }
      case 'katana': case 'rapier': case 'greatsword': {
        const w = b.form === 'rapier' ? 3 + Math.min(tier, 3) : b.form === 'katana' ? 6 + Math.min(tier, 3) : 13 + Math.min(tier, 3) * 2;
        const gl = b.form === 'greatsword' ? grip + 8 : grip;
        R(x0, AY - 3, gl, 6, b.form === 'katana' ? '#2a2a34' : '#5a3a22');
        if (b.form === 'katana') for (let i = 0; i < gl; i += 4) R(x0 + i, AY - 3, 2, 6, '#c8b890');
        if (b.form === 'rapier') { R(x0 + gl - 2, AY - 8, 8, 16, tier >= 2 ? acc : '#b8a070'); }
        else R(x0 + gl, AY - (b.form === 'katana' ? 5 : 11), b.form === 'katana' ? 4 : 6, b.form === 'katana' ? 10 : 22, b.form === 'katana' ? acc : (tier >= 2 ? acc : hot));
        const bx = x0 + gl + 6;
        R(bx, AY - w / 2, x1 - bx - 6, w, hot); ctx.fillStyle = hotHi; ctx.fillRect(Math.round(bx), Math.round(AY - w / 2), Math.round(x1 - bx - 6), b.form === 'katana' ? 1 : 2);
        ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 6, AY - w / 2); ctx.lineTo(x1, b.form === 'katana' ? AY - w / 2 : AY); ctx.lineTo(x1 - 6, AY + w / 2); ctx.fill();
        break;
      }
      case 'axe': {
        R(x0, AY - 2, L - 8, 4, '#6a4a2a');
        const s = 10 + tier * 3;
        R(x1 - 26, AY - s, 16, s, hot); R(x1 - 26, AY - s, 16, 2, hotHi); R(x1 - 10, AY - s, 3, s, hotHi);
        if (tier >= 2) R(x1 - 26, AY, 16, s * 0.7, hot);
        if (tier >= 3) R(x1 - 20, AY - 3, 5, 6, acc);
        break;
      }
      case 'knuckle': {
        const w = 26 + tier * 3, h = 16;
        R(AX - w / 2, AY - h / 2, w, h, hot); R(AX - w / 2, AY - h / 2, w, 2, hotHi);
        for (let i = 0; i < 4; i++) R(AX - w / 2 + 2 + i * (w - 6) / 3, AY - h / 2 - 4, 4, 4, tier >= 2 ? acc : hotHi);
        break;
      }
      case 'chain': {
        const n = Math.max(5, Math.floor(L / 9));
        for (let i = 0; i < n; i++) R(x0 + i * 9, AY - 3 + (i % 2) * 2, 7, 4, i % 2 ? hot : hotHi);
        if (tier >= 2) { ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 4, AY - 10); ctx.lineTo(x1 + 4, AY - 2); ctx.lineTo(x1 - 4, AY + 2); ctx.fill(); }
        break;
      }
      case 'scythe': {
        R(x0, AY - 1.5, L - 6, 3, '#6a4a2a');
        ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 8, AY - 2); ctx.lineTo(x1 - 4, AY - 18 - tier * 2); ctx.lineTo(x1 - 22 - tier * 3, AY - 26 - tier * 2); ctx.lineTo(x1 - 14, AY - 14); ctx.fill();
        if (tier >= 2) R(x1 - 10, AY - 4, 4, 8, acc);
        break;
      }
      // ---- 무기 종류 확장 ----
      case 'dagger': case 'dualblade': case 'hwando': case 'tachi': case 'armblade': {
        const blade = (len, w, hl, gh, hcol, y, curve) => {
          const xs = AX - len / 2, xe = AX + len / 2;
          R(xs, y - 3, hl, 6, hcol);
          if (gh) R(xs + hl, y - gh / 2, 4, gh, tier >= 2 ? acc : hotHi);
          const bx = xs + hl + (gh ? 4 : 0);
          R(bx, y - w / 2 + (curve ? -1 : 0), xe - bx - 6, w, hot);
          ctx.fillStyle = hotHi; ctx.fillRect(Math.round(bx), Math.round(y - w / 2 + (curve ? -1 : 0)), Math.round(xe - bx - 6), curve ? 1 : 2);
          if (curve) { ctx.fillStyle = hot; ctx.fillRect(Math.round(xe - 20), Math.round(y - w / 2 - 2), 14, 2); }
          ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(xe - 6, y - w / 2 - (curve ? 2 : 0)); ctx.lineTo(xe, curve ? y - w / 2 - 2 : y); ctx.lineTo(xe - 6, y + w / 2); ctx.fill();
        };
        if (b.form === 'dagger') blade(Math.min(L, 46 + tier * 5), 6 + Math.min(tier, 2), 12, 12, '#4a3020', AY);
        else if (b.form === 'dualblade') { const l2 = Math.min(L, 50 + tier * 5); blade(l2, 5 + Math.min(tier, 2), 12, 10, '#4a2a2a', AY - 8); blade(l2, 5 + Math.min(tier, 2), 12, 10, '#4a2a2a', AY + 8); }
        else if (b.form === 'hwando') { blade(L, 7 + Math.min(tier, 2), grip, 10, '#3a2418', AY, false); R(AX - L / 2 + 4, AY - 4, 3, 8, acc); }
        else if (b.form === 'tachi') blade(L, 6 + Math.min(tier, 2), grip + 6, 8, '#2a2a34', AY, true);
        else { R(AX - L / 2, AY - 7, 26, 14, shade(M.color, -0.3)); R(AX - L / 2, AY - 7, 26, 2, hotHi); blade(L - 20, 6 + Math.min(tier, 2), 0, 0, '#000', AY); for (let i = 0; i < 3; i++) R(AX - L / 2 + 4 + i * 8, AY - 8, 4, 3, tier >= 2 ? acc : '#3a3a42'); }
        break;
      }
      case 'glaive': case 'lance': case 'harpoon': case 'staff': {
        const pole = b.form === 'staff' ? L - 4 : L - 24;
        R(x0, AY - 1.5, pole, 3, b.form === 'staff' ? shade(M.color, -0.2) : '#6a4a2a');
        if (b.form === 'glaive') {
          ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 30, AY + 4); ctx.lineTo(x1 - 28, AY - 10 - tier * 2); ctx.lineTo(x1 - 6, AY - 14 - tier * 2); ctx.lineTo(x1, AY - 4); ctx.lineTo(x1 - 14, AY + 4); ctx.fill();
          R(x1 - 30, AY - 9 - tier * 2, 22, 2, hotHi); if (tier >= 2) R(x1 - 34, AY - 4, 4, 8, acc);
        } else if (b.form === 'lance') {
          R(x1 - 32, AY - 7 - tier, 6, 14 + tier * 2, tier >= 2 ? acc : hotHi);
          ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 26, AY - 6 - tier); ctx.lineTo(x1, AY); ctx.lineTo(x1 - 26, AY + 6 + tier); ctx.fill();
        } else if (b.form === 'harpoon') {
          ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 22, AY - 4); ctx.lineTo(x1, AY); ctx.lineTo(x1 - 22, AY + 4); ctx.fill();
          for (let i = 0; i < 1 + Math.min(tier, 2); i++) { R(x1 - 20 - i * 6, AY - 8, 3, 4, hotHi); R(x1 - 20 - i * 6, AY + 4, 3, 4, hotHi); }
          R(x0 + 4, AY - 4, 4, 8, '#c8b890');
        } else {
          R(x1 - 10, AY - 6 - tier, 10, 12 + tier * 2, hot); R(x1 - 10, AY - 6 - tier, 10, 2, hotHi);
          if (tier >= 2) R(x1 - 7, AY - 2, 4, 4, acc);
        }
        break;
      }
      case 'hammer': case 'club': {
        if (b.form === 'hammer') {
          R(x0, AY - 2, L - 14, 4, '#5a3a22');
          const s = 14 + tier * 3;
          R(x1 - 22, AY - s / 2, 18, s, hot); R(x1 - 22, AY - s / 2, 18, 2, hotHi); R(x1 - 4, AY - s / 2 + 2, 4, s - 4, shade(M.color, -0.2));
          if (tier >= 2) R(x1 - 16, AY - 2, 6, 4, acc);
        } else {
          const n = 8;
          for (let i = 0; i < n; i++) { const h = 4 + i * (6 + tier) / n; R(x0 + i * L / n, AY - h / 2, L / n + 1, h, i < 2 ? '#5a3a22' : hot); }
          ctx.fillStyle = hotHi; ctx.fillRect(Math.round(x0 + L * 0.25), AY - 4, Math.round(L * 0.7), 1);
          if (tier >= 2) for (let i = 0; i < 3; i++) R(x1 - 10 - i * 9, AY - 7 - tier / 2, 3, 3, acc);
        }
        break;
      }
      case 'gauntlet': case 'claw': {
        const w = 28 + tier * 3, h = 20;
        R(AX - w / 2, AY - h / 2, w, h, hot); R(AX - w / 2, AY - h / 2, w, 2, hotHi);
        for (let i = 0; i < 4; i++) R(AX + w / 2, AY - h / 2 + 1 + i * 5, 6, 3, b.form === 'claw' ? '#3a3a42' : hotHi);
        if (b.form === 'claw') for (let i = 0; i < 3; i++) { ctx.fillStyle = hot; ctx.beginPath(); const y = AY - 6 + i * 6; ctx.moveTo(AX + w / 2 + 4, y - 1); ctx.lineTo(AX + w / 2 + 22 + tier * 3, y + 1); ctx.lineTo(AX + w / 2 + 4, y + 2); ctx.fill(); }
        if (tier >= 2) R(AX - 4, AY - 3, 8, 6, acc);
        break;
      }
      case 'whip': {
        const n = Math.max(8, Math.floor(L / 6));
        R(x0, AY - 3, 14, 6, '#5a3a22');
        for (let i = 0; i < n; i++) R(x0 + 14 + i * (L - 14) / n, AY + Math.round(Math.sin(i * 0.9) * 5) - 1, (L - 14) / n + 1, 3, i % 2 ? hot : hotHi);
        if (tier >= 2) for (let i = 2; i < n; i += 3) R(x0 + 14 + i * (L - 14) / n, AY + Math.round(Math.sin(i * 0.9) * 5) - 3, 2, 2, acc);
        break;
      }
      case 'fan': {
        const r = 26 + tier * 3;
        for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; ctx.strokeStyle = '#120e14'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(AX - 16, AY + 8); ctx.lineTo(AX - 16 + Math.cos(a) * r, AY + 8 + Math.sin(a) * r * 0.9 - 6); ctx.stroke(); ctx.strokeStyle = i % 2 ? hot : hotHi; ctx.lineWidth = 2; ctx.stroke(); }
        if (tier >= 1) { ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(AX - 16, AY + 8, r - 3, -1.25, 1.25); ctx.stroke(); }
        R(AX - 19, AY + 5, 6, 6, '#5a3a22');
        break;
      }
      case 'shield': {
        const r = 18 + tier * 2;
        ctx.fillStyle = '#120e14'; ctx.beginPath(); ctx.arc(AX, AY, r + 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(AX, AY, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = hotHi; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(AX, AY, r - 3, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
        R(AX - 4, AY - 4, 8, 8, tier >= 2 ? acc : hotHi);
        if (tier >= 1) for (let i = 0; i < 8; i++) R(AX + Math.cos(i * 0.785) * (r - 4) - 1, AY + Math.sin(i * 0.785) * (r - 4) - 1, 2, 2, '#2a2a30');
        break;
      }
      case 'brush': {
        R(x0, AY - 2.5, L - 22, 5, '#6a4a2a'); if (tier >= 1) R(x0 + 4, AY - 3, 4, 6, acc);
        R(x1 - 24, AY - 4, 5, 8, hot);
        ctx.fillStyle = '#120e14'; ctx.beginPath(); ctx.moveTo(x1 - 21, AY - 6 - tier); ctx.lineTo(x1 + 1, AY); ctx.lineTo(x1 - 21, AY + 6 + tier); ctx.fill(); ctx.fillStyle = '#4a3a40'; ctx.beginPath(); ctx.moveTo(x1 - 20, AY - 5 - tier); ctx.lineTo(x1, AY); ctx.lineTo(x1 - 20, AY + 5 + tier); ctx.fill(); R(x1 - 18, AY - 1, 14, 1, '#8a7a80');   // 먹 묻은 붓털
        break;
      }
      case 'scissors': {
        const len = L - 10;
        ctx.strokeStyle = '#120e14'; ctx.lineWidth = 7;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(AX - len / 2, AY + s * 9); ctx.lineTo(AX + len / 2, AY - s * 3); ctx.stroke(); }
        ctx.lineWidth = 5; ctx.strokeStyle = hot;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(AX - len / 4, AY + s * 6); ctx.lineTo(AX + len / 2, AY - s * 3); ctx.stroke(); }
        for (const s of [-1, 1]) { ctx.strokeStyle = '#3a3a42'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(AX - len / 2 + 6, AY + s * 9, 5, 0, Math.PI * 2); ctx.stroke(); }
        R(AX - len / 4 + 6, AY - 2, 4, 4, tier >= 2 ? acc : hotHi);
        break;
      }
      case 'tfaxe': case 'tfgreat': {
        if (b.form === 'tfaxe') {
          R(x0, AY - 2, L - 8, 4, '#5a4a3a');
          for (let i = 1; i < 4; i++) R(x0 + i * (L - 8) / 4, AY - 4, 4, 8, '#3a3a42');
          const s = 12 + tier * 3;
          R(x1 - 26, AY - s, 16, s, hot); R(x1 - 26, AY - s, 16, 2, hotHi); R(x1 - 26, AY, 16, s * 0.6, hot);
          R(x1 - 21, AY - 3, 6, 6, tier >= 2 ? acc : '#2a2a30');
        } else {
          const w = 14 + Math.min(tier, 3) * 2, gl = grip + 8;
          R(x0, AY - 3, gl, 6, '#4a3a2a'); R(x0 + gl, AY - 11, 6, 22, tier >= 2 ? acc : hotHi);
          const bx = x0 + gl + 6;
          R(bx, AY - w / 2, x1 - bx - 6, w, hot); R(bx, AY - w / 2, x1 - bx - 6, 2, hotHi);
          for (let i = 1; i < 4; i++) R(bx + i * (x1 - bx) / 4, AY - w / 2, 2, w, '#2a2a30');
          ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 6, AY - w / 2); ctx.lineTo(x1, AY); ctx.lineTo(x1 - 6, AY + w / 2); ctx.fill();
        }
        break;
      }
      case 'bow': case 'crossbow': {
        if (b.form === 'crossbow') { R(x0, AY - 3, L - 12, 6, '#5a3a22'); R(x1 - 30, AY - 4, 10, 8, hot); }
        const cx = b.form === 'bow' ? AX : x1 - 16, r = b.form === 'bow' ? 30 + tier * 3 : 22 + tier * 2;
        ctx.strokeStyle = '#120e14'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx - r * 0.6, AY, r, -0.95, 0.95); ctx.stroke();
        ctx.strokeStyle = hot; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - r * 0.6 + Math.cos(0.95) * r, AY - Math.sin(0.95) * r); ctx.lineTo(cx - r * 0.6 + Math.cos(0.95) * r, AY + Math.sin(0.95) * r); ctx.stroke();
        if (tier >= 2) { R(cx + r * 0.38 - 2, AY - 3, 4, 6, acc); }
        break;
      }
      case 'revolver': case 'rifle': case 'sniper': case 'shotgun': case 'bayonet': {
        const long = b.form !== 'revolver';
        R(x0, AY - 4, long ? 24 : 14, 8, '#5a3a22');
        const bodyL = long ? L * 0.32 : L * 0.4;
        R(x0 + (long ? 24 : 14), AY - 5, bodyL, 10, hot); R(x0 + (long ? 24 : 14), AY - 5, bodyL, 2, hotHi);
        const bs = x0 + (long ? 24 : 14) + bodyL;
        if (b.form === 'shotgun') { R(bs, AY - 4, x1 - bs, 3, shade(M.color, -0.25)); R(bs, AY + 1, x1 - bs, 3, shade(M.color, -0.25)); R(bs + 6, AY + 4, 18, 4, '#5a3a22'); }
        else R(bs, AY - 2, x1 - bs - (b.form === 'bayonet' ? 18 : 0), 4, shade(M.color, -0.25));
        if (b.form === 'revolver') { ctx.fillStyle = '#120e14'; ctx.beginPath(); ctx.arc(x0 + 14 + bodyL * 0.5, AY, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = hotHi; ctx.beginPath(); ctx.arc(x0 + 14 + bodyL * 0.5, AY, 6, 0, Math.PI * 2); ctx.fill(); }
        if (b.form === 'sniper') { R(x0 + 30, AY - 10, bodyL, 4, '#2a2a32'); R(x0 + 28, AY - 11, 4, 6, tier >= 2 ? acc : '#3a3a42'); }
        if (b.form === 'bayonet') { ctx.fillStyle = hot; ctx.beginPath(); ctx.moveTo(x1 - 20, AY - 4); ctx.lineTo(x1, AY); ctx.lineTo(x1 - 20, AY + 2); ctx.fill(); }
        if (tier >= 2 && b.form !== 'sniper') R(x0 + 30, AY - 8, 12, 3, acc);
        break;
      }
      case 'robe': case 'lightarmor': case 'vest': case 'chainmail': case 'heavyarmor': case 'hazmat': case 'powerarmor': case 'cyberskin': {
        const wide = { heavyarmor: 6, powerarmor: 12, robe: 0 }[b.form] || 0;
        const w = Math.min(76, 30 + b.quality * 1.5) + wide, h = b.form === 'robe' ? 42 : 34;
        const cx = AX - w / 2, cy = AY - h / 2;
        R(cx, cy, w, h, hot); R(cx, cy, w, 3, hotHi);
        if (b.form === 'robe') { R(cx - 5, cy + h - 10, w + 10, 10, hot); R(AX - 9, cy - 4, 18, 6, shade(M.color, -0.3)); if (tier >= 1) R(AX - 1, cy + 4, 2, h - 6, acc); }
        if (b.form === 'lightarmor') for (let i = 0; i < 4; i++) R(cx + 2, cy + 6 + i * 7, w - 4, 2, shade(M.color, -0.3));
        if (b.form === 'vest') { R(cx + 4, cy + 14, 10, 8, shade(M.color, -0.25)); R(cx + w - 14, cy + 14, 10, 8, shade(M.color, -0.25)); R(AX - 1, cy + 3, 2, h - 4, '#2a2a30'); }
        if (b.form === 'chainmail') for (let i = 0; i < w - 4; i += 4) for (let j = 4; j < h - 2; j += 4) R(cx + 2 + i + (j % 8 ? 2 : 0), cy + j, 2, 2, shade(M.color, -0.35));
        if (b.form === 'heavyarmor') { R(cx - 8, cy, 12, 12, hotHi); R(cx + w - 4, cy, 12, 12, hotHi); R(cx + 4, cy + h / 2, w - 8, 3, shade(M.color, -0.3)); }
        if (b.form === 'hazmat') { ctx.fillStyle = '#120e14'; ctx.beginPath(); ctx.arc(AX, cy + 9, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9ad8e8'; ctx.beginPath(); ctx.arc(AX, cy + 9, 6, 0, Math.PI * 2); ctx.fill(); }
        if (b.form === 'powerarmor') { R(cx - 10, cy - 2, 14, 16, hotHi); R(cx + w - 4, cy - 2, 14, 16, hotHi); R(AX - 5, cy + 12, 10, 10, '#120e14'); R(AX - 3, cy + 14, 6, 6, tier >= 1 ? acc : '#ffb040'); }
        if (b.form === 'cyberskin') { for (let i = 0; i < 3; i++) R(cx + 6 + i * (w - 12) / 2, cy + 4, 1, h - 8, '#2a2a30'); R(cx + 4, cy + h / 2, w - 8, 1, '#2a2a30'); if (tier >= 2) R(AX - 2, cy + 8, 4, 4, acc); }
        if (tier >= 2 && b.form !== 'powerarmor') { R(cx, cy, 2, h, acc); R(cx + w - 2, cy, 2, h, acc); }
        break;
      }
      case 'suit': case 'cloak':
      case 'coat': case 'plate': {
        const w = Math.min(70, 30 + b.quality * 1.5), h = 34;
        const cx = AX - w / 2, cy = AY - h / 2;
        R(cx, cy, w, h, hot); R(cx, cy, w, 3, hotHi);
        R(AX - 1, cy + 4, 2, h - 6, shade(M.color, -0.35));
        if (b.form === 'plate') { R(cx - 6, cy + 2, 8, 10, hotHi); R(cx + w - 2, cy + 2, 8, 10, hotHi); }
        if (b.form === 'suit') { R(AX - 4, cy + 2, 8, 12, '#e8e4dc'); R(AX - 1, cy + 4, 2, 10, acc); }
        if (b.form === 'cloak') { R(cx - 4, cy + h - 6, w + 8, 6, hot); R(AX - 8, cy - 4, 16, 6, shade(M.color, -0.3)); }
        if (tier >= 1) for (let i = 0; i < 5; i++) R(cx + 4 + i * (w - 8) / 4, cy + h - 5, 2, 2, '#2a2a30');
        if (tier >= 2) { R(cx, cy, 2, h, acc); R(cx + w - 2, cy, 2, h, acc); }
        break;
      }
    }
    // 망치 자국
    for (const m of b.marks || []) {
      if (FORMS[b.form].kind === 'armor' || ['knuckle', 'gauntlet', 'claw', 'fan', 'shield', 'scissors', 'bow', 'whip'].includes(b.form)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(Math.round(x0 + m.u * L), Math.round(AY + m.v * 0.4 - 1), 2, 1);
    }
  },

  // 망치: 위에서 볼 때 들어올리면 크게(카메라에 가까움), 내려치면 작아지며 모루에 닿는다
  drawHammer(ctx) {
    const rest = (this.LY || FORGE_LAYOUT.proc).rest;
    const tgt = this.hit || { x: this.AX + 10, y: this.AY };
    let k = 0, lift = 0.35;                 // k: 위치 보간(0=대기,1=타격점), lift: 높이(1=최고)
    if (this.hammerT > 0) {
      const t = this.hammerT;
      if (t < 0.1) { k = t / 0.1; lift = 0.35 + 0.65 * (t / 0.1); }          // 들어올리며 이동
      else if (t < 0.17) { k = 1; lift = 1 - (t - 0.1) / 0.07; }             // 내려침
      else { k = 1 - (t - 0.17) / 0.21; lift = 0.35 * (1 - k) + 0.12 * k; }   // 복귀
    } else if (!this.blank) { lift = 0.25; }
    k = Math.max(0, Math.min(1, k));
    const hx = rest.x + (tgt.x - rest.x) * k, hy = rest.y + (tgt.y - rest.y) * k;
    const sc = 1 + lift * 0.55;
    // 그림자 (높을수록 멀고 흐림)
    ctx.fillStyle = `rgba(0,0,0,${0.45 - lift * 0.25})`;
    ctx.beginPath(); ctx.ellipse(hx + 6 + lift * 16, hy + 6 + lift * 12, 11 + lift * 4, 7 + lift * 3, 0, 0, 7); ctx.fill();
    // 팔 + 자루 (오른쪽 아래에서 뻗어 옴)
    const ox = hx - lift * 10, oy = hy - lift * 18;
    ctx.save();
    ctx.translate(ox, oy);
    const ang = Math.atan2(200 - oy, 330 - ox);
    ctx.rotate(ang);
    ctx.fillStyle = '#6a4428'; ctx.fillRect(4 * sc, -2.5 * sc, 46 * sc, 5 * sc);
    ctx.fillStyle = '#c89070'; ctx.fillRect(36 * sc, -5 * sc, 12 * sc, 10 * sc);           // 손
    ctx.fillStyle = '#3d4a5c'; ctx.fillRect(48 * sc, -7 * sc, 40 * sc, 14 * sc);           // 소매
    // 망치 머리 (자루에 직각)
    ctx.fillStyle = '#2a2a32'; ctx.fillRect(-9 * sc, -13 * sc, 18 * sc, 26 * sc);
    ctx.fillStyle = '#5a5a66'; ctx.fillRect(-8 * sc, -12 * sc, 16 * sc, 24 * sc);
    ctx.fillStyle = '#7a7a88'; ctx.fillRect(-8 * sc, -12 * sc, 16 * sc, 4 * sc);
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(-8 * sc, 8 * sc, 16 * sc, 4 * sc);
    ctx.restore();
  },

  // ---------- 패널 HTML ----------
  renderUI() {
    const body = document.getElementById('forgeBody');
    const ctrl = document.getElementById('forgeControls');
    const tw = document.getElementById('timingWrap');
    const sub = document.getElementById('forgeSub');
    const W = S.wLevel;
    sub.textContent = `${WORKSHOP_LEVELS[W - 1].name} · Lv.${W} · ⚖ ${districtTaboo().short}${S.detained ? ' · 금기 사냥꾼에게 붙잡혀 작업 중단' : ''}`;

    if (this.blank) {
      const b = this.blank;
      const ht = this.reheatT > 0 ? 'good' : this.heatTier();
      const p = this.probs(ht);
      const hc = this.heatCuts();
      tw.classList.remove('hidden');
      tw.innerHTML = `
        <div class="heatrow"><span>열</span>
          <div id="heatBar"><div class="hz warm" style="left:${hc.warm * 100}%"></div><div class="hz hot" style="left:${hc.hot * 100}%"></div><div id="heatFill" style="left:${this.heat * 100}%"></div></div>
          <b id="heatLabel" class="ht-${ht}">${this.reheatT > 0 ? '가열 중…' : { perfect: '적열', good: '달궈짐', miss: '식음' }[ht]}</b></div>
        <div class="probbar">${OUTCOME_ORDER.map(k => `<div style="width:${p[k]}%;background:${OUTCOMES[k].color}" title="${OUTCOMES[k].name} ${p[k].toFixed(1)}%"></div>`).join('')}</div>
        <div class="problegend">${OUTCOME_ORDER.map(k => `<span style="color:${OUTCOMES[k].color}">${OUTCOMES[k].name} ${p[k].toFixed(0)}%</span>`).join('')}</div>
        <div class="hint"><span class="pc-only">원하는 때에 모루를 클릭하거나 Space로 두드리세요 · </span><span class="phone-only">모루를 탭해 두드리세요 · </span>적열일수록 성공률↑ · 식으면 가열 · 두드릴수록 위험↑</div>`;
      const M = MATERIALS[b.main], F = FORMS[b.form];
      const hearts = '■'.repeat(b.hp) + '□'.repeat(b.maxHp - b.hp);
      const tierNow = tierOf(b.quality);
      const nextStep = TIER_STEPS[tierNow + 1];
      body.innerHTML = `
        <div class="itembox ${b.base ? 'enh' : ''}">
          <div class="boxlabel">${b.base ? '개량 중인 장비' : '만들고 있는 장비'}</div>
          <div class="bname">${b.base ? `<b>개량</b> ${b.base.epithet ? b.base.epithet + ' ' : ''}${b.base.name}` : `${M.adj} ${F.name} 합성재료`} <span class="tierchip" style="color:${TIER_COLORS[tierNow]}">→ ${TIER_NAMES[tierNow]} ${F.tiers[tierNow]}</span></div>
          <div class="brow stepbar"><span class="qnow">단련도 <b class="q">+${b.quality}</b>${b.base ? ` <small class="dim">(시작 +${b.startQ})</small>` : ''}</span>${TIER_STEPS.slice(1).map((s, i) => `<span class="${b.quality >= s ? 'on' : ''}" style="--tc:${TIER_COLORS[i + 1]}">+${s}</span>`).join('')}
            ${nextStep ? `<small class="dim">다음 형태 변화까지 ${nextStep - b.quality}</small>` : '<small class="gold">최종 형태</small>'}</div>
          ${this.statPreviewHTML(b, F)}
          ${this.traitPreviewHTML(b, F)}
          ${b.base ? '<div class="warnline">⚠ 개량 중 파괴되면 장비를 잃습니다</div>' : ''}
          ${this.contraHint(b)}
        </div>
        <div class="forgebox">
          <div class="bstats">
            <div class="bst ${b.hp <= 1 ? 'bad' : b.hp < b.maxHp ? 'warn' : ''}"><label>내구</label><b class="hp">${hearts}</b><small>${b.hp <= 1 ? '한 번 더 상하면 부서짐' : b.hp >= BUFFER_HP && useBuffer() ? '파괴 보호' : b.hp < b.maxHp ? '손상 ' + (b.maxHp - b.hp) : '온전함'}</small>
              <label class="bufopt"><input type="checkbox" data-act="toggleBuffer" ${useBuffer() ? 'checked' : ''}> 내구로 파괴 막기</label></div>
            <div class="bst ${b.fatigue ? (b.fatigue >= 3 ? 'bad' : 'warn') : ''}"><label>가열</label><b>${b.fatigue ? '열피로 ' + b.fatigue : (b.reheats || 0) >= freeReheats() ? '무료 소진' : '무료 ' + (freeReheats() - (b.reheats || 0)) + '회'}</b><small>${b.fatigue ? '쇠가 물러졌다' : (b.reheats || 0) >= freeReheats() ? '다음 가열부터 열피로' : '쇠 상태 좋음'}</small></div>
            <div class="bst ${b.maxStrikes - b.strikes <= 1 ? 'bad' : ''}"><label>단조 남은 횟수</label><b>${b.maxStrikes - b.strikes}</b><small>최대 ${b.maxStrikes}</small></div>
          </div>
          ${this.forgeCountHTML(b)}
        </div>
        <div class="strikelog">${this.strikeLog.length ? this.strikeLog.map(s => `<div><span class="tm ${s.tcls}">${s.timing}</span> <span style="color:${OUTCOMES[s.out].color}">${s.msg}</span></div>`).join('') : '<div class="empty dim">— 두드린 결과가 여기에 남습니다</div>'}</div>`;
      if (this.contraWarn) {
        body.innerHTML = `<div class="contrawarn"><h3>☠ 도시의 금기 — 금기품 경고</h3>
          <p>지금 완성하면 <b>${esc(this.contraWarn)}</b> — 금기품이 됩니다.</p>
          <p>만드는 순간 <b>머리가 반드시 인식</b>하고, 곧바로 <b>발톱</b>이 파견됩니다. 발톱을 쓰러뜨려도 <b>조율자</b>가 옵니다. 조율자마저 이기면 도시에서 <b>외곽으로 추출</b>되고, 전투에서 지면 모든 것이 끝나 <b>처음부터</b> 다시 시작해야 합니다.</p></div>`;
        ctrl.innerHTML = '<button class="big" data-act="finishCancel">돌아가기</button><button class="big" data-act="meltBlank">🔥 녹여 버리기</button><button class="big danger" data-act="finishForce">그래도 완성한다</button>';
        return;
      }
      ctrl.innerHTML = `
        <button class="big gold" data-act="strike" ${b.strikes >= b.maxStrikes || this.reheatT > 0 ? 'disabled' : ''}>🔨 두드리기 <small class="key">[Space]</small></button>
        <button class="big fire" data-act="reheat" ${this.reheatT > 0 || b.strikes >= b.maxStrikes ? 'disabled' : ''}>🔥 가열 <small><span class="key">[R] </span>${(b.reheats || 0) < freeReheats() ? `무료 ${freeReheats() - (b.reheats || 0)}회` : '열피로 +1'}</small></button>
        <button class="big" data-act="finish" ${this.reheatT > 0 ? 'disabled' : ''}>완성</button>${wardOpen() ? (b.ward ? '<button class="big ward on" disabled>🛡 파괴 방지 중</button>' : b.wardUsed ? '' : `<button class="big ward" data-act="ward" ${S.money < wardCost(b) ? 'disabled' : ''}>🛡 파괴 방지 <small>${fmtMoney(wardCost(b))}</small></button>`) : ''}`;
      return;
    }
    tw.classList.add('hidden');
    tw.innerHTML = '';

    if (this.result) {
      const r = this.result;
      if (r.destroyed) {
        body.innerHTML = `<div class="resultbox bad"><b>${r.name} — 파괴</b><p>${r.reason}. ${r.enhanced ? '장비를 잃었습니다.' : '재료를 잃었습니다.'}</p></div>`;
      } else {
        body.innerHTML = `<div class="resultbox">${gearHTML(r, { big: true })}<p class="dim">보관함에 저장되었습니다. 마감 후 인원에게 배분하거나, 의뢰에 납품하세요.</p></div>`;
      }
      ctrl.innerHTML = `<button class="big gold" data-act="forgeNext">다음 제작</button>`;
      return;
    }

    const slot = (key, label, hint) => {
      const id = this.slots[key], on = this.activeSlot === key ? 'active' : '';
      if (!id) return `<div class="slot empty ${on}" data-act="selectSlot" data-slot="${key}"><small>${label}</small><span>${hint}</span></div>`;
      return `<div class="slot ${on}" data-act="selectSlot" data-slot="${key}"><small>${label}<i class="x" data-act="clearSlot" data-slot="${key}" title="빼기">✕</i></small>${matChip(id)}</div>`;
    };
    const r = this.resolve();
    let preview = '';
    if (r.error) preview = `<div class="preview ${this.slots.main ? 'err' : 'idle'}">${r.error}</div>`;   // 아직 아무것도 안 골랐으면 안내, 잘못 골랐으면 경고
    else {
      const F = FORMS[r.form], M = MATERIALS[this.slots.main];
      const fake = { form: r.form, main: this.slots.main, shape: this.slots.shape, core: null, matGrade: r.matGrade, engraves: [], greats: 0 };
      const lo = this.previewStat(fake, 0), hi = this.previewStat(fake, 10);
      const core = this.slots.core ? TRAITS[MATERIALS[this.slots.core].trait] : null;
      const risk = r.effGrade > W + 1 ? `<div class="warnline">⚠ 공방 등급에 비해 높은 등급의 재료 — 손상·파괴 위험 증가</div>` : '';
      preview = `<div class="preview">
        <div>합성 결과: <b>${M.adj} ${F.name} 합성재료</b> <small>(${F.kind === 'weapon' ? '무기' : '방어구'})</small></div>
        <div class="dim">${F.kind === 'weapon' ? `공격력 ${lo.atk} ~ ${hi.atk}+ · 공속 ${F.interval}s · ${F.ranged ? '원거리' : '근접'}` : `방어 ${lo.def} ~ ${hi.def}+ · 체력 +${lo.hp} ~ ${hi.hp}+${F.slow ? ' · 이동 느림' : ''}`}${F.desc ? ' · ' + F.desc : ''}</div>
        ${core ? `<div>속성: <span class="trait" style="--tc:${core.color}">${core.name}</span> <small class="dim">${F.kind === 'weapon' ? core.w : core.a}</small></div>` : ''}
        ${risk}</div>`;
    }
    if (!feat('enhance')) this.mode = 'craft';   // 개량은 필요해질 때 열린다
    const tabs = !feat('enhance') ? '' : `<div class="ftabs">
        <button class="${this.mode === 'craft' ? 'on' : ''}" data-act="forgeMode" data-m="craft">새로 제작</button>
        <button class="${this.mode === 'enhance' ? 'on' : ''}" data-act="forgeMode" data-m="enhance">개량 <small>${S.gear.filter(g => g.reforgeReady > 0).length || ''}</small></button>
      </div>`;
    if (this.mode === 'enhance') {
      S.gear.forEach(migrateGear);
      const list = S.gear.slice().sort((a, b) => (b.reforgeReady || 0) - (a.reforgeReady || 0) || b.q - a.q);
      body.innerHTML = `${tabs}
        <div class="enhlist">${list.length ? list.map(g => {
          const c = this.enhanceCost(g), have = S.stock[c.id] || 0;
          const ready = g.reforgeReady || 0, ok = ready > 0 && have >= c.n && this.canWork();
          const nx = TIER_STEPS[g.tier + 1];
          const why = reforgeMax(g) === 0 ? '개량 불가 등급' : ready > 0 ? `개량 기회 ${ready}회 · 필요: ${MATERIALS[c.id].name} ${c.n}개 (보유 ${have})` : reforgeLeft(g) > 0 ? `경험치 ${Math.floor(g.exp || 0)}%` : '개량 기회를 모두 사용함';
          return gearHTML(g, { extra: `<div class="enhrow"><span class="dim">${why}${nx ? ` · 다음 형태 +${nx}` : ' · 최종 형태'}</span>
            <button class="gold" data-act="enhance" data-gid="${g.id}" ${ok ? '' : 'disabled'}>개량</button></div>` });
        }).join('') : '<div class="empty">보관함에 장비가 없습니다.</div>'}</div>`;
      ctrl.innerHTML = '';
      return;
    }
    body.innerHTML = `${tabs}
      <div class="slots">
        ${slot('main', '주재료', '금속=무기 / 천=방어구')}
        ${slot('shape', '형태재료', '선택 (형태 결정)')}
        ${slot('core', '속성재료', '선택 (특성 부여)')}
      </div>
      ${preview}
      ${(() => {
        const lock = S.wLevel < SING_UNLOCK_W;
        const kind = !r.error ? FORMS[r.form].kind : null;
        const can = k => !lock && (k === 'p' ? !!this.slots.main : (kind && SINGULARITIES[k].kinds.includes(kind)));
        if (lock) return "";   // 잠겨 있으면 존재도 알리지 않는다
        return `<div class="singrow"><div class="dim small">특이점 기술 ${lock ? `— 🔒 공방 Lv.${SING_UNLOCK_W}(A+급)부터 해금` : `— 사용료 ${fmtMoney(SING_COST)}`}</div>
          <div class="sings wide">${Object.entries(SINGULARITIES).map(([k, X]) => `<button class="sing ${this.singSel === k ? 'on' : ''}" style="--sc:${X.color}" data-act="pickSing" data-k="${k}" title="${X.desc}" ${can(k) ? '' : 'disabled'}>${X.short}<small>${X.name.split(' · ')[0]}</small></button>`).join('')}</div>
          ${this.singSel && !lock ? `<div class="small" style="color:${SINGULARITIES[this.singSel].color}">${SINGULARITIES[this.singSel].name}: ${SINGULARITIES[this.singSel].desc}</div>` : ''}</div>`;
      })()}
      ${(() => {
        const owned = MAT_ORDER.filter(id => MATERIALS[id].cat === 'ego' && (S.stock[id] || 0) > 0);
        if (!unlocked('ego') && !owned.length) return '';   // 해금 전에는 존재조차 알리지 않는다 — 드문 발견
        const weap = !r.error && FORMS[r.form].kind === 'weapon';
        return `<div class="singrow"><div class="dim small">E.G.O — 추출물을 녹여 넣으면 그 환상체의 E.G.O 무기가 된다 (무기에만, 공격력 1.6배)</div>
          <div class="sings">${owned.length ? owned.map(id => { const E = EGO[MATERIALS[id].ego]; return `<button class="sing ${this.egoSel === id ? 'on' : ''}" style="--sc:${E.color}" data-act="pickEgo" data-id="${id}" title="${E.desc}" ${weap ? '' : 'disabled'}>${E.name}<small>보유 ${S.stock[id]}</small></button>`; }).join('') : '<span class="dim small">보유한 추출물 없음</span>'}</div></div>`;
      })()}`;
    ctrl.innerHTML = `<button class="big gold" data-act="synth" ${r.error || !this.canWork() ? 'disabled' : ''}>⚗ 합성</button>`;
  },
  // 지금 완성하면 갖게 될 최종 능력치
  statPreviewHTML(b, F) {
    const known = b.base ? b.base.rarity : b.preRarity;
    const st = gearStats(b, known != null ? known : 0), up = known == null ? '<i class="up">↑</i>' : '';
    const cells = [];
    if (st.atk) cells.push(['공격력', st.atk + up]);
    if (st.def) cells.push(['방어', st.def + up]);
    if (st.hp) cells.push(['체력', '+' + st.hp + up]);
    if (F.kind === 'weapon') cells.push(['공속', F.interval + 's']);
    if (F.capacity) cells.push(['수납', F.capacity + '칸']);
    return `<div class="finalstats">${cells.map(([k, v]) => `<span><small>${k}</small><b>${v}</b></span>`).join('')}</div>`;
  },
  traitPreviewHTML(b, F) {
    const fc = (b.base ? (b.base.forgeCount || 0) : 0) + b.strikes;
    // 각인 세기는 완성 때 등급으로 정해진다 — 지금 노릴 수 있는 범위를 보여 준다
    const rLo = b.base ? b.base.rarity : 0, rHi = b.base ? b.base.rarity : rarityCap(b);
    const mg = MATERIALS[b.main].grade;
    const tm = traitLevels(b, F, fc, b.base ? b.base.bonus : null, engraveRange(rLo, mg)[0]);
    const th = traitLevels(b, F, fc, b.base ? b.base.bonus : null, engraveRange(rHi, mg)[1]);
    const chips = Object.keys(th).map(id => { const T = TRAITS[id], lo = tm[id] || 0, hi = th[id];
      return `<span class="trait ${T.strong ? 'strong' : T.res ? 'res' : ''}" style="--tc:${T.color}">${T.strong ? '⚠' : T.res ? '🛡' : ''}${T.name} ${lo === hi ? roman(hi) : roman(lo) + '~' + roman(hi)}</span>`; }).join('');
    return `<div class="brow">특성: ${chips || '<span class="dim">없음</span>'}</div>`;
  },
  forgeCountHTML(b) {
    const fc = (b.base ? (b.base.forgeCount || 0) : 0) + b.strikes;
    const left = FORGE_PER_LV - (fc % FORGE_PER_LV);
    const cb = comboBonus(b);
    return `<div class="fcount" title="특성은 최대 Lv${TRAIT_MAX}">누적 단조 <b>${fc}회</b> · 모든 특성 +1까지 <b>${left}회</b>${b.combo >= 1 ? ` · <span class="combo">콤보 ${b.combo}${cb ? ` (대성공 +${cb}%)` : ''}</span>` : ''}${b.strikes >= LATE_GREAT_AT - 1 ? ' · <span class="late">대성공 +3</span>' : ''}</div>`;
  },
  previewStat(fake, q) {
    const F = FORMS[fake.form], g = fake.matGrade;
    const gm = 1 + 0.7 * (g - 1), qm = qMult(g, q);
    const sg = fake.shape ? MATERIALS[fake.shape].grade : 0;
    return { atk: Math.round((F.atk || 0) * gm * qm + sg * 1.5), def: Math.round((F.def || 0) * gm * qm + sg * 0.8), hp: Math.round((F.hp || 0) * gm * qm + sg * 4) };
  },
};
