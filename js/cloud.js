'use strict';
// ============================================================
//  클라우드 세이브 — claude.ai 링크에서 열었을 때만 동작
//  계정별 비공개 경로 data/users/<id>/save 에 세이브 1개를 보관.
//  로컬(Live Server 등)에서는 조용히 꺼지고 localStorage만 사용.
// ============================================================
const Cloud = {
  status: 'off',      // off | loading | on | local(권한 없음) | error(일시 오류)
  ref: null, remote: null, lastPushed: '', lastSync: 0,
  timer: null, writing: false, again: false,

  async init() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    this.status = 'loading';
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const uid = user ? await user.id() : null;
      if (!db || !uid) { this.status = 'off'; return this.changed(); }
      this.ref = db.doc('data/users/' + uid + '/save');
      const snap = await Promise.race([
        this.ref.get(),
        new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 10000)),
      ]);
      if (snap.exists) {
        const d = snap.data();
        try { this.remote = JSON.parse(d.json); this.lastPushed = d.json; } catch (e) { this.remote = null; }
      }
      this.status = 'on';
      this.lastSync = Date.now();
      this.watch();
    } catch (e) {
      this.status = this.ref ? 'error' : 'off';
    }
    this.changed();
  },
  changed() { if (typeof UI !== 'undefined') UI.cloudChanged(); },

  // 다른 기기에서 더 최근에 저장하면 덮어쓰지 않고 알려준다
  stale: false,
  watch() {
    this.ref.onSnapshot(snap => {
      if (!snap.exists || snap.metadata.hasPendingWrites || snap.metadata.fromCache) return;
      const d = snap.data();
      if (d.json === this.lastPushed) return;
      let r; try { r = JSON.parse(d.json); } catch (e) { return; }
      this.remote = r;
      if (S && (r.savedAt || 0) > (S.savedAt || 0)) {
        this.stale = true;
        if (typeof UI !== 'undefined') UI.showStale(r);
      } else this.changed();
    }, () => { /* 구독 종료: 저장은 계속 시도 */ });
  },

  // save()마다 호출 — 몰아서 8초에 한 번만 기록
  schedule() {
    if (this.status !== 'on' || this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.push(); }, 8000);
  },
  async push() {
    if (this.status !== 'on' || !S || this.stale) return;
    if (this.writing) { this.again = true; return; }
    let json = JSON.stringify(S);
    if (json.length > 240000) {           // 문서 한도(256KiB) 보호: 기록을 줄여서 저장
      const c = JSON.parse(json); c.log = (c.log || []).slice(0, 15); json = JSON.stringify(c);
    }
    if (json === this.lastPushed) return;
    this.writing = true;
    try {
      await this.ref.set({ json, savedAt: S.savedAt || Date.now(), day: S.day, workshop: S.workshopName });
      this.lastPushed = json;
      this.remote = JSON.parse(json);
      this.lastSync = Date.now();
    } catch (e) {
      // 쓰기 권한이 없는 사람(공유받은 친구 등)은 오류가 아니라 기기 저장으로 조용히 전환
      if (e && (e.code === 'not_granted' || e.code === 'invalid_argument' || e.code === 'revoked')) this.status = 'local';
      else this.status = 'error';
      this.changed();
    }
    this.writing = false;
    if (this.again) { this.again = false; this.push(); }
  },
  async clear() {
    this.remote = null; this.lastPushed = '';
    if (this.status === 'on') { try { await this.ref.delete(); } catch (e) { /* 무시 */ } }
  },
  label() {
    if (this.status === 'on') {
      const t = this.lastSync ? new Date(this.lastSync).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-';
      return `☁ 클라우드 저장 켜짐 · 마지막 동기화 ${t}`;
    }
    if (this.status === 'loading') return '☁ 클라우드 연결 중…';
    if (this.status === 'error') return '☁ 클라우드 저장이 잠시 안 됩니다 — 이 기기에는 저장 중';
    return '💾 이 기기에 저장됩니다 · 다른 기기로 옮길 땐 메뉴의 세이브 코드를 쓰세요';
  },
};

// 이 기기 세이브와 클라우드 세이브 중 더 최근 것
function bestSave() {
  const local = loadSave(), remote = Cloud.remote && Cloud.remote.v === 1 ? Cloud.remote : null;
  if (!local) return remote;
  if (!remote) return local;
  return (remote.savedAt || 0) > (local.savedAt || 0) ? remote : local;
}
