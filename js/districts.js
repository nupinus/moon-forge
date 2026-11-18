'use strict';
// ============================================================
//  구(區) 확장 — 날개마다 다른 뒷골목
//  날개 이름의 알파벳 순서가 곧 구 번호다 (G사 7구 · H사 8구 · J사 10구 · L사 12구 · T사 20구 · U사 21구 · W사 23구).
//  원작에서 둥지와 뒷골목의 모습이 어느 정도 드러난 곳만 넣는다. 금기는 이 게임에서 지어낸 것이다.
//  각 구는 4번째·6번째 지역과 가장 깊은 둥지 경계가 그 날개의 색으로 바뀐다 (난이도는 원래 자리와 같다).
// ============================================================

// 지역 단계별 적 기본 능력치 (원래 자리의 적들과 같은 수준)
const WING_TIER = {
  3: { n: { hp: 100, atk: 15, def: 3, interval: 1.1, range: 22, speed: 30, exp: 18, money: 12 },
       b: { hp: 1100, atk: 32, def: 10, interval: 1.4, range: 30, speed: 20, exp: 210, money: 380, boss: true, scale: 1.7 } },
  5: { n: { hp: 220, atk: 24, def: 9, interval: 1.2, range: 24, speed: 28, exp: 34, money: 28 },
       b: { hp: 2900, atk: 52, def: 16, interval: 1.4, range: 32, speed: 20, exp: 480, money: 1000, boss: true, scale: 1.8 } },
  8: { n: { hp: 680, atk: 64, def: 20, interval: 1.1, range: 26, speed: 30, exp: 92, money: 85 },
       b: { hp: 9800, atk: 115, def: 36, interval: 1.2, range: 32, speed: 26, exp: 2000, money: 4000, boss: true, scale: 1.7 } },
};
// o: name, sprite, pal, weapon, ranged, ab + 배율(hpM, atkM, defM, spdM, ivM)
function wingMob(tier, boss, o) {
  const e = Object.assign({}, WING_TIER[tier][boss ? 'b' : 'n']);
  if (!boss) { e.hp = Math.round(e.hp * 0.9); e.money = Math.round(e.money * 1.15); }   // 고유 능력이 있는 만큼 조금 덜 단단하게
  if (o.ranged) { e.range = boss ? 120 : 110; e.hp = Math.round(e.hp * 0.9); }
  if (o.hpM) e.hp = Math.round(e.hp * o.hpM);
  if (o.atkM) e.atk = Math.round(e.atk * o.atkM);
  if (o.defM) e.def = Math.round(e.def * o.defM);
  if (o.spdM) e.speed = Math.round(e.speed * o.spdM);
  if (o.ivM) e.interval = +(e.interval * o.ivM).toFixed(2);
  const r = Object.assign(e, o);
  delete r.hpM; delete r.atkM; delete r.defM; delete r.spdM; delete r.ivM;
  return r;
}
// 하늘색과 창문 불빛 두 가지로 지역 팔레트를 만든다
function wingPal(sky, win) {
  const c = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const s = c(sky), up = k => hex(s.map(v => v * k + 10 * (k - 1)));
  return { sky, far: up(1.45), mid: up(1.95), ground: up(1.12), line: up(1.6), edge: up(2.3), win };
}
// key → 적 정의 등록, 지역 객체 반환
function wingZone(tier, name, sky, win, mobs, boss, drops, rare) {
  const keys = mobs.map(([k, o]) => { ENEMIES[k] = wingMob(tier, false, o); return k; });
  ENEMIES[boss[0]] = wingMob(tier, true, boss[1]);
  return { name, pal: wingPal(sky, win), enemies: keys, boss: boss[0], drops, rare };
}

// ---------- 날개 고유 능력 (환상체 능력과 같은 틀) ----------
const WING_AB = {
  g_carapace: { name: '갑각', desc: '곤충의 껍질이 처음 몇 번의 공격을 막아 낸다',
    tick(e) { if (e.ab.shell == null) { e.ab.shell = 4; e.def0 = e.def; e.def = e.def0 * 2; } },
    hurt(e, H) { if (e.ab.shell > 0 && --e.ab.shell === 0) { e.def = e.def0; H.float(e.x, e.y - 50, '껍질 깨짐', '#c8d870'); } } },
  g_smoke: { name: '연막', desc: '때때로 연기를 피워 주변 해결사의 공격을 빗나가게 한다',
    tick(e, dt, H) { if (H.every(e, 'smoke', 9, dt)) { for (const u of H.alive()) if (Math.abs(u.x - e.x) < 70) u.slowT = Math.max(u.slowT || 0, 2); H.float(e.x, e.y - 50, '연막', '#9a9a9a'); } } },
  g_volley: { name: '참호전', desc: '체력이 줄수록 전열을 다잡아 더 빨리 공격한다',
    tick(e) { e.interval = e.d.interval * (0.65 + 0.35 * Math.max(0, e.hp / e.maxHp)); } },
  h_pill: { name: '환', desc: '체력이 바닥나면 환을 삼켜 단번에 상처를 아물게 한다',
    tick(e, dt, H) { if (!e.ab.pill && e.hp < e.maxHp * 0.3) { e.ab.pill = 1; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.4); H.float(e.x, e.y - 50, '환', '#d8b070', true); } } },
  h_beast: { name: '흑수화', desc: '궁지에 몰리면 짐승의 모습을 드러내 빠르고 사나워진다',
    tick(e, dt, H) { if (!e.ab.beast && e.hp < e.maxHp * 0.5) { e.ab.beast = 1; e.interval *= 0.7; e.speed *= 1.4; e.atk *= 1.2; H.float(e.x, e.y - 50, '흑수화', '#ff3a2a', true); H.radioLog(`${e.name}이(가) 짐승의 모습을 드러냈다!`, 'bad'); } } },
  j_gamble: { name: '도박', desc: '공격할 때마다 판돈을 건다 — 크게 이기거나 크게 잃는다',
    hit(e, u, H) { const r = Math.random(); if (r < 0.15) { H.float(e.x, e.y - 40, '잭팟', '#ffd84a'); return 1.8; } if (r < 0.4) return 0.5; return 1; } },
  j_house: { name: '하우스의 규칙', desc: '판이 길어지면 하우스가 이긴다 — 시간이 갈수록 강해진다',
    tick(e, dt, H) { if ((e.ab.raise || 0) < 4 && H.every(e, 'house', 12, dt)) { e.ab.raise = (e.ab.raise || 0) + 1; e.atk *= 1.1; H.float(e.x, e.y - 50, '판돈 상승', '#ffd84a'); } } },
  l_meltdown: { name: '붕괴', desc: '쓰러질 때 빛이 터져 주변 해결사를 다치게 한다',
    tick(e, dt, H) { if (!e.ab.melt && e.hp < e.maxHp * 0.15) { e.ab.melt = 1; for (const u of H.alive()) if (Math.abs(u.x - e.x) < 60) { u.hp -= u.maxHp * 0.18; u.flash = 0.1; } H.float(e.x, e.y - 50, '붕괴', '#ffe8a0', true); } } },
  l_whisper: { name: '속삭임', desc: '때때로 해결사의 정신을 흔들어 잠시 멈추게 한다',
    tick(e, dt, H) { if (H.every(e, 'whisper', 11, dt)) { const us = H.alive(); if (us.length) { const u = us[Math.floor(Math.random() * us.length)]; u.stunT = 1.2; H.float(u.x, u.y - 40, '…', '#c8a0ff'); } } } },
  t_slow: { name: '시간 지연', desc: '맞은 해결사의 시간이 느리게 흐른다',
    hit(e, u) { u.slowT = Math.max(u.slowT || 0, 2.5); return 1; } },
  t_rewind: { name: '되감기', desc: '한 번, 쓰러지기 직전의 시간을 되감는다',
    tick(e, dt, H) { if (!e.ab.rw && e.hp < e.maxHp * 0.25) { e.ab.rw = 1; e.hp = e.maxHp * 0.6; H.float(e.x, e.y - 50, '되감기', '#9ad0ff', true); H.radioLog(`${e.name}이(가) 시간을 되감았다!`, 'bad'); } } },
  u_harpoon: { name: '작살', desc: '멀리 있는 해결사를 작살로 끌어당긴다',
    tick(e, dt, H) { if (H.every(e, 'harpoon', 8, dt)) { const us = H.alive(); if (us.length) { const u = us.reduce((a, b) => Math.abs(b.x - e.x) > Math.abs(a.x - e.x) ? b : a); u.x += (e.x - u.x) * 0.6; u.stunT = 0.6; H.float(u.x, u.y - 40, '작살', '#9ac8e0'); } } } },
  u_tide: { name: '밀물', desc: '때때로 물결이 덮쳐 모든 해결사를 뒤로 밀어낸다',
    tick(e, dt, H) { if (H.every(e, 'tide', 12, dt)) { for (const u of H.alive()) { u.x -= 24; u.stunT = Math.max(u.stunT || 0, 0.5); } H.float(e.x, e.y - 50, '밀물', '#5fa8ff', true); } } },
  w_feast: { name: '포식', desc: '쓰러진 자를 먹어 치워 상처를 회복한다',
    tick(e, dt, H) { const c = (e.ab.dead || 0), n = H.enemies.filter(o => o.dead && o !== e).length; if (n > c) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.08 * (n - c)); } e.ab.dead = n; } },
  w_warp: { name: '워프', desc: '때때로 사라졌다가 뒷줄 해결사 앞에 나타난다',
    tick(e, dt, H) { if (H.every(e, 'warp', 10, dt)) { const us = H.alive(); if (us.length) { const u = us.reduce((a, b) => b.x < a.x ? b : a); e.x = u.x + 16; e.cd = 0; H.float(e.x, e.y - 50, '워프', '#b0f0ff', true); } } } },
};
Object.assign(ABNO_AB, WING_AB);

// ---------- 새 구 ----------
const P = (h, c, p, s) => ({ h, c, p, s });   // 사람 모습 팔레트
DISTRICTS.push(
  { name: '7구 뒷골목', wing: 'G사', desc: 'G사 둥지가 다스리는 7구. 연기 전쟁이 끝난 뒤에도 참전병들이 돌아오지 못한 곳.',
    taboo: { id: 'nightwatch', name: '무장한 밤', desc: '밤에 무기를 든 자를 문밖에 세우면 안 된다 — 야간 경계를 세우면 위반', short: '야간 경계 금지' } },
  { name: '8구 뒷골목', wing: 'H사', desc: 'H사 둥지가 다스리는 8구. 환을 빚는 약방과 흑수의 이름이 골목마다 얽혀 있다.',
    taboo: { id: 'marketday', name: '장부의 날', desc: '도시세를 내는 날에는 장부를 덮는다 — 그날 시장에서 사고팔면 위반', short: '세금 날 시장 거래 금지' } },
  { name: '10구 뒷골목', wing: 'J사', desc: 'J사 둥지가 다스리는 10구. 카지노의 불빛이 꺼지지 않고, 모든 것이 판돈이 된다.',
    taboo: { id: 'debt', name: '빚진 밤', desc: '빚을 진 채로 잠들면 안 된다 — 마감을 마치고 다음 날로 넘어갈 때 돈이 마이너스면 위반 (아침 급여는 세지 않는다)', short: '빚진 채 하루 넘기기 금지' } },
  { name: '12구 뒷골목', wing: 'L사', desc: '무너진 L사 둥지의 12구. 둥지가 사라진 뒤에도 빛과 괴물의 흔적이 남아 있다.',
    taboo: { id: 'watchabno', name: '격리 수칙', desc: '그것을 쓰러뜨린 밤에는 눈을 떼면 안 된다 — 환상체를 처치한 날 밤에 야간 경계를 세우지 않으면 위반', short: '환상체 처치 밤 경계 필수' } },
  { name: '20구 뒷골목', wing: 'T사', desc: 'T사 둥지가 다스리는 20구. 이곳의 시간은 빌리고 갚는 것이다.',
    taboo: { id: 'overtime', name: '시간 엄수', desc: '그날의 일은 그날 끝내야 한다 — 마감 때 화로에 작업물이 남아 있으면 위반', short: '마감 때 작업물 금지' } },
  { name: '21구 뒷골목', wing: 'U사', desc: 'U사 둥지가 다스리는 21구. 대호수를 끼고 작살과 그물이 오가는 항구의 뒷골목.',
    taboo: { id: 'voyage', name: '같은 물길', desc: '같은 물길로 나흘을 나가면 물이 노한다 — 갈 곳이 둘 이상인데 같은 출동 지역에 4일 연속 나가면 위반', short: '같은 지역 4일 연속 금지' } },
  { name: '23구 뒷골목', wing: 'W사', desc: 'W사 둥지가 다스리는 23구. 워프 열차가 지나가고, 뒷골목에는 미식가들이 모인다.',
    taboo: { id: 'nowaste', name: '버리지 않는 식탁', desc: '23구에서는 무엇도 버리지 않는다 — 시장에 재료를 팔면 위반', short: '재료 판매 금지' } },
);

DISTRICT_ZONES.push(
  { // 7구 — G사: 연기 전쟁의 잔재
    3: wingZone(3, '참전병 골목', '#161a14', '#c8d870',
      [['g_vet', { name: '퇴역 병사', sprite: 'human', pal: P('#3a3a2a', '#5a5a3a', '#2a2a1e', '#c8a888'), weapon: 'rifle', ranged: true }],
       ['g_bugling', { name: '곤충 개조병 잔당', sprite: 'human', pal: P('#2a3a1a', '#4a5a2a', '#1e2614', '#a8b878'), weapon: 'claw', ab: 'g_carapace' }]],
      ['g_sergeant', { name: '부사관', sprite: 'human', pal: P('#2a2a1a', '#4a4a2e', '#1a1a12', '#c8a888'), weapon: 'bayonet', ab: 'g_volley' }],
      { steel: 3, kevlar: 3, clot: 2, cog: 2, fuel: 2, bayonetlug: 1, talon: 2, thread: 2, lining: 1, alloy: 1 }, ['alloy', 'weave', 'talon', 'bayonetlug']),
    5: wingZone(5, 'G사 옛 참호', '#14160e', '#e0e070',
      [['g_drone', { name: '벌레 병사', sprite: 'bot', pal: { m: '#4a5a2a', r: '#e0e070' }, ab: 'g_carapace' }],
       ['g_gasser', { name: '연막병', sprite: 'cloak', pal: { m: '#3a3a30', y: '#c8c8a0' }, weapon: 'staff', ab: 'g_smoke' }]],
      ['g_mantis', { name: '사마귀 팔 개조병', sprite: 'human', pal: P('#3a4a1e', '#5a6a2a', '#1e2410', '#b8c890'), weapon: 'armblade', ab: 'nh_verdict' }],
      { alloy: 3, weave: 3, blackiron: 2, silk: 1, fuel: 2, battery: 2, armmount: 2, servo: 1, heavyplate: 1, greathilt: 1 }, ['blackiron', 'silk', 'armmount', 'servo']),
    8: wingZone(8, 'G사 둥지 경계', '#12140c', '#f0f080',
      [['g_guard', { name: 'G사 경비대', sprite: 'human', pal: P('#2a2e1a', '#4e5a30', '#1a1e10', '#c8a888'), weapon: 'rifle', ranged: true }],
       ['g_elite', { name: '정예 개조병', sprite: 'human', pal: P('#1e2a12', '#3e5a1e', '#121a0a', '#a8c070'), weapon: 'armblade', ab: 'g_carapace' }]],
      ['g_commander', { name: 'G사 지휘관', sprite: 'human', pal: P('#1a1a12', '#3a3e26', '#12140c', '#c8a888'), weapon: 'lance', ab: 'r_drill' }],
      { blackiron: 3, silk: 3, stigma: 2, dawn: 2, servo: 2, armmount: 1, capacitor: 1, ember: 1, mechcore: 1 }, ['stigma', 'dawn', 'servo', 'capacitor']),
  },
  { // 8구 — H사: 환과 흑수
    3: wingZone(3, '약재 골목', '#1a1612', '#e8c070',
      [['h_addict', { name: '환 중독자', sprite: 'human', pal: P('#3a2a1a', '#6a4a2a', '#2a1a10', '#d8b494'), weapon: 'knuckle', ab: 'h_pill' }],
       ['h_porter', { name: '약방 짐꾼', sprite: 'human', pal: P('#2a2018', '#5a4a30', '#1e160e', '#c8a080'), weapon: 'club', hpM: 1.2 }]],
      ['h_druggist', { name: '약방 주인', sprite: 'cloak', pal: { m: '#5a3a1e', y: '#e8c070' }, weapon: 'fan', ab: 'h_pill' }],
      { steel: 3, leather: 2, kevlar: 2, clot: 3, bloodvial: 2, fanrib: 2, hwanhilt: 1, coil: 1, alloy: 1 }, ['alloy', 'weave', 'bloodvial', 'hwanhilt']),
    5: wingZone(5, '흑수의 사냥터', '#180e0e', '#ff6a3a',
      [['h_pawn', { name: '흑수 하급 조직원', sprite: 'human', pal: P('#1a1a1a', '#3a1a1a', '#121010', '#d8b494'), weapon: 'hwando' }],
       ['h_scout', { name: '흑수 - 묘 정찰조', sprite: 'cloak', pal: { m: '#2a2430', y: '#f0e8ff' }, weapon: 'dagger', spdM: 1.4, ivM: 0.8 }]],
      ['h_tiger', { name: '흑수 - 인 부두목', sprite: 'human', pal: P('#c87818', '#2a1a10', '#1a120a', '#e0b080'), weapon: 'hwando', ab: 'h_beast' }],
      { alloy: 3, weave: 3, blackiron: 2, silk: 2, ember: 1, bloodvial: 2, hwanhilt: 2, twinhilt: 1, tachimount: 1, crystal: 1 }, ['blackiron', 'silk', 'tachimount', 'ember']),
    8: wingZone(8, 'H사 둥지 경계', '#160c0a', '#ffb050',
      [['h_guard', { name: 'H사 경비 무사', sprite: 'human', pal: P('#1a1210', '#5a1a14', '#140c0a', '#d8b494'), weapon: 'glaive' }],
       ['h_doctor', { name: 'H사 의원', sprite: 'cloak', pal: { m: '#3a2a1e', y: '#ffe0a0' }, weapon: 'staff', ranged: true, ab: 'r_antler' }]],
      ['h_horse', { name: '흑수 - 오 대장', sprite: 'human', pal: P('#5a3a2a', '#2a1a10', '#1a100a', '#d0a880'), weapon: 'lance', ab: 'h_beast' }],
      { blackiron: 3, silk: 3, stigma: 2, dawn: 2, ember: 2, pendulum: 1, tachimount: 1, glaivehaft: 1, mechcore: 1 }, ['stigma', 'dawn', 'ember', 'pendulum']),
  },
  { // 10구 — J사: 카지노
    3: wingZone(3, '빚쟁이 골목', '#1a1420', '#ffd84a',
      [['j_debtor', { name: '도박 빚쟁이', sprite: 'human', pal: P('#3a3040', '#5a4a6a', '#2a2030', '#d8b494'), weapon: 'knife', ab: 'j_gamble' }],
       ['j_collector', { name: '추심원', sprite: 'human', pal: P('#1a1a1a', '#2a2a3a', '#141418', '#c8a888'), weapon: 'club', hpM: 1.15 }]],
      ['j_loanshark', { name: '사채업자', sprite: 'human', pal: P('#2a1a2a', '#6a3a6a', '#1e121e', '#d8b494'), weapon: 'revolver', ranged: true, ab: 'j_gamble' }],
      { steel: 3, brass: 3, kevlar: 2, clot: 2, coil: 2, cylinder: 1, guard: 1, thread: 2, cog: 1, alloy: 1 }, ['alloy', 'weave', 'cylinder', 'brass']),
    5: wingZone(5, '카지노 지하 금고', '#160e1a', '#ff5ab4',
      [['j_dealer', { name: '딜러', sprite: 'cloak', pal: { m: '#1a1a22', y: '#ffd84a' }, weapon: 'fan', ab: 'j_gamble' }],
       ['j_vaultbot', { name: '금고 경비 기계', sprite: 'bot', pal: { m: '#8a7a3a', r: '#ffd84a' }, hpM: 1.25, defM: 1.3, spdM: 0.7 }]],
      ['j_manager', { name: '하우스 지배인', sprite: 'human', pal: P('#1a1218', '#4a2a4a', '#120c12', '#d8b494'), weapon: 'rapier', ab: 'j_house' }],
      { alloy: 3, weave: 3, blackiron: 2, silk: 2, battery: 2, crystal: 2, cylinder: 1, scope: 1, guard: 1, capacitor: 1 }, ['blackiron', 'silk', 'capacitor', 'scope']),
    8: wingZone(8, 'J사 둥지 경계', '#140c16', '#ffcf4a',
      [['j_bodyguard', { name: 'J사 경호원', sprite: 'human', pal: P('#141414', '#1e1e24', '#0e0e10', '#c8a888'), weapon: 'shotgun', ranged: true }],
       ['j_croupier', { name: 'J사 크루피어', sprite: 'cloak', pal: { m: '#2a1424', y: '#ffd84a' }, weapon: 'scissors', ab: 'j_gamble' }]],
      ['j_gambler', { name: 'J사 승부사', sprite: 'human', pal: P('#ffd84a', '#3a1a3a', '#1a0e1a', '#e0c0a0'), weapon: 'revolver', ab: 'j_house' }],
      { blackiron: 3, silk: 3, stigma: 2, dawn: 2, capacitor: 1, scope: 1, pump: 1, mechcore: 1, meteor: 2 }, ['stigma', 'dawn', 'capacitor', 'scope']),
  },
  { // 12구 — L사: 무너진 둥지
    3: wingZone(3, 'L사 폐 지부 외곽', '#141418', '#e8e0c0',
      [['l_clerk', { name: '실성한 전 직원', sprite: 'human', pal: P('#3a3a3a', '#2a2a30', '#1a1a1e', '#d8c8b8'), weapon: 'revolver', ranged: true }],
       ['l_stray', { name: '빛에 그을린 자', sprite: 'cloak', pal: { m: '#4a4a44', y: '#fff4c0' }, weapon: 'club', ab: 'l_meltdown' }]],
      ['l_manager', { name: '미쳐 버린 관리인', sprite: 'human', pal: P('#2a2a2a', '#1a1a20', '#121216', '#e0d0c0'), weapon: 'staff', ab: 'l_whisper' }],
      { steel: 3, kevlar: 3, clot: 2, crystal: 1, coil: 2, battery: 1, lining: 2, sealant: 1, pivot: 1, alloy: 1 }, ['alloy', 'weave', 'crystal', 'pivot']),
    5: wingZone(5, 'L사 붕괴 지구', '#100e16', '#fff0a0',
      [['l_agent', { name: '침식된 직원', sprite: 'human', pal: P('#2a2a30', '#1a1a1e', '#121214', '#c8b8c8'), weapon: 'scythe', ab: 'l_whisper' }],
       ['l_glow', { name: '흘러나온 빛 덩어리', sprite: 'blob', pal: { m: '#e8e0b0', e: '#ffffff', r: '#ffd84a' }, ab: 'l_meltdown', spdM: 0.7 }]],
      ['l_apostle', { name: '사도의 잔재', sprite: 'cloak', pal: { m: '#e8e4d8', y: '#ffd84a' }, weapon: 'spear', ab: 'onesin' }],
      { alloy: 3, weave: 3, blackiron: 2, silk: 2, crystal: 2, ink: 1, pendulum: 1, pivot: 1, brushtip: 1, shadecloth: 1 }, ['blackiron', 'silk', 'ink', 'pendulum']),
    8: wingZone(8, 'L사 둥지 잔해', '#0e0c14', '#fff4c0',
      [['l_suppress', { name: '진압 요원 잔당', sprite: 'human', pal: P('#1a1a1a', '#121212', '#0a0a0a', '#d8c8b8'), weapon: 'greatsword' }],
       ['l_core', { name: '흩어진 코어 파편', sprite: 'blob', pal: { m: '#c8c0a0', e: '#ff4a4a', r: '#ffd84a' }, ranged: true, ab: 'l_meltdown' }]],
      ['l_light', { name: '흘러넘친 빛', sprite: 'cloak', pal: { m: '#fff8e0', y: '#ffd84a' }, weapon: 'staff', ab: 'l_whisper' }],
      { blackiron: 3, silk: 3, stigma: 2, dawn: 2, ink: 2, pendulum: 2, brushtip: 1, mechcore: 1 }, ['stigma', 'dawn', 'ink', 'pendulum']),
  },
  { // 20구 — T사: 시간
    3: wingZone(3, '느린 시계 골목', '#12161c', '#9ad0ff',
      [['t_slowpoke', { name: '늘어진 사람', sprite: 'human', pal: P('#3a4a5a', '#2a3a4a', '#1a222a', '#c8c0b8'), weapon: 'club', hpM: 1.4, spdM: 0.6, ab: 't_slow' }],
       ['t_tinker', { name: '시계 수리공', sprite: 'human', pal: P('#4a3a2a', '#5a5a6a', '#2a2a30', '#d8b494'), weapon: 'hammer' }]],
      ['t_keeper', { name: '고장 난 시계탑지기', sprite: 'bot', pal: { m: '#5a6a7a', r: '#9ad0ff' }, ab: 't_slow' }],
      { steel: 3, brass: 3, kevlar: 2, coil: 3, cog: 2, battery: 1, hammerhead: 1, plating: 1, alloy: 1 }, ['alloy', 'weave', 'battery', 'brass']),
    5: wingZone(5, 'T사 시간 징수소', '#0e1218', '#7ab8ff',
      [['t_collector', { name: '시간 징수원', sprite: 'human', pal: P('#1a2030', '#2a3a5a', '#121620', '#d8c8b8'), weapon: 'rapier', ab: 't_slow' }],
       ['t_hand', { name: '초침 경비', sprite: 'bot', pal: { m: '#6a7a8a', r: '#e0f0ff' }, weapon: 'spear', ivM: 0.75 }]],
      ['t_chief', { name: '징수 반장', sprite: 'human', pal: P('#141820', '#22304a', '#0e1018', '#d8c8b8'), weapon: 'glaive', ab: 't_rewind' }],
      { alloy: 3, weave: 3, blackiron: 2, silk: 1, battery: 2, crystal: 2, capacitor: 1, resonator: 1, mechhinge: 1, pendulum: 1 }, ['blackiron', 'silk', 'resonator', 'mechhinge']),
    8: wingZone(8, 'T사 둥지 경계', '#0c1016', '#b0e0ff',
      [['t_warden', { name: 'T사 시간 관리인', sprite: 'cloak', pal: { m: '#1a2436', y: '#b0e0ff' }, weapon: 'staff', ranged: true, ab: 't_slow' }],
       ['t_guard', { name: 'T사 경비', sprite: 'human', pal: P('#101418', '#1e2a3e', '#0a0c10', '#d8c8b8'), weapon: 'shield' }]],
      ['t_executor', { name: 'T사 시간 집행관', sprite: 'human', pal: P('#e8f0ff', '#1a2236', '#0c1018', '#e0d0c0'), weapon: 'tachi', ab: 't_rewind' }],
      { blackiron: 3, silk: 3, stigma: 2, dawn: 2, pendulum: 2, resonator: 1, capacitor: 1, mechcore: 1, mechhinge: 1 }, ['stigma', 'dawn', 'pendulum', 'resonator']),
  },
  { // 21구 — U사: 대호수
    3: wingZone(3, '부둣가 뒷골목', '#10161a', '#8ac8e0',
      [['u_sailor', { name: '선원 깡패', sprite: 'human', pal: P('#2a2a2a', '#3a4a5a', '#1a2028', '#c8a080'), weapon: 'axe' }],
       ['u_harpooner', { name: '작살잡이', sprite: 'human', pal: P('#3a2a1a', '#2a3a4a', '#1a1e24', '#c8a080'), weapon: 'harpoon', ab: 'u_harpoon' }]],
      ['u_dockboss', { name: '부두 두목', sprite: 'human', pal: P('#1a1a1a', '#1e2a3a', '#12161c', '#c89a78'), weapon: 'hammer', hpM: 1.15 }],
      { steel: 3, kevlar: 2, canvas: 3, leather: 2, clot: 2, barb: 2, braid: 2, chainlink: 2, hook: 1, alloy: 1 }, ['alloy', 'weave', 'barb', 'hook']),
    5: wingZone(5, '대호수 연안', '#0c141a', '#5fa8ff',
      [['u_fisher', { name: '호수 어부', sprite: 'human', pal: P('#3a3a2a', '#4a5a4a', '#22282a', '#c8a080'), weapon: 'harpoon', ab: 'u_harpoon' }],
       ['u_drowned', { name: '물에 불은 시체', sprite: 'cloak', pal: { m: '#4a5a5a', y: '#9ad0d0' }, hpM: 1.3, spdM: 0.7 }]],
      ['u_lakebeast', { name: '호수의 괴어', sprite: 'shark', pal: { m: '#3a5a6a', w: '#e8f0f0', e: '#ffd84a', p: '#c8b494' }, ab: 'u_tide' }],
      { alloy: 3, weave: 3, blackiron: 2, silk: 1, barb: 2, hook: 1, crystal: 1, ink: 2, sealant: 1, heavyplate: 1 }, ['blackiron', 'silk', 'ink', 'barb']),
    8: wingZone(8, 'U사 둥지 경계', '#0a1218', '#7ac8ff',
      [['u_mate', { name: 'U사 항해사', sprite: 'human', pal: P('#1a1a1a', '#e8e8e0', '#1a2230', '#d8b494'), weapon: 'rifle', ranged: true }],
       ['u_whaler', { name: 'U사 작살대', sprite: 'human', pal: P('#141414', '#2a3a4e', '#10141a', '#c8a080'), weapon: 'harpoon', ab: 'u_harpoon' }]],
      ['u_captain', { name: 'U사 선장', sprite: 'human', pal: P('#e8e8e8', '#1a2436', '#0e121a', '#d0a880'), weapon: 'harpoon', ab: 'u_tide' }],
      { blackiron: 3, silk: 3, stigma: 2, dawn: 2, ink: 2, meteor: 2, scope: 1, vamplate: 1, mechcore: 1 }, ['stigma', 'dawn', 'ink', 'vamplate']),
  },
  { // 23구 — W사: 워프 열차와 미식가
    3: wingZone(3, '미식 골목', '#1a1210', '#ff9a6a',
      [['w_gourmet', { name: '미식가 패거리', sprite: 'human', pal: P('#2a1a14', '#e8e0d8', '#2a1e1a', '#d8b494'), weapon: 'knife', ab: 'w_feast' }],
       ['w_butcher', { name: '정육 손질꾼', sprite: 'human', pal: P('#3a2a20', '#8a3a3a', '#2a1a14', '#c8a080'), weapon: 'axe', hpM: 1.2 }]],
      ['w_chef', { name: '골목 요리사', sprite: 'human', pal: P('#f0f0f0', '#e8e8e8', '#3a2a2a', '#d8b494'), weapon: 'greatsword', ab: 'w_feast' }],
      { steel: 3, leather: 3, kevlar: 2, clot: 3, bloodvial: 2, fang: 2, shiv: 2, haft: 1, alloy: 1 }, ['alloy', 'weave', 'bloodvial', 'fang']),
    5: wingZone(5, '워프 열차 정비창', '#0e1218', '#b0f0ff',
      [['w_mechanic', { name: 'W사 정비공', sprite: 'human', pal: P('#2a2a2a', '#3a4a5a', '#1a2028', '#c8a888'), weapon: 'hammer' }],
       ['w_residue', { name: '워프 잔해에 붙은 것', sprite: 'blob', pal: { m: '#4a5a7a', e: '#b0f0ff', r: '#2a3a5a' }, ab: 'w_warp' }]],
      ['w_foreman', { name: '정비창 감독', sprite: 'bot', pal: { m: '#5a6a7a', r: '#b0f0ff' }, weapon: 'hammer', ab: 'w_warp' }],
      { alloy: 3, weave: 3, blackiron: 2, silk: 1, battery: 2, cog: 2, capacitor: 1, servo: 1, mechhinge: 1, plating: 1 }, ['blackiron', 'silk', 'capacitor', 'mechhinge']),
    8: wingZone(8, 'W사 둥지 경계', '#0c0e16', '#c0f8ff',
      [['w_cleanup', { name: 'W사 정리 요원', sprite: 'human', pal: P('#1a1a1a', '#1e2a3e', '#0e1218', '#d8c8b8'), weapon: 'dualblade', ab: 'w_warp' }],
       ['w_conductor', { name: 'W사 승무원', sprite: 'human', pal: P('#2a2a3a', '#3a3a5a', '#1a1a2a', '#d8c8b8'), weapon: 'revolver', ranged: true }]],
      ['w_chief', { name: 'W사 정리 반장', sprite: 'human', pal: P('#e8e8e8', '#1a2236', '#0c1018', '#d8c8b8'), weapon: 'tfgreat', ab: 'w_warp' }],
      { blackiron: 3, silk: 3, stigma: 2, dawn: 2, capacitor: 2, servo: 1, mechcore: 1, synthskin: 1, meteor: 1 }, ['stigma', 'dawn', 'capacitor', 'mechcore']),
  },
);
krwEnemies();   // 여기서 추가한 적의 보상도 원화로
