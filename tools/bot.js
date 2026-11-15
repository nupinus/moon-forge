// 개발용 자동 플레이 봇 — 브라우저 콘솔에서 fetch 후 eval 해서 쓴다. 게임에는 포함되지 않음.
// 평범한 플레이어처럼: 좋은 재료로 제작 → 적열일 때 두드림 → 위험해지면 완성 → 의뢰 납품
// 마감: 좋은 장비 장착, 남는 장비 판매, 고용, 승급.
window.Bot = {
  stats: [],
  pickMain(kind) {
    const ids = Object.keys(S.stock).filter(id => S.stock[id] > 0 && MATERIALS[id] && (kind === 'weapon' ? MATERIALS[id].cat === 'metal' : MATERIALS[id].cat === 'fabric'));
    ids.sort((a, b) => MATERIALS[b].grade - MATERIALS[a].grade);
    return ids[0];
  },
  needKind() {
    // 방어구 없는 사람이 있거나 방어구 의뢰가 있으면 방어구
    const wantArmor = S.fixers.some(f => !f.armor) || S.orders.some(o => !o.done && FORMS[o.form].kind === 'armor');
    const n = (S.stats.crafted || 0);
    return wantArmor && n % 2 === 1 ? 'armor' : 'weapon';
  },
  forgeTick(dt) {
    const F = Forge;
    if (F.result) { F.next(); return; }
    if (!F.blank) {
      let kind = this.needKind();
      let main = this.pickMain(kind);
      if (!main) { kind = kind === 'weapon' ? 'armor' : 'weapon'; main = this.pickMain(kind); }
      if (!main) return;
      F.slots = { main: null, shape: null, core: null };
      F.pickMat(main);
      // 형태재료: 무기면 아무거나(shape cat), 속성재료: 아무거나
      const shapes = Object.keys(S.stock).filter(id => F.avail(id) > 0 && F.slotAccepts('shape', id) && MATERIALS[id].cat === 'shape');
      if (kind === 'weapon' && shapes.length && Math.random() < 0.6) { F.activeSlot = 'shape'; F.pickMat(shapes[0]); }
      const cores = Object.keys(S.stock).filter(id => F.avail(id) > 0 && F.slotAccepts('core', id));
      if (cores.length) { F.activeSlot = 'core'; F.pickMat(cores.sort((a, b) => MATERIALS[b].grade - MATERIALS[a].grade)[0]); }
      const r = F.resolve();
      if (r.error) { F.slots = { main: null, shape: null, core: null }; F.activeSlot = 'main'; F.pickMat(main); }
      F.synth();
      return;
    }
    const b = F.blank;
    if (F.contraWarn) { F.finishCancel(); F.blank = null; return; }
    const p = F.probs('perfect');
    const risky = p.destroy + (b.hp <= 1 ? p.damage : 0);
    if (b.strikes >= b.maxStrikes || risky > (this.risk || 12)) { F.finish(); return; }
    if (F.lock > 0 || F.reheatT > 0) return;
    if (F.heatTier() === 'perfect') { Game.paused = false; F.strike(); Game.paused = true; }
    else F.reheat();
  },
  deliverAll() {
    for (const o of S.orders) if (!o.done && matchGear(o)) ACT.deliver({ id: o.id });
  },
  closeActions() {
    // 장착: 각 해결사에게 가장 좋은 무기/방어구
    for (const f of S.fixers) {
      for (const slot of ['weapon', 'armor']) {
        const kind = slot;
        const stat = slot === 'weapon' ? 'atk' : 'def';
        const cands = S.gear.filter(g => g.kind === kind && !g.contraband && !(g.owner && g.owner !== f.id) && FORMS[g.form].kind === kind);
        cands.sort((a, b) => b[stat] - a[stat]);
        const best = cands[0];
        if (best && (!f[slot] || best[stat] > f[slot][stat])) ACT.equip({ fid: f.id, gid: best.id, slot });
      }
    }
    // 판매: 보관함 6개 넘으면 싼 것부터
    const keep = 6;
    while (S.gear.length > keep) {
      const g = S.gear.slice().sort((a, b) => a.value - b.value)[0];
      ACT.sell({ gid: g.id });
    }
    // 승급
    const wc = WORKSHOP_LEVELS[S.wLevel - 1].up;
    if (wc && S.money >= wc.money + 300000 && S.fame >= wc.fame) ACT.upWorkshop();
    const oc = OFFICE_UP[S.oGrade];
    if (oc && S.money >= oc.money + 300000 && S.fame >= oc.fame) ACT.upOffice();
    // 고용
    if (S.fixers.length < maxMembers()) {
      const c = S.candidates.slice().sort((a, b) => b.lv - a.lv).find(c => c.cost < S.money * 0.4);
      if (c) ACT.hire({ id: c.id });
    }
    // 출동 지역: 갈 수 있는 가장 높은 곳(봇 설정 zoneLag 만큼 낮춤)
    const okZ = ZONES.map((z, i) => i).filter(i => S.oGrade <= ZONES[i].req); S.zone = Math.max(0, okZ[okZ.length - 1] - (this.zoneLag || 0));
    // 출동: 가용 인원 최대 4명
    S.party = S.fixers.filter(isAvailable).slice(0, MAX_PARTY).map(f => f.id);
    // 시장: 자금 여유 있으면 다음 등급 금속/천 2개씩
    UI.hideModal && UI.hideModal();
  },
  // 하루 진행. 반환: 그날 요약
  day() {
    if (S.phase === 'morning') { if (S.finger) Game.fingerAnswer(Math.random() < 0.5); Game.openShop(); }
    Game.paused = true;
    const dt = 0.05;
    let guard = 0, endT = 0;
    while (S && S.phase === 'open' && guard++ < 40000) {
      if (!Hunt.special) S.time += dt * 5;
      Hunt.update(dt);
      if (!S) return { end: 'gameover' };
      Forge.update(dt, true);
      if (UI.modalOpen) UI.hideModal();
      this.forgeTick(dt);
      this.deliverAll();
      if (!Hunt.active && !endT) endT = S.time;
      if (S.time >= 1080 && !Hunt.special) Game.closeShop();
    }
    if (!S) return { end: 'gameover' };
    const rep = Object.assign({}, S.report);
    const sum = { day: S.day, money: Math.round(S.money / 10000) + '만', fame: S.fame, W: S.wLevel, O: S.oGrade,
      kills: rep.kills, crafted: rep.crafted, destroyed: rep.destroyed, orders: rep.orders, orderMoney: Math.round(rep.orderMoney / 10000), hunt: Math.round(rep.huntMoney / 10000),
      deaths: rep.deaths.length, inj: rep.injuries.length, fixers: S.fixers.map(f => f.name.slice(0, 2) + f.lv).join(','),
      endT: endT ? fmtTime(endT) : "-", zone: S.zone, best: (S.fixers.map(f => f.weapon ? f.weapon.atk : 0)).join('/') };
    this.closeActions();
    UI.hideModal();
    Game.nextDay();
    if (!S) return { end: 'gameover', sum };
    this.stats.push(sum);
    return sum;
  },
  fresh() { localStorage.removeItem(SAVE_KEY); applyZonesFor(false); newGame("봇 공방", "봇 사무소", 0); Game.startDay(); this.stats = []; },
  run(n) { window.BOT_MUTE = true; const out = []; for (let i = 0; i < n; i++) { const s = this.day(); out.push(s); if (!S || s.end) break; } return out; },
};
'bot loaded';
