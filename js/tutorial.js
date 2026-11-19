'use strict';
// ============================================================
//  튜토리얼 · 기능 해금
//  새 게임에서만: 기본 진행을 한 단계씩 짚어 주고, 나머지 기능은 필요해지는 순간 열면서 짧게 알려 준다.
//  오른쪽 위 [건너뛰기]로 지금 안내를, [튜토리얼 끄기]로 앞으로의 안내를 모두 넘길 수 있다.
//  예전 세이브(S.tut 없음)는 안내 없이 모든 기능이 열려 있다.
// ============================================================

// 기능이 열려 있는가 — S.feat가 없으면(예전 세이브·원정 분점) 모두 열림
function feat(k) { return !S || !S.feat ? true : !!S.feat[k]; }
function unlockFeat(k) { if (S && S.feat && !S.feat[k]) { S.feat[k] = true; return true; } return false; }

// 단계: sel(가리킬 화면 요소, 없으면 가운데) · t(문구) · view(먼저 바꿀 화면) · tab(마감 탭)
const TUTS = {
  intro: [
    { t: '「{w}」 공방의 첫날입니다. 장비를 만들어 팔고, 해결사들을 현장에 내보내 재료를 모으는 것이 하루의 흐름입니다.' },
    { sel: '.morning .taboo', t: '공방이 자리 잡은 구에는 그 구를 다스리는 날개의 금기가 있습니다. 어기면 금기 사냥꾼이 찾아옵니다.' },
    { sel: '[data-act="openShop"]', t: '준비가 되면 가게 문을 엽니다. 문을 열면 시간이 흐르고, 해결사들은 알아서 현장으로 나갑니다.' },
  ],
  forge1: [
    { view: 'forge', sel: '#stockGrid', t: '재료함입니다. 먼저 주재료를 고르세요 — 금속은 무기, 천은 방어구가 됩니다.' },
    { view: 'forge', sel: '.slots', t: '주재료에 다른 재료를 더하면 다른 장비가 됩니다. 무엇이 무엇이 되는지는 직접 섞어 보며 알아내세요.' },
    { view: 'forge', sel: '[data-act="synth"]', t: '재료를 골랐다면 합성합니다.' },
  ],
  forge2: [
    { view: 'forge', sel: '#timingWrap', t: '쇠의 열입니다. 붉게 달아오른 「적열」일 때 두드리면 잘 됩니다.' },
    { view: 'forge', sel: '[data-act="strike"]', t: '모루를 누르거나 이 버튼(Space)으로 두드립니다. 두드릴수록 강해지지만, 부서질 위험도 커집니다.' },
    { view: 'forge', sel: '[data-act="reheat"]', t: '식으면 가열(R)하세요. 너무 자주 달구면 쇠가 물러집니다.' },
    { view: 'forge', sel: '.finalstats', t: '지금 완성하면 갖게 될 능력치입니다. 두드릴 때마다 바뀝니다.' },
    { view: 'forge', sel: '[data-act="finish"]', t: '적당하다 싶을 때 완성하세요. 멈출 때를 정하는 것도 대장장이의 일입니다.' },
  ],
  forge3: [
    { sel: '[data-v="orders"]', t: '의뢰 탭에서 조건에 맞는 장비를 납품하면 돈과 명성을 얻습니다.' },
    { sel: '[data-v="hunt"]', t: '현장에서는 해결사들이 알아서 싸우고 재료를 모읍니다. 모은 재료는 다음 날 아침에 들어옵니다.' },
    { sel: '#btnClose', t: '18시가 되면 가게가 닫힙니다. 일찍 닫을 수도 있습니다.' },
  ],
  close1: [
    { sel: '.ctabs', t: '마감입니다. 하루를 정리하는 곳입니다.' },
    { tab: 'roster', sel: '[data-tab="roster"]', t: '만든 장비를 해결사에게 쥐여 주세요. 밤에 습격이 올 수 있으니 야간 경계를 세울 수도 있습니다.' },
    { tab: 'market', sel: '[data-tab="market"]', t: '시장에서 재료를 사고팔 수 있습니다.' },
    { tab: 'upgrade', sel: '[data-tab="upgrade"]', t: '돈과 명성이 모이면 공방과 사무소의 등급을 올립니다. 등급이 오르면 더 좋은 재료와 의뢰, 더 깊은 현장이 열립니다.' },
    { tab: 'deploy', sel: '[data-tab="deploy"]', t: '해결사를 어느 현장에 보낼지 고릅니다.' },
    { tab: 'report', sel: '[data-act="nextDay"]', t: '준비가 끝나면 다음 날로. 이제부터는 직접 꾸려 가세요.' },
  ],
  // ---- 필요해질 때 열리는 기능 ----
  enhance: [{ view: 'forge', sel: '[data-m="enhance"]', t: '개량이 열렸습니다. 전투로 경험치가 가득 찬 장비를 다시 두드려 더 강하게 만들 수 있습니다. 개량한 장비는 그 해결사의 것이 됩니다.' }],
  fingers: [{ t: '뒷골목의 정점, 다섯 손가락이 공방에 눈길을 주기 시작했습니다. 그들의 요구에 어떻게 응하느냐에 따라 관계가 바뀝니다. 마감의 [관계] 탭에서 볼 수 있습니다.' }],
  assoc: [{ tab: 'upgrade', sel: '[data-tab="upgrade"]', t: '사무소가 8급이 되어 협회에 소속할 수 있습니다. [승급] 탭 아래에서 고르세요.' }],
  sing: [{ view: 'forge', sel: '.slots', t: '공방이 커져 날개의 특이점 기술을 쓸 수 있게 되었습니다. 합성할 때 함께 고를 수 있습니다.' }],
  hwan: [{ tab: 'hwan', sel: '[data-tab="hwan"]', t: 'H사의 환을 다룰 수 있게 되었습니다.' }],
  workshop: [{ tab: 'workshop', sel: '[data-tab="workshop"]', t: '공방 시설을 들일 수 있습니다. 화로·모루 같은 시설이 단조를 직접 좋게 만듭니다.' }],
  rune: [{ tab: 'workshop', sel: '[data-tab="workshop"]', t: '각인 인두를 얻었습니다(암시장에서도 가끔 팝니다). [시설] 탭에서 장비의 각인을 다시 새길 수 있습니다 — 마음에 드는 각인은 눌러서 잠가 두세요.' }],
  expedition: [{ tab: 'expedition', sel: '[data-tab="expedition"]', t: '원정이 열렸습니다. 다른 구에 분점을 내고 해결사 한 명과 다시 시작할 수 있습니다. 각 구 둥지의 주인을 쓰러뜨리면 인장을 얻습니다.' }],
  ego: [{ view: 'forge', sel: '#stockGrid', t: 'E.G.O 추출물을 손에 넣었습니다. 무기를 합성할 때 함께 녹여 넣을 수 있습니다.' }],
  auction: [{ sel: '.auction', t: '경매장이 열렸습니다! 몇 초 안에 결판이 납니다. 입찰을 누를 때마다 값이 오르고, 누가 부르면 시간이 조금 늘어납니다. 이기면 내일 아침 들어옵니다.' }],
  blackmarket: [{ tab: 'blackmarket', sel: '[data-tab="blackmarket"]', t: '오늘 밤 뒷골목에 암시장 판이 섰습니다. 일반 시장에는 없는 고급재료를 팝니다 — 오늘 마감에만 열리고, 수량도 한정입니다.' }],
  auctionTab: [{ tab: 'auction', sel: '[data-tab="auction"]', t: '[경매] 탭에서 다음 경매가 언제 열리는지, 무엇이 나오는지 미리 볼 수 있습니다. 돈을 모아 두세요.' }],
  ampule: [{ sel: '.ampule', t: 'K사와 가까워져 재생 앰플을 계약할 수 있습니다. 그날 한 번, 누군가의 죽음을 막아 줍니다. 값은 어마어마합니다.' }],
  remnant: [
    { tab: 'restore', sel: '[data-tab="restore"]', t: '개화한 공방은 부서진 것의 잔흔을 되살릴 수 있습니다. [복구] 탭에서 볼 수 있습니다.' },
    { tab: 'restore', sel: '.remnants', t: '같은 등급대의 파편과 비용을 내면 복구할 수 있습니다 — 개량하다 부서진 장비는 개량 전 모습으로, 새로 만들다 부서진 것은 넣었던 재료로 돌아갑니다.' },
  ],
  shopBloom: [{ tab: 'upgrade', sel: '[data-tab="upgrade"]', t: '공방이 가장 높은 곳에 올랐습니다. [승급] 탭에서 공방을 개화시킬 수 있습니다 — 공방이 당신의 E.G.O가 됩니다.' }],
  ward: [{ view: 'forge', sel: '[data-act="ward"]', t: '불완전하게 피어난 공방은 작업물 하나에 한 번, 값을 치르면 파괴를 막아 줍니다. 내구로 막는 것과 합쳐 최대 두 번 — 내구로 막을지는 내구 칸 아래에서 고를 수 있습니다.' }],
  manifest: [{ t: '누군가 개화 E.G.O를 발현했습니다 — 빌려 온 힘이 아니라, 스스로의 자아입니다. 그 장비는 이제 그 사람만의 것이고, 싸우는 방식이 바뀌었습니다.' }],
};

const Tut = {
  q: [], cur: null, i: 0, done: null,
  on() { return !!(S && S.tut && !S.tut.off && !(typeof window !== 'undefined' && window.BOT_MUTE)); },
  seen(k) { return !S || !S.tut || !!(S.tut.done || {})[k]; },
  // 아직 안 본 안내를 줄 세운다
  want(k) { if (!this.on() || this.seen(k) || this.q.includes(k) || this.cur === k) return false; this.q.push(k); return true; },
  // moment: morning · open · blank · done · close — 그 순간에 맞는 안내를 꺼낸다
  check(moment) {
    if (!this.on()) return;
    const W = S.wLevel;
    if (moment === 'morning') {
      this.want('intro');
      if (S.finger && unlockFeat('fingers')) this.want('fingers');
      if ((S.kRel || 0) >= K_REL_NEED) this.want('ampule');
    }
    if (moment === 'open') {
      if (!this.seen('intro') || this.q.includes('intro')) return;
      this.want('forge1');
      if (feat('enhance') && S.feat && S.feat.enhance) this.want('enhance');
      if (W >= SING_UNLOCK_W) this.want('sing');
      if (Object.keys(S.stock).some(k => MATERIALS[k] && MATERIALS[k].cat === 'ego' && S.stock[k] > 0)) this.want('ego');
    }
    if (moment === 'blank') { this.want('forge2'); if (wardOpen()) this.want('ward'); }
    if (moment === 'done') this.want('forge3');
    if (moment === 'close') {
      this.want('close1');
      if (S.oGrade <= 8) this.want('assoc');
      if (W >= SING_UNLOCK_W) { this.want('hwan'); this.want('workshop'); }
      if ((S.stock.rune || 0) > 0 && W >= 4) this.want('rune');
      if (S.auctionNext && S.feat && S.feat.auction) this.want('auctionTab');
      if (BlackMarket.open()) this.want('blackmarket');
      if (shopBloomed() && (S.remnants || []).length) this.want('remnant');
      if (W >= 5 && !S.home) this.want('expedition');
      if (W >= 5 && !S.home && !S.bloomed) this.want('shopBloom');
      if (S.fixers.some(f => [f.weapon, f.armor].some(g => g && g.manifest))) this.want('manifest');
    }
    this.next();
  },
  next() {
    if (this.cur || !this.q.length) return;
    if (Auction.on && this.q[0] !== 'auction') { setTimeout(() => this.next(), 500); return; }   // 경매가 끝나면
    this.cur = this.q.shift(); this.i = 0;
    this.wasPaused = Game.paused; if (S.phase === 'open') Game.paused = true;
    this.show();
  },
  // 한 번만 보여 주고 끝나면 이어서 할 일 (경매장처럼 안내 뒤에 시작해야 하는 것)
  run(k, then) {
    if (!this.on() || this.seen(k)) return then && then();
    this.after = then; this.q = this.q.filter(x => x !== k); this.q.unshift(k);
    if (this.cur) { const c = this.cur; this.cur = null; this.q.splice(1, 0, c); }
    this.next();
  },
  show() {
    const steps = TUTS[this.cur], st = steps[this.i];
    if (st.view && UI.view !== st.view && S.phase === 'open') UI.setView(st.view);
    if (st.tab && S.phase === 'close' && UI.closeTab !== st.tab) { UI.closeTab = st.tab; UI.renderClose(); }
    let layer = document.getElementById('tutLayer');
    if (!layer) { layer = document.createElement('div'); layer.id = 'tutLayer'; document.body.appendChild(layer); }
    const el = st.sel ? [...document.querySelectorAll(st.sel)].find(x => x.offsetParent !== null) : null;
    if (st.sel && !el && (this.retry = (this.retry || 0) + 1) <= 6) { UI.flush && UI.flush(); return setTimeout(() => this.show(), 120); }   // 화면이 그려질 때까지 잠깐 기다린다
    this.retry = 0;
    const last = this.i >= steps.length - 1;
    const text = (typeof st.t === 'function' ? st.t() : st.t).replace('{w}', esc(S.workshopName));
    layer.innerHTML = `<div class="tut-shade"></div>${el ? '<div class="tut-hi"></div>' : ''}
      <div class="tut-skip"><button data-act="tutSkip">건너뛰기</button><button data-act="tutOff">튜토리얼 끄기</button></div>
      <div class="tut-box"><div class="tut-n">${this.i + 1} / ${steps.length}</div><p>${text}</p><button class="gold" data-act="tutNext">${last ? '확인' : '다음'}</button></div>`;
    this.place(el);
  },
  place(el) {
    const layer = document.getElementById('tutLayer'); if (!layer) return;
    const box = layer.querySelector('.tut-box'), hi = layer.querySelector('.tut-hi');
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!el || !hi) { box.style.left = Math.max(8, (vw - box.offsetWidth) / 2) + 'px'; box.style.top = Math.max(8, (vh - box.offsetHeight) / 2) + 'px'; return; }
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(), pad = 4;
    Object.assign(hi.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const bw = box.offsetWidth, bh = box.offsetHeight;
    let top = r.bottom + 10; if (top + bh > vh - 8) top = r.top - bh - 10; if (top < 8) top = Math.min(vh - bh - 8, r.bottom + 10);
    box.style.left = Math.max(8, Math.min(vw - bw - 8, r.left + r.width / 2 - bw / 2)) + 'px'; box.style.top = Math.max(8, top) + 'px';
  },
  advance() {
    if (!this.cur) return;
    if (++this.i < TUTS[this.cur].length) return this.show();
    this.finish();
  },
  finish() {
    if (this.cur) { S.tut.done = S.tut.done || {}; S.tut.done[this.cur] = 1; }
    this.cur = null; this.close(); save();
    if (this.after) { const a = this.after; this.after = null; a(); }
    if (this.q.length) this.next();
  },
  close() {
    const layer = document.getElementById('tutLayer'); if (layer) layer.remove();
    if (S && S.phase === 'open' && !this.q.length) Game.paused = !!this.wasPaused;
  },
  skipAll() { S.tut.off = true; this.q = []; this.finish(); },
};
window.addEventListener('resize', () => { if (Tut.cur) Tut.show(); });

Object.assign(ACT, {
  tutNext() { Tut.advance(); },
  tutSkip() { Tut.finish(); },
  tutOff() { Tut.skipAll(); },
});
