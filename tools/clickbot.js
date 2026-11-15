// 개발용 '클릭 봇' — 실제 화면의 버튼을 눌러 플레이한다 (게임에는 포함되지 않음).
// 브라우저에서: eval(await (await fetch('/tools/clickbot.js')).text()); ClickBot.start();
// 한 번에 한 동작씩, 누르는 버튼에 노란 테두리와 말풍선을 띄워 화면으로 따라갈 수 있게 한다.
window.ClickBot && ClickBot.stop();
window.ClickBot = {
  timer: null, step: 380, speed: 2, ticks: 0, lastOrdersPeek: 0, notes: [], risk: 12, closeDone: {},
  start(ms) { window.BOT_MUTE = true; this.stop(); if (ms) this.step = ms; this.ensureHud(); this.timer = setInterval(() => { try { this.tick(); } catch (e) { this.say('오류: ' + e.message); console.error(e); } }, this.step); },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; window.BOT_MUTE = false; },
  ensureHud() {
    if (document.getElementById('botHud')) return;
    const d = document.createElement('div'); d.id = 'botHud';
    d.style.cssText = 'position:fixed;left:8px;bottom:64px;z-index:99999;background:#000c;color:#ffe070;font:12px monospace;padding:4px 8px;border:1px solid #ffe070;pointer-events:none;max-width:60vw';
    document.body.appendChild(d);
  },
  say(t) { const h = document.getElementById('botHud'); if (h) h.textContent = '🤖 ' + t; },
  note(t) { this.notes.push(`[${S ? S.day + '일 ' + fmtTime(S.time) : '-'}] ${t}`); },
  // 실제로 누른다: 테두리 표시 후 click()
  press(el, label) {
    if (!el || el.disabled) return false;
    el.scrollIntoView({ block: 'nearest' });
    el.style.outline = '3px solid #ffe070'; setTimeout(() => { el.style.outline = ''; }, this.step * 0.9);
    this.say(label || (el.textContent || '').trim().slice(0, 30));
    el.click();
    return true;
  },
  $(sel) { return document.querySelector(sel); },
  $$(sel) { return Array.from(document.querySelectorAll(sel)); },
  visible(el) { return el && el.offsetParent !== null; },

  tick() {
    this.ticks++;
    if (!S) { const c = this.$('[data-act="continue"]'); if (c) return this.press(c, '이어하기'); return this.say('게임 없음'); }
    // 모달
    if (UI.modalOpen) {
      const m = this.$('#modal');
      const yes = m.querySelector('[data-act="fingerYes"]'), no = m.querySelector('[data-act="fingerNo"]');
      if (yes) return this.press(Math.random() < 0.6 ? yes : no, '핑거 응답');
      const cl = m.querySelector('[data-act="closeModal"]'); if (cl) return this.press(cl, '모달 닫기');
      const any = m.querySelector('button'); if (any) return this.press(any);
      return;
    }
    if (S.phase === 'morning') { const y = this.$('#overlay [data-act="fingerYes"]'); if (y) return this.press(Math.random() < 0.6 ? y : this.$('#overlay [data-act="fingerNo"]'), '핑거 응답'); this.closeDone = {}; const b = this.$('[data-act="openShop"]'); if (b) return this.press(b, '개점'); }
    if (S.phase === 'open') return this.openTick();
    if (S.phase === 'close') return this.closeTick();
  },

  // ---------- 개점 중 ----------
  openTick() {
    if (S.speed !== this.speed) return this.press(this.$('[data-act="speed"]'), '배속');
    if (Game.paused) return this.press(this.$('[data-act="pause"]'), '재개');
    // 가끔 의뢰 탭: 납품 가능한 의뢰가 있으면 간다
    const canDeliver = S.orders.some(o => !o.done && matchGear(o));
    if (canDeliver && !Forge.blank) {
      if (UI.view !== 'orders') return this.press(this.$('[data-act="view"][data-v="orders"]'), '의뢰 탭');
      const d = this.$$('[data-act="deliver"]').find(b => !b.disabled); if (d) return this.press(d, '납품');
    }
    if (UI.view !== 'forge') {
      // 현장 탭을 가끔 구경한다
      if (UI.view === 'hunt' && this.ticks % 12 !== 0) return this.say('현장 구경 중');
      return this.press(this.$('[data-act="view"][data-v="forge"]'), '단조 탭');
    }
    if (this.ticks - this.lastOrdersPeek > 90 && !Forge.blank) { this.lastOrdersPeek = this.ticks; return this.press(this.$('[data-act="view"][data-v="hunt"]'), '현장 탭 확인'); }
    const F = Forge;
    if (F.result) return this.press(this.$('[data-act="forgeNext"]'), '다음 제작');
    if (F.blank) {
      if (F.contraWarn) return this.press(this.$('[data-act="finishCancel"]'), '금기품 경고 → 취소');
      const b = F.blank, p = F.probs('perfect');
      const risky = p.destroy + (b.hp <= 1 ? p.damage : 0);
      if (b.strikes >= b.maxStrikes || risky > this.risk) return this.press(this.$('[data-act="finish"]'), '완성');
      if (F.reheatT > 0 || F.lock > 0) return this.say('기다리는 중');
      if (F.heatTier() === 'perfect') return this.press(this.$('[data-act="strike"]'), '두드리기 (적열)');
      return this.press(this.$('[data-act="reheat"]'), '가열');
    }
    // 재료 고르기 → 합성
    const kind = this.kindToMake();
    if (!F.slots.main) {
      const main = this.bestMat(kind) || this.bestMat(kind === 'weapon' ? 'armor' : 'weapon');
      if (!main) return this.say('재료 없음 — 대기');
      if (F.activeSlot !== 'main') return this.press(this.$('[data-act="selectSlot"][data-slot="main"]'), '주재료 칸');
      return this.press(this.chip(main), '주재료 선택');
    }
    const isW = MATERIALS[F.slots.main].cat === 'metal';
    if (isW && !F.slots.shape && !this._shapeTried) {
      this._shapeTried = true;
      const sh = Object.keys(S.stock).filter(id => F.avail(id) > 0 && MATERIALS[id].cat === 'shape' && (MATERIALS[id].shape !== 'gun' || unlocked('gun')));
      if (sh.length && Math.random() < 0.5) { if (F.activeSlot !== 'shape') return this.press(this.$('[data-act="selectSlot"][data-slot="shape"]'), '형태재료 칸'); return this.press(this.chip(sh[0]), '형태재료 선택'); }
    }
    if (!F.slots.core && !this._coreTried) {
      this._coreTried = true;
      const cs = Object.keys(S.stock).filter(id => F.avail(id) > 0 && F.slotAccepts('core', id) && MATERIALS[id].cat === 'core').sort((a, b) => MATERIALS[b].grade - MATERIALS[a].grade);
      if (cs.length) { if (F.activeSlot !== 'core') return this.press(this.$('[data-act="selectSlot"][data-slot="core"]'), '속성재료 칸'); return this.press(this.chip(cs[0]), '속성재료 선택'); }
    }
    this._shapeTried = this._coreTried = false;
    if (F.resolve().error) { this.note('조합 오류: ' + F.resolve().error); return this.press(this.$('[data-act="clearSlot"][data-slot="shape"]'), '형태재료 빼기'); }
    return this.press(this.$('[data-act="synth"]'), '합성');
  },
  chip(id) { return this.$$('#stockGrid [data-act="pickMat"]').find(e => e.dataset.id === id); },
  kindToMake() {
    const needArmor = S.fixers.some(f => !f.armor) || S.orders.some(o => !o.done && FORMS[o.form].kind === 'armor' && !matchGear(o));
    const needWeapon = S.orders.some(o => !o.done && FORMS[o.form].kind === 'weapon' && !matchGear(o));
    if (needArmor && !needWeapon) return 'armor';
    if (needArmor && S.stats.crafted % 2) return 'armor';
    return 'weapon';
  },
  bestMat(kind) {
    const ids = Object.keys(S.stock).filter(id => Forge.avail(id) > 0 && MATERIALS[id] && MATERIALS[id].cat === (kind === 'weapon' ? 'metal' : 'fabric'));
    return ids.sort((a, b) => MATERIALS[b].grade - MATERIALS[a].grade)[0];
  },

  // ---------- 마감 ----------
  goTab(t) { if (UI.closeTab !== t) { this.press(this.$(`[data-act="tab"][data-tab="${t}"]`), '마감 탭: ' + t); return true; } return false; },
  closeTick() {
    const D = this.closeDone;
    // 1) 결산 잠깐 보기
    if (!D.report) { D.report = 1; return this.goTab('report') || this.say('결산 확인'); }
    // 2) 장비 장착
    if (!D.roster) {
      if (this.goTab('roster')) return;
      for (const f of S.fixers) for (const slot of ['weapon', 'armor']) {
        const stat = slot === 'weapon' ? 'atk' : 'def';
        const best = S.gear.filter(g => g.kind === slot && !g.contraband && !(g.owner && g.owner !== f.id)).sort((a, b) => b[stat] - a[stat])[0];
        if (best && (!f[slot] || best[stat] > f[slot][stat])) {
          const open = UI.picker && UI.picker.fid === f.id && UI.picker.slot === slot;
          if (!open) return this.press(this.$(`.eqslot[data-act="picker"][data-fid="${f.id}"][data-slot="${slot}"]`), `${f.name} ${slot === 'weapon' ? '무기' : '방어구'} 칸`);
          return this.press(this.$(`[data-act="equip"][data-fid="${f.id}"][data-gid="${best.id}"]`), `${f.name}에게 장착`);
        }
      }
      // 출동 인원 채우기
      const add = S.fixers.find(f => !S.party.includes(f.id) && S.party.length < MAX_PARTY && S.day + 1 > (f.injuredUntil || 0));
      if (add) return this.press(this.$(`[data-act="toggleParty"][data-fid="${add.id}"]`), '출동 지정');
      D.roster = 1;
    }
    // 3) 승급
    if (!D.upgrade) {
      if (this.goTab('upgrade')) return;
      const wc = WORKSHOP_LEVELS[S.wLevel - 1].up, oc = OFFICE_UP[S.oGrade];
      const bw = this.$('[data-act="upWorkshop"]'), bo = this.$('[data-act="upOffice"]');
      if (wc && S.money >= wc.money + 300000 && S.fame >= wc.fame && bw && !bw.disabled) return this.press(bw, '공방 승급');
      if (oc && S.money >= oc.money + 300000 && S.fame >= oc.fame && bo && !bo.disabled) return this.press(bo, '사무소 승급');
      D.upgrade = 1;
    }
    // 4) 고용
    if (!D.hire) {
      if (S.fixers.length < maxMembers()) {
        if (this.goTab('hire')) return;
        const c = S.candidates.slice().sort((a, b) => b.lv - a.lv).find(c => c.cost < S.money * 0.4);
        if (c) { D.hire = 1; return this.press(this.$(`[data-act="hire"][data-id="${c.id}"]`), '고용'); }
      }
      D.hire = 1;
    }
    // 5) 보관함이 넘치면 판매 (시장 탭)
    if (!D.sell) {
      if (S.gear.length > 6) {
        if (this.goTab('market')) return;
        const g = S.gear.slice().sort((a, b) => a.value - b.value)[0];
        const b = this.$(`[data-act="sell"][data-gid="${g.id}"]`);
        if (b) return this.press(b, '판매');
      }
      D.sell = 1;
    }
    // 5.5) 시장: 살 수 있는 가장 좋은 금속·천을 5개씩 (여윳돈이 있을 때)
    if (!D.buy) {
      const ids = []; for (let i = 0; i < Math.min(S.wLevel, MARKET_TIERS.length); i++) ids.push(...MARKET_TIERS[i]);
      const want = ['metal', 'fabric'].map(c => ids.filter(id => MATERIALS[id].cat === c).sort((a, b) => MATERIALS[b].grade - MATERIALS[a].grade)[0]).filter(Boolean);
      D.bought = D.bought || 0;
      const reserve = S.fixers.reduce((a, f) => a + wageOf(f), 0) * 2 + 200000;
      const id = want[D.bought];
      if (id && MATERIALS[id].grade > 1 && S.money - marketPrice(id) * 5 > reserve) {
        if (this.goTab('market')) return;
        D.bought++;
        const b = this.$(`[data-act="buy"][data-id="${id}"][data-n="5"]`); if (b) return this.press(b, '재료 구매 +5');
      }
      if (!id || D.bought >= want.length || !(MATERIALS[id].grade > 1 && S.money - marketPrice(id) * 5 > reserve)) D.buy = 1;
      if (!D.buy) return;
    }
    // 6) 출동 지역
    if (!D.zone) {
      if (this.goTab('deploy')) return;
      const ok = ZONES.map((z, i) => i).filter(i => S.oGrade <= ZONES[i].req);
      const want = Math.max(0, ok[ok.length - 1] - (this.zoneLag || 0));
      D.zone = 1;
      if (S.zone !== want) { const b = this.$(`[data-act="zone"][data-i="${want}"]`); if (b) return this.press(b, '출동 지역 변경'); }
    }
    return this.press(this.$('[data-act="nextDay"]'), '다음 날 →');
  },
};
'clickbot loaded';
