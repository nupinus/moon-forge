'use strict';
// ============================================================
//  메인 루프 · 단계 전환 · 액션
// ============================================================
const Game = {
  paused: false, last: 0, saveT: 0, uiT: 0, huntCtx: null, anvilCtx: null,

  init() {
    this.huntCtx = document.getElementById('huntCanvas').getContext('2d');
    const anvil = document.getElementById('anvil');
    this.anvilCtx = anvil.getContext('2d');
    // 모루를 직접 탭/클릭해서 원하는 지점을 두드린다 (프리 타이밍)
    anvil.addEventListener('pointerdown', e => {
      if (!Forge.blank) return;
      const r = anvil.getBoundingClientRect();
      Forge.strike((e.clientX - r.left) / r.width * anvil.width, (e.clientY - r.top) / r.height * anvil.height);
    });
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const fn = ACT[el.dataset.act];
      if (fn) { e.preventDefault(); fn(el.dataset, el); }
    });
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (typeof Tut !== 'undefined' && Tut.cur) { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); Tut.advance(); } return; }   // 안내 중에는 게임 조작을 막는다
      const phaseScreen = !document.getElementById('overlay').classList.contains('hidden');
      if (e.code === 'Space') { if (UI.view === 'forge' && Forge.blank) { e.preventDefault(); Forge.strike(); } }
      else if (e.code === 'KeyR') { if (UI.view === 'forge' && Forge.blank) Forge.reheat(); }
      else if (e.code === 'Escape' && UI.modalOpen) UI.hideModal();
      else if (e.code === 'Enter' && phaseScreen && !UI.modalOpen && S) {   // 아침: 개점 · 마감: 다음 날
        const b = document.querySelector('#overlay [data-act="openShop"], #overlay [data-act="nextDay"]'); if (b && !b.disabled) { e.preventDefault(); b.click(); }
      }
      else if (e.code === 'KeyP' && !phaseScreen && !UI.modalOpen && S && S.phase === 'open') ACT.pause();
      else if (!phaseScreen && !UI.modalOpen && S && /^Digit[1-5]$/.test(e.code)) {
        UI.setView(['forge', 'hunt', 'orders', 'storage', 'log'][Number(e.code.slice(5)) - 1]);
      }
    });
    window.addEventListener('beforeunload', () => save());
    const flush = () => { save(); if (Cloud.timer) { clearTimeout(Cloud.timer); Cloud.timer = null; } Cloud.push(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    Cloud.init();
    UI.layoutForge(); window.addEventListener('resize', () => UI.layoutForge());
    UI.showTitle();
    requestAnimationFrame(t => { this.last = t; this.loop(t); });
  },

  loop(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    if (S) {
      const running = S.phase === 'open' && !this.paused && !UI.modalOpen;
      const sdt = running ? dt * S.speed : 0;
      if (running && !Hunt.special) {
        S.time += sdt * DAY_SPEED;
        if (S.time >= 1080) { S.time = 1080; this.closeShop(); }
      }
      Hunt.update(sdt);
      if (!S) { requestAnimationFrame(t => this.loop(t)); return; }   // 발톱 패배·외곽 추출로 게임이 끝난 경우
      Forge.update(dt, running);
      if (UI.view === 'hunt') Hunt.render(this.huntCtx);
      Forge.draw(this.anvilCtx);
      this.uiT += dt;
      if (this.uiT > 0.2) { this.uiT = 0; UI.mark('top'); UI.updateParty(); }
      if (S && S.phase === 'open' && !Hunt.special) { const hr = Math.floor(S.time / 60); if (hr !== this.lastHr) { this.lastHr = hr; this.rollRareGuest(); } }
      UI.flush();
      this.saveT += dt;
      if (running && this.saveT > 6) { this.saveT = 0; save(); }
    }
    requestAnimationFrame(t => this.loop(t));
  },

  enterGame() {
    applyZonesFor(!!S.outskirts);
    for (const old in BW_LEGACY) {
      if (S.stock[old]) { S.stock[BW_LEGACY[old]] = (S.stock[BW_LEGACY[old]] || 0) + S.stock[old]; delete S.stock[old]; }
      if (S.incoming[old]) { S.incoming[BW_LEGACY[old]] = (S.incoming[BW_LEGACY[old]] || 0) + S.incoming[old]; delete S.incoming[old]; }
    }
    S.fixers.forEach(f => { if (BW_LEGACY[f.blackwater]) f.blackwater = BW_LEGACY[f.blackwater]; if (f.colorTitle && !f.colorKey && LEGACY_COLOR[f.colorTitle]) { f.colorKey = LEGACY_COLOR[f.colorTitle]; f.colorHex = COLOR_FAMILIES.find(c => c.key === f.colorKey).color; } });
    (S.berserk || []).forEach(b => { if (BW_LEGACY[b.bw]) b.bw = BW_LEGACY[b.bw]; });
    if (S.extractPending) { return this.extracted(); }
    if (S.clawPending) { return this.resumeClaw(); }
    if (!S.seen) { S.seen = {}; for (const k in S.stock) S.seen[k] = 1; }   // 예전 세이브: 지금 가진 재료만 "본 적 있음"
    if (!S.patents) S.patents = [];
    if (S.assoc === undefined) S.assoc = null;
    if (!S.fingers) S.fingers = { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
    delete S.taboo; delete S.tabooBroken;
    if (S.district == null || !DISTRICTS[S.district]) S.district = 0;   // 구 정보가 없거나 잘못된 옛 세이브만 보정
    if (!S.krw) {
      S.krw = true;
      S.money *= KRW;
      const allGear = S.gear.concat(S.fixers.map(f => f.weapon), S.fixers.map(f => f.armor)).filter(Boolean);
      allGear.forEach(g => { g.value *= KRW; });
      (S.patents || []).forEach(p => { p.royalty *= KRW; });
      (S.orders || []).forEach(o => { o.money *= KRW; });
      (S.candidates || []).forEach(c => { if (c.cost) c.cost *= KRW; });
      S.ammo = Math.min(S.ammo || 0, 2);
    }
    if (S.ammo == null) S.ammo = 60;
    if (S.valueV !== 5) { S.gear.concat(S.fixers.map(f => f.weapon), S.fixers.map(f => f.armor)).filter(Boolean).forEach(g => { g.value = gearValue(g); }); S.valueV = 5; }   // 판매가 기준 변경
    if (S.zoneV !== 2) { if (!S.outskirts) S.zone = [0, 2, 4, 6, 8][S.zone] || 0; S.zoneV = 2; }   // 지역 확장(5→9곳): 옛 번호를 새 번호로
    if (!(S.zone >= 0 && S.zone < ZONES.length)) S.zone = 0;   // 지역 목록이 바뀌어도 범위 밖이 되지 않게
    if (!S.unlocks) S.unlocks = { gun: false, aug: false, ego: false };
    if (!S.claws) S.claws = [];
    if (S.tabooStrikes == null) S.tabooStrikes = 0;
    if (S.taxWarn == null) S.taxWarn = 0;
    // 없어진 재료·장비 형태가 남아 있는 옛 세이브: 화면이 멈추지 않게 정리
    for (const box of [S.stock, S.incoming, S.seen]) for (const k in box) if (!MATERIALS[k]) delete box[k];
    S.gear = S.gear.filter(g => g && FORMS[g.form]);
    S.fixers.forEach(f => { if (f.weapon && !FORMS[f.weapon.form]) f.weapon = null; if (f.armor && !FORMS[f.armor.form]) f.armor = null; });
    S.orders = (S.orders || []).filter(o => !o.form || FORMS[o.form]);
    S.party = S.party.filter(id => S.fixers.some(f => f.id === id));
    S.gear.forEach(migrateGear);
    S.fixers.forEach(f => { migrateGear(f.weapon); migrateGear(f.armor); });
    Forge.resetAll();
    UI.logUnread = 0;
    UI.setView('forge');
    UI.markAll();
    if (S.phase === 'open') { UI.hideOverlay(); Hunt.start(); }
    else if (S.phase === 'close') { Hunt.active = false; Hunt.units = []; UI.showClose('report'); }
    else UI.showMorning();
    UI.mark('partyStruct');
  },
  startDay() {
    if (S.home && !S.fixers.length) return ENDGAME.failExpedition('동행한 해결사를 잃었다.');
    const arrived = Object.assign({}, S.incoming);
    for (const k in arrived) S.stock[k] = (S.stock[k] || 0) + arrived[k];
    S.incoming = {};
    S.morningEvents = [];
    // 어제 물건을 받아 간 손님이 한마디를 남기고 갔다 (가끔)
    const got = S.delivered || []; S.delivered = [];
    if (got.length && Math.random() < 0.4) { const m = clientWord(pick(got)); if (m) S.morningEvents.push({ t: m, cls: 'msgline' }); }
    for (const f of S.fixers.slice()) {
      f.serum = null;
      // 충성도: 급여를 받으면 조금씩 회복, 바닥이면 떠날 수 있다
      if (f.loyalty == null) f.loyalty = 70;
      f.loyalty = Math.max(0, Math.min(100, f.loyalty + (S.money >= 0 ? 2 : -5)));
      if (f.loyalty < 20 && Math.random() < 0.25) {
        if (f.weapon) S.gear.push(f.weapon); if (f.armor) S.gear.push(f.armor); if (f.pack) { (f.pack.items || []).forEach(g => S.gear.push(g)); S.gear.push(f.pack); }
        S.fixers = S.fixers.filter(x => x !== f); S.party = S.party.filter(id => id !== f.id);
        S.morningEvents.push(`${f.name}이(가) 사무소를 떠났다 (충성도 바닥).`); addLog(`${f.name}이(가) 더는 이 사무소를 믿지 못해 떠났다.`, 'bad');
        continue;
      }
      // 흑수 침식: 누름환을 꾸준히 먹이지 않으면 오른다
      if (f.blackwater) {
        const talisman = [f.weapon, f.armor].some(g => g && g.singularity === 'q');   // Q사 괴문자 부적으로 억누른다
        f.erosion = (f.erosion || 0) + (talisman ? 6 : 12);
        if ((S.stock.nureum || 0) > 0) { S.stock.nureum--; if (!S.stock.nureum) delete S.stock.nureum; f.erosion = Math.max(0, f.erosion - 30); }
        if (f.erosion >= 100) {
          if (f.weapon) S.gear.push(f.weapon); if (f.armor) S.gear.push(f.armor); if (f.pack) { (f.pack.items || []).forEach(g => S.gear.push(g)); S.gear.push(f.pack); }
          S.fixers = S.fixers.filter(x => x !== f); S.party = S.party.filter(id => id !== f.id);
          (S.berserk = S.berserk || []).push({ id: f.id, name: f.name, lv: f.lv, bw: f.blackwater });
          S.morningEvents.push(`☠ ${f.name}이(가) 침식을 이기지 못하고 광폭화해 뛰쳐나갔다 — 이제 현장에서 적으로 마주친다.`);
          addLog(`☠ ${f.name}이(가) 이성을 잃고 광폭화했다.`, 'bad');
          continue;
        }
      }
    }
    S.fixers.forEach(f => { f.curHp = Math.round(unitStats(f).maxHp * (f.tired ? 0.75 : 1)); f.tired = false; });
    S.morning = { arrived, wages: S.lastWages || 0, resting: S.fixers.filter(f => !isAvailable(f)).map(f => f.name),
      night: S.lastNight || null, royalty: S.lastRoyalty || 0, colors: S.lastColors || [], tax: S.lastTax || null, claw: S.lastClaw || [] };
    S.lastNight = null; S.lastRoyalty = 0; S.lastColors = []; S.lastTax = null;
    S.nightRoll = Math.random();
    S.finger = (!S.outskirts && S.day >= 3 && Math.random() < 0.28) ? this.rollFinger() : null;
    S.phase = 'morning'; S.time = 540;
    Hunt.active = false; Hunt.units = []; Hunt.ended = '';
    save();
    UI.markAll();
    // 경험치가 가득 찬 장비가 생기면 다음 날 개량이 열린다
    if (S.feat && !S.feat.enhance && S.gear.concat(S.fixers.flatMap(f => [f.weapon, f.armor])).some(g => g && g.reforgeReady > 0)) S.feat.enhance = true;
    UI.showMorning();
  },
  openShop() {
    if (S.phase !== 'morning') return;
    if (S.examAsked !== S.day && !S.outskirts) {
      const f = S.fixers.find(examReady);
      if (f) {
        S.examAsked = S.day;
        if (typeof window !== 'undefined' && window.BOT_MUTE) { ACT.examYes({ fid: String(f.id) }); return; }   // 개발용 봇: 받는다
        return UI.showModal(`<h2>하나 협회의 연락</h2>
          <p><b>${esc(f.name)}</b>의 특색 심사를 받으시겠습니까?</p>
          <p class="dim small">심사를 받는 동안(오늘 하루) 출동할 수 없습니다. 떨어지면 1급 0%로 돌아갑니다. · 합격 가능성 ${examChance(f) >= 0.7 ? '높음' : examChance(f) >= 0.45 ? '보통' : '낮음'}</p>
          <div class="row"><button data-act="examNo">다음에</button><button class="gold" data-act="examYes" data-fid="${f.id}">심사 받기</button></div>`);
      }
    }
    S.phase = 'open'; S.time = 540;
    S.detained = false; S.recordWatched = false; delete S.huntEnded; S.huntWave = 0;
    Forge.resetAll();
    UI.hideOverlay();
    UI.setView('forge');
    Hunt.start();
    addLog(`${S.day}일차 개점. 현장: ${ZONES[S.zone].name}`, '');
    if (!(typeof window !== 'undefined' && window.BOT_MUTE ? (S.volatile = S.volatile || S.wLevel >= 3, false) : volatileBloom())) setTimeout(() => Tut.check('open'), 60);   // 공방 Lv3: 불완전 개화
    // 구의 금기 (출동)
    S.zoneStreak = S.lastZone === S.zone ? (S.zoneStreak || 1) + 1 : 1; S.lastZone = S.zone;
    { const avail = S.fixers.filter(isAvailable).length, going = Hunt.units.length;
      const why = tabooBreach('open', { idle: Math.max(0, Math.min(MAX_PARTY, avail) - going), streak: S.zoneStreak }); if (why) Game.breakDistrictTaboo(why); }
    UI.markAll();
    save();
  },
  closeShop() {
    if (S.phase !== 'open') return;
    if (Forge.blank && !S.outskirts && districtTaboo().id === 'overtime') Game.breakDistrictTaboo('마감까지 작업물을 화로에 남겼다', { stop: true });   // 20구의 금기
    if (Forge.blank) Forge.finish(true);
    Forge.resetAll();
    Hunt.stop('마감 · 귀환');
    S.phase = 'close'; S.time = 1080;
    for (const o of S.orders) if (!o.done && o.finger === 'index') { S.fame = Math.max(0, S.fame - 10); addRel('index', -25, '지령 불이행'); addLog('검지의 지령을 완수하지 못했다. 명성 -10', 'bad'); }
    for (const o of S.orders) if (!o.done && o.finger === 'ring') addRel('ring', -5, '의뢰 미완');
    const left = S.orders.filter(o => !o.done).length;
    addLog(`${S.day}일차 마감.${left ? ` 미완료 의뢰 ${left}건은 만료되었다.` : ''}`, '');
    S.ampuleToday = false;
    this.paused = false;
    save();
    UI.markAll();
    UI.showClose('report');
    BlackMarket.roll();   // 가끔 암시장 판이 선다
    if (!Auction.roll() && BlackMarket.open()) UI.renderClose();   // 정해진 날 경매
  },
  nextDay() {
    S.preWage = S.money;   // 10구 금기: 급여는 빼고, 스스로 진 빚만 본다
    const wages = S.fixers.reduce((a, f) => a + wageOf(f), 0);
    S.money -= wages;
    S.lastWages = wages;
    // 도시의 금기: 금기품을 가진 자에게 발톱이 온다
    S.lastClaw = [];
    for (const c of (S.claws || []).filter(c => c.due <= S.day)) {
      const holder = S.fixers.find(f => (f.weapon && f.weapon.id === c.gid) || (f.armor && f.armor.id === c.gid));
      if (holder) {
        if (holder.weapon && holder.weapon.id === c.gid) holder.weapon = null; else holder.armor = null;
        fixerDies(holder);
        S.lastClaw.push(`${holder.name} — 「${c.name}」`);
        addLog(`☠ 발톱이 왔다. 금기품 「${c.name}」을 지닌 ${holder.name}이(가) 처형되었고, 금기품은 흔적도 없이 사라졌다.`, 'bad');
      } else if (S.gear.some(g => g.id === c.gid)) {
        S.dead = 'contraband'; save(); this.showGameOver(); return;
      } else {
        addLog(`☠ 발톱은 금기품 「${c.name}」을 쫓아갔다. 그것은 이미 이 공방에 없었다.`, 'warn');
      }
    }
    S.claws = (S.claws || []).filter(c => c.due > S.day);
    S.lastNight = this.nightEvent();          // 03:13 ~ 04:34 뒷골목의 밤
    // 도시의 금기: 세금 (7일마다)
    S.lastTax = null;
    if (!S.outskirts && S.day % TAX_PERIOD === 0) {
      const tax = taxAmount();
      if (S.money >= tax) { S.money -= tax; S.lastTax = { paid: tax }; addLog(`도시세 ${fmtMoney(tax)}을 냈다.`, ''); }
      else {
        S.taxWarn = (S.taxWarn || 0) + 1; S.lastTax = { warn: S.taxWarn, due: tax };
        addLog(`⚠ 도시세 ${fmtMoney(tax)}을 내지 못했다 — 머리의 경고 ${S.taxWarn}회`, 'bad');
        if (S.taxWarn >= TAX_STRIKES) { S.dead = 'tax'; save(); this.showGameOver(); return; }
      }
    }
    // 트레스 협회 특허 로열티
    const roy = (S.patents || []).reduce((a, p) => a + p.royalty, 0);
    S.money += roy; S.lastRoyalty = roy;
    // 하나 협회: 색 칭호
    S.lastColors = [];
    for (const f of S.fixers) {
      if (!f.exam) continue;
      const pass = Math.random() < examChance(f);
      delete f.exam;
      if (pass) { grantColor(f); }
      else { f.lv = 25; f.exp = 0; f.curHp = unitStats(f).maxHp; S.lastColors.push(`${f.name} — 불합격 (1급 0%로)`); addLog(`하나 협회 특색 심사 — ${f.name} 불합격. 처음부터 다시 쌓아야 한다.`, 'bad'); }
    }
    S.day++;
    genOrders(); genCandidates(); resetReport();
    // 출동 불가 인원 정리 없이 유지 (부상자는 시작 시 제외됨)
    this.startDay();
  },
  // 뒷골목의 밤: 사무소 습격. 야간 경계 인원이 막아낸다.
  nightEvent() {
    const watchers = S.fixers.filter(f => f.nightWatch && (S.day + 1) > (f.injuredUntil || 0));
    watchers.forEach(f => { f.tired = true; });
    { const why = tabooBreach('night', { watch: watchers.length, abno: S.report && S.report.abno }); if (why) Game.breakDistrictTaboo(why); }   // 구의 금기 (밤)
    const names = watchers.map(f => f.name);
    let revenge = S.forcedRaid; S.forcedRaid = false;
    if (!revenge && rel('thumb') <= -40 && Math.random() < 0.3) revenge = true;          // 엄지 적대: 보복
    let chance = 0.25 + (9 - S.oGrade) * 0.025;
    if (rel('thumb') >= 70) chance *= 0.5;                                                  // 엄지 동맹: 보호
    const roll = S.nightRoll != null ? S.nightRoll : Math.random(); S.nightRoll = null;
    if (!revenge && roll > chance) return { calm: true, watchers: names };
    if (S.outskirts) revenge = false;
    const kind = S.outskirts ? pick(['외곽 짐승 무리', '환으로 빚어진 것', '떠돌이 약탈자'])   // 외곽: 청소부도 손가락도 없다
      : revenge ? '엄지 조직의 보복' : Math.random() < 0.18 ? '청소부' : pick(['쥐 떼', '조직원 무리', '현상금 사냥꾼', '정체불명의 습격자', '손가락 말단 조직']);
    const power = (25 + (9 - S.oGrade) * 30 + S.wLevel * 10) * rand(0.7, 1.3) * (revenge ? 1.6 : kind === '청소부' ? 1.3 : 1);
    // 청소부는 밖에 있는 자만 쓸어간다 — 문을 걸어 잠그면 피해가 없다
    if (kind === '청소부' && !watchers.length) { addLog('뒷골목의 밤 — 청소부가 지나갔다. 문을 걸어 잠근 덕에 피해는 없었다.', ''); return { kind, sweep: true, lost: [], hurt: [], watchers: names }; }
    const def = watchers.reduce((a, f) => { const st = unitStats(f); return a + st.atk * 3 + st.def * 4 + st.maxHp * 0.2; }, 0);
    if (def >= power) {
      const fame = 2 + (9 - S.oGrade);
      S.fame += fame;
      watchers.forEach(f => gainExp(f, 10 + (9 - S.oGrade) * 6));
      addLog(`${S.outskirts ? '외곽의 밤' : '뒷골목의 밤'} — ${kind}의 습격을 막아냈다. 명성 +${fame}`, 'good');
      return { kind, win: true, fame, watchers: names };
    }
    const ratio = Math.min(1, 1 - def / power);
    if (kind === '청소부') {   // 청소부: 약탈은 없고, 밖에서 경계하던 인원이 크게 다친다
      const hurt = [];
      watchers.forEach(f => { if (Math.random() < 0.3 + ratio * 0.6) { f.injuredUntil = S.day + 1; hurt.push(f.name); } });
      addLog(`뒷골목의 밤 — 청소부와 마주쳤다. 부상: ${hurt.join(', ') || '없음'}`, 'bad');
      return { kind, win: false, lost: [], hurt, watchers: names };
    }
    const lost = [];
    const cap = (300 + (9 - S.oGrade) * 120 + S.wLevel * 60) * KRW;   // 한 번에 털리는 돈의 상한: 모아 둔 돈이 한밤에 녹아내리지 않게
    const money = S.money > 0 ? Math.round(Math.min(S.money * 0.1, cap) * ratio) : 0;
    if (money > 0) { S.money -= money; lost.push(fmtMoney(money)); }
    const ids = MAT_ORDER.filter(id => S.stock[id] > 0);
    for (let i = 0; i < Math.min(ids.length, randInt(1, 3)); i++) {
      const id = ids.splice(randInt(0, ids.length - 1), 1)[0];
      const n = Math.max(1, Math.ceil(S.stock[id] * 0.35 * ratio));
      S.stock[id] -= n; if (S.stock[id] <= 0) delete S.stock[id];
      lost.push(`${MATERIALS[id].name} ${n}`);
    }
    if (ratio > 0.6 && S.gear.length) {
      const g = S.gear.splice(randInt(0, S.gear.length - 1), 1)[0];
      S.patents = (S.patents || []).filter(p => p.gid !== g.id);
      lost.push(`장비 「${g.name} +${g.q}」`);
    }
    const hurt = [];
    watchers.forEach(f => { if (Math.random() < ratio * 0.6) { f.injuredUntil = S.day + 1; hurt.push(f.name); } });
    addLog(`${S.outskirts ? '외곽의 밤' : '뒷골목의 밤'} — ${kind}에게 털렸다: ${lost.join(', ') || '피해 없음'}. ${S.outskirts ? '외곽에서 잃은 것은 돌아오지 않는다.' : '밤의 일은 기록도 조사도 금기 — 되찾을 길은 없다.'}`, 'bad');
    return { kind, win: false, lost, hurt, watchers: names };
  },
  // ---------- 둥지(구)의 금기: 금기 사냥꾼 ----------
  // 1회: 벌금·명성 하락·오늘 작업 중단 / 2회: + 해결사 부상 / 3회 이상: + 해결사 한 명 처형
  breakDistrictTaboo(what, opt) {
    const stop = !!(opt && opt.stop);   // 작업물을 압수하고 오늘 작업을 멈추는 경우 (화로 앞에서 어겼을 때만)
    if (S.outskirts || S.detained || S.tabooDay === S.day + (S.phase === 'close' ? 0.5 : 0)) return;
    S.tabooDay = S.day + (S.phase === 'close' ? 0.5 : 0);
    S.tabooStrikes = (S.tabooStrikes || 0) + 1;
    const n = S.tabooStrikes, T = districtTaboo();
    const fine = Math.max(300 * KRW, Math.round(Math.max(0, S.money) * 0.2)) * Math.min(3, n);
    S.money -= fine; S.fame = Math.max(0, S.fame - 10 * n);
    if (stop) S.detained = true;
    if (stop && Forge.blank) { const nm = Forge.blank.base ? Forge.blank.base.name : '작업물'; if (Forge.blank.base) S.gear.push(Forge.blank.base); Forge.blank = null; Forge.result = { destroyed: true, reason: '금기 사냥꾼이 작업을 중단시켰다', name: nm }; }
    let extra = '';
    const pool = S.fixers.slice();
    if (n === 2 && pool.length) { const f = pick(pool); f.injuredUntil = S.day + 1; extra = ` ${f.name}이(가) 붙잡히며 중상을 입었다.`; }
    if (n >= 3 && pool.length) { const f = pick(pool); fixerDies(f); extra = ` 더 높은 등급의 금기 사냥꾼이 왔다. ${f.name}이(가) 그 자리에서 처형당했다.`; }
    addLog(`⚖ ${district().name}의 금기 「${T.name}」 위반(${n}회) — ${what}. 금기 사냥꾼에게 붙잡혔다: 벌금 ${fmtMoney(fine)}, 명성 -${10 * n}${stop ? ', 오늘 작업 중단' : ''}.${extra}`, 'bad');
    UI.toast(`⚖ 금기 위반 — 금기 사냥꾼 출동 (${n}회째)`, 'bad');
    Sound.bad(); UI.mark('forge', 'stock', 'top', 'storage'); save();
  },
  // 안식일: 문을 열지 않고 하루를 보낸다
  // ---------- 희귀 손님 ----------
  rollRareGuest() {
    const cand = RARE_GUESTS.filter(gst => !(S.stock[gst.item] > 0) && !unlocked(MATERIALS[gst.item].unlock) && !S.orders.some(o => o.rare === gst.id));
    if (!cand.length || Math.random() > RARE_GUEST_CHANCE) return;
    const gst = pick(cand), form = pick(gst.forms), F = FORMS[form], stat = F.kind === 'weapon' ? 'atk' : 'def';
    const W = S.wLevel, g = Math.min(5, W), q = 6 + W;
    const req = Math.max(1, Math.round(F[stat] * (1 + 0.7 * (g - 1)) * (1 + 0.08 * q)));
    S.orders.push({ id: uid(), form, stat, req, money: Math.round((stat === 'atk' ? req * 14 : req * 26) * 1.5 * KRW), fame: 8, done: false, client: gst.name, rare: gst.id, item: gst.item });
    addLog(`✦ 드문 손님 — ${gst.name}: "${gst.line}"`, 'gold');
    UI.toast(`✦ 드문 손님: ${gst.name}`, 'good');
    UI.mark('orders');
  },
  // ---------- 도시의 금기: 발톱 → 조율자 → 외곽 ----------
  clawRaid(g) {
    S.clawPending = g.id;
    addLog(`☠ 금기품 「${g.name}」(${g.contraband.reason}) — 머리가 인식했다. 발톱이 파견되었다.`, 'bad');
    UI.toast('☠ 머리가 발톱을 보냈다', 'bad');
    Sound.destroy();
    save();
    Forge.result = g;
    UI.setView('hunt');
    Hunt.startClaw(g);
    UI.markAll();
  },
  resumeClaw() {          // 전투 도중 새로고침해도 도망칠 수 없다
    S.phase = 'open';
    UI.hideOverlay(); Forge.resetAll(); UI.markAll();
    const g = S.gear.find(x => x.id === S.clawPending) || S.fixers.map(f => f.weapon).find(w => w && w.id === S.clawPending);
    UI.setView('hunt');
    Hunt.startClaw(g);
  },
  wipeSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
    Cloud.clear();
  },
  clawDefeat() {
    if (!S) return;
    if (S.home) { this.paused = false; Hunt.active = false; Hunt.special = false; Hunt.units = []; return ENDGAME.failExpedition('발톱이 분점을 찾아왔다.'); }
    this.paused = false;
    const name = S.workshopName, day = S.day;
    this.wipeSave();
    S = null; Hunt.active = false; Hunt.special = false; Hunt.units = [];
    UI.hideModal();
    UI.showOverlay(`<div class="card narrow gameover">
      <div class="dayno">발톱</div>
      <h2>도시의 금기 — 처형</h2>
      <p>머리는 언제나 알고 있다. 금기품을 만든 공방은 ${day}일차에 소리 없이 사라졌다.</p>
      <p class="dim">「${esc(name)}」 공방의 기록은 남지 않는다. 모든 것을 처음부터 다시 시작해야 한다.</p>
      <button class="big gold" data-act="newGameForm">처음부터</button>
    </div>`, 'phase');
  },
  extracted() {
    const name = S.workshopName, day = S.day;
    Hunt.active = false; Hunt.special = false; Hunt.units = [];
    delete S.clawPending; S.extractPending = true; save();
    UI.hideModal();
    UI.showOverlay(`<div class="card narrow gameover ending">
      <div class="dayno">외곽</div>
      <h2>추출</h2>
      <p>발톱을 쓰러뜨리고, 조율자마저 이겨냈다. 도시는 더 이상 「${esc(name)}」 공방을 품지 않는다.</p>
      <p>${day}일차, 공방은 도시 밖 — <b>외곽</b>으로 추출되었다.</p>
      <p class="dim">외곽에는 도시의 금기도, 세금도 닿지 않는다. 대신 환으로 빚어진 것들과 외곽 생물이 기다린다.</p>
      <div class="row"><button class="big" data-act="newGameForm">새 게임</button><button class="big gold" data-act="goOutskirts">외곽 모드로 계속</button></div>
    </div>`, 'phase');
  },
  enterOutskirts() {
    S.outskirts = true; delete S.extractPending; delete S.clawPending;
    applyZonesFor(true); S.zone = 0;
    S.phase = 'close'; S.time = 1080;
    addLog('공방은 외곽에 자리를 잡았다. 도시의 금기와 세금은 더 이상 닿지 않는다.', 'gold');
    save(); UI.markAll(); UI.showClose('report');
  },
  restDay() {
    S.phase = 'open'; S.detained = false;
    Hunt.active = false; Hunt.units = []; Hunt.ended = '휴업';
    S.phase = 'close'; S.time = 1080;
    addLog(`${S.day}일차 — 안식일이라 가게 문을 닫고 하루를 보냈다.`, '');
    save(); UI.markAll(); UI.showClose('report');
  },
  showGameOver() {
    if (S.home) return ENDGAME.failExpedition(S.dead === 'tax' ? '분점이 세금을 내지 못해 무너졌다.' : '분점에 금기품이 있었다.');
    UI.showOverlay(`<div class="card narrow gameover">
      <div class="dayno">발톱</div>
      <h2>도시의 금기 — ${S.dead === 'contraband' ? '금기품' : '세금 체납'}</h2>
      <p>${S.dead === 'contraband' ? '금기품은 공방 창고에 있었다. 머리는 그것을 만든 자를 알고 있었다. 소리도 없이 발톱이 찾아왔다.' : '세 번의 경고를 무시한 끝에, 네 번째 체납의 날 밤. 소리도 없이 발톱이 찾아왔다.'}</p>
      <p class="dim">${esc(S.workshopName)} 공방 · ${S.day}일차 · 제작 ${S.stats.crafted} · 처치 ${S.stats.kills}</p>
      <button class="big gold" data-act="newGameForm">새 게임</button>
    </div>`, 'phase');
  },
  // ---------- 손가락 ----------
  rollFinger() {
    const type = pick(Object.keys(FINGERS));
    const zoneI = S.zone;
    if (type === 'thumb') return { type, cost: Math.round((150 + (9 - S.oGrade) * 120 + S.wLevel * 50) * (rel('thumb') >= 40 ? 0.5 : 1) * KRW) };
    if (type === 'index' || type === 'ring') {
      const W = S.wLevel, forms = ['sword', 'mace', 'spear', 'coat'].concat(W >= 2 ? ['gun', 'plate'] : []);
      const form = pick(forms), F = FORMS[form], stat = F.kind === 'weapon' ? 'atk' : 'def';
      const g = randInt(1, Math.min(5, W)), q = randInt(3, 6) + Math.floor(W / 2);
      const req = Math.max(1, Math.round(F[stat] * (1 + 0.7 * (g - 1)) * (1 + 0.08 * q) * 1.3));
      const money = Math.round(((stat === 'atk' ? req * 14 : req * 26) * 2.5 + 60 * g) * KRW);
      const o = { form, stat, req, money, fame: 6 + g, finger: type };
      if (type === 'index' && rel('index') >= 50) o.money = Math.round(o.money * 1.5);
      if (type === 'ring') { o.trait = pick(TRAIT_KEYS); o.money = Math.round(o.money * 1.3 * (rel('ring') >= 50 ? 2 : 1)); }
      return { type, order: o };
    }
    if (type === 'middle') return { type, zone: zoneI };
    return { type, cost: Math.round((300 + zoneLv(zoneI) * 150) * (rel('pinky') >= 70 ? 0.7 : 1) * KRW), mats: ZONES[Math.min(ZONES.length - 1, zoneI + 1)].rare.concat(rel('pinky') >= 40 ? ['pinky_letter'] : []) };
  },
  fingerAnswer(accept) {
    const e = S.finger; if (!e || e.done) return;
    const F = FINGERS[e.type];
    if (e.type === 'thumb') {
      if (accept) { if (S.money < e.cost) return UI.toast('공물을 낼 돈이 없습니다'); S.money -= e.cost; addRel('thumb', 15, '공물'); addLog(`엄지에게 공물 ${fmtMoney(e.cost)}을 바쳤다.`, ''); }
      else { S.forcedRaid = true; addRel('thumb', -20, '공물 거절'); addLog('엄지의 요구를 거절했다. 오늘 밤 보복이 올 것이다.', 'bad'); }
    } else if (e.type === 'index' || e.type === 'ring') {
      if (accept) { S.orders.push(Object.assign({ id: uid(), done: false, client: `${F.name}` }, e.order)); addRel(e.type, 5, '의뢰 수락'); addLog(`${F.name}의 ${F.title}를 받았다.`, 'gold'); }
      else addRel(e.type, e.type === 'index' ? -8 : -3, '거절');
    } else if (e.type === 'middle') {
      if (accept) { S.middleHunt = true; addRel('middle', 5, '표적 수락'); addLog('중지의 표적 사냥을 받아들였다. 현장 3웨이브에 표적이 나타난다.', 'gold'); }
      else addRel('middle', -10, '형제의 부탁 거절');
    } else if (e.type === 'pinky') {
      if (accept) {
        if (S.money < e.cost) return UI.toast('돈이 부족합니다');
        S.money -= e.cost; addRel('pinky', 10, '거래');
        const got = [pick(e.mats), pick(e.mats)];
        got.forEach(id => { S.stock[id] = (S.stock[id] || 0) + 1; });
        addLog(`소지에게서 정보를 사 희귀 재료를 얻었다: ${got.map(id => MATERIALS[id].name).join(', ')}`, 'gold');
      }
    }
    e.done = true; e.accepted = accept;
    save(); UI.showMorning(); UI.markAll();
  },
  checkWin() {
    if (!S.won && S.wLevel >= 5 && S.oGrade <= 1) {
      S.won = true;
      save();
      UI.showModal(`<h2>🏆 도시의 전설</h2>
        <p>「${esc(S.workshopName)}」 공방은 도시 최고의 명품 공방이 되었고,<br>「${esc(S.officeName)}」 사무소는 1급 사무소로 이름을 떨쳤습니다.</p>
        <p class="dim">${S.day}일 · 제작 ${S.stats.crafted} · 처치 ${S.stats.kills} · 보스 ${S.stats.bosses} · 희생 ${S.stats.deaths}</p>
        <p>게임은 계속 즐길 수 있습니다.</p>
        <button class="big gold" data-act="closeModal">계속</button>`);
    }
  },
};

// ---------- 하나 협회 특색 심사 ----------
// 1급 등급 경험치가 100%인 해결사만. 개점할 때 연락이 오고, 받으면 그날은 심사로 자리를 비운다.
// 합격 확률은 그동안의 처치·보스·장비로 정해진다. 떨어지면 1급 0%(Lv25)로 돌아간다.
function examChance(f) {
  const gear = [f.weapon, f.armor].filter(Boolean).reduce((a, g) => a + (g.rarity || 0), 0);
  return Math.min(0.9, 0.3 + Math.min(0.25, (f.kills || 0) / 1600) + Math.min(0.2, (f.bosses || 0) * 0.03) + Math.min(0.15, gear * 0.012));
}
function grantColor(f) {
  const used = S.fixers.map(x => x.colorTitle).filter(Boolean).concat(CANON_COLOR_NAMES);
  const ng = [f.weapon, f.armor].find(g => g && g.customName && colorFamilyOf(g.customName));
  let fam, title;
  if (ng) {                       // 이름에 색이 깃든 장비 → 그 색의 특색
    fam = colorFamilyOf(ng.customName);
    const cw = colorWordOf(ng.customName);     // 이름에서 색 낱말만 따온다
    fam = Object.assign({}, fam, { adj: cw || fam.adj });
    title = `${fam.adj} ${pick(COLOR_NOUNS)}`;
  } else {
    const free = COLOR_FAMILIES.filter(c => !S.fixers.some(x => x.colorKey === c.key));
    fam = pick(free.length ? free : COLOR_FAMILIES);
    title = `${fam.adj} ${pick(COLOR_NOUNS)}`;
  }
  for (let k = 0; used.includes(title) && k < 20; k++) title = `${fam.adj} ${pick(COLOR_NOUNS)}`;
  f.colorTitle = title; f.colorKey = fam.key; f.colorHex = fam.color; S.fame += 50;
  S.lastColors.push(`${f.name} — 「${title}」`);
  addLog(`하나 협회가 ${f.name}에게 특색 「${title}」을(를) 부여했다${ng ? ` — 「${ng.customName}」의 색을 따랐다` : ''}. ${fam.perk} · 명성 +50`, 'gold');
}

// ---------- 납품받은 손님의 한마디 ----------
const CLIENT_WORDS = {
  great: ['「{n}」, 손에 착 감기더군. 다음에도 부탁하지.', '기대 이상이었다. 덕분에 일이 일찍 끝났어.', '그 물건 덕에 살아 돌아왔다. 고맙다.',
    '이 정도면 다른 사무소 놈들이 군침을 흘리겠어.', '값을 더 쳐줬어야 했나 싶군.', '「{n}」을 본 동료들이 어디서 났냐고 묻더군. 알려 줘도 되겠나?',
    '이런 물건은 오랜만이야. 공방 이름을 기억해 두지.', '처음 휘둘렀을 때 소름이 돋았다. 좋은 쇠다.'],
  ok: ['물건은 잘 받았다. 딱 말한 만큼이더군.', '쓸 만해. 그 이상도 이하도 아니고.', '다음엔 조금 더 단단한 걸로 부탁하지.',
    '잘 쓰고 있다. 아직은 부러지지 않았어.', '「{n}」, 무난하더군. 다음 일감도 맡기지.', '가격만큼은 한다. 뒷골목에선 그게 칭찬이야.'],
  sub: ['우리 공방 이름으로 팔아도 손색없겠어. …농담이야.', '납기 맞춰 줘서 고맙소. 하청은 신용이 전부라.', '이 마감이면 우리 쪽 장인도 할 말이 없겠군.'],
  index: ['지령은 이행되었다. 그것으로 충분하다.', '처방에 따랐군. 다음 지령을 기다려라.'],
  ring: ['색이 아름다웠어. 다음 작품이 기대되네.', '쇠에도 붓질이 남는구나. 마음에 들어.'],
  rare: ['좋은 거래였소. 약속한 것은 잘 쓰시오.', '그 물건이라면 우리 쪽에서도 쓸 만하겠군. 또 봅시다.'],
};
function clientWord(d) {
  const L = d.finger === 'index' ? CLIENT_WORDS.index : d.finger === 'ring' ? CLIENT_WORDS.ring : d.rare ? CLIENT_WORDS.rare
    : /하청/.test(d.client) && Math.random() < 0.5 ? CLIENT_WORDS.sub : d.over >= 1.15 ? CLIENT_WORDS.great : CLIENT_WORDS.ok;
  return `✉ ${d.client.replace('(하청)', '')} — "${pick(L).replace('{n}', d.name)}"`;
}

const ACT = {
  // 타이틀
  loadCloud() {
    const r = Cloud.remote; if (!r) return;
    Cloud.stale = false; Cloud.lastPushed = JSON.stringify(r);
    S = JSON.parse(JSON.stringify(r)); if (S.speed == null) S.speed = 1;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ }
    UI.hideModal(); Game.paused = false; Game.enterGame();
    UI.toast('최신 진행을 불러왔습니다', 'good');
  },
  continue() { let d = bestSave(); if (!d) return; d = JSON.parse(JSON.stringify(d));   // 클라우드 사본과 같은 객체를 쓰지 않게
    if (d.dead) { S = d; return Game.showGameOver(); } S = d; if (S.speed == null) S.speed = 1; Game.enterGame(); },
  newGameForm() { UI.showNewGame(); },
  title() { UI.showTitle(); },
  startNew() {
    const w = (document.getElementById('inW').value || '').trim() || '잿빛 모루';
    const o = (document.getElementById('inO').value || '').trim() || '늦은 등불';
    const dist = UI.newDist != null ? UI.newDist : randInt(0, DISTRICTS.length - 1);   // 구는 새 게임마다 무작위
    applyZonesFor(false, dist);
    newGame(w, o, dist);
    S.tut = { done: {} }; S.feat = {};   // 새 게임: 안내를 따라가며 기능이 하나씩 열린다
    Game.startDay();
  },
  help() { UI.showHelp(); },
  notice() { UI.showNotice(); },
  reloadUpdate() { try { if (S) save(); } catch (e) {} location.reload(); },
  dismissUpdate(d) { try { sessionStorage.setItem('moonforge_update_dismissed', d.v); } catch (e) {} document.getElementById('updateBar').classList.add('hidden'); },
  districtInfo() { UI.showDistrictInfo(); },
  fillParty() {   // 나갈 수 있는 인원으로 빈자리를 채운다
    S.party = S.party.filter(id => { const f = getFixer(id); return f && isAvailable(f); });
    for (const f of S.fixers) if (S.party.length < MAX_PARTY && isAvailable(f) && !S.party.includes(f.id)) S.party.push(f.id);
    save(); UI.mark('partyStruct'); if (S.phase === 'morning') UI.showMorning(); else if (S.phase === 'close') UI.renderClose();
  },
  closeModal() { UI.hideModal(); UI.confirmKey = null; },
  openShop() { Game.openShop(); },
  examYes(d) {
    const f = getFixer(Number(d.fid)); UI.hideModal(); if (!f || !examReady(f)) return Game.openShop();
    f.exam = { day: S.day }; S.party = S.party.filter(id => id !== f.id);
    addLog(`${f.name}이(가) 하나 협회의 특색 심사를 받으러 갔다.`, 'gold');
    Game.openShop();
  },
  examNo() { UI.hideModal(); Game.openShop(); },

  // 상단 바
  pause() { if (S.phase !== 'open') return; Game.paused = !Game.paused; UI.mark('top'); },
  speed() { S.speed = S.speed >= 3 ? 1 : S.speed + 1; UI.mark('top'); },
  closeShopBtn(d, el) {
    if (UI.confirmKey !== 'close') {
      UI.confirmKey = 'close'; el.textContent = '정말 마감?';
      setTimeout(() => { if (UI.confirmKey === 'close') { UI.confirmKey = null; el.textContent = '마감하기'; } }, 5000);   // 확인 대기 5초
      return;
    }
    UI.confirmKey = null; el.textContent = '마감하기';
    Game.closeShop();
  },
  menu() { UI.confirmKey = null; UI.showMenu(); },

  view(d) { UI.setView(d.v); },

  // 단조
  pickMat(d) { Forge.pickMat(d.id); },
  clearSlot(d) { Forge.clearSlot(d.slot); },
  selectSlot(d) { Forge.selectSlot(d.slot); },
  synth() { Forge.synth(); },
  strike() { Forge.strike(); },
  reheat() { Forge.reheat(); },
  finish() { Forge.finish(); },
  forgeNext() { Forge.next(); },
  forgeMode(d) { Forge.setMode(d.m); },
  enhance(d) { Forge.startEnhance(Number(d.gid)); },

  // 현장 / 의뢰
  retreat() { Hunt.retreat(); UI.mark('top'); },
  deliver(d) {
    if (S.phase !== 'open') return;
    const o = S.orders.find(x => x.id === Number(d.id));
    if (!o || o.done) return;
    const list = matchGears(o);
    if (!list.length) return UI.toast('조건에 맞는 장비가 없습니다');
    if (list.length > 1 && !d.gid) return UI.showDeliverPick(o, list);   // 여러 개면 고른다
    const g = d.gid ? list.find(x => String(x.id) === String(d.gid)) : list[0];
    if (!g) return;
    UI.hideModal();
    S.gear = S.gear.filter(x => x.id !== g.id);
    o.done = true;
    // 요구치보다 훨씬 좋은 물건이면 웃돈을 얹어 줄 때가 있다
    const over = (g[o.stat] || 0) / Math.max(1, o.req);
    const tip = over >= 1.15 && Math.random() < Math.min(0.7, (over - 1) * 1.5) ? Math.round(o.money * Math.min(0.5, 0.1 + (over - 1) * 0.4)) : 0;
    S.money += o.money + tip; S.fame += o.fame;
    S.report.orderMoney += o.money + tip; S.report.orderFame += o.fame; S.report.orders++;
    addLog(`${o.client}에게 ${g.name} +${g.q} 납품 — ${fmtMoney(o.money)}${tip ? ` + 웃돈 ${fmtMoney(tip)}` : ''}, 명성 +${o.fame}`, 'gold');
    if (tip) UI.toast(`기대 이상의 물건 — 웃돈 ${fmtMoney(tip)}`, 'good');
    if (/K사/.test(o.client)) S.kRel = Math.min(100, (S.kRel || 0) + 12);   // K사와의 관계
    (S.delivered = S.delivered || []).push({ client: o.client, finger: o.finger || null, rare: o.rare || null, name: g.name, over: +over.toFixed(2), tip: !!tip });
    if (o.rare && o.item) { S.stock[o.item] = (S.stock[o.item] || 0) + 1; grantUnlock(o.item); }
    if (o.finger === 'index') { addRel('index', 15, '지령 완수'); if (rel('index') >= 50) { S.stock.index_prescript = (S.stock.index_prescript || 0) + 1; addLog('검지가 지령서를 남겼다: 검지의 지령서 +1', 'gold'); } }
    if (o.finger === 'ring') { addRel('ring', 20, '작품 납품'); if (rel('ring') >= 50) { S.stock.ring_pigment = (S.stock.ring_pigment || 0) + 1; addLog('약지가 물감을 선물했다: 약지의 물감 +1', 'gold'); } }
    UI.toast(`납품 완료! +${fmtMoney(o.money)}`, 'good');
    Sound.coin();
    UI.mark('orders', 'storage', 'top');
    save();
  },

  // 마감 화면
  tab(d) { UI.closeTab = d.tab; UI.picker = null; UI.confirmKey = null; UI.renderClose(); },
  nextDay() { Game.nextDay(); },
  picker(d) {
    const fid = Number(d.fid);
    if (UI.picker && UI.picker.fid === fid && UI.picker.slot === d.slot) UI.picker = null;
    else UI.picker = { fid, slot: d.slot };
    UI.renderClose();
  },
  equip(d) {
    const f = getFixer(Number(d.fid)); const g = S.gear.find(x => x.id === Number(d.gid));
    if (!f || !g) return;
    const k = d.slot;
    S.gear = S.gear.filter(x => x.id !== g.id);
    if (f[k]) S.gear.push(f[k]);
    f[k] = g;
    f.curHp = unitStats(f).maxHp;
    UI.picker = null;
    Sound.click();
    save(); UI.renderClose(); UI.mark('storage');
  },
  unequip(d) {
    const f = getFixer(Number(d.fid)); if (!f || !f[d.slot]) return;
    S.gear.push(f[d.slot]); f[d.slot] = null;
    UI.picker = null; save(); UI.renderClose(); UI.mark('storage');
  },
  toggleParty(d) {
    const id = Number(d.fid);
    if (S.party.includes(id)) S.party = S.party.filter(x => x !== id);
    else if (S.party.length < MAX_PARTY) S.party.push(id);
    save(); UI.renderClose();
  },
  fire(d) {
    const id = Number(d.fid);
    if (UI.confirmKey !== 'fire' + id) { UI.confirmKey = 'fire' + id; UI.renderClose(); return; }
    UI.confirmKey = null;
    const f = getFixer(id); if (!f) return;
    if (f.weapon) S.gear.push(f.weapon);
    if (f.armor) S.gear.push(f.armor);
    if (f.pack) { (f.pack.items || []).forEach(g => S.gear.push(g)); f.pack.items = []; S.gear.push(f.pack); }
    S.fixers = S.fixers.filter(x => x.id !== id);
    S.party = S.party.filter(x => x !== id);
    addLog(`${f.name}이(가) 사무소를 떠났다.`, '');
    save(); UI.renderClose(); UI.mark('storage');
  },
  hire(d) {
    if (S.home) return UI.toast('분점에서는 고용할 수 없습니다');
    const c = S.candidates.find(x => x.id === Number(d.id));
    if (!c || S.money < c.cost || S.fixers.length >= maxMembers()) return;
    S.money -= c.cost;
    S.candidates = S.candidates.filter(x => x !== c);
    const cost = c.cost; delete c.cost;
    c.joined = S.day;
    S.fixers.push(c);
    if (S.party.length < MAX_PARTY) S.party.push(c.id);
    addLog(`${c.name}(Lv.${c.lv})을(를) 고용했다. -${fmtMoney(cost)}`, 'good');
    Sound.coin();
    save(); UI.renderClose();
  },
  buy(d) {
    { const why = tabooBreach('market'); if (why) Game.breakDistrictTaboo(why); }
    const n = Number(d.n) || 1, price = marketPrice(d.id);
    if (S.money < price * n) return UI.toast('자금이 부족합니다');
    S.money -= price * n;
    S.stock[d.id] = (S.stock[d.id] || 0) + n; (S.seen = S.seen || {})[d.id] = 1;
    Sound.coin();
    save(); UI.renderClose(); UI.mark('stock');
  },
  sellMat(d) {
    { const why = tabooBreach('market') || tabooBreach('sellmat'); if (why) Game.breakDistrictTaboo(why); }
    const have = S.stock[d.id] || 0, p = matSellPrice(d.id);
    if (!have || !p) return;
    const n = d.n === 'all' ? have : Math.min(have, Number(d.n) || 1);
    S.stock[d.id] -= n; if (S.stock[d.id] <= 0) delete S.stock[d.id];
    S.money += p * n; S.report.sold += p * n;
    addLog(`${MATERIALS[d.id].name} ${n}개를 팔았다 — ${fmtMoney(p * n)}`, '');
    Sound.coin(); save(); UI.renderClose(); UI.mark('stock');
  },
  sell(d) {
    const g = S.gear.find(x => x.id === Number(d.gid)); if (!g) return;
    if (g.contraband) return UI.toast('금기품은 트레스 협회를 거칠 수 없습니다');
    S.gear = S.gear.filter(x => x.id !== g.id);
    const net = Math.round(g.value * (1 - saleTax()) * (1 + SEAL_SALE * sealCount()));   // 인장
    S.money += net; S.report.sold += net;
    S.patents = (S.patents || []).filter(p => p.gid !== g.id);
    addLog(`${g.name} +${g.q} 판매 — ${fmtMoney(net)}${saleTax() ? ` (트레스 판매세 ${Math.round(saleTax() * 100)}% 공제)` : ''}`, '');
    Sound.coin();
    save(); UI.renderClose(); UI.mark('storage');
  },
  upWorkshop() {
    const c = WORKSHOP_LEVELS[S.wLevel - 1].up;
    if (!c || S.money < c.money || S.fame < c.fame) return;
    S.money -= c.money; S.wLevel++;
    addLog(`공방 승급! 「${WORKSHOP_LEVELS[S.wLevel - 1].name}」 (Lv.${S.wLevel})`, 'gold');
    Sound.finish();
    save(); UI.renderClose(); UI.mark('forge', 'top'); UI.showPromotion('workshop', S.wLevel); Game.checkWin();
  },
  upOffice() {
    const c = OFFICE_UP[S.oGrade];
    if (!c || S.money < c.money || S.fame < c.fame) return;
    S.money -= c.money; S.oGrade--;
    addLog(`사무소 승급! ${S.oGrade}급 사무소가 되었다.`, 'gold');
    S.fixers.forEach(f => { if (gainExp(f, 0)) f.curHp = unitStats(f).maxHp; });   // 등급 상한이 풀린다
    Sound.finish();
    save(); UI.renderClose(); UI.mark('top'); UI.showPromotion('office', S.oGrade); Game.checkWin();
  },
  joinAssoc(d) {
    if (S.oGrade > 8) return UI.toast('협회 소속은 사무소 8급부터 가능합니다');
    if (S.assoc === d.id) return;
    const cost = S.assoc ? ASSOC_SWITCH_COST : ASSOC_JOIN_COST;
    if (S.money < cost) return UI.toast(`${fmtMoney(cost)}이 필요합니다`);
    S.money -= cost; S.assoc = d.id;
    addLog(`${ASSOCIATIONS[d.id].name} 소속 사무소가 되었다.`, 'gold');
    Sound.finish(); save(); UI.renderClose(); UI.mark('top');
  },
  patent(d) {
    const g = S.gear.find(x => x.id === Number(d.gid)); if (!g || g.contraband) return;
    if ((S.patents || []).length >= patentMax()) return UI.toast('특허 한도에 도달했습니다 — 공방 등급을 올리세요');
    const fee = Math.round(g.value * 0.5);
    if (S.money < fee) return UI.toast(`등록비 ${fmtMoney(fee)}이 필요합니다`);
    S.money -= fee;
    S.patents.push({ gid: g.id, name: `${g.name} +${g.q}`, rarity: g.rarity, royalty: Math.round(g.value * PATENT_ROYALTY) });
    g.patented = true;
    addLog(`트레스 협회에 「${g.name} +${g.q}」 설계를 특허 등록했다. 매일 로열티 ${fmtMoney(Math.round(g.value * PATENT_ROYALTY))}`, 'gold');
    Sound.coin(); save(); UI.renderClose();
  },
  toggleWatch(d) { const f = getFixer(Number(d.fid)); if (!f) return; f.nightWatch = !f.nightWatch; save(); UI.renderClose(); },
  augment(d) {
    const f = getFixer(Number(d.fid)); if (!f || !AUGMENTS[d.part]) return;
    if (!unlocked('aug')) return UI.toast('의체 시술은 아직 해금되지 않았습니다');
    f.aug = f.aug || {};
    if (f.aug[d.part]) return;
    const cost = augmentCost(f);
    if (S.money < cost) return UI.toast(`${fmtMoney(cost)}이 필요합니다`);
    S.money -= cost; f.aug[d.part] = true; f.curHp = unitStats(f).maxHp;
    addLog(`${f.name}이(가) 증강 시술을 받았다: ${AUGMENTS[d.part].name}`, 'good');
    Sound.finish(); save(); UI.renderClose();
  },
  finishForce() { Forge.finishForce(); },
  pickSing(d) { Forge.pickSing(d.k); },
  pickEgo(d) { Forge.pickEgo(d.id); },
  goOutskirts() { Game.enterOutskirts(); },
  heishou(d) { const u = Hunt.units[Number(d.i)]; if (u && Hunt.active && S.phase === 'open') Hunt.transform(u); },
  // P사 차원 장비: 무기 넣기·빼기
  packIn(d) {
    const f = getFixer(Number(d.fid)), g = S.gear.find(x => x.id === Number(d.gid));
    if (!f || !f.pack || !g) return;
    if ((f.pack.items || []).length >= f.pack.capacity) return UI.toast('차원 장비가 가득 찼습니다');
    S.gear = S.gear.filter(x => x !== g); (f.pack.items = f.pack.items || []).push(g);
    UI.picker = null; save(); UI.renderClose(); UI.mark('storage');
  },
  packOut(d) {
    const f = getFixer(Number(d.fid)); if (!f || !f.pack) return;
    const g = f.pack.items.splice(Number(d.i), 1)[0]; if (g) S.gear.push(g);
    save(); UI.renderClose(); UI.mark('storage');
  },
  // F사 요정: 귀속을 열어젖힌다
  unbind(d) {
    if (S.wLevel < SING_UNLOCK_W) return UI.toast(`공방 Lv.${SING_UNLOCK_W}부터 가능합니다`);
    const all = S.gear.concat(S.fixers.map(f => f.weapon), S.fixers.map(f => f.armor)).filter(Boolean);
    const g = all.find(x => x.id === Number(d.gid)); if (!g || !g.owner) return;
    if (S.money < F_UNBIND_COST) return UI.toast(`${fmtMoney(F_UNBIND_COST)}이 필요합니다`);
    S.money -= F_UNBIND_COST; g.owner = null;
    addLog(`F사의 요정이 「${g.name}」의 귀속을 열어젖혔다.`, 'gold');
    Sound.finish(); save(); UI.renderClose();
  },
  // N사: 기억 추출 → 경험 통조림 → 주입 (충성도 하락)
  nExtract(d) {
    const f = getFixer(Number(d.fid)); if (!f) return;
    if (S.wLevel < SING_UNLOCK_W) return UI.toast(`공방 Lv.${SING_UNLOCK_W}부터 가능합니다`);
    if (S.money < N_COST) return UI.toast(`${fmtMoney(N_COST)}이 필요합니다`);
    S.money -= N_COST;
    const best = Object.entries(f.mastery || {}).sort((a, b) => b[1].lv - a[1].lv)[0];
    (S.cans = S.cans || []).push({ id: uid(), from: f.name, exp: f.lv * 25, form: best ? best[0] : null, mlv: best ? best[1].lv : 0 });
    f.loyalty = Math.max(0, (f.loyalty == null ? 70 : f.loyalty) - 10);
    addLog(`N사 기술로 ${f.name}의 기억을 통조림에 담았다. ${f.name}의 충성도가 떨어졌다.`, 'warn');
    save(); UI.renderClose();
  },
  nInject(d) {
    const f = getFixer(Number(d.fid)); const can = (S.cans || []).shift(); if (!f || !can) return;
    const ups = gainExp(f, can.exp);
    if (can.form && can.mlv > 1) { f.mastery = f.mastery || {}; const m = f.mastery[can.form] = f.mastery[can.form] || { lv: 0, exp: 0 }; m.lv = Math.max(m.lv, can.mlv - 1); }
    const drop = randInt(10, 25); f.loyalty = Math.max(0, (f.loyalty == null ? 70 : f.loyalty) - drop);
    addLog(`${f.name}에게 ${can.from}의 경험 통조림을 주입했다${ups ? ` (레벨 +${ups})` : ''}. 남의 기억에 ${f.name}의 충성도가 ${drop} 떨어졌다.`, 'warn');
    save(); UI.renderClose();
  },
  // 머리의 혈청 · H사 환
  serum(d) {
    const f = getFixer(Number(d.fid)), id = 'serum_' + d.t; if (!f || !(S.stock[id] > 0)) return;
    S.stock[id]--; if (!S.stock[id]) delete S.stock[id];
    f.serum = d.t; if (d.t === 'k') { f.injuredUntil = 0; f.curHp = unitStats(f).maxHp; }
    addLog(`${f.name}에게 ${MATERIALS[id].name}을 주입했다 (내일 하루 효과).`, 'gold');
    save(); UI.renderClose();
  },
  hwanMake(d) {
    if (S.wLevel < SING_UNLOCK_W) return;
    const nure = d.k === 'nureum', cost = nure ? NUREUM_COST : HWAN_COST;
    if (S.money < cost) return UI.toast(`${fmtMoney(cost)}이 필요합니다`);
    S.money -= cost; S.stock[d.k] = (S.stock[d.k] || 0) + 1; S.hwanSkill = (S.hwanSkill || 0) + 1;
    if (S.hwanSkill === HWAN_SKILL_REQ) addLog('환 제조법이 무르익었다 — 흑수환 제조가 열렸다.', 'gold');
    Sound.coin(); save(); UI.renderClose();
  },
  hwanUse(d) {
    const f = getFixer(Number(d.fid)); if (!f || !(S.stock.hwan > 0)) return;
    S.stock.hwan--; if (!S.stock.hwan) delete S.stock.hwan;
    f.injuredUntil = 0; f.curHp = unitStats(f).maxHp;
    let msg = `${f.name}에게 환을 먹였다 — 상처가 아물었다.`;
    if (Math.random() < 0.25) { f.scar = +(((f.scar || 1) * 0.95)).toFixed(3); msg += ' 그러나 몸 어딘가가 영영 어긋났다 (능력치 영구 -5%).'; }
    addLog(msg, 'warn'); save(); UI.renderClose();
  },
  heuksu(d) {
    const f = getFixer(Number(d.fid)), mat = d.m;
    if (!f || f.blackwater || !(S.stock[mat] > 0) || (S.hwanSkill || 0) < HWAN_SKILL_REQ) return;
    if (S.money < HEUKSU_COST) return UI.toast(`${fmtMoney(HEUKSU_COST)}이 필요합니다`);
    S.money -= HEUKSU_COST; S.stock[mat]--; if (!S.stock[mat]) delete S.stock[mat];
    f.blackwater = mat; f.erosion = 10; f.curHp = unitStats(f).maxHp;
    addLog(`${f.name}이(가) ${MATERIALS[mat].name}으로 빚은 흑수환을 삼켰다 — ${BLACKWATER[mat].name}${BLACKWATER[mat].side ? ` (부작용: ${BLACKWATER[mat].side})` : ''}. 이제 누름환 없이는 버틸 수 없다.`, 'gold');
    Sound.finish(); save(); UI.renderClose();
  },
  finishCancel() { Forge.finishCancel(); },
  nameForm(d) { UI.showNameGear(d.gid); },
  nameGear(d) {
    const g = findGear(Number(d.gid)); if (!g || g.rarity < NAME_RARITY) return;
    const raw = (document.getElementById('inGearName').value || '').replace(/[<>&"'`「」]/g, '').trim().slice(0, 12);
    if (!raw) return UI.toast('이름을 입력하세요');
    const old = g.name;
    g.customName = raw; g.name = raw; g.named = true;   // 지은 이름이 본래 이름을 대신한다 (별명은 그대로)
    addLog(`${old}에 이름을 붙였다 — 「${raw}」`, 'gold');
    UI.hideModal(); save(); UI.mark('storage', 'forge', 'orders'); if (S.phase === 'close') UI.renderClose();
  },
  meltBlank() { Forge.meltBlank(); },
  buyAmmo(d) {
    { const why = tabooBreach('market'); if (why) Game.breakDistrictTaboo(why); }
    const n = Number(d.n) || 1, price = Math.round(AMMO_PRICE * n * (assoc() === 'tres' ? 0.85 : 1));
    if (S.money < price) return UI.toast('자금이 부족합니다');
    S.money -= price; S.ammo = (S.ammo || 0) + AMMO_PACK * n;
    Sound.coin(); save(); UI.renderClose(); UI.mark('top');
  },
  watchFeed() {
    if (S.phase !== 'open') return;
    S.recordWatched = true;
    Game.breakDistrictTaboo('현장 영상을 시청했다');
    UI.mark('top');
  },
  fingerYes() { Game.fingerAnswer(true); },
  fingerNo() { Game.fingerAnswer(false); },
  toggleRetreat() { S.autoRetreat = S.autoRetreat === false; save(); UI.renderClose(); },
  zone(d) { S.zone = Number(d.i); save(); UI.renderClose(); UI.mark('top'); },

  // 메뉴
  saveNow() {
    save();
    if (Cloud.timer) { clearTimeout(Cloud.timer); Cloud.timer = null; }
    Cloud.push().then(() => UI.cloudChanged());
    UI.toast(Cloud.status === 'on' ? '저장했습니다 (클라우드 포함)' : '저장했습니다', 'good');
  },
  exportSave() {
    save();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    document.getElementById('menuExtra').innerHTML = `<p class="dim">아래 코드를 복사해 보관하세요.</p><textarea id="saveCode" readonly>${code}</textarea><button data-act="copyCode">복사</button>`;
  },
  copyCode() {
    const t = document.getElementById('saveCode'); t.select();
    const fallback = () => { t.select(); try { document.execCommand('copy'); UI.toast('복사했습니다', 'good'); } catch (e) { UI.toast('코드를 길게 눌러 직접 복사하세요'); } };
    try { navigator.clipboard.writeText(t.value).then(() => UI.toast('복사했습니다', 'good'), fallback); } catch (e) { fallback(); }
  },
  importForm() {
    document.getElementById('menuExtra').innerHTML = `<p class="dim">세이브 코드를 붙여넣으세요. 현재 진행은 덮어씌워집니다.</p><textarea id="loadCode"></textarea><button class="gold" data-act="importSave">불러오기</button>`;
  },
  importSave() {
    try {
      const raw = document.getElementById('loadCode').value.trim();
      const d = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!d || d.v !== 1 || !d.fixers) throw new Error('bad');
      S = d; save(); UI.hideModal(); Game.paused = false; Game.enterGame();
      UI.toast('불러왔습니다', 'good');
    } catch (e) { UI.toast('잘못된 세이브 코드입니다', 'bad'); }
  },
  mute() { if (!S) return; S.muted = !S.muted; save(); UI.showMenu(); },
  toTitle() { save(); UI.hideModal(); Game.paused = false; S = null; Hunt.active = false; Hunt.units = []; UI.showTitle(); },
  resetSave() {
    if (UI.confirmKey !== 'reset') { UI.confirmKey = 'reset'; UI.showMenu(); return; }
    UI.confirmKey = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
    Cloud.clear();
    UI.hideModal(); S = null; Hunt.active = false; Hunt.units = []; UI.showTitle();
  },
};

window.addEventListener('DOMContentLoaded', () => Game.init());

// ---------- 새 버전 확인 (5분마다, 서버의 data.js에 적힌 버전과 비교) ----------
const UpdateCheck = {
  newer(a, b) { const p = s => String(s).split('.').map(Number); const x = p(a), y = p(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; },
  async check() {
    try {
      const r = await fetch('js/data.js?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const mm = (await r.text()).match(/GAME_VERSION = '([^']+)'/);
      if (!mm || !this.newer(mm[1], GAME_VERSION)) return;
      let dis = null; try { dis = sessionStorage.getItem('moonforge_update_dismissed'); } catch (e) {}
      if (dis === mm[1]) return;                      // 이 버전 안내는 닫았다
      UI.showUpdateBar(mm[1]);
    } catch (e) {}
  },
  start() { setTimeout(() => this.check(), 20000); setInterval(() => this.check(), 5 * 60 * 1000); },
};
UpdateCheck.start();
