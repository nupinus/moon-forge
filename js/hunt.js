'use strict';
// ============================================================
//  현장 — 횡스크롤 자동 사냥
// ============================================================
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// 지역 배경 그림: assets/bg/z<번호>.png (도시) · o<번호>.png (외곽). 없으면 그려 둔 실루엣 배경.
// 환상체 그림: assets/abno/<키>.png — 위험 등급이 높을수록 크게
const ABNO_ART_H = { ZAYIN: 44, TETH: 48, HE: 56, WAW: 64, ALEPH: 76 };
const abnoArtCache = {};
function abnoArt(k) {
  if (typeof ABNO_ART === 'undefined' || !ABNO_ART.includes(k)) return null;
  let e = abnoArtCache[k];
  if (!e) { e = abnoArtCache[k] = { img: new Image(), ok: false }; e.img.onload = () => { e.ok = true; }; e.img.src = 'assets/abno/' + k + '.png'; }
  return e.ok ? e.img : null;
}
const zoneBgCache = {};
function zoneBgImage(i) {
  const z = ZONES[i];
  if (z && z.bg === null) return null;   // 아직 그림이 없는 지역은 팔레트로 그린다
  const key = z && z.bg ? z.bg : (S && S.outskirts ? 'o' : 'z') + i;
  let e = zoneBgCache[key];
  if (!e) { e = zoneBgCache[key] = { img: new Image(), ok: false }; e.img.onload = () => { e.ok = true; }; e.img.src = 'assets/bg/' + key + '.png'; }
  return e.ok ? e.img : null;
}
const Hunt = {
  W: 384, H: 180, G: 150,
  active: false, units: [], enemies: [], floaters: [], tracers: [],
  camX: 0, wave: 0, spawnCd: 2, zone: 0, ended: '', announce: null, t: 0,

  start() {
    this.units = []; this.enemies = []; this.floaters = []; this.tracers = [];
    this.camX = 0; this.wave = 0; this.spawnCd = 2; this.zone = S.zone; this.ended = ''; this.announce = null; this.brotherUsed = false;
    this.radio = []; this.radioDirty = true;
    this.wave = S.huntWave || 0;   // 새로고침해도 웨이브 진행은 이어진다
    if (S.huntEnded) { this.active = false; this.ended = S.huntEnded; UI.mark('partyStruct'); return; }   // 철수·전원 이탈한 날은 다시 나가지 않는다
    const ids = S.party.filter(id => { const f = getFixer(id); return f && isAvailable(f); });
    ids.slice(0, MAX_PARTY).forEach((id, i) => this.units.push(this.makeUnit(getFixer(id), i)));
    this.active = this.units.length > 0;
    if (!this.active) this.ended = '출동 인원 없음';
    else this.announce = { text: ZONES[this.zone].name, life: 2.5 };
    UI.mark('partyStruct');
  },
  makeUnit(f, i) {
    const st = unitStats(f);
    const hp = f.curHp > 0 ? Math.min(f.curHp, st.maxHp) : st.maxHp;
    // 세 줄(레인)로 나란히 선다 — 같은 줄의 앞사람만 길을 막고, 뒷줄은 앞사람 너머로 찌른다
    const lane = i % 3;
    return Object.assign({ f, lane, x: 90 - Math.floor(i / 3) * 22 - lane * 9, y: this.G + [0, -11, 10][lane], hp, cd: Math.random() * 0.6, walk: 0,
      atkAnim: 0, flash: 0, dead: false, moving: false }, st);
  },
  refreshUnit(u) {
    const st = unitStats(u.f);
    const ratio = u.hp / u.maxHp;
    Object.assign(u, st);
    this.applyHeishou(u);
    u.hp = Math.max(1, Math.round(st.maxHp * ratio));
  },
  syncHp() { for (const u of this.units) if (!u.dead || u.withdrawn) u.f.curHp = Math.max(1, Math.round(u.hp)); },
  stop(reason) {
    if (this.active) { this.active = false; this.ended = reason || '귀환'; if (S && !this.special) S.huntEnded = this.ended; }
    this.syncHp();
  },
  retreat() {
    if (!this.active || this.special) return;
    { const why = tabooBreach('retreat'); if (why) Game.breakDistrictTaboo(why); }
    this.stop('철수 완료 — 오늘은 더 이상 출동하지 않습니다');
    addLog('현장 인원이 철수했다.', '');
  },

  makeEnemy(key, x, mult) {
    const d = ENEMIES[key];
    return { key, d, name: d.name, x, y: this.G - Math.floor(Math.random() * 6),
      hp: Math.round(d.hp * mult * (this.special ? 1 : 1.5)), maxHp: Math.round(d.hp * mult * (this.special ? 1 : 1.5)), atk: d.atk * mult, def: d.def * (0.5 + mult * 0.5),   // 평소 적 체력 1.3배: 세 줄로 함께 싸우는 만큼
      interval: d.interval, range: d.range, speed: d.speed, cd: 0.8 + Math.random(), walk: 0, atkAnim: 0, flash: 0,
      dead: false, deadT: 0, boss: !!d.boss, scale: d.scale || 1, ab: {},
      st: { bleed: 0, burn: 0, rupture: 0, sinking: 0, stun: 0 }, burnT: 0, sinkT: 0 };
  },
  spawnWave() {
    const z = ZONES[this.zone];
    this.wave++;
    if (!this.special) S.huntWave = this.wave;
    const mult = 1 + (this.wave - 1) * 0.035;
    const bx = this.camX + this.W + 20;
    if (this.wave % 6 === 0) {
      const e = this.makeEnemy(z.boss, bx + 10, mult);
      this.enemies.push(e);
      this.announce = { text: `⚠ ${e.name} 출현`, life: 2.2, color: '#ff5a5a' };
      UI.huntAlert(`보스 「${e.name}」 출현!`, 'bad');
      this.radioLog(`⚠ 보스 「${e.name}」 출현!`, 'bad');
      if (this.wave > 6) this.enemies.push(this.makeEnemy(pick(z.enemies), bx + 50, mult));
    } else if (this.wave >= 2 && (S.berserk || []).length && Math.random() < 0.12) {
      const b = pick(S.berserk);
      const e = this.makeEnemy('berserk', bx + 10, mult * (1 + b.lv * 0.12));
      e.name = `광폭화한 ${BLACKWATER[b.bw].name} ${b.name}`; e.berserkOf = b;
      this.enemies.push(e);
      this.announce = { text: `⚠ ${e.name}`, life: 2.6, color: BLACKWATER[b.bw].color };
      UI.huntAlert(`${e.name}이(가) 나타났다`, 'bad');
    } else if (this.wave >= 2 && Math.random() < ABNO_CHANCE * (!S.outskirts && district().wing === 'L사' ? 2 : 1)) {
      // 환상체 출현 (매우 드묾)
      const lv = S.outskirts ? 4 : zoneLv(this.zone);
      const pool = ABNO_KEYS.filter(k => lv >= ABNO_RISK[ENEMIES[k].risk].minLv);   // 깊은 곳일수록 위험한 환상체
      const key = weightedPick(Object.fromEntries(pool.map(k => [k, ABNO_RISK[ENEMIES[k].risk].w])));
      const e = this.makeEnemy(key, bx + 10, mult);
      this.enemies.push(e);
      if (ABNO_AB[e.d.ab] && ABNO_AB[e.d.ab].spawn) ABNO_AB[e.d.ab].spawn(e, this);
      this.radioLog(`고유 능력 — ${ABNO_AB[e.d.ab].name}: ${ABNO_AB[e.d.ab].desc}`, 'warn');
      this.announce = { text: `⚠ 환상체 — ${e.name} (${e.d.risk})`, life: 3, color: '#ff4a6a' };
      UI.huntAlert(`환상체 출현: ${e.name} (${e.d.risk})`, 'bad');
      addLog(`현장에 환상체 「${e.name}」이(가) 나타났다.`, 'bad');
      this.radioLog(`⚠ 환상체 「${e.name}」 출현!`, 'bad');
    } else if (this.wave >= 2 && this.fingerAmbush(bx, mult)) {
      // 적대 손가락의 매복
    } else if (S.middleHunt && this.wave === 3) {
      S.middleHunt = false;
      const e = this.makeEnemy(z.boss, bx + 10, mult * 1.3);
      e.name = '중지 행동대원'; e.finger = true; e.boss = true;
      this.enemies.push(e);
      this.announce = { text: '⚠ 중지의 표적 출현', life: 2.2, color: '#e04a4a' };
      UI.huntAlert('중지의 표적 출현!', 'bad');
    } else {
      const loud = this.t - (this.lastShot || -99) < 12;
      const n = Math.min(6, randInt(z.waveSize[0], z.waveSize[1] + Math.floor(this.wave / 4)) + (loud ? 1 : 0));
      for (let i = 0; i < n; i++) this.enemies.push(this.makeEnemy(pick(z.enemies), bx + i * 28, mult));
    }
    // 도시의 금기(소음기 금지): 총성은 반드시 크게 울려 적을 더 빨리 부른다
    this.spawnCd = this.t - (this.lastShot || -99) < 12 ? 1.3 : 2.5;   // 최근 총성
  },

  fingerAmbush(bx, mult) {
    const hostile = FINGER_KEYS.filter(k => FINGERS[k].soldier && rel(k) <= (k === 'middle' ? -30 : -40));
    if (!hostile.length || Math.random() > 0.15) return false;
    const k = pick(hostile), F = FINGERS[k];
    const zm = mult * (1 + zoneLv(this.zone) * 0.9);
    const n = randInt(2, 3);
    for (let i = 0; i < n; i++) { const e = this.makeEnemy(F.soldier, bx + i * 26, zm); e.fingerOf = k; this.enemies.push(e); }
    this.announce = { text: `⚠ ${F.name}의 매복`, life: 2.2, color: F.color };
    UI.huntAlert(`${F.name}의 매복!`, 'bad');
    addLog(`${F.name} 조직원들이 현장에 매복해 있었다.`, 'bad');
    this.radioLog(`⚠ ${F.name}의 매복!`, 'bad');
    return true;
  },
  // ---------- 흑수화 ----------
  transform(u) {
    if (!u.bw || u.transformUsed || u.dead) return false;
    u.transformUsed = true; u.transformed = HEISHOU_TIME;
    this.applyHeishou(u);
    u.f.erosion = Math.min(100, (u.f.erosion || 0) + 6);
    const B = BLACKWATER[u.bw];
    this.float(u.x, u.y - 50, '흑수화 — ' + B.name.replace('흑수 - ', ''), B.color, true);
    addLog(`${u.f.name}이(가) 흑수화했다 — ${B.name}. 침식 ${u.f.erosion}%`, 'warn');
    UI.huntAlert(`${u.f.name} 흑수화 (${B.name})`);
    Sound.great(); UI.mark('partyStruct');
    return true;
  },
  // 변신 중 배율: 공격 1.12배 · 방어 1.1배 · 공속 조금 증가 (힘의 중심은 장비)
  applyHeishou(u) {
    if (!(u.transformed > 0)) return;
    u.atk = +(u.atk * 1.12).toFixed(1); u.def = +(u.def * 1.1).toFixed(1); u.interval = +(u.interval * 0.93).toFixed(2);
    if (u.bw === 'hb_myo') u.speed *= 1.2;
  },
  // W사 세트 효과: 순식간에 적의 사방으로 차원을 이동하며 연속으로 벤다
  dimensionSlash(u, e, dmg) {
    this.float(e.x, e.y - 58, '차원 베기', SINGULARITIES.w.color, true);
    const pts = [[-30, -24], [30, -24], [-30, 4], [30, 4]];
    for (const [dx, dy] of pts) {
      if (e.dead) break;
      this.tracers.push({ x1: e.x + dx, y1: e.y - 14 + dy, x2: e.x - dx * 0.5, y2: e.y - 14 - dy * 0.5, life: 0.14, c: SINGULARITIES.w.color });
      this.hurtEnemy(e, Math.max(1, dmg * 0.6 - e.def * 0.6), SINGULARITIES.w.color, true);
    }
  },
  // 금기품을 만든 순간: 머리가 발톱을 보낸다. 공방에 있는 모든 해결사가 맞선다.
  startClaw(gear) {
    this.special = true; this.stage = 'claw';
    this.enemies = []; this.floaters = []; this.tracers = []; this.camX = 0; this.wave = 0; this.ended = ''; this.brotherUsed = true;
    const fs = S.fixers.filter(f => isAvailable(f)).sort((a, b) => unitStats(b).atk - unitStats(a).atk);
    if (gear && gear.kind === 'weapon' && fs[0] && !(fs[0].weapon && fs[0].weapon.id === gear.id)) {
      const f = fs[0];
      S.gear = S.gear.filter(x => x.id !== gear.id);
      if (f.weapon) S.gear.push(f.weapon);
      f.weapon = gear;
      addLog(`${f.name}이(가) 금기품 「${gear.name}」을 쥐고 맞선다.`, 'warn');
    }
    this.units = fs.slice(0, 6).map((f, i) => { const u = this.makeUnit(f, i); u.hp = u.maxHp; return u; });
    this.active = this.units.length > 0;
    UI.mark('partyStruct');
    if (!this.active) { this.special = false; Game.clawDefeat(); return; }
    this.enemies.push(this.makeEnemy('claw', this.camX + this.W + 30, 1));
    this.announce = { text: '☠ 머리가 발톱을 보냈다', life: 3, color: '#ff3b3b' };
  },
  // 무전 보고: 녹화 금지 구역에서는 이것만 들을 수 있다
  radioLog(msg, cls) {
    (this.radio = this.radio || []).unshift({ t: fmtTime(S.time), msg, cls: cls || '' });
    if (this.radio.length > 40) this.radio.length = 40;
    this.radioDirty = true;
  },
  // 후퇴한 인원: 뒤에서 숨을 고르고 체력 70%가 되면 다시 합류한다 (쓰러진 인원은 돌아오지 못한다)
  restWithdrawn(dt) {
    for (const u of this.units) {
      if (!u.withdrawn || !S.fixers.includes(u.f)) continue;
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.02 * dt);
      if (u.hp >= u.maxHp * 0.7) {
        const alive = this.units.filter(o => !o.dead);
        u.dead = false; u.withdrawn = false; u.cd = 0.5;
        u.x = alive.length ? Math.min(...alive.map(o => o.x)) - 26 : this.camX + 60;
        this.float(u.x, u.y - 40, '복귀', '#6fdc8c', true);
        this.radioLog(`${u.f.name} — 숨을 고르고 다시 합류했다.`, 'good');
        UI.mark('partyStruct');
      }
    }
  },
  // 떠오르는 숫자 (메이플식): 같은 자리에 새 숫자가 뜨면 기존 것들이 한 줄씩 위로 밀려 올라가고, 새 숫자가 그 자리에 쌓인다
  float(x, y, text, color, big) {
    let col = null;
    for (const f of this.floaters) {
      if (Math.abs(f.ax - x) < 16 && Math.abs(f.ay - y) < 14) {
        if (!col || f.slot < col.slot) col = f;   // 같은 기둥에 맞춰 세운다
        f.slot++;
        if (f.slot > 6) f.life = Math.min(f.life, 0.15);   // 너무 높이 쌓이면 맨 위부터 사라진다
      }
    }
    if (col) { x = col.ax; y = col.ay; }
    this.floaters.push({ x, y, ax: x, ay: y, slot: 0, shift: 0, age: 0, text: String(text), color, life: 1.1, big });
  },

  update(dt) {
    this.t += dt;
    for (const f of this.floaters) {
      f.life -= dt; f.age = (f.age || 0) + dt;
      const LH = (f.big ? 14 : 12) * (this.fk || 1);
      f.shift += ((f.slot || 0) * LH - (f.shift || 0)) * Math.min(1, dt * 18);   // 밀려 올라가는 움직임은 부드럽게
      f.y = (f.ay != null ? f.ay : f.y) - f.shift - f.age * 6;
    }
    this.floaters = this.floaters.filter(f => f.life > 0);
    for (const t of this.tracers) t.life -= dt;
    this.tracers = this.tracers.filter(t => t.life > 0);
    if (this.announce) { this.announce.life -= dt; if (this.announce.life <= 0) this.announce = null; }
    if (!this.active || dt <= 0) return;

    if (!this.special) this.restWithdrawn(dt);
    const alive = this.units.filter(u => !u.dead);
    if (!alive.length) {
      if (this.special) {
        this.active = false; this.special = false; Game.paused = true;
        this.announce = { text: '전멸', life: 3, color: '#ff3b3b' };
        setTimeout(() => Game.clawDefeat(), 1800);
        return;
      }
      // 전원 후퇴했지만 쉬고 있는 인원이 있으면: 적은 흩어지고, 정비를 마치면 다시 나간다
      if (this.units.some(u => u.withdrawn && S.fixers.includes(u.f))) {
        if (this.enemies.some(e => !e.dead)) { this.enemies = []; this.radioLog('전원 물러나 재정비 중 — 적들이 흩어졌다.', 'warn'); }
        this.spawnCd = 3;
        return;
      }
      this.active = false;
      const anyFell = this.units.some(u => !u.withdrawn);
      this.ended = anyFell ? '전원 이탈 — 오늘의 출동 종료' : '전원 후퇴 — 오늘의 출동 종료';
      S.huntEnded = this.ended;
      addLog(anyFell ? '현장에 남은 인원이 없다. 오늘의 출동 종료.' : '전원 무사히 후퇴했다.', anyFell ? 'bad' : 'warn');
      this.radioLog(anyFell ? '현장에 남은 인원이 없다 — 오늘의 출동 종료.' : '전원 후퇴 — 오늘의 출동 종료.', 'bad');
      UI.huntAlert('오늘의 출동이 끝났습니다', anyFell ? 'bad' : '');
      return;
    }
    let foes = this.enemies.filter(e => !e.dead);
    if (!foes.length && this.special) {
      if (this.stage === 'claw') {
        this.stage = 'arbiter';
        const a = this.makeEnemy('arbiter', this.camX + this.W + 30, 1);
        this.enemies.push(a);
        this.announce = { text: '⚖ 조율자가 내려왔다', life: 3, color: '#e8e8f0' };
        addLog('발톱이 쓰러졌다. 그리고 — 조율자가 왔다.', 'bad');
        UI.huntAlert('조율자 출현', 'bad');
        foes = [a];
      } else { this.active = false; this.special = false; Game.extracted(); return; }
    }
    if (!foes.length) {
      this.spawnCd -= dt;
      for (const u of alive) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.025 * dt);
      if (this.spawnCd <= 0) { this.spawnWave(); foes = this.enemies.filter(e => !e.dead); }
    }

    // 아군
    const rear = Math.min(...alive.map(u => u.x));
    for (const u of alive) {
      u.atkAnim = Math.max(0, u.atkAnim - dt); u.flash = Math.max(0, u.flash - dt);
      if (u.stunT > 0) { u.stunT -= dt; u.moving = false; continue; }          // 환상체에게 묶임·잠·빙결
      u.cd -= dt * (u.slowT > 0 ? 0.7 : 1); if (u.slowT > 0) u.slowT -= dt;
      if (u.egoAb && EGO_AB[u.egoAb].tick) EGO_AB[u.egoAb].tick(u, dt, this);
      // 개화 E.G.O — 위기의 순간에 발현한다 (그날 한 번만 시험받는다)
      // 위기에 빠질 때마다(한 번 회복했다가 다시 무너질 때도) 낮은 확률로
      if (u.hp >= u.maxHp * 0.6) u.mfCrisis = false;
      if (!this.special && !u.mfCrisis && u.hp < u.maxHp * MF_HP && canManifest(u.f)) { u.mfCrisis = true; if (Math.random() < MF_CHANCE) manifestNow(u, this); }
      for (const MA of mfAbsOf(u)) if (MA.tick) MA.tick(u, dt, this);
      if (u.transformed > 0) { u.transformed -= dt; if (u.transformed <= 0) { u.transformed = 0; this.refreshUnit(u); this.float(u.x, u.y - 44, '흑수화 해제', '#9a9aa8'); UI.mark('partyStruct'); } }
      else if (u.bw && !u.transformUsed && !this.special && u.hp < u.maxHp * 0.5) this.transform(u);   // 위기에 짐승이 깨어난다
      if (u.bl && u.bl.burn) { u.blT = (u.blT || 0) + dt; if (u.blT >= 1) { u.blT -= 1; this.selfHurt(u, u.maxHp * 0.012 * u.bl.burn, TRAITS.scorch.color); if (u.dead) continue; } }
      let tgt = null, best = 1e9;
      for (const e of foes) { if (e.dead) continue; const d = e.x - u.x; if (d > -14 && d < best) { best = d; tgt = e; } }
      const rng = (u.gun && tgt && (tgt.boss || tgt.fingerOf) && (S.ammo || 0) > 0) ? 130 : u.range;
      if (u.regen) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * u.regen * dt);   // K사 앰플 · K 혈청 · 흑수화 재생
      const backRow = !u.ranged && alive.some(o => o !== u && o.lane === u.lane && o.x > u.x && o.x - u.x < 34 && !o.moving);
      const laneOff = u.ranged ? 0 : (u.lane || 0) * 12;   // 줄마다 조금씩 뒤에 서서 대각선 진형
      if (tgt && best <= rng + laneOff + (backRow ? 26 : 0)) {
        u.moving = false;
        if (u.cd <= 0) { this.unitAttack(u, tgt); u.cd = u.interval * (u.egoAb && EGO_AB[u.egoAb].speed ? EGO_AB[u.egoAb].speed(u) : 1) * mfAbsOf(u).reduce((m, A) => m * (A.speed ? A.speed(u) : 1), 1); }
      } else if (alive.some(o => o !== u && o.lane === u.lane && !o.moving && o.x > u.x && o.x - u.x < 20)) {
        u.moving = false;
      } else if (u.x - rear < 70 || tgt) {
        u.x += u.speed * dt; u.walk += dt; u.moving = true;
      } else u.moving = false;
    }

    // 적
    for (const e of foes) {
      if (e.dead) continue;
      e.atkAnim = Math.max(0, e.atkAnim - dt); e.flash = Math.max(0, e.flash - dt);
      if (e.st.burn > 0) {
        e.burnT += dt;
        if (e.burnT >= 1) { e.burnT -= 1; const b = e.st.burn; e.st.burn = Math.max(0, b - 1); this.hurtEnemy(e, b, TRAITS.burn.color, true); }
      }
      if (e.st.sinking > 0) { e.sinkT += dt; if (e.sinkT >= 3) { e.sinkT = 0; e.st.sinking--; } }
      if (e.dead) continue;
      if (e.d.ab && ABNO_AB[e.d.ab].tick) { ABNO_AB[e.d.ab].tick(e, dt, this); if (e.dead) continue; }
      if (e.st.stun > 0) { e.st.stun -= dt; e.moving = false; continue; }
      e.cd -= dt;
      if (e.st.lock > 0) e.st.lock -= dt;
      const us = this.units.filter(u => !u.dead);
      if (!us.length) break;
      let tgt = null, best = 1e9;
      for (const u of us) { const d = Math.abs(e.x - u.x); if (d < best) { best = d; tgt = u; } }
      if (e.d.ab && ABNO_AB[e.d.ab].target && best <= e.range) tgt = ABNO_AB[e.d.ab].target(e, us);
      if (best <= e.range) {
        e.moving = false;
        if (e.cd <= 0 && !(e.st.lock > 0)) { this.enemyAttack(e, tgt); e.cd = e.interval; }
      } else { e.x += (tgt.x < e.x ? -1 : 1) * e.speed * dt; e.walk += dt; e.moving = true; }
    }
    for (const e of this.enemies) if (e.dead) e.deadT += dt;
    this.enemies = this.enemies.filter(e => !e.dead || e.deadT < 0.7);

    const au = this.units.filter(u => !u.dead);
    if (au.length) {
      const front = Math.max(...au.map(u => u.x));
      const target = front - 210;
      this.camX += (target - this.camX) * Math.min(1, dt * 3);
    }
  },

  // ---- 환상체·E.G.O 능력 도우미 ----
  every(e, k, period, dt) { const a = e.ab; a[k] = (a[k] || 0) + dt; if (a[k] >= period) { a[k] = 0; return true; } return false; },
  foes() { return this.enemies.filter(o => !o.dead); },
  alive() { return this.units.filter(u => !u.dead); },
  summon(key, x, n) { for (let i = 0; i < n; i++) this.enemies.push(this.makeEnemy(key, x + i * 18, 1)); },
  hitUnit(u, d, color) { if (u.dead) return; d = Math.max(1, Math.round(d)); u.hp -= d; u.flash = 0.08; this.float(u.x - 12, u.y - 14, d, color || '#ff6b6b'); if (u.hp <= 0) this.unitFall(u); else this.checkRetreat(u); },
  beam(x, y, dir, color) { const far = dir < 0 ? this.camX - 20 : this.camX + this.W + 20; this.tracers.push({ x1: x, y1: y, x2: far, y2: y, life: 0.45, c: color, w: 6 }, { x1: x, y1: y, x2: far, y2: y, life: 0.45, c: '#ffffff', w: 2 }); },
  burst(x, color) { this.tracers.push({ x1: x - 40, y1: this.G - 20, x2: x + 40, y2: this.G - 20, life: 0.3, c: color, w: 4 }); },
  pickWeapon(u, e) {
    const pool = [u.f.weapon].concat(u.f.pack ? (u.f.pack.items || []) : []).filter(Boolean);
    let best = u.f.weapon, bestScore = -1;
    for (const w of pool) {
      const st = unitStats(u.f, w);
      let sc = st.atk / st.interval;
      if (st.gun) sc *= (e.boss || e.fingerOf) && (S.ammo || 0) > 0 ? 4 : st.gunMelee ? 1 : 0.5;
      if (e.d.abno) sc *= st.abnoDealt;
      if (sc > bestScore) { bestScore = sc; best = w; }
    }
    return best;
  },
  unitAttack(u, e) {
    if (u.f.pack && (u.f.pack.items || []).length) {
      const w = this.pickWeapon(u, e);
      if (w !== u.curW) {
        const hp = u.hp; Object.assign(u, unitStats(u.f, w)); this.applyHeishou(u); u.hp = Math.min(hp, u.maxHp);
        this.float(u.x, u.y - 44, '⇄ ' + (w ? w.name : '맨손'), '#7ad8b0');
      }
    }
    // 총: 탄환 한 발이 큰돈 — 보스·강적에게만 쏘고, 평소에는 총으로 후려친다
    const shoot = u.gun && (e.boss || e.fingerOf) && (S.ammo || 0) > 0;
    if (shoot) { S.ammo--; this.lastShot = this.t; UI.mark('top'); if (!S.ammo) UI.huntAlert(`${u.f.name}: 마지막 탄환을 썼다`, 'bad'); }
    const bl = u.bl || {};
    if (bl.tremor && Math.random() < Math.min(0.5, bl.tremor * 0.08)) {      // 격진 반동: 휘청여 공격을 놓침
      u.cd = u.interval * 0.8;
      this.float(u.x, u.y - 34, '휘청', TRAITS.quake.color);
      return;
    }
    u.atkAnim = 0.22;
    let dmg = u.atk * rand(0.85, 1.15) * (u.gun ? (shoot ? 4 : u.gunMelee ? 1 : 0.5) : 1);   // 총검은 평소에도 제대로 찌른다
    if (e.d.abno) dmg *= u.abnoDealt || 1;                             // M사 월광석
    if (u.bw === 'hb_in' && (e.boss || e.fingerOf)) dmg *= u.transformed ? 1.4 : 1.25;         // 흑수 - 인: 일기토
    if (u.bw === 'hb_sa') { e.ambushed = e.ambushed || {}; if (!e.ambushed[u.f.id]) { e.ambushed[u.f.id] = 1; dmg *= u.transformed ? 1.75 : 1.5; } }   // 흑수 - 사: 기습
    if (u.sing === 'q') {                                                 // Q사 괴문자
      e.st.glyph = (e.st.glyph || 0) + 1;
      if (e.st.glyph > 5) { dmg *= 2; e.st.glyph = 0; this.float(e.x, e.y - 46, '괴문자 발동', SINGULARITIES.q.color, true); }
    }
    if (u.sing === 'w') { e.warped = e.warped || {}; if (!e.warped[u.f.id]) { e.warped[u.f.id] = 1; dmg *= 1.5; } }   // W사 워프
    const crit = Math.random() < u.crit;
    if (crit) dmg *= 1.6;
    if (shoot) this.tracers.push({ x1: u.x + 18, y1: u.y - 13, x2: e.x, y2: e.y - 14 * e.scale, life: 0.07 });
    else if (u.ranged) this.tracers.push({ x1: u.x + 14, y1: u.y - 14, x2: e.x, y2: e.y - 12 * e.scale, life: 0.12, c: '#e8dcc0' });   // 활·석궁: 화살
    Sound.tick(shoot ? 'gun' : 'hit');
    if (e.boss && assoc() === 'cinq') dmg *= 1.15;
    const EA = u.egoAb ? EGO_AB[u.egoAb] : null;
    if (EA) { u.eg = u.eg || {}; if (EA.hit) dmg *= EA.hit(u, e, this, dmg); if (EA.pierce) dmg += e.def * 0.6; }   // E.G.O: 환상체 능력의 열화판
    for (const MA of mfAbsOf(u)) if (MA.hit) dmg *= MA.hit(u, e, this, dmg, crit);   // 개화 E.G.O
    for (const a of this.units) if (!a.dead) for (const MA of mfAbsOf(a)) if (MA.dealt) MA.dealt(a, dmg);   // 피의 장막
    this.lastHitter = u;
    this.hurtEnemy(e, Math.max(1, dmg - e.def * 0.6 * (u.bw === 'hb_mi' ? (u.transformed ? 0.5 : 0.75) : 1)), crit ? '#ffd84a' : '#ffffff', false, crit);   // 흑수 - 미: 방어 절반 무시
    if (u.cleave) {                                                       // 낫·대검: 휩쓸기
      const o = this.enemies.find(x => x !== e && !x.dead && Math.abs(x.x - e.x) < 34);
      if (o) this.hurtEnemy(o, Math.max(1, dmg * u.cleave - o.def * 0.6), '#d8d0c0', true);
    }
    if (u.bw) {                                                           // 흑수 공통 키워드: 파열
      e.st.rupture += 1;
      if (u.bw === 'hb_mi') e.st.sinking = Math.min(25, e.st.sinking + 1);
      if (u.bw === 'hb_yu') { e.st.burn += u.transformed ? 2 : 1; for (const o of this.enemies) if (o !== e && !o.dead && Math.abs(o.x - e.x) < (u.transformed ? 52 : 40)) this.hurtEnemy(o, Math.max(1, dmg * (u.transformed ? 0.3 : 0.2) - o.def * 0.6), BLACKWATER.hb_yu.color, true); }
      if (u.bw === 'hb_ja' && !e.dead && Math.random() < (u.transformed ? 0.2 : 0.1)) this.hurtEnemy(e, Math.max(1, dmg * 0.5 - e.def * 0.6), BLACKWATER.hb_ja.color, true);
    }
    if (u.sing === 'j' && !e.dead && Math.random() < 0.2) {            // J사 자물쇠
      e.st.lock = Math.max(e.st.lock || 0, 3);
      this.float(e.x, e.y - 40, '잠금', SINGULARITIES.j.color);
    }
    if (u.wset && !e.dead && Math.random() < 0.15) this.dimensionSlash(u, e, dmg);   // W사 세트
    if (u.sing === 'g') {   // G사 중력: 주변의 적까지 짓누른다
      for (const o of this.enemies) if (o !== e && !o.dead && Math.abs(o.x - e.x) < 36) this.hurtEnemy(o, Math.max(1, dmg * 0.5 - o.def * 0.6), SINGULARITIES.g.color, true);
      this.rings && this.rings.push && this.rings.push({ x: e.x, y: e.y, r: 4, life: 0.3 });
    }
    // 숙련도: 지금 쥔 무기 종류로 적중할 때마다 오른다 (개머리판은 총 숙련에 들어가지 않음)
    if (gainMastery(u.f, u.form, 1)) {
      this.refreshUnit(u);
      this.float(u.x, u.y - 52, `${MASTERY_FORMS[u.form]} 숙련 Lv${masteryLv(u.f, u.form)}`, '#9ad0ff', true);
      addLog(`${u.f.name}의 ${MASTERY_FORMS[u.form]} 숙련도가 Lv${masteryLv(u.f, u.form)}이(가) 되었다.`, 'good');
    }
    const wt = u.wt;
    if (wt.bleed) e.st.bleed += wt.bleed;
    if (wt.burn) e.st.burn += wt.burn;
    if (wt.rupture) e.st.rupture += wt.rupture;
    if (wt.sinking) e.st.sinking = Math.min(15, e.st.sinking + wt.sinking);
    // 강화형 특성: 기본의 3배
    if (wt.scorch) e.st.burn += wt.scorch * 3;
    if (wt.hemo) e.st.bleed += wt.hemo * 3;
    if (wt.collapse) e.st.rupture += wt.collapse * 3;
    if (wt.abyss) e.st.sinking = Math.min(25, e.st.sinking + wt.abyss * 3);
    // 반동 (내성으로 상쇄되고 남은 만큼)
    if (bl.bleed) this.selfHurt(u, u.maxHp * 0.02 * bl.bleed, TRAITS.hemo.color);
    if (bl.charge && !u.dead) this.selfHurt(u, u.maxHp * 0.015 * bl.charge, TRAITS.overcharge.color);
    const stunCh = Math.min(0.6, (wt.tremor || 0) * 0.08 + (wt.quake || 0) * 0.2 + u.stagger);
    if (!e.dead && stunCh > 0 && Math.random() < stunCh) {
      e.st.stun = Math.max(e.st.stun, e.boss ? 0.4 : 0.9);
      this.float(e.x, e.y - 34 * e.scale, '경직', TRAITS.tremor.color);
    }
  },
  hurtEnemy(e, dmg, color, isDot, crit) {
    if (e.dead) return;
    if (!isDot && e.st.rupture > 0) { dmg += e.st.rupture; e.st.rupture = Math.max(0, e.st.rupture - 1); }
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.flash = 0.08;
    this.float(e.x + rand(-5, 5), e.y - 28 * e.scale, (crit ? '!' : '') + dmg, color, crit);
    if (e.hp <= 0) this.killEnemy(e);
    else if (!isDot && e.d.ab && ABNO_AB[e.d.ab].hurt) ABNO_AB[e.d.ab].hurt(e, this);
  },
  killEnemy(e) {
    e.dead = true; e.deadT = 0; e.hp = 0;
    if (this.special) {
      this.float(e.x, e.y - 60, e.name + ' 격파', '#ffd84a', true);
      if (e.key === 'claw' && Math.random() < 0.5) { const sid = pick(['serum_k', 'serum_r', 'serum_w']); S.stock[sid] = (S.stock[sid] || 0) + 1; addLog(`발톱이 떨어뜨린 것: ${MATERIALS[sid].name}`, 'gold'); }
      if (e.key === 'arbiter' && Math.random() < 0.5) { S.stock.arbiter_shard = (S.stock.arbiter_shard || 0) + 1; addLog('조율자가 남긴 것: 조율자의 파편', 'gold'); }
      return;
    }
    S.stats.kills++; S.report.kills++;
    { const lu = this.lastHitter; if (lu && !lu.dead && lu.egoAb && EGO_AB[lu.egoAb].kill) EGO_AB[lu.egoAb].kill(lu, e, this); if (lu && !lu.dead) for (const MA of mfAbsOf(lu)) if (MA.kill) MA.kill(lu, e, this); }
    const live = this.units.filter(u => !u.dead);
    for (const u of live) {
      u.f.kills++;
      // 장비 경험치 (무기는 처치 기여, 방어구는 함께 싸운 몫)
      const gexp = (2 + e.d.exp * 0.25) * HUNT_YIELD;
      gearExpGain(u.curW || u.f.weapon, u.f, gexp);
      gearExpGain(u.f.armor, u.f, gexp * 0.7);
      const ups = gainExp(u.f, e.d.exp * 0.7 * HUNT_YIELD * (1 + this.wave * 0.02));   // 모두 함께 싸우는 만큼 경험치는 조금 덜
      if (ups) {
        this.refreshUnit(u);
        this.float(u.x, u.y - 44, 'LEVEL UP', '#6fdc8c', true);
        S.report.levelups.push(`${u.f.name} Lv.${u.f.lv}`);
        addLog(`${u.f.name} 레벨 업! (Lv.${u.f.lv})`, 'good');
        this.radioLog(`${u.f.name} 레벨 업 — Lv.${u.f.lv}`, 'good');
        Sound.level();
      }
    }
    if (e.d.money) {
      const m = Math.round(e.d.money * HUNT_YIELD * rand(0.6, 1.3) * (live.some(u => u.colorKey === 'yellow') ? 1.15 : 1));   // 노란 특색
      S.money += m; S.report.huntMoney += m;
    }
    const z = ZONES[this.zone];
    if (S.outskirts && Math.random() < 0.2) { const om = pick(OUTSKIRTS_MATS); addIncoming(om, 1); this.float(e.x, e.y - 52, '✦ ' + MATERIALS[om].name, MATERIALS[om].color, true); }   // 아인족의 정수는 외곽에서만
    if (e.berserkOf) {
      S.berserk = (S.berserk || []).filter(b => b.id !== e.berserkOf.id);
      addIncoming(e.berserkOf.bw, 1);
      addLog(`광폭화한 ${e.berserkOf.name}을(를) 쓰러뜨렸다. 남은 것은 흑수의 재료뿐.`, 'bad');
    }
    const n = (e.boss ? randInt(2, 3) : (Math.random() < 0.72 * HUNT_YIELD ? 1 : 0)) + (assoc() === 'seven' && Math.random() < 0.2 ? 1 : 0);
    const got = [];
    for (let i = 0; i < n; i++) {
      let id = weightedPick(z.drops);
      if (MATERIALS[id] && MATERIALS[id].gunpart && !unlocked('gun')) id = Math.random() < 0.5 ? 'scrap' : (z.drops.steel ? 'steel' : 'scrap');   // 총기 해금 전에는 톱니 대신 쇳조각
      addIncoming(id, 1); got.push(MATERIALS[id].name);
      this.float(e.x, e.y - 18 - i * 9, '+' + MATERIALS[id].name, MATERIALS[id].color);
    }
    if (!e.boss) this.radioLog(`${e.name} 처치${got.length ? ' · ' + got.join(', ') : ''}`);
    if (e.d.abno) {
      if (S.report) S.report.abno = (S.report.abno || 0) + 1;
      addIncoming(e.d.abno, 1);
      S.fame += e.d.abnoFame || 10;
      this.float(e.x, e.y - 70, '✦ ' + MATERIALS[e.d.abno].name, '#ff8ad0', true);
      addLog(`환상체 「${e.name}」(${e.d.risk})을(를) 제압했다. ${MATERIALS[e.d.abno].name} 획득 · 명성 +${e.d.abnoFame || 10}`, 'gold');
    }
    if (e.fingerOf) {
      const F = FINGERS[e.fingerOf];
      addRel(e.fingerOf, -3, '조직원 처치');
      if (Math.random() < 0.3) { addIncoming(F.mat, 1); this.float(e.x, e.y - 40, '★ ' + MATERIALS[F.mat].name, F.color, true); }
    }
    if (e.finger) {
      addRel('middle', 10, '표적 처리');
      const bounty = 500 * (zoneLv(this.zone) + 1) * KRW;
      S.money += bounty; S.report.huntMoney += bounty;
      for (let i = 0; i < 2; i++) { const id = pick(z.rare); addIncoming(id, 1); }
      addLog(`중지의 표적을 처리했다. 현상금 ${fmtMoney(bounty)} · 희귀 재료 2개`, 'gold');
    }
    if (e.boss) {
      const rid = pick(z.rare);
      addIncoming(rid, 1);
      if (!this.special && !S.outskirts && this.zone >= 3 && Math.random() < RUNE_BOSS_CHANCE) { addIncoming('rune', 1); addLog(`${e.name}이(가) 각인 인두를 떨어뜨렸다.`, 'gold'); }
      if (!this.special && !S.outskirts && this.zone === ZONES.length - 1 && e.key === z.boss) {   // 둥지 경계의 주인 — 인장
        const so = sealsOf(); if (!so[S.district]) { so[S.district] = true; addLog(`◆ ${district().name}의 인장을 얻었다.`, 'gold'); UI.huntAlert(`${district().wing} 인장 획득`, 'good'); }
      }
      const bf = Math.max(1, Math.round(z.fame * HUNT_YIELD * (assoc() === 'cinq' ? 1.5 : 1)));
      S.fame += bf; S.stats.bosses++; S.report.bossKills++;
      for (const u of live) u.f.bosses = (u.f.bosses || 0) + 1;
      this.float(e.x, e.y - 60, '★ ' + MATERIALS[rid].name, '#ffd84a', true);
      addLog(`${e.name} 격파! 희귀 재료 「${MATERIALS[rid].name}」 획득 · 명성 +${bf}`, 'gold');
      UI.huntAlert(`${e.name} 격파! 「${MATERIALS[rid].name}」 획득`, 'good');
      this.radioLog(`★ ${e.name} 격파! 「${MATERIALS[rid].name}」${got.length ? ' · ' + got.join(', ') : ''}`, 'gold');
    }
    UI.mark('top');
  },
  enemyAttack(e, u) {
    e.atkAnim = 0.22;
    if (e.st.bleed > 0) {
      const b = e.st.bleed;
      e.st.bleed = Math.floor(b * 0.67);
      this.hurtEnemy(e, b, TRAITS.bleed.color, true);
      if (e.dead) return;
    }
    const atk = e.atk * (1 - Math.min(0.6, e.st.sinking * 0.04));
    if (e.d.ranged) this.tracers.push({ x1: e.x - 14, y1: e.y - 13, x2: u.x, y2: u.y - 14, life: 0.07, c: '#ff8a6a' });
    if (u.dodge && Math.random() < u.dodge) { this.float(u.x, u.y - 30, '회피', '#9ad0ff'); return; }   // 정장·망토·잿빛 특색
    const AB = e.d.ab ? ABNO_AB[e.d.ab] : null;
    let mul = AB && AB.hit ? AB.hit(e, u, this, atk) : 1;
    if (!e.d.ab && this.enemies.some(o => !o.dead && o.d.ab && ABNO_AB[o.d.ab].aura)) mul *= 1.25;   // 노래하는 기계의 노래
    const dmg = Math.round((Math.max(1, Math.round(atk * mul * rand(0.85, 1.15) - (AB && AB.pierce ? 0 : u.def * 0.6))) + ((u.bl && u.bl.rupture) ? u.bl.rupture * 3 : 0)) * (e.d.abno ? (u.abnoTaken || 1) : 1));
    let dmg2 = dmg;
    if (this.units.some(a => a !== u && !a.dead && mfAbsOf(a).some(A => A.guard))) dmg2 *= 0.8;   // 이어진 인연: 곁의 아군
    for (const MA of mfAbsOf(u)) if (MA.taken) dmg2 = MA.taken(u, dmg2, e, this);
    dmg2 = Math.round(dmg2);
    u.hp -= dmg2; u.flash = 0.08;
    this.float(u.x - 12, u.y - 14, dmg2, '#ff6b6b');   // 받는 피해: 몸통 왼쪽 — 머리 위 이름표·번호와 자리를 나눈다
    const at = u.at;
    if (at.bleed) e.st.bleed += Math.ceil(at.bleed / 2);
    if (at.burn) e.st.burn += Math.ceil(at.burn / 2);
    if (at.rupture) e.st.rupture += Math.ceil(at.rupture / 2);
    if (at.sinking) e.st.sinking = Math.min(15, e.st.sinking + Math.ceil(at.sinking / 2));
    if (at.tremor && Math.random() < Math.min(0.5, at.tremor * 0.06)) e.st.stun = Math.max(e.st.stun, 0.6);
    if (u.hp <= 0) this.unitFall(u);
    else this.checkRetreat(u);
  },
  checkRetreat(u) {
    if (this.special || u.bw === 'hb_mi') return;   // 흑수 - 미: 착란 상태의 돌진           // 발톱 앞에서는 물러설 곳이 없다
    if (!u.dead && S.autoRetreat !== false && u.hp < u.maxHp * 0.2) {
      // 후퇴가 늘 성공하지는 않는다 — 험한 지역일수록 물러서다 붙잡힌다
      if (Math.random() < (zoneLv(this.zone) === 0 ? 0.02 : 0.05 + 0.03 * zoneLv(this.zone))) { this.float(u.x, u.y - 52, '후퇴 실패', '#ff6b6b', true); this.radioLog(u.f.name + ' — 물러서다 붙잡혔다!', 'bad'); return this.unitFall(u); }
      u.dead = true; u.withdrawn = true;
      this.float(u.x, u.y - 40, '후퇴', '#9ad0ff', true);
      addLog(`${u.f.name}이(가) 위험을 느끼고 후퇴했다.`, 'warn');
      this.radioLog(`${u.f.name} — 위험하다, 물러난다! (쉬고 나서 복귀)`, 'warn');
      UI.huntAlert(`${u.f.name} 후퇴`);
      UI.mark('partyStruct');
    }
  },
  // 반동 피해 (무기가 착용자를 해친다)
  selfHurt(u, d, color) {
    if (u.dead) return;
    d = Math.max(1, Math.round(d));
    u.hp -= d; u.flash = 0.06;
    this.float(u.x + rand(-4, 4), u.y - 30, '-' + d, color);
    if (u.hp <= 0) this.unitFall(u);
    else this.checkRetreat(u);
  },
  unitFall(u) {
    for (const o of this.enemies) if (!o.dead && o.d.ab && ABNO_AB[o.d.ab].fall) ABNO_AB[o.d.ab].fall(o, this);
    if (this.special) {                  // 발톱·조율자에게 쓰러지면 죽는다
      u.dead = true; u.hp = 0;
      fixerDies(u.f); S.report.deaths.push(u.f.name);
      this.float(u.x, u.y - 40, '사망', '#ff3b3b', true);
      addLog(`✝ ${u.f.name}이(가) 쓰러졌다.`, 'bad');
      UI.mark('partyStruct');
      return;
    }
    if (rel('middle') >= 60 && !this.brotherUsed) {
      this.brotherUsed = true;
      u.dead = true; u.withdrawn = true; u.hp = 1;
      this.float(u.x, u.y - 40, '형제의 구원', FINGERS.middle.color, true);
      addLog(`쓰러지려던 ${u.f.name}을(를) 중지의 형제가 끌어냈다.`, 'good');
      UI.huntAlert(`중지의 형제가 ${u.f.name}을(를) 구했다`, 'good');
      UI.mark('partyStruct');
      return;
    }
    u.dead = true; u.hp = 0;
    const f = u.f;
    f.curHp = 0;
    let dies = Math.random() < (f.blackwater === 'hb_yu' ? 0.6 : 0.25);   // 흑수 - 유: 높은 사망률
    if (dies && S.ampuleToday && !S.ampuleUsed) {   // K사 재생 앰플: 하루 한 번
      dies = false; S.ampuleUsed = true;
      this.float(u.x, u.y - 40, 'K사 앰플', '#7affb0', true);
      addLog(`${f.name}이(가) 숨을 거두려던 순간, K사 재생 앰플이 그를 붙잡았다.`, 'good');
      UI.huntAlert(`K사 앰플 — ${f.name} 생존`, 'good');
    }
    if (dies) {
      fixerDies(f);
      S.report.deaths.push(f.name);
      this.float(u.x, u.y - 40, '사망', '#ff3b3b', true);
      addLog(`✝ ${f.name}(Lv.${f.lv})이(가) 현장에서 목숨을 잃었다. 장비는 회수되었다.`, 'bad');
      this.radioLog(`✝ ${f.name} — 응답이 없다…`, 'bad');
      Sound.death();
      UI.huntAlert(`✝ ${f.name} 사망`, 'bad');
      UI.mark('storage');
    } else {
      f.injuredUntil = S.day + 1;
      S.report.injuries.push(f.name);
      this.float(u.x, u.y - 40, '쓰러짐', '#ff9f43', true);
      addLog(`${f.name}이(가) 쓰러졌다. 중상 — 내일은 휴식.`, 'warn');
      this.radioLog(`${f.name} 쓰러짐 — 중상, 동료가 끌어냈다.`, 'bad');
      UI.huntAlert(`${f.name} 쓰러짐 (중상)`, 'bad');
    }
    UI.mark('partyStruct');
  },

  // ---------- 렌더 ----------
  render(ctx) {
    const W = this.W, H = this.H, G = this.G;
    const z = ZONES[this.zone] || ZONES[0];
    ctx.imageSmoothingEnabled = false;
    const bg = zoneBgImage(this.zone);
    if (bg) {                                   // 지역 배경 그림 (PixAI) — 느리게 흐르고, 번갈아 뒤집어 이음매 없이
      const bw = Math.round(bg.width * H / bg.height), px = this.camX * 0.3, t0 = Math.floor(px / bw);
      for (let t = t0; t <= t0 + Math.ceil(W / bw) + 1; t++) {
        const x = Math.round(t * bw - px);
        if (t & 1) { ctx.save(); ctx.translate(x + bw, 0); ctx.scale(-1, 1); ctx.drawImage(bg, 0, 0, bw, H); ctx.restore(); }
        else ctx.drawImage(bg, x, 0, bw, H);
      }
      ctx.fillStyle = 'rgba(8,6,10,0.5)'; ctx.fillRect(0, G - 2, W, H - G + 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, G - 2, W, 2);
    } else {
    ctx.fillStyle = z.pal.sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = shade(z.pal.sky, 0.06); ctx.fillRect(0, 60, W, 40);
    this.layer(ctx, this.camX * 0.15, 44, z.pal.far, 40, 110, 1, z.pal.win, 0.18);
    this.layer(ctx, this.camX * 0.45, 58, z.pal.mid, 24, 70, 2, z.pal.win, 0.3);
    // 가로등
    const lo = this.camX * 0.8;
    for (let k = Math.floor(lo / 150) - 1; k < Math.floor(lo / 150) + 4; k++) {
      const x = Math.round(k * 150 - lo + 40);
      ctx.fillStyle = '#1a1418'; ctx.fillRect(x, G - 62, 3, 62); ctx.fillRect(x, G - 62, 12, 3);
      ctx.fillStyle = z.pal.win; ctx.fillRect(x + 9, G - 59, 4, 2);
      ctx.fillStyle = 'rgba(255,220,150,0.05)'; ctx.fillRect(x - 6, G - 58, 30, 58);
    }
    ctx.fillStyle = z.pal.ground; ctx.fillRect(0, G - 2, W, H - G + 2);
    ctx.fillStyle = z.pal.edge; ctx.fillRect(0, G - 2, W, 2);
    ctx.fillStyle = z.pal.line;
    const off = Math.floor(this.camX) % 32;
    for (let x = -off; x < W; x += 32) ctx.fillRect(x, G + 4, 1, H - G);
    ctx.fillRect(0, G + 14, W, 1);
    }

    const list = [];
    for (const u of this.units) if (!u.dead) list.push(u);
    for (const e of this.enemies) list.push(e);
    list.sort((a, b) => a.y - b.y);
    this.labels = [];
    for (const a of list) (a.f ? this.drawUnit(ctx, a) : this.drawEnemy(ctx, a));
    this.drawLabels(ctx);

    for (const t of this.tracers) {
      ctx.strokeStyle = t.c || '#ffe08a'; ctx.lineWidth = t.w || 1; ctx.globalAlpha = t.w ? Math.min(1, t.life * 3) : 1;
      ctx.beginPath(); ctx.moveTo(t.x1 - this.camX, t.y1); ctx.lineTo(t.x2 - this.camX, t.y2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center';
    // 좁은 화면(폰)에서는 떠오르는 숫자를 키운다 — 실제로 보이는 크기가 약 10px 이상
    { const cv = ctx.canvas; this.fk = cv.clientWidth > 0 && cv.clientWidth < 560 ? Math.min(1.4, cv.width / cv.clientWidth) : 1; }
    for (const f of this.floaters) {
      ctx.font = Math.round((f.big ? 12 : 10) * this.fk) + 'px Galmuri9, Galmuri11, monospace';
      ctx.globalAlpha = Math.min(1, f.life * 2.5);
      const x = Math.round(f.x - this.camX), y = Math.round(f.y);
      ctx.fillStyle = '#000';                                   // 사방 테두리 — 복잡한 배경에서도 또렷하게
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) ctx.fillText(f.text, x + ox, y + oy);
      ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.textAlign = 'left'; ctx.font = '10px Galmuri9, Galmuri11, monospace';
    const hdr = this.special ? `도시의 금기 — ${this.stage === 'arbiter' ? '조율자' : '발톱'}` : `${z.name}  WAVE ${this.wave}`;
    ctx.fillStyle = '#000'; ctx.fillText(hdr, 7, 14);
    ctx.fillStyle = this.special ? '#ff6b6b' : '#e8dcc8'; ctx.fillText(hdr, 6, 13);
    const boss = this.enemies.find(e => e.boss && !e.dead);
    if (boss) {
      const bw = 160, bx = (W - bw) / 2;
      ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, 21, bw + 2, 7);
      ctx.fillStyle = '#3a1010'; ctx.fillRect(bx, 22, bw, 5);
      ctx.fillStyle = '#e03a3a'; ctx.fillRect(bx, 22, bw * Math.max(0, boss.hp / boss.maxHp), 5);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffb0b0'; ctx.fillText(boss.name, W / 2, 19); ctx.textAlign = 'left';
    }
    if (this.announce) {
      ctx.textAlign = 'center'; ctx.font = this.special ? '18px Galmuri14, NeoDunggeunmo, monospace' : '16px NeoDunggeunmo, Galmuri11, monospace';   // 강조: 출현 알림 · 발톱·조율자는 더 크게
      ctx.globalAlpha = Math.min(1, this.announce.life);
      ctx.fillStyle = '#000'; ctx.fillText(this.announce.text, W / 2 + 1, 56);
      ctx.fillStyle = this.announce.color || '#ffd890'; ctx.fillText(this.announce.text, W / 2, 55);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    if (!this.active) {
      ctx.fillStyle = 'rgba(10,8,12,0.55)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.font = '14px NeoDunggeunmo, Galmuri11, monospace';   // 강조: 보스 이름
      const msg = S.phase === 'open' ? (this.ended || '대기 중') : S.phase === 'close' ? '영업 종료 — 사무소 정비 중' : '개점 준비 중';
      ctx.fillStyle = '#d8c8b0'; ctx.fillText(msg, W / 2, H / 2);
      if (S.phase === 'open' && this.ended === '출동 인원 없음') {
        ctx.font = '10px Galmuri9, Galmuri11, monospace'; ctx.fillStyle = '#9a8a80';
        ctx.fillText('마감 후 [인원·장비] 탭에서 출동 인원을 지정하세요', W / 2, H / 2 + 16);
      }
      ctx.textAlign = 'left';
    }
  },
  layer(ctx, off, bw, color, minH, maxH, seed, win, wd) {
    const G = this.G, start = Math.floor(off / bw) - 1;
    for (let k = start; k < start + Math.ceil(this.W / bw) + 3; k++) {
      const h = Math.round(minH + hash1(k * 7 + seed) * (maxH - minH));
      const w = bw - 4 - Math.floor(hash1(k * 13 + seed) * 10);
      const x = Math.round(k * bw - off), y = G - 2 - h;
      ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
      if (hash1(k * 3 + seed) > 0.6) ctx.fillRect(x + 4, y - 6, 3, 6);
      ctx.fillStyle = win;
      for (let wy = y + 6; wy < G - 12; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) {
        if (hash1(k * 31 + wx * 0.37 + wy * 0.71 + seed) < wd) { ctx.globalAlpha = 0.35 + hash1(wx + wy) * 0.4; ctx.fillRect(wx, wy, 2, 3); }
      }
      ctx.globalAlpha = 1;
    }
  },
  frameOf(a) { return a.moving ? (Math.floor(a.walk * 7) % 2 ? 'walkA' : 'walkB') : 'idle'; },
  drawUnit(ctx, u) {
    const s = 2, spr = SPR.human, rows = spr.idle;
    const w = rows[0].length * s, h = rows.length * s;
    const sx = Math.round(u.x - this.camX - w / 2 + (u.atkAnim > 0 ? 2 : 0)), sy = Math.round(u.y - h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx + 2, u.y - 1, w - 4, 3);
    let pal = u.f.pal;
    const look = u.bw ? HEISHOU_LOOK[u.bw] : null;
    if (u.bw) {
      pal = Object.assign({}, pal, { e: BLACKWATER[u.bw].color });               // 흑수의 눈은 지파의 빛깔
      if (u.transformed > 0 && look) {
        pal.c = look.coat || shade(pal.c, -0.45); pal.h = '#141014';
        if (look.legs) pal.p = look.legs;
        // 흑수의 기운
        const bc = BLACKWATER[u.bw].color;
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.t * 10);
        ctx.fillStyle = bc; ctx.beginPath(); ctx.ellipse(sx + w / 2, u.y, w * 0.75, 4, 0, 0, 7); ctx.fill();
        for (let k = 0; k < 4; k++) {                                   // 피어오르는 흑수의 기운
          const ph = (this.t * 1.6 + k * 0.25 + u.f.id * 0.13) % 1;
          ctx.globalAlpha = 0.8 * (1 - ph);
          ctx.fillRect(Math.round(sx + 2 + ((k * 7 + u.f.id * 3) % (w - 4))), Math.round(u.y - 4 - ph * (h + 6)), 2, 2);
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.drawImage(getSprite('human', this.frameOf(u), pal, s, false, u.flash > 0), sx, sy);
    if (u.transformed > 0 && look) {
      const px = ([x, y, ww, hh, c]) => { ctx.fillStyle = c; ctx.fillRect(sx + x * s, sy + y * s, ww * s, hh * s); };
      for (const k of ['ears', 'tail', 'mane', 'wool', 'wing', 'arm']) (look[k] || []).forEach(px);
      (look.stripes || []).forEach(([x, y, ww, hh]) => px([x, y, ww, hh, '#1a1210']));
    }
    if (!(u.transformed > 0 && u.bw === 'hb_sa')) drawHeldWeapon(ctx, u.form, sx + spr.hand[0] * s + s, sy + spr.hand[1] * s, s, u.wColor, u.atkAnim > 0 ? 1 : 0, 1);
    this.hpBar(ctx, sx + 1, sy - 6, w - 2, u.hp / u.maxHp, '#6fdc8c');
    (this.labels = this.labels || []).push({ text: u.f.name, num: String(this.units.indexOf(u) + 1), cx: sx + w / 2, y: sy - 9, color: u.f.colorHex || '#e8e0d0' });   // 이름표는 나중에 한꺼번에
  },
  // 이름표: 겹치면 위로 한 칸씩 쌓고, 올라간 이름표는 가는 선으로 주인과 잇는다
  drawLabels(ctx) {
    const L = this.labels || []; this.labels = [];
    if (!L.length) return;
    // 좁은 화면(폰)에서는 이름 대신 큰 번호 — 아래 체력 바 카드의 번호와 같다
    const cv = ctx.canvas, small = cv.clientWidth > 0 && cv.clientWidth < 560;
    // 화면이 좁을수록 크게 — 실제로 보이는 크기가 약 10px 이상 되도록
    const fpx = small ? Math.round(Math.min(15, Math.max(11, 10 * cv.width / cv.clientWidth))) : 8;
    ctx.font = (small ? 'bold ' : '') + fpx + 'px Galmuri9, Galmuri11, monospace'; ctx.textAlign = 'center';
    const RH = small ? fpx + 1 : 11;
    if (small) for (const l of L) l.text = l.num;
    // 뭉쳐 있으면 무리에서 가장 높은 머리 위부터 쌓는다 (아래 동료의 몸·체력 바를 가리지 않게)
    for (const l of L) l.y0 = Math.min(...L.filter(o => Math.abs(o.cx - l.cx) < 34).map(o => o.y));
    const placed = [];
    L.sort((a, b) => b.y - a.y || b.cx - a.cx);
    for (const l of L) {
      const w = ctx.measureText(l.text).width + 2;
      let y = l.y0;
      for (let k = 0; k < 8; k++) {
        const hit = placed.some(p => Math.abs(p.cx - l.cx) < (p.w + w) / 2 + 3 && Math.abs(p.y - y) < RH);
        if (!hit) break;
        y = Math.min(y, ...placed.filter(p => Math.abs(p.cx - l.cx) < (p.w + w) / 2 + 3 && Math.abs(p.y - y) < RH).map(p => p.y)) - RH;
      }
      placed.push({ cx: l.cx, y, w });
      if (y < l.y - 1) { ctx.fillStyle = 'rgba(232,224,208,0.35)'; ctx.fillRect(Math.round(l.cx), Math.round(y + 2), 1, Math.round(l.y - y - 4)); }
      ctx.fillStyle = '#000'; ctx.fillText(l.text, l.cx + 1, y + 1);
      ctx.fillStyle = l.color; ctx.fillText(l.text, l.cx, y);
    }
    ctx.textAlign = 'left';
  },
  drawEnemy(ctx, e) {
    const art = e.d.ab ? abnoArt(e.d.ab) : null;          // 환상체: 크고 자세한 그림 (PixAI)
    let s = Math.max(2, Math.round(2 * e.scale));
    const spr = SPR[e.d.sprite], rows = spr.idle;
    let w = rows[0].length * s, h = rows.length * s;
    if (art) { h = ABNO_ART_H[e.d.risk] || 48; w = Math.round(art.width * h / art.height); }
    const bob = art && !e.dead ? Math.round(Math.sin(this.t * 3 + e.x) * 1) : 0;
    const sx = Math.round(e.x - this.camX - w / 2 - (e.atkAnim > 0 ? 3 : 0)), sy = Math.round(e.y - h) + bob;
    if (sx > this.W + 40 || sx + w < -40) return;
    if (e.dead) ctx.globalAlpha = Math.max(0, 1 - e.deadT / 0.7);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx + 4, e.y - 1, w - 8, 3);
    if (art) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(art, sx, sy + (e.dead ? Math.round(e.deadT * 10) : 0), w, h);
      if (e.flash > 0) { ctx.globalAlpha = 0.6; ctx.filter = 'brightness(3)'; ctx.drawImage(art, sx, sy, w, h); ctx.filter = 'none'; ctx.globalAlpha = 1; }
    } else ctx.drawImage(getSprite(e.d.sprite, e.dead ? 'idle' : this.frameOf(e), e.d.pal, s, true, e.flash > 0), sx, sy + (e.dead ? Math.round(e.deadT * 10) : 0));
    if (!art && spr.hand && e.d.weapon) {
      const hx = sx + (rows[0].length - 1 - spr.hand[0]) * s, hy = sy + spr.hand[1] * s;
      drawHeldWeapon(ctx, e.d.weapon, hx, hy, s, '#8a8a92', e.atkAnim > 0 ? 1 : 0, -1);
    }
    ctx.globalAlpha = 1;
    if (e.dead) return;
    if (!e.boss) this.hpBar(ctx, sx + 1, sy - 5, w - 2, e.hp / e.maxHp, '#e04a4a');
    let ix = sx;
    for (const k of ['bleed', 'burn', 'rupture', 'sinking']) {
      if (e.st[k] > 0) { ctx.fillStyle = TRAITS[k].color; ctx.fillRect(ix, sy - 9, 3, 3); ix += 4; }
    }
    if (e.st.stun > 0) { ctx.fillStyle = TRAITS.tremor.color; ctx.fillRect(ix, sy - 9, 3, 3); ix += 4; }
    if (e.st.lock > 0) { ctx.fillStyle = SINGULARITIES.j.color; ctx.fillRect(ix, sy - 9, 3, 3); ix += 4; }
    for (let gI = 0; gI < (e.st.glyph || 0); gI++) { ctx.fillStyle = SINGULARITIES.q.color; ctx.fillRect(sx + gI * 3, sy - 13, 2, 2); }
  },
  hpBar(ctx, x, y, w, r, c) {
    ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
    ctx.fillStyle = '#2a1a1a'; ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = c; ctx.fillRect(x, y, Math.max(0, Math.round(w * Math.max(0, r))), 2);
  },
};
