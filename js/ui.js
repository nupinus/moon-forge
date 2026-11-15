'use strict';
// ============================================================
//  UI — 패널, 마감 화면, 모달
// ============================================================

// ---------- 효과음 (WebAudio, 외부 파일 없음) ----------
const Sound = {
  ctx: null, lastTick: 0,
  ac() {
    if ((S && S.muted) || window.BOT_MUTE) return null;   // 개발용 봇이 돌 때는 소리를 끈다
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type, vol, slide) {
    const a = this.ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.06, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
  },
  noise(dur, vol) {
    const a = this.ac(); if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(), g = a.createGain();
    s.buffer = buf; g.gain.value = vol || 0.08; s.connect(g); g.connect(a.destination); s.start();
  },
  click() { this.tone(660, 0.05, 'square', 0.03); },
  synth() { this.tone(220, 0.25, 'sawtooth', 0.05, 2); },
  hit(good) { this.noise(0.08, 0.12); this.tone(good ? 880 : 520, 0.12, 'square', 0.05); },
  great() { this.noise(0.1, 0.14); [880, 1175, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.15, 'square', 0.05), i * 70)); },
  bad() { this.noise(0.12, 0.12); this.tone(180, 0.2, 'sawtooth', 0.06, 0.6); },
  destroy() { this.noise(0.4, 0.2); this.tone(120, 0.5, 'sawtooth', 0.08, 0.3); },
  finish() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 'triangle', 0.07), i * 80)); },
  level() { [660, 880].forEach((f, i) => setTimeout(() => this.tone(f, 0.1, 'triangle', 0.05), i * 90)); },
  death() { this.tone(300, 0.8, 'triangle', 0.08, 0.3); },
  coin() { this.tone(1046, 0.06, 'square', 0.04); setTimeout(() => this.tone(1568, 0.1, 'square', 0.04), 60); },
  tick(kind) {
    const now = performance.now(); if (now - this.lastTick < 70) return; this.lastTick = now;
    if (kind === 'gun') this.noise(0.04, 0.03); else this.tone(240 + Math.random() * 60, 0.03, 'square', 0.015);
  },
};

// ---------- HTML 헬퍼 ----------
// 남는 재료 되팔기: 시장 가격의 40% (값이 매겨지지 않는 희귀품·열쇠·외곽 재료는 팔 수 없다)
function matSellPrice(id) { const M = MATERIALS[id]; return M && M.price > 0 && ['metal', 'fabric', 'shape', 'core'].includes(M.cat) ? Math.round(M.price * 0.4) : 0; }
function matSellHTML() {
  const ids = MAT_ORDER.filter(id => S.stock[id] > 0 && matSellPrice(id) > 0);
  if (!ids.length) return '';
  return `<hr><h3>남는 재료 팔기 <small class="dim">시장가의 40%</small></h3>${ids.map(id => `<div class="mrow sellrow">${matChip(id, S.stock[id])}<b>${fmtMoney(matSellPrice(id))}</b>
    <button data-act="sellMat" data-id="${id}" data-n="1">-1</button><button data-act="sellMat" data-id="${id}" data-n="all">전부<small>${fmtMoney(matSellPrice(id) * S.stock[id])}</small></button></div>`).join('')}`;
}
function colorHexOf(f) { return f.colorHex || (COLOR_FAMILIES.find(c => c.key === (f.colorKey || LEGACY_COLOR[f.colorTitle])) || {}).color || '#ffcf4a'; }
// 도트 초승달 — Project Moon 로고의 달에서 따온 모양 (24×24 픽셀)
// 오른쪽으로 열린 초승달 · 바깥은 밝고 안쪽은 어둡게 3단 명암 · 짙은 윤곽선 · 작은 분화구 · 반짝이는 별
function pixelMoonSVG() {
  const N = 24, A = [11, 12, 10.2], B = [16.2, 10.4, 8.6];
  const inMoon = (x, y) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return false;
    const px = x + 0.5, py = y + 0.5;
    return Math.hypot(px - A[0], py - A[1]) < A[2] && Math.hypot(px - B[0], py - B[1]) >= B[2];
  };
  const craters = new Set(['6,9', '7,15', '5,13', '9,19']);
  let r = '';
  const px = (x, y, c) => { r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (inMoon(x, y)) {
      const dIn = Math.hypot(x + 0.5 - B[0], y + 0.5 - B[1]) - B[2];       // 안쪽 가장자리에서 떨어진 정도
      const dOut = A[2] - Math.hypot(x + 0.5 - A[0], y + 0.5 - A[1]);     // 바깥 둘레까지 남은 거리
      let c = dIn < 1.2 ? '#b8782c' : dOut < 1.3 ? '#fff4d2' : '#f0c060';  // 안쪽 그늘 · 바깥 빛 · 몸
      if (craters.has(x + ',' + y)) c = '#d49a44';
      px(x, y, c);
    } else if (inMoon(x - 1, y) || inMoon(x + 1, y) || inMoon(x, y - 1) || inMoon(x, y + 1)) {
      px(x, y, '#2a1a0c');                                                  // 윤곽선
    }
  }
  // 반짝이는 별 (십자 모양)
  for (const [sx, sy, big] of [[20, 3, 1]]) {
    px(sx, sy, '#fff8e0');
    if (big) { px(sx - 1, sy, '#e8c070'); px(sx + 1, sy, '#e8c070'); px(sx, sy - 1, '#e8c070'); px(sx, sy + 1, '#e8c070'); }
  }
  return `<svg class="moonmark" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
function matTip(id) {   // 쓰임새는 알려주지 않는다 — 직접 섞어 보며 알아낼 것
  const m = MATERIALS[id];
  const cat = { metal: '금속', fabric: '천', shape: '형태재료', core: '속성재료' }[m.cat] || '재료';
  return `${m.name} · ${m.grade}등급 ${cat}`;
}
// 본 적 있는 재료인가 (가진 적 있거나 지금 가지고 있거나 오늘 들어올 예정)
function seenMat(id) { return !!((S.seen || {})[id] || S.stock[id] || S.incoming[id]); }
// 장비 선택: 지금 낀 장비와 비교 (▲ 좋아짐 · ▼ 나빠짐)
function gearDelta(g, cur) {
  const keys = g.kind === 'weapon' ? [['atk', '공격']] : g.kind === 'armor' ? [['def', '방어'], ['hp', '체력']] : [];
  if (!keys.length) return '';
  const parts = keys.map(([k, n]) => {
    const d = (g[k] || 0) - (cur ? cur[k] || 0 : 0);
    return d === 0 ? `<span class="dim">${n} =</span>` : `<span class="${d > 0 ? 'good' : 'bad'}">${n} ${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>`;
  });
  return `<div class="small delta">${cur ? '지금보다 ' : '맨손 대비 '}${parts.join(' · ')}</div>`;
}
function matChip(id, n, cls) {
  const m = MATERIALS[id];
  return `<span class="mat ${cls || ''}" style="--mc:${m.color}" title="${esc(matTip(id))}"><i class="g${m.grade}"></i>${m.name}${n != null ? ` <b>×${n}</b>` : ''}</span>`;
}
function traitChips(g) {
  return g.traits.map(t => {
    const T = TRAITS[t.id], cls = T.strong ? 'strong' : T.res ? 'res' : '';
    const tip = (g.kind === 'weapon' ? (T.w || T.a) : (T.a || T.w)) || '';
    return `<span class="trait ${cls}" style="--tc:${T.color}" title="${esc(tip)}">${T.strong ? '⚠' : T.res ? '🛡' : ''}${T.name} Lv${t.lv}</span>`;
  }).join('');
}
// 해결사의 반동 상태 요약 (무기 강화형 특성 vs 방어구 내성)
function backlashHTML(st) {
  const out = [];
  for (const base in STRONG_OF) {
    const sid = STRONG_OF[base], lv = st.wt[sid] || 0;
    if (!lv) continue;
    const res = st.at['r_' + base] || 0, eff = Math.max(0, lv - res);
    out.push(eff === 0
      ? `<span class="good">🛡 ${TRAITS[sid].name} ${lv} 상쇄 (내성 ${res})</span>`
      : `<span class="bad">⚠ ${TRAITS[sid].name} 반동 ${eff}${res ? ` (내성 ${res})` : ''}</span>`);
  }
  return out.length ? `<div class="blline">${out.join(' ')}</div>` : '';
}
function gearStatText(g) {
  if (g.kind === 'pack') return `수납 ${(g.items || []).length}/${g.capacity} · 무기를 넣어 다니며 바꿔 든다`;
  const p = [];
  if (g.atk) p.push(`공격 ${g.atk}`);
  if (g.def) p.push(`방어 ${g.def}`);
  if (g.hp) p.push(`체력 +${g.hp}`);
  const F = FORMS[g.form];
  if (g.kind === 'weapon') p.push(`${F.interval}s`, F.ranged ? '원거리' : F.range > 30 ? '중거리' : '근접');
  else if (F.slow) p.push('이동↓');
  return p.join(' · ');
}
function gearHTML(g, o) {
  o = o || {};
  const R = RARITIES[g.rarity || 0];
  return `<div class="gear r${g.rarity || 0} ${o.big ? 'big' : ''} ${o.cls || ''}" style="--rc:${R.color}" ${o.attrs || ''}>
    <img class="pix" src="${gearIconURL(g)}" alt="">
    <div class="ginfo">
      <div class="gname" style="color:${R.color}"><span class="rar">${R.name}</span> ${g.epithet ? `<em${g.named ? ` class="named"${colorFamilyOf(g.epithet) ? ` style="color:${colorFamilyOf(g.epithet).color}"` : ''}` : ''}>${esc(g.epithet)}</em> ` : ''}${g.name} <small style="color:${TIER_COLORS[g.tier]}">+${g.q}</small></div>
      <div class="gstat">${gearStatText(g)}</div>
      ${g.traits.length ? `<div class="gtraits ${o.fixer && isBoundElse(g, o.fixer) ? 'sealed' : ''}">${traitChips(g)}</div>` : ''}
      ${gearGrowthHTML(g, o.fixer)}
      ${o.extra || ''}
    </div></div>`;
}
function gearGrowthHTML(g, fixer) {
  let h = '';
  const max = reforgeMax(g);
  if (max > 0) {
    const used = g.reforgeUsed || 0, ready = g.reforgeReady || 0, left = reforgeLeft(g);
    h += `<div class="gexp">${left > 0 ? `<div class="bar gx"><div style="width:${Math.min(100, g.exp || 0)}%"></div></div><small>EXP ${Math.floor(g.exp || 0)}%</small>` : ''}
      <small class="${ready ? 'gold' : 'dim'}">개량 ${used}/${max}${ready ? ` · 기회 ${ready}` : ''}</small></div>`;
  }
  if (g.forgeCount || g.brand) h += `<div class="gfc">${g.brand ? `[${esc(g.brand)} 공방] ` : ''}${g.forgeCount ? `단조 ${g.forgeCount}회` : ''}${g.patented ? ' · 특허' : ''}</div>`;
  if (g.ego) { const E = EGO[g.ego]; h += `<div class="gsing" style="color:${E.color}">◈ ${E.desc}</div>`; }
  if (g.singularity) { const X = SINGULARITIES[g.singularity]; h += `<div class="gsing" style="color:${X.color}">✦ ${X.name} — ${X.desc}</div>`; }
  if (g.contraband) { const c = (S.claws || []).find(x => x.gid === g.id); h += `<div class="contra">☠ 금기품 — ${esc(g.contraband.reason)} · 머리가 인식함${c ? ` · ${c.due}일차 마감 후 발톱이 이것을 가진 자를 찾아온다` : ''}</div>`; }
  if (g.owner) {
    const bad = fixer && isBoundElse(g, fixer);
    h += `<div class="gown ${bad ? 'bad' : ''}">🔒 귀속: ${esc(ownerName(g.owner))}${bad ? ' — 이 해결사는 능력치 60%, 특성 봉인' : ''}</div>`;
  }
  return h;
}
function tabooHTML(compact) {
  if (S.outskirts) return '<div class="taboo out">🌫 외곽 — 도시의 금기도, 세금도, 머리의 눈도 닿지 않는 곳</div>';
  const D = district(), T = D.taboo, n = S.tabooStrikes || 0;
  if (compact) return `<div class="taboo compact">⚖ ${D.name} 금기: <b>${T.name}</b> <small>${T.short}${n ? ` · 위반 ${n}회` : ""}</small></div>`;   // 2일차부터 아침에는 한 줄
  return `<div class="taboo">⚖ ${D.name} 둥지의 금기: <b>${T.name}</b> <small>${T.desc} · 어기면 금기 사냥꾼이 찾아온다${n ? ` · 지금까지 위반 ${n}회` : ''}</small></div>`;
}
function fingerHTML(e) {
  if (!e) return '';
  const F = FINGERS[e.type];
  let body = '', yes = '수락', no = '거절', canYes = true;
  if (e.type === 'thumb') { body = `엄지가 사무소에 공물 <b>${fmtMoney(e.cost)}</b>을 요구한다. 거절하면 오늘 밤 강력한 보복이 온다.`; yes = '공물 바치기'; canYes = S.money >= e.cost; }
  else if (e.type === 'index') { const o = e.order; body = `검지의 지령: 오늘 안에 <b>${FORMS[o.form].name}</b> (${o.stat === 'atk' ? '공격력' : '방어력'} ${o.req} 이상)을 납품하라. 보수 <b>${fmtMoney(o.money)}</b> · 명성 +${o.fame}. 받아 놓고 못 하면 명성 -10.`; }
  else if (e.type === 'ring') { const o = e.order; body = `약지가 <b>${TRAITS[o.trait].name}</b> 특성이 깃든 <b>${FORMS[o.form].name}</b> (${o.stat === 'atk' ? '공격력' : '방어력'} ${o.req} 이상)을 원한다. 보수 <b>${fmtMoney(o.money)}</b> · 명성 +${o.fame}.`; }
  else if (e.type === 'middle') { body = '중지가 복수의 표적을 넘겼다. 오늘 현장 3웨이브에 강력한 표적이 나타난다. 처리하면 큰 현상금과 희귀 재료.'; }
  else { body = `소지가 정보를 판다. <b>${fmtMoney(e.cost)}</b>에 희귀 재료 2개(${e.mats.map(id => MATERIALS[id].name).join('·')} 중).`; yes = '구매'; canYes = S.money >= e.cost; }
  const done = e.done ? `<p class="${e.accepted ? 'good' : 'dim'}">${e.accepted ? '✔ 수락함' : '✖ 거절함'}</p>` :
    `<div class="row"><button data-act="fingerNo">${no}</button><button class="gold" data-act="fingerYes" ${canYes ? '' : 'disabled'}>${yes}</button></div>`;
  return `<div class="finger" style="--fc:${F.color}"><h3>✋ ${F.name} — ${F.title}</h3><p>${body}</p>${done}</div>`;
}
function masteryHTML(f, cur) {
  const chips = Object.entries(MASTERY_FORMS).map(([k, n]) => {
    const m = (f.mastery || {})[k];
    if (!m || (!m.lv && !m.exp)) return '';
    const pct = m.lv >= MASTERY_MAX ? 100 : Math.floor(m.exp / masteryNeed(m.lv) * 100);
    return `<span class="mchip ${k === cur ? 'cur' : ''}" title="${n} 숙련 Lv${m.lv} — 공격 +${m.lv * 2}% · 공속 +${m.lv}% · 치명 +${(m.lv * 0.5).toFixed(1)}% (다음 레벨까지 ${pct}%)">${n} Lv${m.lv}<i style="width:${pct}%"></i></span>`;
  }).join('');
  return `<div class="mastery">숙련: ${chips || '<span class="dim">아직 없음 — 무기를 쥐고 싸우면 오른다</span>'}</div>`;
}
function fixerPortrait(f, sc) { return `<img class="pix portrait" src="${spriteURL('human', f.pal, sc || 3)}" alt="">`; }

// ---------- UI 본체 ----------
const UI = {
  dirty: new Set(), modalOpen: false, closeTab: 'report', picker: null, confirmKey: null,
  $(id) { return document.getElementById(id); },
  // PC(넓은 화면): 왼쪽은 모루만, 오른쪽에 슬롯·미리보기·버튼·재료함을 모은다 — 스크롤 없이 고르고 합성하고 두드린다
  layoutForge() {
    const W = window.innerWidth, wide = W >= 1000, phone = W < 760;
    const body = document.getElementById('forgeBody'), ctrl = document.getElementById('forgeControls');
    const side = document.querySelector('.forge-side'), main = document.getElementById('forgePanel'), tw = document.getElementById('timingWrap');
    const view = document.getElementById('view-forge');
    if (!body || !side || !main) return;
    // 기본 배치로 되돌린 뒤 화면 크기에 맞게 다시 놓는다
    let top = document.getElementById('forgeSideTop');
    if (top) { tw.after(body); body.after(ctrl); top.remove(); }
    const fo = document.getElementById('forgeOrders'); if (fo) fo.remove();
    if (side.parentNode !== view) view.appendChild(side);
    if (wide) {
      // PC: 왼쪽은 모루만, 오른쪽에 슬롯·미리보기·버튼·재료함·의뢰 — 스크롤 없이 고르고 합성하고 두드린다
      top = document.createElement('div'); top.id = 'forgeSideTop'; side.insertBefore(top, side.firstChild);
      top.appendChild(body); top.appendChild(ctrl);
      const o = document.createElement('div'); o.id = 'forgeOrders'; side.appendChild(o); if (S) this.renderForgeOrders();
    } else if (phone) {
      // 폰: 재료함을 슬롯 바로 아래(하단 고정 버튼 위)로 — 재료를 고르려고 화면 밖까지 내려가지 않게
      body.after(side);
    }
    document.body.classList.toggle('wideforge', wide);
    document.body.classList.toggle('phoneforge', phone);
  },
  mark(...k) { k.forEach(x => this.dirty.add(x)); },
  markAll() { ['top', 'forge', 'stock', 'orders', 'incoming', 'storage', 'log', 'partyStruct'].forEach(k => this.dirty.add(k)); },
  flush() {
    if (!S || !this.dirty.size) return;
    const d = this.dirty;
    if (d.has('top')) this.renderTop();
    if (d.has('forge')) Forge.renderUI();
    if (d.has('stock')) this.renderStock();
    if (d.has('orders')) this.renderOrders();
    if (d.has('incoming')) this.renderIncoming();
    if (d.has('storage')) this.renderStorage();
    if (d.has('log')) this.renderLog();
    if (d.has('partyStruct')) this.renderPartyStruct();
    if (d.has('close') && S.phase === 'close' && !this.$('overlay').classList.contains('hidden')) this.renderClose();
    d.clear();
  },
  // 알림: 한 번에 최대 3개 · 같은 알림이 연달아 오면 '×N'으로 합친다
  toast(msg, cls) {
    const box = this.$('toasts');
    const same = [...box.children].find(x => x.dataset.msg === msg && !x.classList.contains('out'));
    const life = t => { clearTimeout(t._a); clearTimeout(t._b); t._a = setTimeout(() => t.classList.add('out'), 1800); t._b = setTimeout(() => t.remove(), 2300); };
    if (same) {
      same.dataset.n = (Number(same.dataset.n) || 1) + 1;
      same.textContent = `${msg} ×${same.dataset.n}`;
      life(same);
      return;
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (cls || '');
    t.dataset.msg = msg;
    t.textContent = msg;
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    life(t);
  },

  renderTop() {
    this.updateNoticeBadge();
    this.$('tbWorkshop').textContent = `${S.workshopName} 공방`;
    this.$('tbOffice').textContent = `${S.officeName} 사무소 · ${S.oGrade}급${S.assoc ? ' · ' + ASSOCIATIONS[S.assoc].name : ''} · 공방 ${workshopClass()}급(Lv.${S.wLevel})`;
    this.$('tbDay').textContent = `${S.day}일차`;
    this.$('tbTime').textContent = S.phase === 'open' ? fmtTime(S.time) : S.phase === 'close' ? '마감' : '개점 전';
    this.$('tbTime').classList.toggle('tabootime', S.phase === 'open' && tabooTimeNow());
    const m = this.$('tbMoney'); m.textContent = fmtMoney(S.money); m.classList.toggle('neg', S.money < 0);
    this.$('tbFame').textContent = S.fame;
    this.$('tbDistrict').textContent = S.outskirts ? '외곽' : district().name;
    this.$('tbAmmoStat').classList.toggle('hidden', !(unlocked('gun') || (S.ammo || 0) > 1));   // 총을 쓸 수 있을 때만
    this.$('tbAmmo').textContent = S.ammo || 0;
    this.$('tbAmmo').classList.toggle('neg', (S.ammo || 0) <= 0);
    const fb = this.$('feedBlock');
    if (fb) fb.classList.toggle('hidden', !(S.phase === 'open' && !S.outskirts && districtTaboo().id === 'record' && !S.recordWatched && !Hunt.special));
    this.$('btnPause').textContent = Game.paused ? '▶ 재개' : '❚❚ 정지';
    this.$('btnSpeed').textContent = '배속 ×' + S.speed;
    const prog = Math.max(0, Math.min(1, (S.time - 540) / 540));
    this.$('dayProgress').firstElementChild.style.width = (prog * 100) + '%';
    const open = S.phase === 'open';
    ['btnPause', 'btnSpeed', 'btnClose'].forEach(id => this.$(id).disabled = !open);
    this.$('btnRetreat').disabled = !open || !Hunt.active || Hunt.special;
    this.$('huntSub').textContent = ZONES[Hunt.active ? Hunt.zone : S.zone].name + '';
    this.renderBadges();
  },

  // ---------- 하단 탭 ----------
  view: 'forge', logUnread: 0,
  setView(v) {
    this.view = v;
    document.querySelectorAll('.view').forEach(el => el.classList.toggle('on', el.id === 'view-' + v));
    document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    if (v === 'log') this.logUnread = 0;
    if (v === 'hunt') this.mark('partyStruct');
    this.renderBadges();
    window.scrollTo(0, 0);
  },
  badge(id, text, cls) {
    const el = this.$(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'badge ' + (cls || '');
  },
  renderBadges() {
    if (!S) return;
    const open = S.phase === 'open';
    if (open && Hunt.units.length) {
      const alive = Hunt.units.filter(u => !u.dead).length;
      const down = Hunt.units.some(u => u.dead && !u.withdrawn);
      this.badge('bdHunt', Hunt.active ? `${alive}/${Hunt.units.length}` : '종료', down ? 'alert' : '');
    } else this.badge('bdHunt', '');
    const deliverable = open ? S.orders.filter(o => !o.done && matchGear(o)).length : 0;
    this.badge('bdOrders', deliverable ? String(deliverable) : '', 'gold');
    this.badge('bdStorage', S.gear.length ? String(S.gear.length) : '');
    this.badge('bdLog', this.logUnread ? String(Math.min(99, this.logUnread)) : '');
  },
  // 현장을 보고 있지 않을 때만 알림
  huntAlert(msg, cls) { if (this.view !== 'hunt') this.toast('⚔ ' + msg, cls); },
  renderStock() {
    const el = this.$('stockGrid');
    const ids = MAT_ORDER.filter(id => (S.stock[id] || 0) > 0 && !['key', 'ego', 'item', 'outskirts'].includes(MATERIALS[id].cat));
    if (!ids.length) { el.innerHTML = '<div class="empty">재료가 없습니다. 마감 후 시장에서 사거나, 사냥으로 수급하세요.</div>'; return; }
    const lock = !Forge.canWork() || Forge.blank || Forge.result;
    const filtering = !lock && Forge.mode === 'craft';
    const sub = this.$('stockSub');
    if (sub) sub.textContent = filtering ? `${Forge.SLOT_LABEL[Forge.activeSlot]}에 넣을 재료` : '오늘 사용 가능';
    const shown = filtering ? ids.filter(id => Forge.slotAccepts(Forge.activeSlot, id)) : ids;
    if (!shown.length) { el.innerHTML = `<div class="empty">${Forge.SLOT_LABEL[Forge.activeSlot]}에 넣을 재료가 없습니다.</div>`; return; }
    const grades = [...new Set(shown.map(id => MATERIALS[id].grade))].sort((a, b) => b - a);   // 등급 높은 순으로 묶는다
    el.innerHTML = grades.map(gr => `<div class="stockgrp"><div class="sg-h g${gr}">${gr}등급</div><div class="sg-row">${shown.filter(id => MATERIALS[id].grade === gr).map(id => {
      const a = Forge.avail(id);
      return `<button class="matbtn ${a <= 0 || lock ? 'off' : ''}" data-act="pickMat" data-id="${id}" title="${esc(matTip(id))}">${matChip(id, a)}</button>`;
    }).join('')}</div></div>`).join('');
  },
  // 의뢰마다: 그 형태로 보관함에 있는 가장 좋은 수치 (모자라면 얼마나 모자란지 바로 보이게)
  bestOwn(o) {
    const list = S.gear.filter(g => g.form === o.form && !g.contraband);
    return list.length ? Math.max(...list.map(g => g[o.stat])) : null;
  },
  // 그 종류를 몇 개 가졌나 · 조건을 채운 것이 있나
  ownTag(o) {
    const n = S.gear.filter(g => g.form === o.form && !g.contraband).length, ok = matchGears(o).length;
    return `<small class="${n === 0 ? 'dim' : ok ? 'good' : 'warn'}">${n}개 보유${n && !ok ? ' · 미달' : ''}</small>`;
  },
  renderForgeOrders() {
    const el = document.getElementById('forgeOrders'); if (!el) return;
    const open = S.phase === 'open';
    const left = S.orders.filter(o => !o.done);
    el.innerHTML = `<h2>오늘의 의뢰 <small>${left.length}건 남음 · 마감 시 만료</small></h2>` + (S.orders.length ? S.orders.map(o => {
      const F = FORMS[o.form], m = !o.done && matchGear(o), best = this.bestOwn(o);
      return `<div class="forder ${o.done ? 'done' : ''} ${m ? 'ready' : ''}">
        <span class="fo-form"><b>${F.name}</b></span>
        <span class="fo-req">${o.stat === 'atk' ? '공격' : '방어'} ${o.req}+ ${this.ownTag(o)}</span>
        <span class="fo-pay">${fmtMoney(o.money)}</span>
        ${o.done ? '<span class="stamp">완료</span>' : `<button data-act="deliver" data-id="${o.id}" ${m && open ? '' : 'disabled'}>납품</button>`}
      </div>`;
    }).join('') : '<div class="empty">의뢰 없음</div>');
  },
  renderOrders() {
    this.renderForgeOrders();
    const el = this.$('ordersList');
    if (!S.orders.length) { el.innerHTML = '<div class="empty">의뢰 없음</div>'; return; }
    const open = S.phase === 'open';
    el.innerHTML = S.orders.map(o => {
      const F = FORMS[o.form];
      const m = !o.done && matchGear(o);
      return `<div class="order ${o.done ? 'done' : ''}">
        <div>${o.rare ? `<span class="ftag" style="--fc:#ffd84a">✦ 드문 손님 · 보상 ${MATERIALS[o.item].name}</span> ` : ''}${o.finger ? `<span class="ftag" style="--fc:${FINGERS[o.finger].color}">✋ ${FINGERS[o.finger].name}</span> ` : ''}<b>${F.name}</b><br><span class="oreq">${o.stat === 'atk' ? '공격력' : '방어력'} ${o.req} 이상${o.trait ? ` · ${TRAITS[o.trait].name} 특성` : ''}</span> ${o.done ? '' : this.ownTag(o)}<br><small class="dim">${o.client}</small></div>
        <div class="oreward">${fmtMoney(o.money)}<br><small>명성 +${o.fame}</small></div>
        ${o.done ? '<span class="stamp">완료</span>' : `<button data-act="deliver" data-id="${o.id}" ${m && open ? '' : 'disabled'} title="${m ? '납품: ' + esc(m.name) + ' +' + m.q : '조건에 맞는 장비가 보관함에 없습니다'}">납품</button>`}
      </div>`;
    }).join('');
  },
  renderIncoming() {
    const el = this.$('incomingList');
    const ids = MAT_ORDER.filter(id => S.incoming[id] > 0);
    el.innerHTML = ids.length ? ids.map(id => matChip(id, S.incoming[id])).join('') : '<div class="empty">아직 수급한 재료가 없습니다</div>';
  },
  renderStorage() {
    const el = this.$('storageList');
    this.$('storageCount').textContent = S.gear.length ? `(${S.gear.length})` : '';
    const nameBtn = g => g.rarity >= NAME_RARITY ? { extra: `<button class="sellbtn" data-act="nameForm" data-gid="${g.id}">✎ ${g.named ? '이름 바꾸기' : '이름 짓기'}</button>` } : undefined;
    const worn = [];
    for (const f of S.fixers) for (const g of [f.weapon, f.armor, f.pack]) if (g) worn.push([f, g]);
    el.innerHTML = `<div class="gearlist">${S.gear.length ? S.gear.slice().reverse().map(g => gearHTML(g, nameBtn(g))).join('') : '<div class="empty">보관 중인 장비 없음 — 단조대에서 만든 장비가 여기에 쌓입니다</div>'}</div>`
      + (worn.length ? `<h3 class="subhead">장착 중 <small class="dim">마감 후 [인원·장비]에서 바꿀 수 있습니다</small></h3><div class="gearlist worn">${worn.map(([f, g]) => gearHTML(g, Object.assign({ fixer: f }, nameBtn(g) || {}, { extra: `<div class="small dim">${esc(f.name)} 착용${g.rarity >= NAME_RARITY ? '' : ''}</div>` + ((nameBtn(g) || {}).extra || '') }))).join('')}</div>` : '');
  },
  renderLog() {
    this.$('logList').innerHTML = S.log.slice(0, 40).map(l => `<div class="log ${l.cls}"><small>${l.d}일 ${l.t}</small> ${esc(l.msg)}</div>`).join('');
  },
  renderPartyStruct() {
    const el = this.$('partyBars');
    if (!Hunt.units.length) { el.innerHTML = '<div class="empty">출동 인원 없음</div>'; return; }
    el.innerHTML = Hunt.units.map((u, i) => `<div class="pbar" id="pb${i}">
      <b class="pnum">${i + 1}</b>${fixerPortrait(u.f, 2)}<div class="pinfo"><div><b>${esc(u.f.name)}</b> <small>Lv.${u.f.lv} · ${fixerGrade(u.f)}급</small> <span class="pst"></span></div>
      ${u.bw ? `<button class="hsbtn" style="--hc:${BLACKWATER[u.bw].color}" data-act="heishou" data-i="${i}" ${u.transformUsed || u.dead ? 'disabled' : ''}>${u.transformed > 0 ? '흑수화 중' : u.transformUsed ? '흑수화 사용함' : '흑수화 — ' + BLACKWATER[u.bw].name.replace('흑수 - ', '')}</button>` : ''}
      <div class="bar hp"><div></div></div><div class="bar xp"><div></div></div></div></div>`).join('');
    this.updateParty();
  },
  renderRadio() {
    if (!Hunt.radioDirty) return;
    const el = document.getElementById('radioFeed'); if (!el) return;
    Hunt.radioDirty = false;
    const r = Hunt.radio || [];
    el.innerHTML = r.length ? r.slice(0, 9).map(x => `<div class="${x.cls}"><i>${x.t}</i> ${esc(x.msg)}</div>`).join('') : '<div class="dim">무전 대기 중…</div>';
  },
  updateParty() {
    this.renderRadio();
    Hunt.units.forEach((u, i) => {
      const el = document.getElementById('pb' + i); if (!el) return;
      const hpb = el.querySelector('.bar.hp div'), xpb = el.querySelector('.bar.xp div'), st = el.querySelector('.pst');
      const alive = !u.dead;
      hpb.style.width = (alive || u.withdrawn ? Math.max(0, u.hp / u.maxHp) * 100 : 0) + '%';
      xpb.style.width = (u.f.exp / expNeed(u.f.lv) * 100) + '%';
      const dead = !S.fixers.includes(u.f);
      st.textContent = dead ? '사망' : u.withdrawn ? `정비 중 ${Math.round(u.hp / u.maxHp * 100)}%` : !alive ? '쓰러짐' : `${Math.ceil(u.hp)}/${u.maxHp}`;
      st.className = 'pst ' + (dead ? 'bad' : !alive ? 'warn' : '');
      el.querySelector('small').textContent = `Lv.${u.f.lv} · ${fixerGrade(u.f)}급`;
      el.classList.toggle('down', !alive);
    });
  },

  // ---------- 오버레이 (단계 화면) ----------
  showOverlay(html, cls) {
    this.onTitle = false;
    const o = this.$('overlay');
    o.className = cls || '';
    o.innerHTML = html;
  },
  hideOverlay() { this.onTitle = false; this.$('overlay').className = 'hidden'; this.$('overlay').innerHTML = ''; },
  showModal(html) { this.$('modal').className = ''; this.$('modal').innerHTML = `<div class="modalbox">${html}</div>`; this.modalOpen = true; },
  hideModal() { this.$('modal').className = 'hidden'; this.$('modal').innerHTML = ''; this.modalOpen = false; },

  onTitle: false,
  cloudChanged() {
    if (this.onTitle) this.showTitle();
    const el = document.getElementById('cloudLine');
    if (el) el.textContent = Cloud.label();
  },
  showStale(r) {
    Game.paused = true;
    this.showModal(`<h2>☁ 다른 기기에서 더 진행했습니다</h2>
      <p>클라우드에 더 최근 진행이 있습니다: <b>${esc(r.workshopName)} · ${r.day}일차</b></p>
      <p class="dim">이 화면의 진행은 클라우드에 저장되지 않도록 멈췄습니다. 덮어쓰지 않도록 최신 진행을 불러오세요.</p>
      <div class="row"><button class="gold big" data-act="loadCloud">최신 진행 불러오기</button></div>`);
  },
  showTitle() {
    const d = bestSave();
    const can = !!d;
    const wait = Cloud.status === 'loading';
    this.showOverlay(`<div class="title">
      <div class="logo"><b class="moonword">${pixelMoonSVG()}<i>문</i></b><span>포지</span></div>
      <div class="tmenu">
        ${wait ? '<button class="big gold" disabled>클라우드 세이브 확인 중…</button>'
          : can ? `<button class="big gold" data-act="continue">이어하기 <small>${esc(d.workshopName)} · ${d.day}일차</small></button>` : ''}
        <button class="big" data-act="newGameForm" ${wait ? 'disabled' : ''}>새 게임</button>
        <button class="big" data-act="help">게임 방법</button>
      </div>
      <p class="cloudline" id="cloudLine">${Cloud.label()}</p>
      <p class="disclaimer">v${GAME_VERSION} · Project Moon의 세계관을 차용한 비공식 팬게임입니다. 등장인물·장비는 창작입니다.<br><small>폰트: 갈무리(Galmuri) · Neo둥근모 — SIL Open Font License</small></p>
    </div>`, 'phase');
    this.onTitle = true;
  },
  // ---------- 납품할 장비 고르기 (같은 종류가 여러 개일 때) ----------
  showDeliverPick(o, list) {
    this.showModal(`<h2>납품할 장비 고르기</h2>
      <p class="dim">${esc(o.client || '의뢰인')} — ${FORMS[o.form].name} · ${o.stat === 'atk' ? '공격' : '방어'} ${o.req} 이상 · 보상 ${fmtMoney(o.money)}</p>
      <div class="picklist">${list.map(g => gearHTML(g, { cls: 'pickable', attrs: `data-act="deliver" data-id="${o.id}" data-gid="${g.id}"` })).join('')}</div>
      <button data-act="closeModal">취소</button>`);
  },
  // ---------- 구역 정보 (상단 '구역'을 누르면) ----------
  showDistrictInfo() {
    if (!S) return;
    if (S.outskirts) return this.showModal(`<h2>외곽</h2><p>도시의 바깥. 날개도, 머리의 눈도 닿지 않는 곳입니다.</p><p class="dim">이곳에는 둥지의 금기도, 도시세도 없습니다.</p><button data-act="closeModal">닫기</button>`);
    const D = district(), T = D.taboo, n = S.tabooStrikes || 0;
    this.showModal(`<h2>${D.name}</h2>
      <p><b>${D.wing}</b>의 둥지가 다스리는 구역입니다.</p>
      <p class="dim">${D.desc}</p>
      <div class="taboo">⚖ 둥지의 금기: <b>${T.name}</b><br><small>${T.desc}</small></div>
      <p class="${n ? 'bad' : 'dim'}">${n ? `지금까지 위반 ${n}회 — 거듭 어길수록 금기 사냥꾼이 가혹해집니다.` : '아직 금기를 어긴 적이 없습니다.'}</p>
      <button data-act="closeModal">닫기</button>`);
  },
  // ---------- 승급 연출: 건물이 넓어짐 → '승급' 도장 → 새로 생긴 것 ----------
  showPromotion(kind, lv) {
    // 단계 0~8 (사무소 9급→1급, 공방 Lv1→5를 같은 축에)
    const step = kind === 'office' ? 9 - lv : (lv - 1) * 2;
    const pal = [['#8a5a32', '#c88a4a'], ['#8a5a32', '#c88a4a'], ['#6a6a74', '#c3ced6'], ['#6a6a74', '#c3ced6'], ['#9a7a2a', '#f0c674'], ['#9a7a2a', '#f0c674'], ['#8a2a2a', '#ff6a5a'], ['#5a2a7a', '#d8a0ff'], ['#c8a040', '#fff0b0']][Math.min(8, step)];
    const title = kind === 'office' ? `사무소 ${lv}급` : `공방 Lv.${lv} — ${WORKSHOP_LEVELS[lv - 1].name}`;
    const feats = [];
    if (kind === 'workshop') {
      feats.push(`망치질이 손에 익는다 — 성공·대성공이 더 잘 난다`, `한 작업물에 두드릴 수 있는 횟수 +1`, `시장에 새 재료가 들어온다`);
      if (lv === SING_UNLOCK_W) feats.push('특이점 기술 — 날개의 기술을 빌릴 수 있다', 'H사 환 — 새로운 거래 상대');
      if (lv === 5) feats.push('S급 공방 — 높은 등급의 총기도 허가를 받는다');
      feats.push(`트레스 협회 등급 ${workshopClass()}급`);
    } else {
      feats.push(`사무소 정원 ${maxMembers()}명 · 고용 후보 최대 Lv.${1 + (9 - lv) * 2}`);
      const z = ZONES.find(z => z.req === lv); if (z) feats.push(`새 출동 지역 — ${z.name}`);
      if (lv === 8) feats.push('협회 소속이 가능해졌다');
      if (lv === 1) feats.push('도시가 당신의 이름을 안다');
    }
    this.showModal(`<div class="promo" style="--pa:${pal[0]};--pb:${pal[1]}">
      <canvas id="promoCv" width="320" height="170"></canvas>
      <div class="promo-stamp">승급</div>
      <div class="promo-title">${title}</div>
      <div class="promo-info"><h3>새로 생긴 것</h3><ul>${feats.map(t => `<li>${t}</li>`).join('')}</ul><button class="big gold" data-act="closeModal">확인</button></div>
    </div>`);
    const cv = document.getElementById('promoCv'); if (!cv) return;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    const from = Math.max(0, step - (kind === 'office' ? 1 : 2)), to = step;
    const dust = []; let t0 = null, stamped = false;
    const drawBuilding = (k, glow) => {
      x.clearRect(0, 0, 320, 170);
      const sky = x.createLinearGradient(0, 0, 0, 170); sky.addColorStop(0, '#120e1a'); sky.addColorStop(1, '#2a2030'); x.fillStyle = sky; x.fillRect(0, 0, 320, 170);
      for (let i = 0; i < 24; i++) { x.fillStyle = 'rgba(255,230,180,' + (0.2 + 0.3 * ((i * 7) % 5) / 5) + ')'; x.fillRect((i * 53) % 320, (i * 29) % 70, 1, 1); }
      x.fillStyle = '#1a141c'; x.fillRect(0, 150, 320, 20);
      const w = 70 + k * 22, floors = 1 + Math.round(k * 0.6), fh = 22, h = floors * fh + 12;
      const bx = 160 - w / 2, by = 150 - h;
      x.fillStyle = '#0c0a10'; x.fillRect(bx - 2, by - 2, w + 4, h + 2);
      x.fillStyle = pal[0]; x.fillRect(bx, by, w, h);
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(bx, by, w, 2);
      for (let f = 0; f < floors; f++) for (let c = 0; c < Math.floor(w / 18); c++) {
        const wx = bx + 7 + c * 18, wy = by + 10 + f * fh;
        x.fillStyle = (c + f) % 3 ? '#ffd27a' : '#3a2a30'; x.fillRect(wx, wy, 8, 10);
      }
      x.fillStyle = pal[1]; x.fillRect(bx - 6, by - 6, w + 12, 6);                  // 지붕
      if (kind === 'workshop') { x.fillStyle = '#3a3a44'; x.fillRect(bx + w - 18, by - 22, 10, 16); x.fillStyle = 'rgba(200,200,210,0.35)'; x.beginPath(); x.arc(bx + w - 13, by - 28, 6, 0, 7); x.fill(); }
      else { x.fillStyle = pal[1]; x.fillRect(160 - 18, by + h - 16, 36, 16); x.fillStyle = '#0c0a10'; x.fillRect(160 - 16, by + h - 14, 32, 14); }
      if (glow > 0) { const g = x.createRadialGradient(160, by + h / 2, 10, 160, by + h / 2, 160); g.addColorStop(0, `rgba(255,240,190,${0.35 * glow})`); g.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = g; x.fillRect(0, 0, 320, 170); }
      for (const d of dust) { x.fillStyle = `rgba(200,180,160,${Math.max(0, d.l)})`; x.fillRect(d.x, d.y, 3, 3); }
    };
    const loop = ts => {
      if (!document.getElementById('promoCv')) return;
      if (t0 == null) t0 = ts;
      const t = (ts - t0) / 1000, k = from + (to - from) * Math.min(1, Math.max(0, (t - 0.2) / 1.2));
      if (t < 1.4 && Math.random() < 0.6) dust.push({ x: 160 + (Math.random() - 0.5) * (90 + k * 22), y: 148, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 30, l: 1 });
      for (const d of dust) { d.x += d.vx / 60; d.y += d.vy / 60; d.l -= 0.02; }
      drawBuilding(k, t > 1.4 ? Math.max(0, 1 - (t - 1.4) / 1.2) : 0);
      if (t > 1.5 && !stamped) { stamped = true; const p = cv.closest('.promo'); if (p) p.classList.add('stamped'); Sound.great && Sound.great(); }
      if (t > 2.2) { const p = cv.closest('.promo'); if (p) p.classList.add('info'); }
      if (t < 4) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  // ---------- 공지 (업데이트 내역) — 읽은 버전은 이 브라우저에 기억 ----------
  noticeSeen() { try { return localStorage.getItem('moonforge_notice_seen') === GAME_VERSION; } catch (e) { return true; } },
  showNotice() {
    try { localStorage.setItem('moonforge_notice_seen', GAME_VERSION); } catch (e) {}
    this.showModal(`<h2>공지 <small class="dim">v${GAME_VERSION}</small></h2>
      <div class="notices">${(() => { const one = (n, i) => `<div class="notice ${i ? 'old' : ''}"><h3>v${n.v} <small class="dim">${n.date}</small></h3><ul>${n.items.map(t => `<li>${t}</li>`).join('')}</ul></div>`; const recent = NOTICES.slice(0, 3), older = NOTICES.slice(3); return recent.map(one).join('') + (older.length ? `<details class="oldnotices"><summary>이전 공지 ${older.length}개</summary>${older.map(n => one(n, 1)).join('')}</details>` : ''); })()}</div>
      <button class="big" data-act="closeModal">닫기</button>`);
    this.updateNoticeBadge();
  },
  // ---------- 새 버전 안내: 방해하지 않게 구석에 작게, 누르면 저장 후 새로고침 ----------
  showUpdateBar(v) {
    const el = document.getElementById('updateBar'); if (!el) return;
    el.innerHTML = `<button class="ub-go" data-act="reloadUpdate" title="저장하고 새로고침">✦ 새 버전 v${esc(v)} — 새로고침</button><button class="ub-x" data-act="dismissUpdate" data-v="${esc(v)}" title="닫기">✕</button>`;
    el.classList.remove('hidden');
  },
  updateNoticeBadge() { const b = document.getElementById('noticeBadge'); if (b) b.classList.toggle('hidden', this.noticeSeen()); },
  showNewGame() {
    this.showOverlay(`<div class="card narrow">
      <h2>새 게임</h2>
      ${hasSave() ? '<p class="warnline">기존 저장 데이터가 덮어씌워집니다.</p>' : ''}
      <label>공방 이름<input id="inW" maxlength="12" value="잿빛 모루"></label>
      <label>사무소 이름<input id="inO" maxlength="12" value="늦은 등불"></label>
      ${(() => { this.newDist = randInt(0, DISTRICTS.length - 1); const D = DISTRICTS[this.newDist]; return `<div class="dsel"><div class="dopt"><small class="dim">공방이 자리 잡은 곳 (무작위)</small><br><b>${D.name}</b> <small class="dim">${D.desc}</small><br><span class="bad">⚖ 둥지의 금기 — ${D.taboo.name}: ${D.taboo.desc}</span></div></div>`; })()}
      <p class="dim">당신은 뒷골목의 작은 공방을 물려받았습니다. 공방 한편에 해결사 사무소도 차렸죠.<br>
      직접 무기를 벼려 해결사들에게 쥐여주고, 그들이 가져온 재료로 더 좋은 무기를 만드세요.</p>
      <div class="row"><button data-act="title">뒤로</button><button class="gold big" data-act="startNew">시작</button></div>
    </div>`, 'phase');
  },
  showMorning() {
    const m = S.morning || { arrived: {}, wages: 0, resting: [] };
    const arr = MAT_ORDER.filter(id => m.arrived[id] > 0);
    this.showOverlay(`<div class="card narrow morning">
      <div class="dayno">${S.day}일차</div>
      <h2>아침 · 개점 준비</h2>
      ${S.day === 1 ? `<div class="card guide"><b>처음이라면</b>
        <ol><li><b>단조</b> 탭 재료함에서 주재료를 고르세요 — 금속은 무기, 천은 방어구가 됩니다. 다른 재료를 섞으면 무엇이 되는지는 직접 두드려 보며 알아내세요.</li>
        <li><b>합성</b> 후 쇠가 <b>적열</b>일 때 두드리고, 식으면 <b>가열</b>하세요(너무 자주 달구면 쇠가 물러집니다). 많이 두드릴수록 강해지지만 파괴 위험도 커집니다 — 적당할 때 <b>완성</b>.</li>
        <li>완성한 장비는 <b>의뢰</b> 탭에서 납품해 돈·명성을 벌고, 마감 후 <b>인원·장비</b>에서 해결사에게 쥐여 주세요. 해결사가 현장에서 모은 재료는 다음 날 들어옵니다.</li></ol></div>` : ''}
      ${arr.length ? `<h3>어제 수급한 재료가 입고되었습니다</h3><div class="chips">${arr.map(id => matChip(id, m.arrived[id])).join('')}</div>` : S.day > 1 ? '<p class="dim">새로 입고된 재료가 없습니다.</p>' : ''}
      ${m.wages ? `<p>해결사 급여 지급: <b class="bad">-${fmtMoney(m.wages)}</b></p>` : ''}
      ${S.money < 0 ? '<p class="warnline">자금이 마이너스입니다! 고용·구매·승급을 할 수 없습니다. 의뢰를 납품해 빚을 갚으세요.</p>' : ''}
      ${m.night ? (m.night.sweep ? `<p class="dim">🌙 지난밤 청소부가 뒷골목을 쓸고 지나갔다. 문을 걸어 잠근 덕에 피해는 없었다.</p>` : m.night.calm ? `<p class="dim">🌙 지난밤 ${S.outskirts ? "외곽의 밤은" : "뒷골목의 밤(03:13~04:34)은"} 조용히 지나갔다.${m.night.watchers.length ? ' 경계: ' + m.night.watchers.map(esc).join(', ') : ''}</p>`
        : m.night.win ? `<p class="good">🌙 ${S.outskirts ? "외곽의 밤" : "뒷골목의 밤"} — ${m.night.kind}의 습격을 막아냈다! 명성 +${m.night.fame}</p>`
        : `<p class="bad">🌙 ${S.outskirts ? "외곽의 밤" : "뒷골목의 밤"} — ${m.night.kind}에게 습격당했다. 잃은 것: ${(m.night.lost || []).join(', ') || '없음'}${m.night.hurt && m.night.hurt.length ? ' · 부상: ' + m.night.hurt.map(esc).join(', ') : ''}${(m.night.watchers || []).length ? '' : ' (야간 경계 인원 없음)'}</p>`) : ''}
      ${m.royalty ? `<p>트레스 협회 특허 로열티: <b class="good">+${fmtMoney(m.royalty)}</b></p>` : ''}
      ${m.colors && m.colors.length ? `<p class="gold">🎨 하나 협회 특색 부여: ${m.colors.map(esc).join(', ')}</p>` : ''}
      ${m.resting && m.resting.length ? `<p class="warn">휴식 중: ${m.resting.map(esc).join(', ')}</p>` : ''}
      ${tabooHTML(S.day > 1)}
      ${(S.morningEvents || []).map(t => `<p class="bad">${esc(t)}</p>`).join('')}
      ${m.claw && m.claw.length ? `<p class="bad">☠ 발톱이 다녀갔다: ${m.claw.map(esc).join(', ')}</p>` : ''}
      ${(S.claws || []).length ? `<p class="bad">☠ 머리가 인식한 금기품: ${S.claws.map(c => `「${esc(c.name)}」(${c.due}일차 마감 후)`).join(', ')} — 그때 그것을 가진 자가 처형된다. 창고에 있으면 공방주가 처형된다.</p>` : ''}
      ${m.tax ? (m.tax.paid ? `<p>도시세 납부: <b class="bad">-${fmtMoney(m.tax.paid)}</b></p>` : `<p class="bad">⚠ 도시세 ${fmtMoney(m.tax.due)} 체납 — 머리의 경고 ${m.tax.warn}/${TAX_STRIKES - 1}. 네 번째 체납에는 발톱이 온다.</p>`) : ''}
      ${S.outskirts ? "" : `<p class="dim">다음 도시세: ${((TAX_PERIOD - S.day % TAX_PERIOD) % TAX_PERIOD) === 0 ? "오늘" : ((TAX_PERIOD - S.day % TAX_PERIOD) % TAX_PERIOD) + "일 뒤"} 마감 후 (예상 ${fmtMoney(taxAmount())})${S.taxWarn ? ` · 누적 경고 ${S.taxWarn}회` : ""}</p>`}
      ${rel('pinky') >= 40 && S.nightRoll != null ? (() => {
        let ch = 0.25 + (9 - S.oGrade) * 0.025; if (rel('thumb') >= 70) ch *= 0.5;
        const risky = S.nightRoll <= ch || S.forcedRaid || rel('thumb') <= -40;
        return `<p class="intel">✋ 소지의 정보: 오늘 밤 사무소 습격 가능성 <b class="${risky ? 'bad' : 'good'}">${risky ? '높음' : '낮음'}</b>${risky ? ' — 야간 경계를 세우세요' : ''}</p>`;
      })() : ''}
      ${fingerHTML(S.finger)}
      <p>출동 지역: <b>${ZONES[S.zone].name}</b> · 출동 인원 ${S.party.filter(id => { const f = getFixer(id); return f && isAvailable(f); }).length}명</p>
      <p>오늘의 의뢰 ${S.orders.length}건 · 보관 장비 ${S.gear.length}개</p>
      <button class="big gold" data-act="openShop">개점 (09:00)</button>
    </div>`, 'phase dim');
  },

  // ---------- 마감 화면 ----------
  showClose(tab) {
    if (tab) this.closeTab = tab;
    this.picker = null;
    this.showOverlay('<div class="closewrap" id="closeWrap"></div>', 'phase');
    this.renderClose();
  },
  renderClose() {
    const wrap = this.$('closeWrap'); if (!wrap) return;
    const tabs = [['report', '결산'], ['roster', '인원·장비'], ['hire', '고용'], ['market', '시장'], ['upgrade', '승급'], ['deploy', '출동 지역'], ['fingers', '관계'], ['hwan', 'H사 환']]
      .filter(([k]) => k !== 'hwan' || S.wLevel >= SING_UNLOCK_W || S.fixers.some(f => f.blackwater))   // H사 환: 공방 Lv4 전에는 숨김
      .filter(([k]) => k !== 'fingers' || !S.outskirts);                                                  // 외곽에는 핑거가 없다
    if (!tabs.some(([k]) => k === this.closeTab)) this.closeTab = 'report';
    const sc = wrap.querySelector('.ctab-body'); const scroll = sc ? sc.scrollTop : 0;
    wrap.innerHTML = `
      <div class="closehead">
        <div><div class="dayno">${S.day}일차 마감</div><div class="dim">${esc(S.workshopName)} 공방 · ${esc(S.officeName)} 사무소 ${S.oGrade}급</div></div>
        <div class="cstats"><span>자금 <b class="${S.money < 0 ? 'bad' : ''}">${fmtMoney(S.money)}</b></span><span>명성 <b>${S.fame}</b></span></div>
        <button class="big gold" data-act="nextDay">다음 날 →</button>
      </div>
      <div class="ctabs">${tabs.map(([k, n]) => `<button class="${this.closeTab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="ctab-body">${this['tab_' + this.closeTab]()}</div>`;
    const nb = wrap.querySelector('.ctab-body'); if (nb) nb.scrollTop = scroll;
  },
  tab_report() {
    const r = S.report;
    const tb = tabooHTML(true);   // 결산에서는 한 줄 — 자세한 건 첫날 아침에 봤다
    const loot = MAT_ORDER.filter(id => r.loot[id] > 0);
    const wages = S.fixers.reduce((a, f) => a + wageOf(f), 0);
    return `${tb}<div class="grid2">
      <div class="card">
        <h3>현장 보고</h3>
        <p>처치 <b>${r.kills}</b> · 보스 격파 <b>${r.bossKills}</b> · 현장 수입 <b>${fmtMoney(r.huntMoney)}</b></p>
        ${loot.length ? `<div class="chips">${loot.map(id => matChip(id, r.loot[id])).join('')}</div><p class="dim">수급한 재료는 내일 아침 입고됩니다.</p>` : '<p class="dim">수급한 재료 없음</p>'}
        ${r.levelups.length ? `<p class="good">성장: ${(() => { const m = new Map(); r.levelups.forEach(s => { const i = s.lastIndexOf(' Lv.'); m.set(s.slice(0, i), s.slice(i + 1)); }); return [...m].map(([n, l]) => esc(n) + ' ' + l).join(', '); })()}</p>` : ''}
        ${r.injuries.length ? `<p class="warn">중상(내일 휴식): ${r.injuries.map(esc).join(', ')}</p>` : ''}
        ${r.deaths.length ? `<p class="bad">✝ 사망: ${r.deaths.map(esc).join(', ')}</p>` : ''}
      </div>
      <div class="card">
        <h3>공방 보고</h3>
        <p>제작 <b>${r.crafted}</b> · 파괴 <b>${r.destroyed}</b> · 명품 <b>${r.masterworks}</b></p>
        <p>의뢰 완료 <b>${r.orders}</b>건 · 수입 <b>${fmtMoney(r.orderMoney)}</b> · 명성 <b>+${r.orderFame}</b></p>
        <p>장비 판매 <b>${fmtMoney(r.sold)}</b></p>
        <hr>
        <p>내일 아침 급여 예정: <b class="bad">${fmtMoney(wages)}</b> <small class="dim">(${S.fixers.length}명)</small></p>
        ${S.money < wages ? `<p class="warnline">⚠ 지금 자금으로는 내일 급여를 다 줄 수 없습니다 — ${fmtMoney(wages - S.money)} 부족. 시장에서 남는 재료나 장비를 팔아 두세요.</p>` : ""}
        <p class="dim">누적: 제작 ${S.stats.crafted} · 대성공 ${S.stats.great} · 처치 ${S.stats.kills} · 보스 ${S.stats.bosses} · 사망 ${S.stats.deaths}</p>
      </div></div>`;
  },
  tab_roster() {
    const full = S.party.length >= MAX_PARTY;
    const cards = S.fixers.map(f => {
      const st = unitStats(f), inParty = S.party.includes(f.id), av = isAvailable(f) && S.day + 1 > (f.injuredUntil || 0);
      const nextAv = (S.day + 1) > (f.injuredUntil || 0);
      const slot = (k, label) => {
        const g = f[k];
        const open = this.picker && this.picker.fid === f.id && this.picker.slot === k;
        return `<div class="eqslot ${open ? 'open' : ''}" data-act="picker" data-fid="${f.id}" data-slot="${k}">
          <small>${label}</small>${g ? gearHTML(g, { fixer: f }) : '<div class="empty">비어 있음 — 눌러서 장착</div>'}</div>`;
      };
      let pick = '';
      if (this.picker && this.picker.fid === f.id) {
        const k = this.picker.slot, kind = k === 'weapon' ? 'weapon' : k === 'pack' ? 'pack' : 'armor';
        const list = S.gear.filter(g => g.kind === kind).sort((a, b) => b.value - a.value);
        pick = `<div class="picker">
          <div class="row"><b>${k === 'weapon' ? '무기' : k === 'pack' ? '차원 장비' : '방어구'} 선택</b>${f[k] ? `<button data-act="unequip" data-fid="${f.id}" data-slot="${k}">해제</button>` : ''}<button data-act="picker" data-fid="${f.id}" data-slot="${k}">닫기</button></div>
          ${list.length ? list.map(g => gearHTML(g, { fixer: f, cls: 'pickable', extra: gearDelta(g, f[k]) + (g.kind === 'weapon' ? `<div class="small dim">${f.name}의 ${MASTERY_FORMS[g.form]} 숙련 Lv${masteryLv(f, g.form)}</div>` : ''), attrs: `data-act="equip" data-fid="${f.id}" data-slot="${k}" data-gid="${g.id}"` })).join('') : '<div class="empty">보관함에 해당 장비가 없습니다</div>'}
        </div>`;
      }
      const confirmFire = this.confirmKey === 'fire' + f.id;
      return `<div class="card fixer ${inParty ? 'inparty' : ''}">
        <div class="fhead">${fixerPortrait(f, 4)}
          <div class="finfo">
            <div class="fname">${esc(f.name)} <span class="grade">${fixerGrade(f)}급</span>${f.colorTitle ? ` <span class="colortitle" style="--cc:${colorHexOf(f)}" title="${esc((COLOR_FAMILIES.find(c => c.key === f.colorKey) || {}).perk || '')}">특색 「${esc(f.colorTitle)}」</span>` : ''} <small>Lv.${f.lv}</small></div>
            <div class="augrow">${!unlocked('aug') ? '' : Object.entries(AUGMENTS).map(([k, A]) => (f.aug || {})[k] ? `<span class="aug on" title="${A.desc}">⚙ ${A.name}</span>` : `<button class="aug" data-act="augment" data-fid="${f.id}" data-part="${k}" title="${A.desc}" ${S.money < augmentCost(f) ? 'disabled' : ''}>+${A.name} ${fmtMoney(augmentCost(f))}</button>`).join('')}</div>
            <div class="bar xp"><div style="width:${f.exp / expNeed(f.lv) * 100}%"></div></div>
            <div class="fstats">체력 ${st.maxHp} · 공격 ${st.atk} · 방어 ${st.def} · 공속 ${st.interval}s${st.crit > 0.05 ? ` · 치명 ${Math.round(st.crit * 100)}%` : ''}</div>
            <div class="dim">재능 ${'★'.repeat(Math.round((f.talent - 0.85) * 10 / 1.75) + 1)} · 처치 ${f.kills} · 급여 ${fmtMoney(wageOf(f))}/일</div>
            ${masteryHTML(f, f.weapon ? f.weapon.form : 'fist')}
            ${backlashHTML(st)}
            ${!nextAv ? '<div class="warn">중상 — 내일 휴식</div>' : ''}
          </div>
          <div class="fbtns">
            <button class="${inParty ? 'gold' : ''}" data-act="toggleParty" data-fid="${f.id}" ${!inParty && (full || !nextAv) ? 'disabled' : ''}>${inParty ? '✔ 출동' : '대기'}</button>
            <button class="${f.nightWatch ? 'gold' : ''}" data-act="toggleWatch" data-fid="${f.id}" title="뒷골목의 밤(03:13~04:34)에 사무소를 지킵니다. 다음 날 체력 75%로 시작">${f.nightWatch ? '🌙 경계' : '야간 경계'}</button>
            <button class="${confirmFire ? 'danger' : ''}" data-act="fire" data-fid="${f.id}">${confirmFire ? '정말 해고?' : '해고'}</button>
          </div>
        </div>
        <div class="eqrow">${slot('weapon', '무기')}${slot('armor', '방어구')}</div>
        ${f.pack ? `<div class="packbox"><b>${esc(f.pack.name)}</b> <small class="dim">${(f.pack.items || []).length}/${f.pack.capacity} — 상대에 맞게 알아서 바꿔 든다</small>
          ${(f.pack.items || []).map((g, i) => gearHTML(g, { fixer: f, extra: `<button class="sellbtn" data-act="packOut" data-fid="${f.id}" data-i="${i}">빼기</button>` })).join('')}
          ${(f.pack.items || []).length < f.pack.capacity ? `<div class="row" style="justify-content:flex-start;margin:4px 0">${S.gear.filter(g => g.kind === 'weapon').slice(0, 6).map(g => `<button class="small" data-act="packIn" data-fid="${f.id}" data-gid="${g.id}">+ ${esc(g.name)} +${g.q}</button>`).join('') || '<span class="dim small">넣을 무기가 보관함에 없다</span>'}</div>` : ''}
        </div>` : ''}
        ${f.pack || S.wLevel >= SING_UNLOCK_W ? `<div class="eqrow one">${slot('pack', '차원 장비 (P사)')}</div>` : ''}
        <div class="special">
          <span class="small">충성 <b class="${(f.loyalty == null ? 70 : f.loyalty) < 30 ? 'bad' : ''}">${f.loyalty == null ? 70 : f.loyalty}</b></span>
          ${f.blackwater ? `<span class="small" style="color:${BLACKWATER[f.blackwater].color}">${BLACKWATER[f.blackwater].name} · 침식 <b class="${f.erosion >= 70 ? 'bad' : ''}">${f.erosion || 0}%</b></span>` : ''}
          ${f.scar ? `<span class="small bad">영구 손상 ×${f.scar}</span>` : ''}
          ${f.serum ? `<span class="small gold">${MATERIALS['serum_' + f.serum].name} 투여됨</span>` : ''}
          ${S.wLevel >= SING_UNLOCK_W ? `<button class="small" data-act="nExtract" data-fid="${f.id}" title="N사: 기억을 통조림에 담는다 (${fmtMoney(N_COST)}, 충성도 하락)">기억 추출</button>` : ''}
          ${(S.cans || []).length ? `<button class="small" data-act="nInject" data-fid="${f.id}" title="${esc(S.cans[0].from)}의 경험 통조림 주입 — 충성도가 떨어질 수 있다">통조림 주입</button>` : ''}
          ${(S.stock.hwan || 0) > 0 ? `<button class="small" data-act="hwanUse" data-fid="${f.id}" title="회복·부상 치료, 25% 확률로 영구 손상">환 먹이기</button>` : ''}
          ${['k', 'r', 'w'].filter(t => (S.stock['serum_' + t] || 0) > 0).map(t => `<button class="small" data-act="serum" data-fid="${f.id}" data-t="${t}">${MATERIALS['serum_' + t].name}</button>`).join('')}
        </div>
        ${pick}
      </div>`;
    }).join('');
    const mem = S.memorial.length ? `<div class="card memorial"><h3>✝ 추모</h3>${S.memorial.map(m => `<div>${esc(m.name)} — Lv.${m.lv}, ${m.day}일차에 잠들다 (처치 ${m.kills})</div>`).join('')}</div>` : '';
    return `<p class="dim">인원 ${S.fixers.length}/${maxMembers()} · 출동 ${S.party.length}/${MAX_PARTY} — 장비 슬롯을 눌러 보관함의 장비를 배분하세요. 사망한 해결사의 장비는 회수됩니다.</p>
      <div class="fixers">${cards || '<div class="empty">소속 해결사가 없습니다. [고용] 탭에서 고용하세요.</div>'}</div>${mem}`;
  },
  tab_hire() {
    const full = S.fixers.length >= maxMembers();
    return `${S.fixers.length >= maxMembers() ? `<p class="warnline">정원이 찼습니다 (${S.fixers.length}/${maxMembers()}) — 새로 고용하려면 사무소를 승급하거나 [인원·장비]에서 한 명을 내보내세요.</p>` : ""}<p class="dim">인원 ${S.fixers.length}/${maxMembers()} — 사무소 등급이 오를수록 정원과 후보의 수준이 오릅니다. 후보는 매일 바뀝니다.</p>
      <div class="fixers">${S.candidates.map(f => {
        const st = unitStats(f);
        return `<div class="card fixer"><div class="fhead">${fixerPortrait(f, 4)}
          <div class="finfo"><div class="fname">${esc(f.name)} <span class="grade">${fixerGrade(f)}급</span> <small>Lv.${f.lv}</small></div>
          <div class="fstats">체력 ${st.maxHp} · 공격 ${st.atk} · 방어 ${st.def}</div>
          <div class="dim">재능 ${'★'.repeat(Math.round((f.talent - 0.85) * 10 / 1.75) + 1)} · 급여 ${fmtMoney(wageOf(f))}/일</div></div>
          <div class="fbtns"><button class="gold" data-act="hire" data-id="${f.id}" ${full || S.money < f.cost ? 'disabled' : ''}>고용<br><small>${fmtMoney(f.cost)}</small></button></div>
        </div></div>`;
      }).join('') || '<div class="empty">오늘은 후보가 없습니다</div>'}</div>`;
  },
  tab_market() {
    const ids = [];
    for (let i = 0; i < Math.min(S.wLevel, MARKET_TIERS.length); i++) ids.push(...MARKET_TIERS[i].filter(id => !MATERIALS[id].gunpart || unlocked('gun')));   // 톱니는 총기 해금 뒤에만
    const buy = ids.map(id => { const p = marketPrice(id); return `<div class="mrow">${matChip(id)}<span class="dim">보유 ${S.stock[id] || 0}</span><b>${fmtMoney(p)}</b>
      <button data-act="buy" data-id="${id}" data-n="1" ${S.money < p ? 'disabled' : ''}>+1</button>
      <button data-act="buy" data-id="${id}" data-n="5" ${S.money < p * 5 ? 'disabled' : ''}>+5</button></div>`; }).join('');
    const tax = saleTax();
    const sell = S.gear.length ? S.gear.map(g => gearHTML(g, { extra: g.contraband ? '<button class="sellbtn" disabled>금기품 — 거래 불가</button>' : `<button class="sellbtn" data-act="sell" data-gid="${g.id}">판매 ${fmtMoney(Math.round(g.value * (1 - tax)))}</button>` })).join('') : '<div class="empty">판매할 장비 없음</div>';
    const ammoP = Math.round(AMMO_PRICE * (assoc() === 'tres' ? 0.85 : 1));
    const ammoHTML = !unlocked('gun') && !(S.ammo > 1) ? '' : `<div class="mrow ammo"><span>🔫 <b>탄환</b> ${AMMO_PACK}발</span><span class="dim">보유 ${S.ammo || 0}발</span><b>${fmtMoney(ammoP)}</b>
      <button data-act="buyAmmo" data-n="1" ${S.money < ammoP ? 'disabled' : ''}>+1</button><button data-act="buyAmmo" data-n="5" ${S.money < ammoP * 5 ? 'disabled' : ''}>+5</button></div>
      <p class="dim small">머리의 총기 규제로 탄환에는 엄청난 세금이 붙어, 한 발이 일반인의 몇 달 치 생활비입니다. 총잡이는 평소에 총으로 후려치고(약함), 탄환이 있을 때 <b>보스·강적에게만</b> 사격합니다(4배 위력).</p>`;
    const pats = S.patents || [], pmax = patentMax();
    const cand = S.gear.filter(g => g.rarity >= 5 && !g.patented && !g.contraband);
    const patentHTML = `<div class="card"><h3>트레스 협회 — 특허 <small>${pats.length}/${pmax}</small></h3>
      <p class="dim">에픽 이상 장비의 설계를 특허로 등록하면 매일 아침 로열티가 들어옵니다. 등록비는 장비 가치의 50%. 한도는 공방 등급에 따라 늘어납니다.</p>
      ${pats.length ? pats.map(p => `<div class="mrow pat"><span style="color:${RARITIES[p.rarity].color}">${esc(p.name)}</span><b>+${fmtMoney(p.royalty)}/일</b></div>`).join('') : '<div class="empty">등록된 특허 없음</div>'}
      ${cand.length ? '<hr>' + cand.map(g => gearHTML(g, { extra: `<button class="sellbtn gold" data-act="patent" data-gid="${g.id}" ${pats.length >= pmax || S.money < Math.round(g.value * 0.5) ? 'disabled' : ''}>특허 등록 ${fmtMoney(Math.round(g.value * 0.5))} → 매일 ${fmtMoney(Math.round(g.value * PATENT_ROYALTY))}</button>` })).join('') : '<p class="dim">등록할 수 있는 에픽 이상 장비가 없습니다.</p>'}
    </div>`;
    return `<div class="grid2">
      <div class="card"><h3>재료 구매</h3><p class="dim">공방 레벨이 오르면 더 좋은 재료가 입고됩니다. 구매한 재료는 바로 창고에 들어갑니다.</p>${buy}<hr>${ammoHTML}${matSellHTML()}</div>
      <div class="card"><h3>장비 판매 <small>${tax ? `트레스 판매세 ${Math.round(tax * 100)}%` : '판매세 면제'}</small></h3><div class="selllist">${sell}</div></div></div>
      <div class="grid2" style="margin-top:10px">${patentMax() > 0 || (S.patents || []).length ? patentHTML : ""}${(() => {
        const bound = S.gear.concat(S.fixers.map(f => f.weapon), S.fixers.map(f => f.armor)).filter(g => g && g.owner);
        if (S.wLevel < SING_UNLOCK_W) return "";   // F사 귀속 해제: 공방 Lv4 전에는 숨김
        return `<div class="card"><h3>F사 요정 — 귀속 해제</h3>
          <p class="dim">잠긴 것을 강제로 열어젖히는 F사의 특이점. 귀속된 장비의 귀속을 풀 수 있습니다. ${S.wLevel < SING_UNLOCK_W ? `🔒 공방 Lv.${SING_UNLOCK_W}부터` : `비용 ${fmtMoney(F_UNBIND_COST)}`}</p>
          ${bound.length ? bound.map(g => gearHTML(g, { extra: `<button class="sellbtn gold" data-act="unbind" data-gid="${g.id}" ${S.wLevel < SING_UNLOCK_W || S.money < F_UNBIND_COST ? 'disabled' : ''}>귀속 해제</button>` })).join('') : '<div class="empty">귀속된 장비 없음</div>'}</div>`;
      })()}</div>`;
  },
  tab_hwan() {
    if (S.wLevel < SING_UNLOCK_W) return `<p class="dim">🔒 H사의 환 제조는 공방 Lv.${SING_UNLOCK_W}(A+급)부터 가능합니다.</p>`;
    const skill = S.hwanSkill || 0, open = skill >= HWAN_SKILL_REQ;
    const mats = OUTSKIRTS_MATS.filter(id => (S.stock[id] || 0) > 0);
    return `<div class="grid2">
      <div class="card"><h3>환 제조 <small>숙련 ${skill}/${HWAN_SKILL_REQ}</small></h3>
        <p class="dim">H사의 특이점, 환. 일반 환은 상처를 단번에 아물게 하지만, 몸이 영영 어긋날 수도 있다(25%·능력치 -5%).</p>
        <div class="row" style="justify-content:flex-start">
          <button data-act="hwanMake" data-k="hwan" ${S.money < HWAN_COST ? 'disabled' : ''}>환 제조 ${fmtMoney(HWAN_COST)}</button>
          <button data-act="hwanMake" data-k="nureum" ${S.money < NUREUM_COST ? 'disabled' : ''}>누름환 제조 ${fmtMoney(NUREUM_COST)}</button>
        </div>
        <p class="small">보유: 환 ${S.stock.hwan || 0} · 누름환 ${S.stock.nureum || 0} — 환은 [인원·장비] 탭에서 먹입니다. 누름환은 흑수화한 인원이 매일 아침 하나씩 자동으로 먹습니다(침식 -30).</p>
      </div>
      <div class="card"><h3>흑수환 ${open ? '' : '🔒'}</h3>
        ${!open ? `<p class="dim">환 제조 숙련이 ${HWAN_SKILL_REQ}에 이르면 열립니다. 외곽 아인족의 정수가 필요합니다 — 도시의 현장에서 아주 드물게, 외곽에서는 흔히 얻습니다.</p>` : `
        <p class="dim">외곽 아인족의 생물적 특성을 빌린 환. 인원당 한 번, 영구적으로 강해지고 그 지파(자·축·인·묘·사·오·미·유)의 흑수가 된다. 모든 지파는 파열을 다룬다. 대신 침식이 매일 오르고(+12, Q사 괴문자 장비를 지니면 +6), 누름환으로 누르지 못해 100%에 닿으면 이성을 잃고 광폭화해 적이 된다.</p>
        ${mats.length ? mats.map(id => `<div class="hrow"><b style="color:${BLACKWATER[id].color}">${BLACKWATER[id].name}</b> <small class="dim">${BLACKWATER[id].desc}${BLACKWATER[id].side ? ` · <span class="bad">부작용: ${BLACKWATER[id].side}</span>` : ''} · ${MATERIALS[id].name} ${S.stock[id]}개</small>
          <div class="row" style="justify-content:flex-start;margin:4px 0">${S.fixers.filter(f => !f.blackwater).map(f => `<button class="small" data-act="heuksu" data-fid="${f.id}" data-m="${id}" ${S.money < HEUKSU_COST ? 'disabled' : ''}>${esc(f.name)}에게 (${fmtMoney(HEUKSU_COST)})</button>`).join('') || '<span class="dim small">흑수환을 먹일 수 있는 인원이 없다</span>'}</div></div>`).join('') : '<p class="dim">외곽 아인족의 정수가 없다.</p>'}`}
        ${(S.berserk || []).length ? `<p class="bad small">광폭화해 떠난 이: ${S.berserk.map(b => esc(b.name)).join(', ')}</p>` : ''}
      </div></div>`;
  },
  tab_fingers() {
    return `<p class="dim">뒷골목의 정점, 다섯 손가락. 그들의 요구에 어떻게 응하느냐에 따라 관계가 바뀌고, 관계는 매일의 장사에 그대로 돌아옵니다.</p>
      <div class="fingers">${FINGER_KEYS.map(k => {
        const F = FINGERS[k], v = rel(k), lab = relLabel(v);
        const pct = (v + 100) / 2;
        return `<div class="card fcard" style="--fc:${F.color}">
          <h3>✋ ${F.name} <span class="rel rel-${lab}">${lab} ${v > 0 ? '+' : ''}${v}</span></h3>
          <div class="relbar"><div class="mid"></div><div class="pin" style="left:${pct}%"></div></div>
          <p class="dim">${F.nature}</p>
          <div class="good small">▲ ${F.friend}</div>
          <div class="bad small">▼ ${F.enemy}</div>
          ${F.mat ? `<div class="small">전용 재료: ${matChip(F.mat)}</div>` : ''}
        </div>`;
      }).join('')}</div>`;
  },
  tab_upgrade() {
    const W = S.wLevel, wl = WORKSHOP_LEVELS[W - 1], wn = WORKSHOP_LEVELS[W];
    const og = S.oGrade, ou = OFFICE_UP[og];
    const can = c => c && S.money >= c.money && S.fame >= c.fame;
    const zonesAt = g => { const zs = ZONES.filter(z => z.req >= g); return zs.length > 2 ? `${zs.length}곳 · 가장 깊은 곳 ${zs[zs.length - 1].name}` : zs.map(z => z.name).join(', '); };
    return `<div class="grid2">
      <div class="card"><h3>공방 — ${wl.name} (Lv.${W}) <span class="wclass">트레스 ${workshopClass()}급</span></h3>
        <ul class="eff"><li>망치질 성공률 보정 +${(W * 2.5).toFixed(1)}% · 대성공 +${(W * 1.2).toFixed(1)}%</li>
        <li>최대 단조 ${6 + W}회 · 합성재료 내구 ${2 + Math.ceil(W / 2)}</li>
        <li>트레스 등급 ${workshopClass()} · 특허 한도 ${patentMax()}건${W < 5 ? " · 마스터 이상 총기 제작 불가(S급 필요)" : ""}</li>
        <li>안전 재료 등급 ${W + 1}등급까지 · 시장 재료 ${Math.min(W, 5)}단계</li></ul>
        ${wn ? `<hr><p>다음: <b>${wn.name}</b> (Lv.${W + 1})</p>
        <p>비용 <b class="${S.money < wl.up.money ? 'bad' : 'good'}">${fmtMoney(wl.up.money)}</b> · 필요 명성 <b class="${S.fame < wl.up.fame ? 'bad' : 'good'}">${wl.up.fame}</b>${S.money < wl.up.money || S.fame < wl.up.fame ? ` <small class="bad">— ${[S.money < wl.up.money ? '자금 ' + fmtMoney(wl.up.money - S.money) : '', S.fame < wl.up.fame ? '명성 ' + (wl.up.fame - S.fame) : ''].filter(Boolean).join(' · ')} 부족</small>` : ''}</p>
        <button class="gold big" data-act="upWorkshop" ${can(wl.up) ? '' : 'disabled'}>공방 승급</button>` : '<p class="gold">최고 등급입니다.</p>'}
      </div>
      <div class="card"><h3>사무소 — ${og}급</h3>
        <ul class="eff"><li>정원 ${maxMembers()}명 · 고용 후보 최대 Lv.${1 + (9 - og) * 2}</li>
        <li>출동 가능: ${zonesAt(og)}</li></ul>
        ${ou ? `<hr><p>다음: <b>${og - 1}급</b></p>
        <p>비용 <b class="${S.money < ou.money ? 'bad' : 'good'}">${fmtMoney(ou.money)}</b> · 필요 명성 <b class="${S.fame < ou.fame ? 'bad' : 'good'}">${ou.fame}</b>${S.money < ou.money || S.fame < ou.fame ? ` <small class="bad">— ${[S.money < ou.money ? '자금 ' + fmtMoney(ou.money - S.money) : '', S.fame < ou.fame ? '명성 ' + (ou.fame - S.fame) : ''].filter(Boolean).join(' · ')} 부족</small>` : ''}</p>
        ${ZONES.find(z => z.req === og - 1) ? `<p class="good">새 지역 개방: ${ZONES.find(z => z.req === og - 1).name}</p>` : ''}
        <button class="gold big" data-act="upOffice" ${can(ou) ? '' : 'disabled'}>사무소 승급</button>` : '<p class="gold">1급 사무소 — 도시가 당신의 이름을 압니다.</p>'}
      </div></div>
      <p class="dim">명성은 소모되지 않는 조건치입니다. 의뢰 납품, 명품 제작, 보스 격파로 오릅니다.</p>
      <div class="card" style="margin-top:10px"><h3>협회 소속 ${S.assoc ? `— 현재: ${ASSOCIATIONS[S.assoc].name}` : ''}</h3>
        <p class="dim">협회의 지원이 없는 사무소는 신뢰받기 어렵습니다. 사무소 8급부터 소속할 수 있고, 소속은 ${fmtMoney(ASSOC_JOIN_COST)}, 변경은 ${fmtMoney(ASSOC_SWITCH_COST)}입니다.</p>
        <div class="assocs">${Object.entries(ASSOCIATIONS).map(([id, A]) => `<div class="assoc ${S.assoc === id ? 'on' : ''}">
          <b>${A.name}</b> <small class="dim">${A.role}</small><div class="perk">${A.perk}</div>
          ${S.assoc === id ? '<span class="good">✔ 소속 중</span>' : `<button data-act="joinAssoc" data-id="${id}" ${S.oGrade > 8 || S.money < (S.assoc ? ASSOC_SWITCH_COST : ASSOC_JOIN_COST) ? 'disabled' : ''}>${S.assoc ? '변경' : '소속'}</button>`}
        </div>`).join('')}</div></div>`;
  },
  tab_deploy() {
    const ar = S.autoRetreat !== false;
    return `<p class="dim">내일 출동할 지역을 선택하세요. 지역이 깊을수록 적이 강하고 좋은 재료가 나옵니다. 웨이브가 진행될수록 적이 강해지며, 6웨이브마다 보스가 출현합니다.</p>
      <div class="card" style="margin-bottom:10px"><b>자동 후퇴</b> — 체력 20% 미만이 되면 스스로 물러나 숨을 고르고, 체력 70%가 되면 다시 합류합니다. 다만 험한 지역일수록 물러서다 붙잡힐 수 있습니다.
        <button class="${ar ? 'gold' : ''}" data-act="toggleRetreat">${ar ? '✔ 켜짐' : '꺼짐 (위험)'}</button></div>
      <div class="zones">${ZONES.map((z, i) => {
        const lock = S.oGrade > z.req;
        const ens = z.enemies.map(k => ENEMIES[k].name).join(', ');
        return `<div class="card zone ${S.zone === i ? 'on' : ''} ${lock ? 'locked' : ''}" ${lock ? '' : `data-act="zone" data-i="${i}"`} style="--zc:${z.pal.win}">
          <h3>${z.name} <small>${z.req}급 이상</small></h3>
          <div class="dim">적: ${ens} · 보스: ${ENEMIES[z.boss].name}</div>
          <div class="chips">${(() => { const ids = Object.keys(z.drops), known = ids.filter(seenMat), unk = ids.length - known.length; return known.map(id => matChip(id)).join('') + (unk ? `<span class="mat unknown">??? ×${unk}종</span>` : ''); })()}</div>
          ${lock ? '<div class="warn">🔒 사무소 등급 부족</div>' : S.zone === i ? '<div class="good">✔ 선택됨</div>' : ''}
        </div>`;
      }).join('')}</div>`;
  },

  // 마스터 등급 이상: 이름 짓기 (색이 들어가면 특색과 이어진다)
  showNameGear(gid, fresh) {
    const g = findGear(Number(gid)); if (!g) return;
    const R = RARITIES[g.rarity];
    const cur = g.named ? g.epithet.replace(/[「」]/g, '') : '';
    this.showModal(`<h2 style="color:${R.color}">${fresh ? R.name + '! ' : ''}이름 짓기</h2>
      <p>${esc(g.name)} +${g.q} — 마스터 등급 이상의 장비에는 이름을 붙일 수 있습니다.</p>
      <p class="dim small"><i>이름에 깃든 빛깔은, 언젠가 이 장비를 든 자의 이름이 될지도 모른다.</i></p>
      <input id="inGearName" maxlength="12" value="${esc(cur)}" placeholder="이름을 지어 주세요" style="width:100%;margin:6px 0">
      <div class="row"><button data-act="closeModal">나중에</button><button class="gold" data-act="nameGear" data-gid="${g.id}">이름 붙이기</button></div>`);
    const inp = document.getElementById('inGearName'); setTimeout(() => inp.focus(), 50);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ACT.nameGear({ gid: String(g.id) }); } });   // Enter로 바로 붙이기 (한글 조합 중에는 무시)
  },
  // 도움말: 조작과 꼭 알아야 할 규칙만. 수치·조합·숨은 콘텐츠는 직접 알아내도록 적지 않는다
  showHelp() {
    this.showModal(`<h2>게임 방법</h2>
      <div class="help">
      <h3>하루</h3>
      <p><b>아침</b> 재료가 들어오고 급여가 나갑니다 → <b>개점</b> 장비를 만들고, 해결사들은 현장에서 사냥합니다 → <b>마감</b> 장비 배분·고용·시장·승급·출동 지역을 정하고 다음 날로.</p>
      <h3>단조</h3>
      <p>재료를 골라 <b>합성</b>하고, 쇠가 <b>적열</b>일 때 모루를 두드리세요. 식으면 <b>가열</b> — 하지만 너무 자주 달구면 쇠가 물러집니다.<br>
      두드릴수록 강해지지만 부서질 위험도 커집니다. 멈출 때를 정하는 것도 대장장이의 일입니다.<br>
      어떤 재료가 무엇이 되는지는 직접 섞어 보며 알아내세요.</p>
      <h3>장비</h3>
      <p>장비에는 등급이 있고, 싸울수록 손에 익어 다시 두드릴(<b>개량</b>) 기회가 생깁니다. 개량한 장비는 그 해결사의 것이 됩니다.</p>
      <h3>현장</h3>
      <p>해결사들은 알아서 싸우고 재료를 모읍니다. 위험하면 물러났다 돌아오지만, 쓰러지면 죽을 수도 있습니다. 모은 재료는 다음 날 들어옵니다.</p>
      <h3>지켜야 할 것</h3>
      <p><b>둥지의 금기</b> — 구마다 그곳을 다스리는 날개가 정한 규칙이 있습니다. 어기면 금기 사냥꾼이 옵니다.<br>
      <b>도시세</b> — 정해진 날마다 세금을 내야 합니다. 거듭 못 내면 머리가 움직입니다.<br>
      <b>도시의 금기</b> — 만들어서는 안 되는 물건이 있습니다. 만들면 머리는 반드시 압니다.<br>
      <b>밤</b> — 뒷골목의 밤에는 사무소가 습격당할 수 있습니다. 야간 경계를 세우세요.</p>
      <h3>목표</h3>
      <p>공방과 사무소의 이름을 도시에 떨치세요.</p>
      <p class="dim small"><span class="pc-only">⌨ 1~5 탭 이동 · Space 두드리기 · R 가열 · P 일시정지 · Enter 개점/다음 날 · Esc 창 닫기<br></span>
      💾 자동 저장 · 메뉴에서 세이브 코드를 내보내거나 불러올 수 있습니다.</p>
      </div>
      <button class="big" data-act="closeModal">닫기</button>`);
  },
  showMenu() {
    this.showModal(`<h2>메뉴</h2>
      <p class="cloudline" id="cloudLine">${Cloud.label()}</p>
      <div class="menu">
        <button data-act="saveNow">지금 저장</button>
        <button data-act="exportSave">세이브 코드 내보내기</button>
        <button data-act="importForm">세이브 코드 불러오기</button>
        <button data-act="mute">${S && S.muted ? '🔇 효과음 켜기' : '🔊 효과음 끄기'}</button>
        <button data-act="toTitle">타이틀로</button>
        <button class="${this.confirmKey === 'reset' ? 'danger' : ''}" data-act="resetSave">${this.confirmKey === 'reset' ? '정말 모든 데이터를 삭제?' : '데이터 초기화'}</button>
      </div>
      <div id="menuExtra"></div>
      <button class="big" data-act="closeModal">닫기</button>`);
  },
};
