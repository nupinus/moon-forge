'use strict';
// 화폐 '안'은 한국 원화 기준 가치 (원작에서도 안 ≈ 원). 아래 수치는 천 안 단위로 적고 KRW를 곱한다.
const KRW = 1000;
// ---------- 버전 · 공지 (커밋할 때마다 올린다 — 내용은 짧게, 숨은 것은 알려주지 않는다) ----------
const GAME_VERSION = '1.3';
const NOTICES = [
  { v: '1.3', date: '2026-11-19', items: ['장비가 덜 부서집니다 — 내구로 파괴를 한 번 막을 수 있습니다 (파괴 보호)', '오래 두드릴수록 돌아오는 것이 커집니다', '성공·대성공·손상·파괴의 손맛이 저마다 다릅니다', '부서진 장비가 잔흔을 남깁니다', '공방이 가장 높은 곳에 오르면 그다음이 있습니다', '가끔 공방에 이상한 기운이 감돕니다', '공방 시설을 새로 정비했습니다', '경매장이 마감 화면의 탭으로 옮겨졌습니다', '어딘가에 암시장이 열립니다', '일반 시장에서는 고급 재료와 인두를 팔지 않습니다', '사무소 등급이 올라야 해결사들도 더 높은 등급에 오를 수 있습니다', '1급 해결사에게 하나협회의 연락이 올지도 모릅니다', '해결사가 성장하면 급여도 오릅니다', '재료값·장비 판매가·성장 속도를 다듬었습니다', '모바일 화면과 튜토리얼 위치 등 여러 화면 문제를 고쳤습니다'] },
  { v: '1.2', date: '2026-11-18', items: ['저장 후 이어하면 구역이 바뀌던 문제를 비롯한 여러 버그를 고쳤습니다', '새로운 구 7곳이 열렸습니다 — 구마다 현장의 모습과 금기가 다릅니다', '금기가 더 이상 대장간 일을 막지 않습니다', '두드리는 동안 완성될 장비의 능력치를 볼 수 있습니다', '대성공 별명에 등급이 생겼습니다', '각인의 세기가 장비 등급에 따라 달라집니다', '지은 이름이 장비의 이름이 됩니다', '공방이 커질수록 찾아오는 손님이 달라집니다', '공방에 새로운 시설이 들어설 자리가 생겼습니다', '가끔 경매장이 열립니다', '원정을 떠날 수 있습니다', '누군가의 자아가 피어날지도 모릅니다', '처음 시작하는 공방주를 위한 안내가 생겼습니다', '손가락, 재료값 등 여러 가지를 다듬었습니다'] },
  { v: '1.1', date: '2026-11-16', items: ['장비 그림을 새로 그렸습니다', '단조대가 새 단장을 했습니다', '뒷골목에 새 구역과 출동 지역이 생겼습니다', '재료마다 망치질의 손맛이 다릅니다', '같은 종류 장비는 골라서 납품할 수 있습니다', '승급의 순간을 축하합니다', '하루가 조금 길어졌습니다', '현장에 더 많은 환상체가 나타납니다', '환상체마다 저만의 능력이 있습니다', 'E.G.O 장비가 제 모습을 찾았습니다', '현장과 단조대를 새로 그렸습니다', '상단에 공지 버튼이 생겼습니다', '새 버전이 나오면 구석에서 조용히 알려 드립니다', '구역을 누르면 그곳의 날개와 금기를 볼 수 있습니다', '재료함이 등급별로 정리됩니다', '장비 값이 등급과 솜씨, 깃든 힘에 따라 매겨집니다'] },
  { v: '1.0', date: '2026-11-15', items: ['첫 공개'] },
];
const DAY_SPEED = 3.75;   // 게임 시간: 현실 1초당 몇 분 (배속 ×1)
const HUNT_YIELD = DAY_SPEED / 5;   // 하루가 길어진 만큼 처치당 보상을 줄여 하루 수확은 그대로
// ============================================================
//  문 포지 (Moon Forge) — 데이터 정의
//  Project Moon 세계관 기반 비공식 팬게임
// ============================================================

// cat: metal(금속: 무기 주재료 / 둔기·갑주 형태재료), fabric(천: 방어구 주재료),
//      shape(형태재료), core(속성재료)
const MATERIALS = {
  scrap:     { name: '고철',          grade: 1, cat: 'metal',  color: '#9a8f80', price: 12,  adj: '고철' },
  steel:     { name: '강철 조각',     grade: 2, cat: 'metal',  color: '#c3ced6', price: 26,  adj: '강철' },
  alloy:     { name: '특수 합금',     grade: 3, cat: 'metal',  color: '#7fd6c8', price: 58, adj: '합금' },
  blackiron: { name: '흑철',          grade: 4, cat: 'metal',  color: '#7a6f9a', price: 128, adj: '흑철' },
  stigma:    { name: '성흔 금속',     grade: 5, cat: 'metal',  color: '#f0d77a', price: 0,   adj: '성흔' },
  leather:   { name: '가죽 끈',       grade: 1, cat: 'fabric', color: '#9a643f', price: 18,  adj: '가죽' },
  kevlar:    { name: '방탄 섬유',     grade: 2, cat: 'fabric', color: '#7a8a5a', price: 40,  adj: '방탄' },
  weave:     { name: '강화 섬유',     grade: 3, cat: 'fabric', color: '#4f74a8', price: 85, adj: '강화' },
  silk:      { name: '이질 비단',     grade: 4, cat: 'fabric', color: '#b05a92', price: 195, adj: '비단' },
  dawn:      { name: '여명의 천',     grade: 5, cat: 'fabric', color: '#f2e8d0', price: 0,   adj: '여명' },
  bone:      { name: '뼛조각',        grade: 1, cat: 'shape', shape: 'spear', color: '#e3dcc2', price: 10 },
  cog:       { name: '기계 톱니',     grade: 2, cat: 'shape', shape: 'gun',   color: '#c9a050', price: 25, gunpart: true },
  clot:      { name: '핏방울 응고물', grade: 1, cat: 'core', trait: 'bleed',   color: '#c0303f', price: 22 },
  fuel:      { name: '타다 남은 연료', grade: 2, cat: 'core', trait: 'burn',    color: '#ef8a2e', price: 36 },
  coil:      { name: '진동 코일',     grade: 2, cat: 'core', trait: 'tremor',  color: '#e3cf4a', price: 37 },
  crystal:   { name: '균열 수정',     grade: 3, cat: 'core', trait: 'rupture', color: '#66d9ef', price: 85 },
  battery:   { name: '충전 배터리',   grade: 3, cat: 'core', trait: 'charge',  color: '#7fb2ff', price: 90 },
  ink:       { name: '침전된 잉크',   grade: 4, cat: 'core', trait: 'sinking', color: '#6a6fe0', price: 0 },
  pendulum:  { name: '고요한 추',     grade: 4, cat: 'core', trait: 'poise',   color: '#d8d8f4', price: 0 },
  // --- 확장 재료 ---
  brass:     { name: '놋쇠',          grade: 2, cat: 'metal',  color: '#c9a24a', price: 27,  adj: '놋쇠' },
  meteor:    { name: '운철',          grade: 4, cat: 'metal',  color: '#6a6a7e', price: 0,   adj: '운철' },
  canvas:    { name: '범포',          grade: 1, cat: 'fabric', color: '#b8a888', price: 17,  adj: '범포' },
  shadecloth:{ name: '차광 섬유',     grade: 3, cat: 'fabric', color: '#3e3a4e', price: 0,   adj: '차광' },
  fang:      { name: '들개 송곳니',   grade: 1, cat: 'shape', shape: 'knuckle',    color: '#efe6cf', price: 12 },
  haft:      { name: '굵은 자루',     grade: 1, cat: 'shape', shape: 'axe',        color: '#7a5434', price: 15 },
  chainlink: { name: '녹슨 사슬 고리', grade: 1, cat: 'shape', shape: 'chain',     color: '#9a6a4a', price: 20 },
  tsuba:     { name: '흑운회 날밑',   grade: 2, cat: 'shape', shape: 'katana',     color: '#2a2a34', price: 0 },
  guard:     { name: '세검 손잡이',   grade: 2, cat: 'shape', shape: 'rapier',     color: '#d8c890', price: 29 },
  hook:      { name: '갈고리',        grade: 3, cat: 'shape', shape: 'scythe',     color: '#8a8a7a', price: 0 },
  greathilt: { name: '대검 자루',     grade: 3, cat: 'shape', shape: 'greatsword', color: '#5a4a3a', price: 0 },
  thread:    { name: '방탄 실',       grade: 2, cat: 'shape', ashape: 'suit',      color: '#4a4a5a', price: 30 },
  lining:    { name: '차광 안감',     grade: 2, cat: 'shape', ashape: 'cloak',     color: '#2e2a3a', price: 35 },
  bloodvial: { name: '응축 혈액',     grade: 3, cat: 'core', trait: 'bleed',   color: '#a01830', price: 0 },
  ember:     { name: '꺼지지 않는 잉걸', grade: 4, cat: 'core', trait: 'burn', color: '#ff6a1a', price: 0 },
  resonator: { name: '공명 장치',     grade: 4, cat: 'core', trait: 'tremor',  color: '#f0e070', price: 0 },
  capacitor: { name: '고압 축전기',   grade: 5, cat: 'core', trait: 'charge',  color: '#9ac8ff', price: 0 },
  // --- 무기 종류 확장: 형태재료 ---
  shiv:       { name: '짧은 칼자루',   grade: 1, cat: 'shape', shape: 'dagger',    color: '#8a6a4a', price: 12 },
  oakrod:     { name: '참나무 막대',   grade: 1, cat: 'shape', shape: 'club',      color: '#8a6438', price: 10 },
  braid:      { name: '꼰 가죽줄',     grade: 1, cat: 'shape', shape: 'whip',      color: '#7a4a2a', price: 14 },
  rod:        { name: '곧은 지팡이대', grade: 1, cat: 'shape', shape: 'staff',     color: '#a08060', price: 16 },
  hammerhead: { name: '망치 머리',     grade: 2, cat: 'shape', shape: 'hammer',    color: '#6a6a72', price: 40 },
  plating:    { name: '손등 판금',     grade: 2, cat: 'shape', shape: 'gauntlet',  color: '#9aa0a8', price: 28 },
  shieldboss: { name: '방패 심',       grade: 2, cat: 'shape', shape: 'shield',    color: '#8a7a5a', price: 38 },
  twinhilt:   { name: '쌍 손잡이',     grade: 2, cat: 'shape', shape: 'dualblade', color: '#4a3a3a', price: 20 },
  hwanhilt:   { name: '환도 자루',     grade: 2, cat: 'shape', shape: 'hwando',    color: '#3a2a20', price: 45 },
  bowstring:  { name: '활시위',        grade: 2, cat: 'shape', shape: 'bow',       color: '#d8ccb0', price: 35 },
  fanrib:     { name: '부채살',        grade: 2, cat: 'shape', shape: 'fan',       color: '#c8a868', price: 20 },
  talon:      { name: '짐승 발톱',     grade: 2, cat: 'shape', shape: 'claw',      color: '#e0d4b8', price: 0 },
  barb:       { name: '미늘',          grade: 2, cat: 'shape', shape: 'harpoon',   color: '#7a8a8a', price: 0 },
  cylinder:   { name: '회전 탄창',     grade: 2, cat: 'shape', shape: 'revolver',  color: '#8a8a90', price: 30, gunpart: true },
  tachimount: { name: '태도 장식',     grade: 3, cat: 'shape', shape: 'tachi',     color: '#b08a3a', price: 0 },
  glaivehaft: { name: '언월 자루',     grade: 3, cat: 'shape', shape: 'glaive',    color: '#5a3a2a', price: 85 },
  vamplate:   { name: '기병창 손보호대', grade: 3, cat: 'shape', shape: 'lance',   color: '#a0a0b0', price: 0 },
  trigger:    { name: '석궁 방아쇠',   grade: 3, cat: 'shape', shape: 'crossbow',  color: '#6a5a4a', price: 90 },
  brushtip:   { name: '붓털',          grade: 3, cat: 'shape', shape: 'brush',     color: '#2a2a2a', price: 0 },
  pivot:      { name: '가위 축',       grade: 3, cat: 'shape', shape: 'scissors',  color: '#b8b8c0', price: 0 },
  armmount:   { name: '팔 장착대',     grade: 3, cat: 'shape', shape: 'armblade',  color: '#5a6a7a', price: 0 },
  longbarrel: { name: '긴 총열',       grade: 3, cat: 'shape', shape: 'rifle',     color: '#4a4a52', price: 55, gunpart: true },
  pump:       { name: '펌프 장치',     grade: 3, cat: 'shape', shape: 'shotgun',   color: '#6a4a3a', price: 0, gunpart: true },
  bayonetlug: { name: '착검 장치',     grade: 3, cat: 'shape', shape: 'bayonet',   color: '#7a7a6a', price: 45, gunpart: true },
  scope:      { name: '조준경',        grade: 4, cat: 'shape', shape: 'sniper',    color: '#3a4a5a', price: 0, gunpart: true },
  mechhinge:  { name: '변형 경첩',     grade: 4, cat: 'shape', shape: 'tfaxe',     color: '#8a7a6a', price: 0 },
  mechcore:   { name: '변형 기어함',   grade: 4, cat: 'shape', shape: 'tfgreat',   color: '#7a6a5a', price: 0 },
  // --- 방어구 종류 확장: 형태재료 (천 주재료와 합성) ---
  embroid:    { name: '자수 실',       grade: 1, cat: 'shape', ashape: 'robe',       color: '#c8a0d8', price: 12 },
  lamella:    { name: '가죽 미늘판',   grade: 1, cat: 'shape', ashape: 'lightarmor', color: '#8a6a48', price: 18 },
  ceramic:    { name: '세라믹 판',     grade: 2, cat: 'shape', ashape: 'vest',       color: '#d8d0c0', price: 45 },
  mailring:   { name: '갑옷 고리',     grade: 2, cat: 'shape', ashape: 'chainmail',  color: '#a8a8b0', price: 48 },
  heavyplate: { name: '두꺼운 장갑판', grade: 3, cat: 'shape', ashape: 'heavyarmor', color: '#6a6a74', price: 160 },
  sealant:    { name: '밀폐 코팅',     grade: 3, cat: 'shape', ashape: 'hazmat',     color: '#c8d84a', price: 0 },
  servo:      { name: '서보 모터',     grade: 4, cat: 'shape', ashape: 'powerarmor', color: '#e0a040', price: 0 },
  synthskin:  { name: '인공 피부막',   grade: 4, cat: 'shape', ashape: 'cyberskin',  color: '#e8b8a8', price: 0 },
};
const MAT_ORDER = Object.keys(MATERIALS);

// 공방 레벨별로 시장에서 살 수 있는 재료 (누적)
const MARKET_TIERS = [
  ['scrap', 'leather', 'bone', 'canvas', 'fang', 'haft', 'shiv', 'oakrod', 'braid', 'embroid', 'lamella'],
  ['steel', 'kevlar', 'clot', 'brass', 'chainlink', 'thread', 'rod', 'hammerhead', 'plating', 'shieldboss', 'ceramic'],
  ['cog', 'fuel', 'coil', 'guard', 'lining', 'twinhilt', 'hwanhilt', 'bowstring', 'fanrib', 'cylinder', 'mailring'],
  ['alloy', 'weave', 'glaivehaft', 'trigger', 'longbarrel', 'bayonetlug', 'heavyplate'],
  ['crystal', 'battery'],   // 4등급 이상 고급재료는 암시장에서만
];

const FORMS = {
  sword: { name: '장검', kind: 'weapon', tiers: ['무딘 장검', '장검', '기사의 장검', '명검', '성검'],      atk: 6, interval: 1.0, range: 24 },
  mace:  { name: '철퇴', kind: 'weapon', tiers: ['못박이 철퇴', '철퇴', '가시 철퇴', '파쇄 철퇴', '천벌의 철퇴'], atk: 9, interval: 1.5, range: 22, stagger: 0.15 },
  spear: { name: '창',   kind: 'weapon', tiers: ['꼬챙이', '창', '장창', '용골창', '천공의 창'],          atk: 7, interval: 1.2, range: 38 },
  gun:   { name: '권총', kind: 'weapon', valueMult: 0.4, tiers: ['사제 권총', '권총', '자동 권총', '정밀 권총', '심판의 권총'], atk: 15, interval: 1.5, range: 130, ranged: true, gun: true },
  coat:  { name: '코트', kind: 'armor',  tiers: ['누더기', '외투', '전투복', '해결사 코트', '전설의 코트'], def: 3, hp: 20 },
  plate: { name: '판금갑주', kind: 'armor', tiers: ['철판 조끼', '흉갑', '판금갑주', '요새 갑주', '불괴의 갑주'], def: 6, hp: 8, slow: 0.12 },
  // --- 확장 형태 (원작의 조직·협회가 쓰는 무기에서) ---
  knuckle:    { name: '너클', kind: 'weapon', tiers: ['싸구려 너클', '너클', '강철 주먹', '파쇄 건틀릿', '붕권'],   atk: 4,  interval: 0.6, range: 18, desc: '빠른 연타' },
  chain:      { name: '사슬', kind: 'weapon', tiers: ['녹슨 사슬', '쇠사슬', '사슬낫', '갈퀴 사슬', '심연의 사슬'], atk: 6,  interval: 1.1, range: 36, desc: '긴 사거리 · 녹슨 사슬의 무기' },
  axe:        { name: '도끼', kind: 'weapon', tiers: ['손도끼', '전투 도끼', '양날 도끼', '처형 도끼', '천둥 도끼'], atk: 10, interval: 1.4, range: 24, stagger: 0.08, desc: '묵직한 일격 · 경직' },
  katana:     { name: '일본도', kind: 'weapon', tiers: ['무딘 일본도', '일본도', '예리한 일본도', '명도', '요도'],                    atk: 7,  interval: 0.9, range: 26, crit: 0.06, desc: '치명타 +6% · 흑운회의 칼' },
  rapier:     { name: '레이피어', kind: 'weapon', tiers: ['연습용 레이피어', '레이피어', '결투용 레이피어', '명예의 레이피어', '맹세의 레이피어'], atk: 5, interval: 0.7, range: 30, crit: 0.1, desc: '치명타 +10% · 생크 협회식 결투' },
  scythe:     { name: '낫',   kind: 'weapon', tiers: ['풀베기 낫', '갈고리 낫', '전투 낫', '사신의 낫', '종언의 낫'], atk: 8,  interval: 1.3, range: 30, cleave: 0.5, desc: '휩쓸기 — 옆의 적에게도 50%' },
  greatsword: { name: '대검', kind: 'weapon', tiers: ['무딘 대검', '대검', '양손 대검', '협회의 대검', '수호의 대검'], atk: 11, interval: 1.6, range: 28, stagger: 0.1, cleave: 0.3, desc: '휩쓸기 30% · 경직 · 츠바이식 대검' },
  // --- 무기 종류 확장 ---
  dagger:    { name: '단검',     kind: 'weapon', tiers: ['녹슨 단검', '단검', '암살 단검', '명인의 단검', '그림자 단검'],   atk: 4,  interval: 0.55, range: 18, crit: 0.08, desc: '아주 빠름 · 치명타 +8%' },
  dualblade: { name: '쌍검',     kind: 'weapon', tiers: ['짝 안 맞는 쌍검', '쌍검', '연환 쌍검', '명인의 쌍검', '쌍룡검'],  atk: 4,  interval: 0.5,  range: 22, crit: 0.04, desc: '가장 빠른 연격' },
  hwando:    { name: '환도',     kind: 'weapon', tiers: ['낡은 환도', '환도', '군용 환도', '명장의 환도', '사인검'],        atk: 7,  interval: 0.95, range: 26, stagger: 0.04, desc: '고른 성능 · 약한 경직' },
  tachi:     { name: '태도',     kind: 'weapon', tiers: ['무딘 태도', '태도', '장식 태도', '명장의 태도', '천하오검'],      atk: 8,  interval: 1.05, range: 30, crit: 0.05, desc: '긴 칼날 · 치명타 +5%' },
  glaive:    { name: '언월도',   kind: 'weapon', tiers: ['녹슨 언월도', '언월도', '청룡 언월도', '명장의 언월도', '청룡언월도'], atk: 9, interval: 1.3, range: 34, cleave: 0.35, desc: '휩쓸기 35%' },
  lance:     { name: '기병창',   kind: 'weapon', tiers: ['나무 기병창', '기병창', '강철 기병창', '돌격창', '천마의 창'],    atk: 9,  interval: 1.4, range: 42, stagger: 0.1, desc: '가장 긴 창 · 경직' },
  harpoon:   { name: '작살',     kind: 'weapon', tiers: ['낚시 작살', '작살', '미늘 작살', '고래잡이 작살', '심해의 작살'], atk: 8,  interval: 1.3, range: 46, desc: '멀리서 찌른다' },
  hammer:    { name: '망치',     kind: 'weapon', tiers: ['대장장이 망치', '전투 망치', '쇄골 망치', '거인의 망치', '천둥 망치'], atk: 11, interval: 1.65, range: 22, stagger: 0.2, desc: '가장 강한 경직' },
  club:      { name: '곤봉',     kind: 'weapon', tiers: ['나무 곤봉', '곤봉', '쇠 박은 곤봉', '경찰 곤봉', '수문장의 곤봉'], atk: 6, interval: 1.0, range: 20, stagger: 0.08, desc: '가볍고 다루기 쉽다' },
  staff:     { name: '지팡이',   kind: 'weapon', tiers: ['나무 지팡이', '지팡이', '쇠 지팡이', '현자의 지팡이', '천년 지팡이'], atk: 5, interval: 0.9, range: 32, stagger: 0.05, desc: '긴 사거리 · 빠른 휘두름' },
  gauntlet:  { name: '건틀릿',   kind: 'weapon', tiers: ['헌 건틀릿', '건틀릿', '강철 건틀릿', '파쇄 건틀릿', '거신의 손'],  atk: 6,  interval: 0.75, range: 18, stagger: 0.06, desc: '연타 · 약한 경직' },
  claw:      { name: '클로',     kind: 'weapon', tiers: ['짐승 발톱', '클로', '갈퀴 클로', '사냥꾼의 클로', '야수의 손톱'], atk: 4,  interval: 0.55, range: 20, crit: 0.06, desc: '빠른 할퀴기 · 치명타 +6%' },
  armblade:  { name: '암블레이드', kind: 'weapon', tiers: ['조잡한 암블레이드', '암블레이드', '접이식 암블레이드', '의체 암블레이드', '살아 있는 칼날'], atk: 6, interval: 0.7, range: 22, crit: 0.05, desc: '팔에 단 칼날 · 빠름' },
  whip:      { name: '채찍',     kind: 'weapon', tiers: ['가죽 채찍', '채찍', '가시 채찍', '조련사의 채찍', '뱀의 채찍'],    atk: 5,  interval: 0.9, range: 40, crit: 0.03, desc: '긴 사거리' },
  fan:       { name: '부채',     kind: 'weapon', tiers: ['종이 부채', '쇠부채', '철선', '무희의 철선', '풍신의 부채'],      atk: 4,  interval: 0.7, range: 24, dodge: 0.06, desc: '쥐고 있으면 회피 +6%' },
  shield:    { name: '방패',     kind: 'weapon', tiers: ['나무 방패', '방패', '강철 방패', '성벽 방패', '불괴의 방패'],      atk: 3,  interval: 1.2, range: 18, wdef: 3, stagger: 0.06, desc: '쥐고 있으면 방어 상승 · 약한 공격' },
  brush:     { name: '붓',       kind: 'weapon', tiers: ['몽당붓', '붓', '큰 붓', '명필의 붓', '천지를 그리는 붓'],        atk: 5,  interval: 1.0, range: 28, crit: 0.04, desc: '휘두르는 획 · 약지의 화가들이 즐긴다' },
  scissors:  { name: '가위',     kind: 'weapon', tiers: ['재단 가위', '큰 가위', '절단 가위', '재봉사의 가위', '운명을 끊는 가위'], atk: 7, interval: 0.85, range: 22, crit: 0.07, desc: '끊어 내는 일격 · 치명타 +7%' },
  tfaxe:     { name: '변형도끼', kind: 'weapon', tiers: ['조잡한 변형도끼', '변형도끼', '정밀 변형도끼', '공방 변형도끼', '만변의 도끼'], atk: 10, interval: 1.3, range: 30, stagger: 0.08, cleave: 0.2, desc: '도끼↔장병기 · 휩쓸기 20% · 경직' },
  tfgreat:   { name: '변형대검', kind: 'weapon', tiers: ['조잡한 변형대검', '변형대검', '정밀 변형대검', '공방 변형대검', '만변의 대검'], atk: 12, interval: 1.5, range: 32, stagger: 0.1, cleave: 0.35, desc: '대검↔장검 · 휩쓸기 35% · 경직' },
  bow:       { name: '활',       kind: 'weapon', tiers: ['사냥 활', '활', '각궁', '명궁의 활', '천궁'],                  atk: 6,  interval: 1.3, range: 110, ranged: true, bow: true, desc: '탄환이 필요 없다' },
  crossbow:  { name: '석궁',     kind: 'weapon', tiers: ['조잡한 석궁', '석궁', '연발 석궁', '공성 석궁', '천궁노'],      atk: 10, interval: 1.9, range: 120, ranged: true, bow: true, desc: '묵직한 한 발' },
  revolver:  { name: '리볼버',   kind: 'weapon', valueMult: 0.4, tiers: ['낡은 리볼버', '리볼버', '6연발 리볼버', '정밀 리볼버', '심판의 리볼버'], atk: 17, interval: 1.6, range: 130, ranged: true, gun: true, crit: 0.06 },
  rifle:     { name: '소총',     kind: 'weapon', valueMult: 0.4, tiers: ['사제 소총', '소총', '반자동 소총', '정밀 소총', '심판의 소총'], atk: 18, interval: 1.7, range: 150, ranged: true, gun: true },
  sniper:    { name: '저격소총', kind: 'weapon', valueMult: 0.4, tiers: ['개조 저격소총', '저격소총', '대물 저격소총', '명사수의 저격소총', '심판의 저격소총'], atk: 26, interval: 2.6, range: 200, ranged: true, gun: true, crit: 0.1 },
  shotgun:   { name: '샷건',     kind: 'weapon', valueMult: 0.4, tiers: ['사제 샷건', '샷건', '펌프 샷건', '전투 샷건', '심판의 샷건'], atk: 19, interval: 1.9, range: 70, ranged: true, gun: true, cleave: 0.5 },
  bayonet:   { name: '총검',     kind: 'weapon', valueMult: 0.6, tiers: ['꽂은 총검', '총검', '돌격 총검', '정예 총검', '심판의 총검'], atk: 9, interval: 1.15, range: 32, gun: true, melee: true, desc: '평소엔 찌르고, 보스에겐 쏜다' },
  robe:       { name: '로브',     kind: 'armor', tiers: ['낡은 로브', '로브', '수놓은 로브', '현자의 로브', '별빛 로브'],       def: 1, hp: 28, dodge: 0.04, desc: '회피 4% · 체력 위주' },
  lightarmor: { name: '경갑',     kind: 'armor', tiers: ['가죽 경갑', '경갑', '강화 경갑', '정찰대 경갑', '바람의 경갑'],     def: 4, hp: 12, dodge: 0.03, desc: '가볍다 · 회피 3%' },
  vest:       { name: '방탄조끼', kind: 'armor', tiers: ['헌 방탄조끼', '방탄조끼', '세라믹 조끼', '전술 조끼', '불사의 조끼'],  def: 5, hp: 12, desc: '고른 방어' },
  chainmail:  { name: '사슬갑옷', kind: 'armor', tiers: ['녹슨 사슬갑옷', '사슬갑옷', '이중 사슬갑옷', '기사의 사슬갑옷', '용린 사슬갑옷'], def: 5, hp: 14, slow: 0.05, desc: '약간 무겁다' },
  heavyarmor: { name: '중갑',     kind: 'armor', tiers: ['조잡한 중갑', '중갑', '강철 중갑', '수비대 중갑', '성채의 중갑'],    def: 6, hp: 16, slow: 0.1, desc: '튼튼하지만 느리다' },
  hazmat:     { name: '방호복',   kind: 'armor', tiers: ['비닐 방호복', '방호복', '밀폐 방호복', '연구소 방호복', '절대 방호복'], def: 3, hp: 24, dodge: 0.02, desc: '체력 위주' },
  powerarmor: { name: '파워아머', kind: 'armor', tiers: ['시제 파워아머', '파워아머', '전투 파워아머', '공방 파워아머', '거신 파워아머'], def: 8, hp: 26, slow: 0.08, desc: '최고의 방호 · 조금 느리다' },
  cyberskin:  { name: '의체외피', kind: 'armor', tiers: ['시술용 외피', '의체외피', '강화 외피', '전투 외피', '완전 의체외피'],  def: 5, hp: 20, dodge: 0.05, desc: '몸처럼 움직인다 · 회피 5%' },
  suit:       { name: '정장', kind: 'armor',  tiers: ['헌 정장', '해결사 정장', '방탄 정장', '사무소 예복', '특색의 정장'], def: 4, hp: 14, dodge: 0.05, desc: '회피 5%' },
  cloak:      { name: '망토', kind: 'armor',  tiers: ['누더기 망토', '여행 망토', '차광 망토', '밤의 망토', '그림자 망토'], def: 2, hp: 30, dodge: 0.08, desc: '회피 8% · 체력 위주' },
};

// 무기 숙련도 — 해결사마다 무기 종류별로 따로 쌓인다
const MASTERY_FORMS = { fist: '맨손' };
for (const k in FORMS) if (FORMS[k].kind === 'weapon') MASTERY_FORMS[k] = FORMS[k].name;   // 숙련도는 무기 종류마다 따로
const MASTERY_MAX = 10;
function masteryNeed(lv) { return 25 + lv * 25; }        // 다음 레벨까지 필요한 적중 수

// 강화 단계: +5, +10, +20, +30 에서 모양이 바뀐다
const TIER_STEPS = [0, 5, 10, 20, 30];
function tierOf(q) { let t = 0; for (let i = 0; i < TIER_STEPS.length; i++) if (q >= TIER_STEPS[i]) t = i; return t; }

const TRAITS = {
  bleed:   { name: '출혈', color: '#e0404f', w: '적중 시 출혈 부여 — 적이 공격할 때마다 피해', a: '피격 시 공격자에게 출혈' },
  burn:    { name: '화상', color: '#ff8c2e', w: '적중 시 화상 부여 — 매초 피해',             a: '피격 시 공격자에게 화상' },
  tremor:  { name: '진동', color: '#e8d04a', w: '적중 시 확률적으로 적 경직',                a: '피격 시 확률적으로 공격자 경직' },
  rupture: { name: '파열', color: '#66d9ef', w: '적중 시 파열 부여 — 피격마다 추가 피해',     a: '피격 시 공격자에게 파열' },
  charge:  { name: '충전', color: '#7fb2ff', w: '공격 속도 증가',                            a: '공격 속도 증가' },
  sinking: { name: '침잠', color: '#8a8fff', w: '적중 시 침잠 부여 — 적 공격력 감소',         a: '피격 시 공격자에게 침잠' },
  poise:   { name: '호흡', color: '#e6e6ff', w: '치명타 확률 증가',                          a: '치명타 확률 증가' },
};
// 기본 특성 (각인·보너스로 뽑히는 풀)
const TRAIT_KEYS = ['bleed', 'burn', 'tremor', 'rupture', 'charge', 'sinking', 'poise'];

// ---------- 강화형 특성(반동) · 내성 ----------
// 무기의 강화형 특성은 기본 특성보다 강하지만 착용자에게 반동이 온다.
// 방어구의 같은 계열 내성 레벨이 강화형 특성 레벨 이상이면 반동이 완전히 상쇄된다.
const STRONG_OF = { burn: 'scorch', bleed: 'hemo', rupture: 'collapse', tremor: 'quake', sinking: 'abyss', charge: 'overcharge' };
Object.assign(TRAITS, {
  scorch:     { name: '작열',   color: '#ff5a1a', strong: 'burn',    w: '적중 시 강력한 화상(3배) — 착용자도 매초 화상 피해' },
  hemo:       { name: '선혈',   color: '#ff2a4a', strong: 'bleed',   w: '적중 시 강력한 출혈(3배) — 공격할 때마다 착용자도 피를 흘림' },
  collapse:   { name: '붕괴',   color: '#3ad9ff', strong: 'rupture', w: '적중 시 강력한 파열(3배) — 착용자도 피격 시 추가 피해' },
  quake:      { name: '격진',   color: '#ffe23a', strong: 'tremor',  w: '높은 확률로 적 경직 — 착용자도 가끔 휘청여 공격을 놓침' },
  abyss:      { name: '심연',   color: '#7a6aff', strong: 'sinking', w: '적중 시 강력한 침잠(3배) — 착용자 방어력 감소' },
  overcharge: { name: '과충전', color: '#5ab0ff', strong: 'charge',  w: '공격 속도 대폭 증가 — 공격할 때마다 착용자 감전' },
  r_burn:    { name: '화상 내성', color: '#ff8c2e', res: 'burn',    a: '작열의 반동을 레벨만큼 상쇄' },
  r_bleed:   { name: '출혈 내성', color: '#e0404f', res: 'bleed',   a: '선혈의 반동을 레벨만큼 상쇄' },
  r_rupture: { name: '파열 내성', color: '#66d9ef', res: 'rupture', a: '붕괴의 반동을 레벨만큼 상쇄' },
  r_tremor:  { name: '진동 내성', color: '#e8d04a', res: 'tremor',  a: '격진의 반동을 레벨만큼 상쇄' },
  r_sinking: { name: '침잠 내성', color: '#8a8fff', res: 'sinking', a: '심연의 반동을 레벨만큼 상쇄' },
  r_charge:  { name: '충전 내성', color: '#7fb2ff', res: 'charge',  a: '과충전의 반동을 레벨만큼 상쇄' },
});

// 각인으로 붙을 특성: 무기는 35% 확률로 강화형, 방어구는 50% 확률로 내성
function rollTrait(kind, strongChance) {
  const base = pick(TRAIT_KEYS);
  if (STRONG_OF[base] && Math.random() < strongChance) return kind === 'weapon' ? STRONG_OF[base] : 'r_' + base;
  return base;
}

const TIER_NAMES = ['조잡한', '쓸만한', '정교한', '명품', '전설'];
const TIER_COLORS = ['#9a948e', '#e6e2da', '#6fb7ff', '#ffcf4a', '#ff7a4a'];

// 장비 등급 — 단조 완성 시 한 번 정해지고, 강화로는 바뀌지 않는다
// mult: 능력치 배율, bonus: 추가 특성 레벨(유니크부터)
const RARITIES = [
  { name: '커먼',         en: 'Common',      color: '#a8a29c', mult: 1.00, bonus: 0 },
  { name: '언커먼',       en: 'Uncommon',    color: '#6fdc8c', mult: 1.08, bonus: 0 },
  { name: '레어',         en: 'Rare',        color: '#5fa8ff', mult: 1.16, bonus: 0 },
  { name: '슈퍼레어',     en: 'Super Rare',  color: '#b07aff', mult: 1.26, bonus: 0 },
  { name: '유니크',       en: 'Unique',      color: '#ffcf4a', mult: 1.38, bonus: 1 },
  { name: '에픽',         en: 'Epic',        color: '#ff8a3a', mult: 1.52, bonus: 2 },
  { name: '마스터',       en: 'Master',      color: '#ff4a6a', mult: 1.70, bonus: 3 },
  { name: '그랜드마스터', en: 'Grandmaster', color: '#4af0e0', mult: 2.00, bonus: 4 },
];
// 등급은 forge.js rollRarity — 재료 등급이 상한, 대성공이 확률

const OUTCOMES = {
  destroy: { name: '파괴',   color: '#ff3b3b' },
  damage:  { name: '손상',   color: '#ff9f43' },
  keep:    { name: '유지',   color: '#a9a9b3' },
  success: { name: '성공',   color: '#6fdc8c' },
  great:   { name: '대성공', color: '#ffd84a' },
};
const OUTCOME_ORDER = ['destroy', 'damage', 'keep', 'success', 'great'];

// 대성공 별명 — 대성공을 많이 할수록 높은 등급의 별명이 붙는다 (개량하면 대성공이 누적된다)
const EPITHET_TIERS = [
  { min: 3, name: '골목의 별명', color: '#cfc4b0', list: ['「잿불」', '「쇳소리」', '「녹슨 맹세」', '「무명」', '「심야의 종」', '「뒷골목의 별」', '「붉은 눈」', '「밤의 송곳니」',
    '「마지막 못」', '「검은 파도」', '「장인의 숨」', '「골목의 왕관」', '「빗속의 칼」', '「낡은 약속」', '「불씨」', '「모루 자국」', '「달그림자」', '「들개 이빨」',
    '「찬 바람」', '「야경꾼」', '「굽은 못」', '「연기 한 줄기」', '「새벽 종소리」', '「뒷문」', '「젖은 성냥」', '「골목 끝 등불」'] },
  { min: 5, name: '알려진 별명', color: '#7fc8ff', list: ['「피어린 서약」', '「강철 장송곡」', '「잿빛 전령」', '「침묵하는 모루」', '「밤을 가르는 자」', '「무너진 성벽」',
    '「아홉 번째 못」', '「뒷골목의 사신」', '「녹슬지 않는 맹세」', '「불꽃의 증인」', '「끊어진 사슬」', '「검은 성좌」', '「한밤의 처형인」', '「흩날리는 재」',
    '「깨어진 달」', '「고요한 폭풍」', '「핏빛 저녁놀」', '「도시의 흉터」', '「울리는 종의 칼」', '「얼어붙은 불길」'] },
  { min: 7, name: '이름난 별명', color: '#c890ff', list: ['「별을 삼킨 모루」', '「백 번의 밤을 넘은 쇠」', '「무너지지 않는 둥지」', '「잿더미 위의 왕관」', '「도시를 가르는 선」',
    '「끝나지 않는 장송곡」', '「피로 쓴 계약서」', '「천 개의 못을 박은 망치」', '「잠들지 않는 대장간」', '「검붉은 혜성」', '「영원히 식지 않는 쇠」',
    '「심연을 두드린 소리」', '「마지막 날의 종」', '「날개를 꺾는 칼날」', '「밤의 끝을 본 자」', '「둥지를 울린 굉음」'] },
  { min: 10, name: '전설의 별명', color: '#ffcf4a', list: ['「도시의 별을 벼린 손」', '「머리조차 기억하는 이름」', '「꺼지지 않는 첫 불꽃」', '「모든 둥지의 악몽」',
    '「신을 두드린 망치」', '「황혼을 끝낸 칼날」', '「세계를 다시 벼린 손」', '「뒷골목이 노래하는 전설」', '「발톱도 비켜 간 쇠」', '「백야를 가른 강철」',
    '「별빛을 담금질한 자」', '「도시가 잊지 못할 이름」'] },
];
const EPITHETS = EPITHET_TIERS[0].list;   // 예전 코드 호환
function epithetTier(greats) { let t = -1; EPITHET_TIERS.forEach((T, i) => { if ((greats || 0) >= T.min) t = i; }); return t; }

const WORKSHOP_LEVELS = [
  { name: '간이 공방',         up: { money: 400,  fame: 15 } },
  { name: '뒷골목 공방',       up: { money: 1200, fame: 60 } },
  { name: '인정받은 공방',     up: { money: 5250, fame: 200 } },
  { name: '이름난 공방',       up: { money: 13500, fame: 500 } },
  { name: '도시의 명품 공방',  up: null },
];

// 이름값 — 승급이 비싸진 만큼 확실한 보상
// 공방 Lv3·4·5: 그 공방에서 만든 장비의 능력치 / 사무소 5급~1급: 현장 수입·재료
const WORKSHOP_RENOWN = [0, 0, 0.03, 0.06, 0.10];
function workshopRenown(W) { return WORKSHOP_RENOWN[Math.max(0, Math.min(4, (W || 1) - 1))]; }
function officeRenown(o) { return Math.max(0, 6 - (o || 9)) * 0.03; }   // 5급 +3% … 1급 +15%
// 사무소 등급 g → g-1 승급 비용
const OFFICE_UP = {
  9: { money: 300,   fame: 15 },
  8: { money: 700,   fame: 50 },
  7: { money: 1400,  fame: 110 },
  6: { money: 3750,  fame: 200 },
  5: { money: 6300,  fame: 330 },
  4: { money: 10500,  fame: 520 },
  3: { money: 13500,  fame: 800 },
  2: { money: 19500, fame: 1200 },
};

const ZONES = [
  { name: '뒷골목 외곽', req: 9,
    pal: { sky: '#1f1a26', far: '#2b2433', mid: '#3a3040', ground: '#2a2326', line: '#3b3136', edge: '#4a3e44', win: '#e8b45a' },
    enemies: ['rat', 'dog'], boss: 'ratboss', waveSize: [1, 2],
    drops: { scrap: 5, leather: 4, bone: 3, clot: 2, canvas: 2, fang: 2, haft: 1, oakrod: 1, shiv: 1 }, rare: ['steel', 'kevlar', 'brass'], fame: 3, lvl: 0 },
  { name: '폐선로 지하도', req: 8,
    pal: { sky: '#161418', far: '#221e22', mid: '#2e2828', ground: '#1e1a1a', line: '#2e2626', edge: '#3e3434', win: '#c8a070' },
    enemies: ['scav', 'molerat'], boss: 'scavking', waveSize: [1, 2],
    drops: { scrap: 4, leather: 2, bone: 2, steel: 2, haft: 2, chainlink: 2, fang: 1, canvas: 1, brass: 1, braid: 1, rod: 1, talon: 1 }, rare: ['steel', 'kevlar', 'talon'], fame: 4, lvl: 0.5 },
  { name: '뒷골목 조직 구역', req: 7,
    pal: { sky: '#1a1620', far: '#2a2030', mid: '#3b2a3a', ground: '#241c22', line: '#38282f', edge: '#4a3440', win: '#d86a5a' },
    enemies: ['thug', 'knife'], boss: 'capo', waveSize: [1, 3],
    drops: { scrap: 2, steel: 4, kevlar: 4, clot: 2, cog: 2, fuel: 2, coil: 2, brass: 2, chainlink: 2, tsuba: 1, thread: 1, lining: 1, hwanhilt: 1, twinhilt: 1, shieldboss: 1 }, rare: ['alloy', 'weave', 'crystal', 'tsuba'], fame: 6, lvl: 1 },
  { name: '하수 처리장', req: 6,
    pal: { sky: '#121a18', far: '#1a2622', mid: '#22322c', ground: '#18201c', line: '#22302a', edge: '#2e3e36', win: '#9ad870' },
    enemies: ['sewerdog', 'drowner'], boss: 'sewerlord', waveSize: [1, 3],
    drops: { steel: 3, kevlar: 3, clot: 3, fuel: 2, coil: 2, cog: 2, hook: 1, thread: 2, lining: 2, bloodvial: 1, alloy: 1, barb: 2, talon: 1, sealant: 1 }, rare: ['alloy', 'weave', 'barb'], fame: 9, lvl: 1.5 },
  { name: '폐공장 지구', req: 5,
    pal: { sky: '#1c2024', far: '#262c30', mid: '#323a3e', ground: '#22262a', line: '#323840', edge: '#40484e', win: '#7fd6c8' },
    enemies: ['bot', 'hunter'], boss: 'factory', waveSize: [1, 3],
    drops: { steel: 2, alloy: 4, weave: 4, cog: 3, crystal: 2, battery: 2, fuel: 1, blackiron: 1, silk: 1, hook: 2, guard: 1, bloodvial: 1, shadecloth: 2, greathilt: 1, pivot: 1, pump: 1 }, rare: ['blackiron', 'silk', 'ink', 'hook', 'greathilt', 'pivot'], fame: 12, lvl: 2 },
  { name: '불법 시술소 거리', req: 4,
    pal: { sky: '#1a1222', far: '#261a30', mid: '#34223e', ground: '#1c1622', line: '#2a1e32', edge: '#3a2a44', win: '#ff5ab4' },
    enemies: ['augthug', 'surgeonbot'], boss: 'butcher', waveSize: [1, 3],
    drops: { alloy: 3, weave: 3, battery: 3, crystal: 2, blackiron: 2, silk: 2, capacitor: 1, resonator: 1, bloodvial: 2, guard: 1, armmount: 2, mechhinge: 1, synthskin: 1, servo: 1 }, rare: ['blackiron', 'silk', 'capacitor', 'armmount', 'mechhinge'], fame: 16, lvl: 2.5 },
  { name: '뒷골목의 밤', req: 3,
    pal: { sky: '#0b0a14', far: '#151325', mid: '#1e1b33', ground: '#121018', line: '#221e30', edge: '#2c2640', win: '#7a7fff' },
    enemies: ['sweeper', 'sweeper2'], boss: 'sweeperlord', waveSize: [1, 3],
    drops: { alloy: 2, blackiron: 4, silk: 4, ink: 2, pendulum: 2, crystal: 1, battery: 1, meteor: 2, ember: 1, resonator: 1, shadecloth: 1, greathilt: 1, tachimount: 1, vamplate: 1 }, rare: ['stigma', 'dawn', 'pendulum', 'meteor', 'tachimount'], fame: 20, lvl: 3 },
  { name: '경매장 뒷길', req: 2,
    pal: { sky: '#18140c', far: '#261e12', mid: '#342a18', ground: '#1e1810', line: '#2e2416', edge: '#40321e', win: '#ffcf5a' },
    enemies: ['collector', 'hitman'], boss: 'auctioneer', waveSize: [1, 3],
    drops: { blackiron: 4, silk: 3, ink: 2, pendulum: 2, meteor: 2, stigma: 1, dawn: 1, ember: 2, resonator: 1, capacitor: 1, brushtip: 1, scope: 1, mechcore: 1, servo: 1 }, rare: ['stigma', 'dawn', 'capacitor', 'brushtip', 'scope', 'mechcore'], fame: 27, lvl: 3.5 },
  { name: 'N사 둥지 경계', req: 1,
    pal: { sky: '#1e1a12', far: '#2e2818', mid: '#3e3620', ground: '#26221a', line: '#3a3324', edge: '#4c4430', win: '#f0d77a' },
    enemies: ['guard', 'shade'], boss: 'shadowfixer', waveSize: [1, 3], wing: 'N사', bg: 'z8',
    drops: { blackiron: 3, silk: 3, stigma: 2, dawn: 2, ink: 2, pendulum: 2, meteor: 2, capacitor: 1, ember: 1, mechcore: 1, vamplate: 1 }, rare: ['stigma', 'dawn', 'capacitor', 'mechcore'], fame: 35, lvl: 4 },
];
// 지역 난이도 단계 (특수 습격·현상금·후퇴 실패율에 쓰인다). lvl이 없으면 순번.
function zoneLv(i) { const z = ZONES[i]; return z && z.lvl != null ? z.lvl : i; }

const ENEMIES = {
  rat:     { name: '뒷골목 쥐',   sprite: 'human', pal: { h: '#4a3a2c', c: '#5d5147', p: '#2e2a28', s: '#d0a888' }, hp: 28, atk: 5, def: 0, interval: 1.4, range: 20, speed: 28, exp: 5, money: 4, weapon: 'knife' },
  dog:     { name: '굶주린 들개', sprite: 'dog',   pal: { d: '#7a6250', e: '#ff5050' }, hp: 20, atk: 6, def: 0, interval: 1.0, range: 16, speed: 48, exp: 5, money: 1 },
  ratboss: { name: '쥐 두목',     sprite: 'human', pal: { h: '#a02828', c: '#3d3328', p: '#221e1c', s: '#d0a888' }, hp: 240, atk: 12, def: 2, interval: 1.6, range: 28, speed: 24, exp: 60, money: 60, weapon: 'pipe', boss: true, scale: 1.5 },

  scav:    { name: '넝마주이',      sprite: 'human', pal: { h: '#5a4a3a', c: '#4a4238', p: '#2a2622', s: '#c89a78' }, hp: 46, atk: 8, def: 1, interval: 1.3, range: 20, speed: 28, exp: 8, money: 7, weapon: 'pipe' },
  molerat: { name: '선로 두더지쥐', sprite: 'dog',   pal: { d: '#5a4a40', e: '#ffb040' }, hp: 36, atk: 9, def: 1, interval: 1.0, range: 16, speed: 44, exp: 8, money: 3 },
  scavking:{ name: '넝마주이 대장', sprite: 'human', pal: { h: '#8a6a3a', c: '#3a3228', p: '#201c18', s: '#c89a78' }, hp: 420, atk: 18, def: 3, interval: 1.5, range: 28, speed: 24, exp: 95, money: 120, weapon: 'pipe', boss: true, scale: 1.5 },

  thug:    { name: '검계 조직원',      sprite: 'human', pal: { h: '#1e1e22', c: '#2d3a4f', p: '#1c1c22', s: '#d8b494' }, hp: 80, atk: 11, def: 3, interval: 1.4, range: 22, speed: 28, exp: 12, money: 10, weapon: 'sword' },
  knife:   { name: '녹슨 사슬 조직원',      sprite: 'human', pal: { h: '#d0d0d0', c: '#5a2a2a', p: '#24181a', s: '#d8b494' }, hp: 58, atk: 14, def: 1, interval: 0.9, range: 22, speed: 34, exp: 12, money: 12, weapon: 'pipe' },
  capo:    { name: '흑운회 행동대장',   sprite: 'human', pal: { h: '#e0c070', c: '#1a1a24', p: '#111111', s: '#e0bc9c' }, hp: 650, atk: 24, def: 6, interval: 1.3, range: 30, speed: 24, exp: 130, money: 200, weapon: 'sword', boss: true, scale: 1.6 },

  sewerdog:{ name: '오수 들개',     sprite: 'dog',   pal: { d: '#4a5a40', e: '#c8ff60' }, hp: 95, atk: 15, def: 2, interval: 0.95, range: 16, speed: 46, exp: 18, money: 6 },
  drowner: { name: '하수구 갈퀴꾼', sprite: 'human', pal: { h: '#3a4a3a', c: '#3a4a40', p: '#1e2620', s: '#b8a088' }, hp: 110, atk: 14, def: 4, interval: 1.3, range: 26, speed: 26, exp: 18, money: 16, weapon: 'spear' },
  sewerlord:{ name: '하수구의 왕초', sprite: 'human', pal: { h: '#2a3a2a', c: '#2e3a30', p: '#161c18', s: '#b8a088' }, hp: 1100, atk: 32, def: 10, interval: 1.5, range: 30, speed: 20, exp: 210, money: 380, weapon: 'pipe', boss: true, scale: 1.7 },

  bot:     { name: '폭주 기계',   sprite: 'bot',   pal: { m: '#6a7378', r: '#ff4040' }, hp: 170, atk: 18, def: 8, interval: 1.5, range: 22, speed: 20, exp: 26, money: 20 },
  hunter:  { name: '갈고리 사무소 해결사', sprite: 'human', pal: { h: '#6a4a2a', c: '#5a5a3a', p: '#2a2a1a', s: '#c89a78' }, hp: 120, atk: 15, def: 4, interval: 1.3, range: 120, speed: 26, exp: 26, money: 25, weapon: 'gun', ranged: true },
  factory: { name: '공장의 주인', sprite: 'bot',   pal: { m: '#8a5a3a', r: '#ffcc40' }, hp: 1700, atk: 40, def: 14, interval: 1.6, range: 30, speed: 16, exp: 320, money: 600, boss: true, scale: 1.8 },

  augthug: { name: '불법 증강 시술자', sprite: 'human', pal: { h: '#ff5ab4', c: '#3a2a44', p: '#1c1622', s: '#c8b0b8' }, hp: 230, atk: 24, def: 9, interval: 1.2, range: 22, speed: 30, exp: 34, money: 30, weapon: 'sword' },
  surgeonbot:{ name: '시술 기계팔', sprite: 'bot',   pal: { m: '#7a6a88', r: '#ff5ab4' }, hp: 200, atk: 26, def: 10, interval: 1.4, range: 24, speed: 22, exp: 34, money: 26 },
  butcher: { name: '의수 도살자',   sprite: 'bot',   pal: { m: '#8a3a4a', r: '#ffd0e0' }, hp: 2800, atk: 52, def: 16, interval: 1.3, range: 30, speed: 20, exp: 480, money: 1000, boss: true, scale: 1.7 },

  sweeper: { name: '청소부',      sprite: 'cloak', pal: { m: '#2a2438', y: '#ffd84a' }, hp: 330, atk: 30, def: 12, interval: 1.3, range: 24, speed: 30, exp: 46, money: 40, weapon: 'spear' },
  sweeper2:{ name: '청소부 집행자', sprite: 'cloak', pal: { m: '#3a1e2e', y: '#ff6a6a' }, hp: 270, atk: 38, def: 8, interval: 0.9, range: 24, speed: 36, exp: 46, money: 45, weapon: 'sword' },
  sweeperlord: { name: '청소부 우두머리', sprite: 'cloak', pal: { m: '#1a1428', y: '#ff3b3b' }, hp: 4200, atk: 66, def: 20, interval: 1.4, range: 34, speed: 24, exp: 720, money: 1500, weapon: 'spear', boss: true, scale: 1.8 },

  collector:{ name: '장기 수집가',  sprite: 'cloak', pal: { m: '#3a2a18', y: '#ffcf5a' }, hp: 410, atk: 41, def: 12, interval: 1.1, range: 24, speed: 32, exp: 68, money: 65, weapon: 'sword' },
  hitman:  { name: '청부 해결사',   sprite: 'human', pal: { h: '#2a2218', c: '#4a3a22', p: '#1e1810', s: '#d8b494' }, hp: 350, atk: 37, def: 11, interval: 1.2, range: 120, speed: 26, exp: 68, money: 70, weapon: 'gun', ranged: true },
  auctioneer:{ name: '경매인',      sprite: 'human', pal: { h: '#e8d8a0', c: '#5a3a18', p: '#2a1a0a', s: '#e0bc9c' }, hp: 5600, atk: 78, def: 23, interval: 1.2, range: 30, speed: 26, exp: 1300, money: 2600, weapon: 'spear', boss: true, scale: 1.6 },

  guard:   { name: '금기 사냥꾼', sprite: 'human', pal: { h: '#dddddd', c: '#e8e0d0', p: '#8a8070', s: '#e0bc9c' }, hp: 720, atk: 60, def: 25, interval: 1.2, range: 120, speed: 26, exp: 92, money: 80, weapon: 'gun', ranged: true },
  shade:   { name: 'N사 소속 해결사', sprite: 'cloak', pal: { m: '#0a0a0a', y: '#f0f0f0' }, hp: 620, atk: 75, def: 15, interval: 1.0, range: 24, speed: 34, exp: 92, money: 90, weapon: 'sword' },
  // 도시의 금기를 어긴 자에게 머리가 보내는 존재들 — 사실상 이길 수 없다
  claw:    { name: '발톱',   sprite: 'human', pal: { h: '#f2f2f2', c: '#f2f2f2', p: '#d8d8d8', s: '#e8d8c8' }, hp: 5200, atk: 80, def: 24, interval: 0.7, range: 30, speed: 70, exp: 0, money: 0, weapon: 'sword', boss: true, scale: 1.4 },
  arbiter: { name: '조율자', sprite: 'human', pal: { h: '#1a1a1a', c: '#121212', p: '#0a0a0a', s: '#e8d0c0' }, hp: 14000, atk: 140, def: 40, interval: 1.0, range: 40, speed: 40, exp: 0, money: 0, weapon: 'spear', boss: true, scale: 1.7 },
  shadowfixer: { name: '고등급 금기 사냥꾼', sprite: 'human', pal: { h: '#111111', c: '#151515', p: '#0a0a0a', s: '#bbbbbb' }, hp: 10000, atk: 120, def: 35, interval: 1.1, range: 30, speed: 30, exp: 2000, money: 4000, weapon: 'sword', boss: true, scale: 1.6 },
};

const SURNAMES = ['강', '윤', '서', '한', '류', '진', '백', '남', '도', '차', '마', '석', '하', '연', '은'];
const GIVEN = ['한결', '도윤', '서하', '이안', '라온', '무진', '세린', '태오', '하람', '유진', '건우', '소율', '재희',
  '민호', '다온', '시우', '윤슬', '해랑', '청명', '가람', '로하', '지안', '새벽', '이든', '루미', '하진'];
const HAIR = ['#2a2024', '#5a3a2a', '#b8b0a0', '#a03030', '#304a80', '#e0c070', '#4a6a3a', '#7a4a8a', '#dcdcdc', '#1a1a1a'];
const COATS = ['#3d4a5c', '#5a3030', '#3a4a3a', '#5a4a30', '#4a3a5a', '#2a2a2a', '#6a5a4a', '#305a5a', '#7a3a1e'];
const PANTS = ['#1e1e24', '#2a2420', '#24242e', '#30282a'];
const SKINS = ['#f0c8a0', '#e0b090', '#c89070', '#f4d4b4'];

// 의뢰인 층 — 공방 등급(Lv)이 오를수록 더 높은 곳에서 일감이 온다. 낮은 층은 공방이 커지면 점점 발길을 끊는다.
// mult: 보수 배율 · fame: 추가 명성 · {wing}은 공방이 있는 구의 날개 이름
// 특성 레벨은 로마 숫자로 적는다 (I · II · III …)
function roman(n) { n = Math.max(0, n | 0); const R = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let o = ''; for (const [v, c] of R) while (n >= v) { o += c; n -= v; } return o || '0'; }
const CLIENT_TIERS = [
  { w: 1, mult: 1.00, fame: 0, list: ['뒷골목 자경단', '이름 없는 9급 사무소', '쥐 사냥꾼 패거리', '골목 상인회', '떠돌이 해결사', '뒷골목 경비원'] },
  { w: 2, mult: 1.08, fame: 1, list: ['갈고리 사무소', '마침표 사무소', '7급 해결사 사무소', '뒷골목 수금 조직', '중견 사무소 해결사'] },
  { w: 3, mult: 1.16, fame: 2, list: ['츠바이 협회', '하나 협회', '세븐 협회', '리우 협회', '시 협회', '생크 협회'] },
  { w: 4, mult: 1.28, fame: 3, list: ['휠스 인더스트리(하청)', '로직 아틀리에(하청)', '크리스탈 아틀리에(하청)', '묵 공방(하청)', '랑아 공방(하청)', '알라스 공방(하청)', '1급 해결사 사무소', 'K사 연구원(외부 의뢰)'] },
  { w: 5, mult: 1.45, fame: 5, list: ['{wing} 직원', '{wing} 둥지 경비대', '이름난 특색 해결사', '협회 본부', '둥지의 귀족'] },
];
const CLIENTS = ['츠바이 협회', '하나 협회', '세븐 협회', '리우 협회', '시 협회', '생크 협회', '갈고리 사무소', '마침표 사무소',
  '휠스 인더스트리(하청)', '로직 아틀리에(하청)', '크리스탈 아틀리에(하청)', '묵 공방(하청)', '랑아 공방(하청)', '알라스 공방(하청)'];

// ============================================================
//  원작 설정 참고 확장 (협회 · 공방 등급 · 뒷골목의 밤 · 증강 · 색)
// ============================================================

// 트레스 협회가 매기는 공방 등급 (공방 레벨 1~5)
const WORKSHOP_CLASS = ['C', 'B', 'A', 'A+', 'S'];
const SALE_TAX = 0.1;          // 트레스 협회 판매세
const PATENT_ROYALTY = 0.06;   // 특허 1건당 매일 (장비 가치 × 비율)

// 사무소가 소속될 수 있는 협회 (사무소 8급 이상부터)
const ASSOCIATIONS = {
  zwei:  { name: '츠바이 협회', role: '의뢰인 보호', perk: '방어구 의뢰 보수 +50% · 해결사 방어력 +10%' },
  liu:   { name: '리우 협회',   role: '대규모 전투 · 화염', perk: '화상·작열 특성 레벨 +1 · 해결사 공격력 +5%' },
  shi:   { name: '시 협회',     role: '은밀한 암살', perk: '치명타 확률 +10% · 검 의뢰 보수 +50%' },
  seven: { name: '세븐 협회',   role: '조사 · 정보', perk: '의뢰 1건 추가 · 처치 시 추가 재료 확률 +20%' },
  cinq:  { name: '생크 협회',   role: '계약 결투', perk: '보스에게 주는 피해 +15% · 보스 명성 +50%' },
  tres:  { name: '트레스 협회', role: '공방 · 제품 관리', perk: '재료 가격 -15% · 판매세 면제 · 특허 한도 +1' },
};
const ASSOC_JOIN_COST = 500 * KRW, ASSOC_SWITCH_COST = 1500 * KRW;

// 증강 시술 (해결사당 부위별 1회)
const AUGMENTS = {
  arm:   { name: '전투 의수',   stat: 'atk', mult: 1.08, desc: '공격력 +8%' },
  frame: { name: '강화 골격',   stat: 'def', mult: 1.1,  desc: '방어력 +10%' },
  heart: { name: '인공 심폐',   stat: 'hp',  mult: 1.08, desc: '체력 +8%' },
};
function augmentCost(f) { return (400 + f.lv * 70 + Object.keys(f.aug || {}).length * 300) * KRW; }

// 색 — 등급 체계를 넘어선 해결사에게 하나 협회가 부여하는 칭호
const COLOR_TITLES = [
  { name: '청색', color: '#5fa8ff' }, { name: '자색', color: '#b07aff' }, { name: '황색', color: '#ffcf4a' },
  { name: '녹색', color: '#6fdc8c' }, { name: '흑색', color: '#9a9aa8' }, { name: '백색', color: '#f0f0f0' },
  { name: '주황', color: '#ff8a3a' }, { name: '은색', color: '#c8d0d8' },
];
const COLOR_REQ = { lv: 25, kills: 400, bosses: 5 };
// 특색(색) 계열 — 장비 이름에 이 낱말이 들어 있으면 그 색으로 특색을 받는다 (마스터 등급 이상만 이름을 지을 수 있다)
const COLOR_FAMILIES = [
  { key: 'red',    adj: '붉은',   color: '#ff4a4a', words: ['핏빛', '피빛', '루비', '장밋빛', '선홍', '붉은', '빨간', '빨강', '적색', '진홍', '다홍', '홍색', '크림슨', '레드', 'red', 'crimson', 'scarlet'], perk: '공격 +5%' },
  { key: 'blue',   adj: '푸른',   color: '#5fa8ff', words: ['하늘빛', '사파이어', '남빛', '청람', '푸른', '파란', '파랑', '청색', '남색', '쪽빛', '블루', 'blue', 'azure'], perk: '공격 속도 +5%' },
  { key: 'black',  adj: '검은',   color: '#a0a0b0', words: ['흑빛', '먹빛', '먹색', '새까만', '어둠', '검은', '까만', '흑색', '칠흑', '블랙', 'black'], perk: '치명타 +6%' },
  { key: 'white',  adj: '하얀',   color: '#f4f4f4', words: ['새하얀', '설백', '은백', '백야', '하얀', '흰', '백색', '순백', '화이트', 'white'], perk: '체력 +8%' },
  { key: 'purple', adj: '보랏빛', color: '#b07aff', words: ['자줏빛', '라벤더', '자수정', '보라', '자색', '자주', '바이올렛', 'purple', 'violet'], perk: '환상체에게 주는 피해 +15%' },
  { key: 'yellow', adj: '노란',   color: '#ffcf4a', words: ['황금빛', '호박색', '샛노란', '노란', '노랑', '황색', '금빛', '황금', '금색', '골드', 'yellow', 'gold', 'golden'], perk: '현장 수입 +15%' },
  { key: 'green',  adj: '푸르른', color: '#6fdc8c', words: ['에메랄드', '청록', '풀빛', '연두', '초록빛', '초록', '녹색', '비취', '그린', 'green', 'jade'], perk: '전투 중 체력 재생' },
  { key: 'orange', adj: '주홍빛', color: '#ff8a3a', words: ['노을빛', '귤빛', '주황빛', '주황', '오렌지', '주홍', 'orange'], perk: '공격 +3% · 공격 속도 +3%' },
  { key: 'silver', adj: '은빛',   color: '#c8d0d8', words: ['은빛', '백은', '수은', '은빛', '은색', '실버', 'silver'], perk: '방어 +8%' },
  { key: 'gray',   adj: '잿빛',   color: '#9a9a9a', words: ['회빛', '재색', '납빛', '잿빛', '회색', '그레이', 'gray', 'grey', 'ash'], perk: '회피 +6%' },
];
// 원작 특색의 이름은 그대로 쓰지 않는다 (다른 사람의 이름이므로)
const CANON_COLOR_NAMES = ['붉은 안개', '검은 침묵', '푸른 잔향', '보라 눈물', '진홍빛 상흔', '쪽빛 칼날'];
// 특색 이름 = 색 + 두 글자 (원작 특색처럼)
const COLOR_NOUNS = ['칼날', '잔불', '서리', '파도', '그늘', '달빛', '폭풍', '별빛', '심장', '이빨', '비수', '섬광', '낙인', '장막', '균열', '잔향', '눈물', '침묵', '안개', '망령'];
// 이름 속 색 낱말 그대로 (영어면 계열의 한국어 형용사)
function colorWordOf(text) {
  const t = String(text || ''), lo = t.toLowerCase();
  for (const c of COLOR_FAMILIES) for (const w of c.words) if (lo.includes(w)) return /[a-z]/.test(w) ? c.adj : t.substr(lo.indexOf(w), w.length);
  return null;
}
function colorFamilyOf(text) {
  const t = String(text || '').toLowerCase();
  return COLOR_FAMILIES.find(c => c.words.some(w => t.includes(w))) || null;
}
// 예전 세이브의 색 칭호 → 계열
const LEGACY_COLOR = { '청색': 'blue', '자색': 'purple', '황색': 'yellow', '녹색': 'green', '흑색': 'black', '백색': 'white', '주황': 'orange', '은색': 'silver' };

// ---------- 금기 (원작 설정) ----------
// · 둥지(구)의 금기: 그 구를 다스리는 날개가 정한 제멋대로의 규칙. 둥지와 뒷골목을 포함한 구 전체에 적용되고 바뀌지 않는다.
//   어기면 금기 사냥꾼이 온다 — 보통은 붙잡고, 거듭 어길수록 더 높은 등급이 와서 가혹해진다.
// · 도시의 금기: 머리가 정한 도시 전체의 규칙. 어기면 발톱이 처형한다.
// 공방이 자리 잡을 구 (가상의 구 — 새 게임에서 선택, 바뀌지 않음)
const DISTRICTS = [
  { name: '14구 뒷골목', wing: 'N사', desc: 'N사 둥지가 다스리는 14구. 둥지와 뒷골목을 가리지 않고 녹화가 금기다.',
    taboo: { id: 'record', name: '녹화 금지', desc: '구 안에서 실제와 같은 영상을 녹화하거나, 녹화된 영상을 보는 것 — 잠깐 보기만 해도 위반', short: '영상 녹화·시청 금지' } },
  { name: '11구 뒷골목', wing: 'K사', desc: 'K사 둥지가 다스리는 11구. 한낮의 한 시간 동안은 쇠붙이 소리가 나서는 안 된다.',
    taboo: { id: 'noretreat', name: '물러서지 않는 피', desc: '앰플이 있는 한 물러설 이유는 없다 — 현장에서 철수 명령을 내리면 위반', short: '현장 철수 금지' } },
  { name: '18구 뒷골목', wing: 'R사', desc: 'R사 둥지가 다스리는 18구. 해가 기울면 불을 다루는 일을 멈춰야 한다.',
    taboo: { id: 'fullcrew', name: '무리의 규칙', desc: '무리는 함께 사냥한다 — 출동할 수 있는 인원을 사무소에 남겨 두면 위반', short: '출동 가능 인원 전원 출동' } },
];
// 탄환: 총은 싸지만 탄환이 비싸다
// 머리의 총기 규제: 탄환에 엄청난 세금 — 한 발이 일반인의 몇 달 치 생활비
const AMMO_PACK = 1, AMMO_PRICE = 2000 * KRW;
// 도시의 금기 — 세금: 경고 세 번, 네 번째는 발톱의 처형
const TAX_PERIOD = 7, TAX_STRIKES = 4;

// ---------- 손가락 (뒷골목 최상위 조직) 이벤트 ----------
const FINGERS = {
  thumb:  { name: '엄지', title: '공물 요구',   color: '#d8a040', soldier: 'thumb_soldier', mat: 'thumb_bullet',
            nature: '엄격한 위계와 예의를 따지는 조직. 공물을 바치면 보호하고, 무례는 총탄으로 갚는다.',
            friend: '우호 40+: 공물 반값 · 동맹 70+: 일반 야간 습격 확률 절반', enemy: '적대 -40 이하: 매일 밤 보복 습격 위험 · 현장에 엄지 병사 매복' },
  index:  { name: '검지', title: '지령',        color: '#8a8fff', soldier: 'index_proselyte', mat: 'index_prescript',
            nature: '알 수 없는 지령을 한 치 오차 없이 따르는 자들. 지령을 지키는 자에게 관대하다.',
            friend: '우호 50+: 지령 보수 +50% · 완수 시 검지의 지령서 지급', enemy: '적대 -40 이하: 현장에 검지 사도 매복' },
  middle: { name: '중지', title: '복수의 표적', color: '#e04a4a', soldier: 'middle_brother', mat: 'middle_oath',
            nature: '형제의 원한을 결코 잊지 않는 자들. 은혜도 원한도 반드시 갚는다.',
            friend: '동맹 60+: 하루 한 번, 쓰러진 해결사를 형제가 구해 사망을 막는다', enemy: '원한 -30 이하: 현장에 중지 아우들이 복수하러 온다' },
  ring:   { name: '약지', title: '예술 의뢰',   color: '#c86ad8', soldier: 'ring_artist', mat: 'ring_pigment',
            nature: '살육을 예술로 여기는 자들. 아름다운 무기에 값을 아끼지 않는다.',
            friend: '우호 50+: 예술 의뢰 보수 2배 · 완수 시 약지의 물감 지급', enemy: '적대 -40 이하: 현장에 약지 화가 매복' },
  pinky:  { name: '소지', title: '정보 거래',   color: '#6fdc8c', soldier: null, mat: 'pinky_letter',
            nature: '정체를 드러내지 않는 정보상. 값만 맞으면 무엇이든 알려 준다.',
            friend: '우호 40+: 아침마다 오늘 밤 습격 정보 · 동맹 70+: 정보 거래 가격 -30%', enemy: '적대: 정보가 끊긴다' },
};
const FINGER_KEYS = Object.keys(FINGERS);
function relLabel(v) { return v >= 70 ? '동맹' : v >= 40 ? '우호' : v > -30 ? '중립' : v > -60 ? '경계' : '적대'; }

// 손가락 전용 재료 (최상급 속성재료)
Object.assign(MATERIALS, {
  thumb_bullet:    { name: '엄지의 탄환',   grade: 5, cat: 'core', trait: 'poise',   color: '#d8a040', price: 0 },
  index_prescript: { name: '검지의 지령서', grade: 5, cat: 'core', trait: 'tremor',  color: '#8a8fff', price: 0 },
  middle_oath:     { name: '중지의 맹세',   grade: 5, cat: 'core', trait: 'bleed',   color: '#e04a4a', price: 0 },
  ring_pigment:    { name: '약지의 물감',   grade: 5, cat: 'core', trait: 'rupture', color: '#c86ad8', price: 0 },
  pinky_letter:    { name: '소지의 밀서',   grade: 5, cat: 'core', trait: 'sinking', color: '#6fdc8c', price: 0 },
});
MAT_ORDER.push('thumb_bullet', 'index_prescript', 'middle_oath', 'ring_pigment', 'pinky_letter');

// 손가락 조직원 (적대 시 현장에 매복) — 지역 깊이에 따라 강해진다
Object.assign(ENEMIES, {
  thumb_soldier:   { name: '엄지 병사',   sprite: 'human', pal: { h: '#2a2a2a', c: '#6a5a30', p: '#2a2418', s: '#d8b494' }, hp: 140, atk: 16, def: 5, interval: 1.2, range: 120, speed: 26, exp: 30, money: 40, weapon: 'gun', ranged: true },
  index_proselyte: { name: '검지 사도',   sprite: 'human', pal: { h: '#e8e8f0', c: '#2a2a6a', p: '#1a1a3a', s: '#e0bc9c' }, hp: 120, atk: 20, def: 3, interval: 0.9, range: 24, speed: 34, exp: 30, money: 40, weapon: 'sword' },
  middle_brother:  { name: '중지 아우',   sprite: 'human', pal: { h: '#1a1a1a', c: '#1a1a1a', p: '#111111', s: '#d0a888' }, hp: 180, atk: 18, def: 6, interval: 1.4, range: 22, speed: 30, exp: 30, money: 40, weapon: 'pipe' },
  ring_artist:     { name: '약지 화가',   sprite: 'human', pal: { h: '#c86ad8', c: '#e8e0f0', p: '#5a3a6a', s: '#f0c8a0' }, hp: 110, atk: 22, def: 2, interval: 1.0, range: 36, speed: 32, exp: 30, money: 40, weapon: 'spear' },
});

// ---------- 원화 기준 환산 (천 안 단위 → 안) ----------
for (const k in MATERIALS) MATERIALS[k].price *= KRW;
// 적 보상: 아직 환산하지 않은 것만 한 번씩 (뒤에 추가되는 적도 파일 끝에서 다시 부른다)
function krwEnemies() { for (const k in ENEMIES) { const e = ENEMIES[k]; if (!e.krw) { e.money = (e.money || 0) * KRW; e.krw = true; } } }
krwEnemies();
for (const w of WORKSHOP_LEVELS) if (w.up) w.up.money *= KRW;
for (const k in OFFICE_UP) OFFICE_UP[k].money *= KRW;

// ---------- 특이점 (날개 고유 기술) ----------
// 무기에 날개의 특이점 기술을 적용한다. 공방 Lv.4(A+급)부터 해금, 적용할 때마다 기술 사용료.
const SINGULARITIES = {
  g: { name: 'G사 특이점 · 중력',   short: '중력',   color: '#9a8aff', kinds: ['weapon'],          desc: '적중 시 주변의 적까지 짓누른다 (주변 적에게 50% 피해)' },
  w: { name: 'W사 특이점 · 워프',   short: '워프',   color: '#5fd0ff', kinds: ['weapon', 'armor'], desc: '무기: 빠른 접근 · 적마다 첫 타격 +50% / 무기+방어구 세트: 15% 확률로 「차원 베기」' },
  k: { name: 'K사 특이점 · 앰플',   short: '재생',   color: '#6fdc8c', kinds: ['weapon'],          desc: '착용자가 매초 최대 체력의 1.5%를 회복' },
  j: { name: 'J사 특이점 · 자물쇠', short: '자물쇠', color: '#c8a060', kinds: ['weapon'],          desc: '적중 시 20% 확률로 적의 공격·스킬을 3초간 잠근다' },
  q: { name: 'Q사 특이점 · 괴문자', short: '괴문자', color: '#e06ad0', kinds: ['weapon'],          desc: '적중마다 괴문자 스택 · 5스택이 쌓인 뒤의 공격은 2배 피해' },
  m: { name: 'M사 특이점 · 월광석', short: '월광석', color: '#c8d8ff', kinds: ['weapon', 'armor'], desc: '무기: 환상체에게 주는 피해 +50% / 방어구: 환상체에게 받는 피해 -50%' },
  x: { name: 'X사 특이점 · 특수 합금', short: '합금', color: '#a8b8c0', kinds: ['weapon', 'armor'], desc: '단조 중 내구가 깎이지 않고, 완성 성능 1.4배' },
  p: { name: 'P사 특이점 · 공간 확장', short: '공간', color: '#7ad8b0', kinds: ['pack'],          desc: '주재료로 차원가방(천)·차원장갑(금속)을 만든다 — 무기를 여러 개 넣어 다니며 상대에 맞게 바꿔 든다' },
};
const SING_UNLOCK_W = 4, SING_COST = 1500 * KRW;
// 특이점 서비스 (단조가 아닌 기술)
const F_UNBIND_COST = 3000 * KRW;   // F사 요정: 귀속을 열어젖힌다
const N_COST = 800 * KRW;           // N사 기억 추출·주입 (경험 통조림)

// ---------- 희귀 해금: 총기 · 의체 · E.G.O ----------
// 매우 낮은 확률로 찾아오는 손님의 의뢰, 또는 현장에 매우 드물게 나타나는 환상체를 처치해 얻는 재료로 해금된다.
Object.assign(MATERIALS, {
  gun_blueprint:   { name: '총기 설계도', grade: 5, cat: 'key', color: '#c9a050', price: 0, unlock: 'gun' },
  prosthetic_part: { name: '의체 부품',   grade: 5, cat: 'key', color: '#9ad0ff', price: 0, unlock: 'aug' },
  // E.G.O 추출물 — 환상체(로보토미 코퍼레이션)마다 하나
  ego_beak: { name: 'E.G.O 추출물 · 부리', grade: 5, cat: 'ego', color: '#e04a4a', price: 0, unlock: 'ego', ego: 'beak' },
  ego_penitence: { name: 'E.G.O 추출물 · 참회', grade: 5, cat: 'ego', color: '#e8e0c0', price: 0, unlock: 'ego', ego: 'penitence' },
  ego_regret: { name: 'E.G.O 추출물 · 후회', grade: 5, cat: 'ego', color: '#8a8a9a', price: 0, unlock: 'ego', ego: 'regret' },
  ego_horn: { name: 'E.G.O 추출물 · 뿔', grade: 5, cat: 'ego', color: '#a0703a', price: 0, unlock: 'ego', ego: 'horn' },
  ego_redeyes: { name: 'E.G.O 추출물 · 적안', grade: 5, cat: 'ego', color: '#c02030', price: 0, unlock: 'ego', ego: 'redeyes' },
  ego_lantern: { name: 'E.G.O 추출물 · 초롱', grade: 5, cat: 'ego', color: '#f0d070', price: 0, unlock: 'ego', ego: 'lantern' },
  ego_ecstasy: { name: 'E.G.O 추출물 · 황홀한 꿈', grade: 5, cat: 'ego', color: '#9a8af0', price: 0, unlock: 'ego', ego: 'ecstasy' },
  ego_solitude: { name: 'E.G.O 추출물 · 외로움', grade: 5, cat: 'ego', color: '#8a8aa0', price: 0, unlock: 'ego', ego: 'solitude' },
  ego_match: { name: 'E.G.O 추출물 · 4번째 성냥불', grade: 5, cat: 'ego', color: '#ff7a2a', price: 0, unlock: 'ego', ego: 'match' },
  ego_logging: { name: 'E.G.O 추출물 · 벌목', grade: 5, cat: 'ego', color: '#c8c0b0', price: 0, unlock: 'ego', ego: 'logging' },
  ego_frost: { name: 'E.G.O 추출물 · 서리조각', grade: 5, cat: 'ego', color: '#9ad8ff', price: 0, unlock: 'ego', ego: 'frost' },
  ego_harmony: { name: 'E.G.O 추출물 · 하모니', grade: 5, cat: 'ego', color: '#e8c070', price: 0, unlock: 'ego', ego: 'harmony' },
  ego_paw: { name: 'E.G.O 추출물 · 곰발바닥', grade: 5, cat: 'ego', color: '#b08a6a', price: 0, unlock: 'ego', ego: 'paw' },
  ego_sanguine: { name: 'E.G.O 추출물 · 핏빛욕망', grade: 5, cat: 'ego', color: '#e02040', price: 0, unlock: 'ego', ego: 'sanguine' },
  ego_justitia: { name: 'E.G.O 추출물 · 유스티티아', grade: 5, cat: 'ego', color: '#e8d8a0', price: 0, unlock: 'ego', ego: 'justitia' },
  ego_crimson: { name: 'E.G.O 추출물 · 붉은 흉터', grade: 5, cat: 'ego', color: '#d02020', price: 0, unlock: 'ego', ego: 'crimson' },
  ego_lovehate: { name: 'E.G.O 추출물 · 사랑과 증오의 이름으로', grade: 5, cat: 'ego', color: '#ff80c0', price: 0, unlock: 'ego', ego: 'lovehate' },
  ego_rapture: { name: 'E.G.O 추출물 · 황홀', grade: 5, cat: 'ego', color: '#5a8ab0', price: 0, unlock: 'ego', ego: 'rapture' },
  ego_greenstem: { name: 'E.G.O 추출물 · 녹색줄기', grade: 5, cat: 'ego', color: '#4aa04a', price: 0, unlock: 'ego', ego: 'greenstem' },
  ego_exuviae: { name: 'E.G.O 추출물 · 허물', grade: 5, cat: 'ego', color: '#a07a4a', price: 0, unlock: 'ego', ego: 'exuviae' },
  ego_feather: { name: 'E.G.O 추출물 · 명예로운 깃털', grade: 5, cat: 'ego', color: '#ff9a3a', price: 0, unlock: 'ego', ego: 'feather' },
  ego_dacapo: { name: 'E.G.O 추출물 · 다카포', grade: 5, cat: 'ego', color: '#e8e8f0', price: 0, unlock: 'ego', ego: 'dacapo' },
  ego_mimicry: { name: 'E.G.O 추출물 · 미미크리', grade: 5, cat: 'ego', color: '#c84a4a', price: 0, unlock: 'ego', ego: 'mimicry' },
  ego_smile: { name: 'E.G.O 추출물 · 웃음', grade: 5, cat: 'ego', color: '#8a8a8a', price: 0, unlock: 'ego', ego: 'smile' },
  ego_paradise: { name: 'E.G.O 추출물 · 실낙원', grade: 5, cat: 'ego', color: '#fff4c0', price: 0, unlock: 'ego', ego: 'paradise' },
});
MAT_ORDER.push('gun_blueprint', 'prosthetic_part', 'ego_beak', 'ego_penitence', 'ego_regret', 'ego_horn', 'ego_redeyes', 'ego_lantern', 'ego_ecstasy', 'ego_solitude', 'ego_match', 'ego_logging', 'ego_frost', 'ego_harmony', 'ego_paw', 'ego_sanguine', 'ego_justitia', 'ego_crimson', 'ego_lovehate', 'ego_rapture', 'ego_greenstem', 'ego_exuviae', 'ego_feather', 'ego_dacapo', 'ego_mimicry', 'ego_smile', 'ego_paradise');

const RARE_GUESTS = [
  { id: 'period', name: '마침표 사무소 해결사', item: 'gun_blueprint', forms: ['sword', 'spear', 'mace'],
    line: '정밀한 일에는 정밀한 도구가 필요하지. 만족스러우면 우리 쪽 설계도를 하나 넘겨 주겠네.' },
  { id: 'prosth', name: '의체 공방 기술자', item: 'prosthetic_part', forms: ['coat', 'plate'],
    line: '사람 몸에 붙일 물건을 다루는 사람으로서, 튼튼한 방어구를 좀 보고 싶군요. 대가로 의체 부품을 드리죠.' },
];
const RARE_GUEST_CHANCE = 0.006;   // 개점 중 한 시간마다

// 환상체 — 현장에 매우 드물게 나타난다. 처치하면 그 환상체의 E.G.O 추출물.
// 이름·외형·E.G.O 무기 이름은 로보토미 코퍼레이션 원작 기준. 위험 등급이 높을수록 강하고 깊은 지역에만 나온다.
Object.assign(ENEMIES, {
  ab_punishing: { name: '징벌 새', risk: 'TETH', look: '작고 하얀 새 — 붉은 무늬 속에 감춘 부리', sprite: 'bird', pal: { w: '#f4f0ea', m: '#d8d0c8', r: '#e02020', e: '#120e14' }, hp: 1000, atk: 28, def: 7, interval: 0.7, range: 24, speed: 60, exp: 125, money: 0, boss: true, scale: 1.3, abno: 'ego_beak', abnoFame: 10 },
  ab_onesin: { name: '단 한번의 악과 수백 가지의 선행', risk: 'ZAYIN', look: '가시 왕관을 쓴 채 십자가에 매달린 해골', sprite: 'skull', pal: { w: '#ece4d0', r: '#6a4a2a', e: '#120e14', y: '#8a6a3a' }, hp: 650, atk: 14, def: 5, interval: 1.2, range: 24, speed: 26, exp: 100, money: 0, boss: true, scale: 1.3, abno: 'ego_penitence', abnoFame: 6 },
  ab_forsaken: { name: '버려진 살인마', risk: 'TETH', look: '구속복에 묶인 남자', sprite: 'human', pal: { h: '#3a3a3a', c: '#e8e4dc', p: '#2a2a2a', s: '#c8b0a0' }, hp: 1000, atk: 28, def: 7, interval: 1.2, range: 24, speed: 26, exp: 125, money: 0, weapon: 'pipe', boss: true, scale: 1.3, abno: 'ego_regret', abnoFame: 10 },
  ab_beauty: { name: '미녀와 야수', risk: 'TETH', look: '갈색 털에 녹색 눈을 가진 짐승', sprite: 'dog', pal: { d: '#7a5a3a', e: '#6fdc6f' }, hp: 1000, atk: 28, def: 7, interval: 1.2, range: 24, speed: 26, exp: 125, money: 0, boss: true, scale: 1.3, abno: 'ego_horn', abnoFame: 10 },
  ab_spiderbud: { name: '거미봉오리', risk: 'TETH', look: '눈이 여럿 달린 검은 덩어리, 바닥의 새끼 거미들', sprite: 'blob', pal: { m: '#2a2430', e: '#e02020', r: '#5a2a3a' }, hp: 1000, atk: 28, def: 7, interval: 1.2, range: 24, speed: 26, exp: 125, money: 0, boss: true, scale: 1.3, abno: 'ego_redeyes', abnoFame: 10 },
  ab_meatlantern: { name: '고기 초롱', risk: 'TETH', look: '하얀 풀밭의 밝은 꽃 — 그 아래 숨은 아귀', sprite: 'flower', pal: { y: '#f8f0a0', g: '#5a8a3a', m: '#7a3a3a', w: '#f0e8d8', r: '#c03030' }, hp: 1000, atk: 28, def: 7, interval: 1.2, range: 24, speed: 26, exp: 125, money: 0, boss: true, scale: 1.3, abno: 'ego_lantern', abnoFame: 10 },
  ab_voiddream: { name: '공허한 꿈', risk: 'TETH', look: '눈알이 박힌 채 잠든 양', sprite: 'sheep', pal: { w: '#e8e4f0', e: '#6a4ae0', m: '#3a3448' }, hp: 1000, atk: 28, def: 7, interval: 1.2, range: 24, speed: 26, exp: 125, money: 0, boss: true, scale: 1.3, abno: 'ego_ecstasy', abnoFame: 10 },
  ab_oldlady: { name: '늙은 여인', risk: 'TETH', look: '흔들의자에 앉아 이야기를 들려주던 노파', sprite: 'cloak', pal: { m: '#6a6670', y: '#c8c0b0' }, hp: 1000, atk: 28, def: 7, interval: 1.2, range: 24, speed: 26, exp: 125, money: 0, boss: true, scale: 1.3, abno: 'ego_solitude', abnoFame: 10 },
  ab_scorched: { name: '불타버린 소녀', risk: 'TETH', look: '온몸이 그을린 성냥팔이 소녀', sprite: 'human', pal: { h: '#2a1a14', c: '#5a2a1a', p: '#2a1a14', s: '#8a5a3a' }, hp: 1000, atk: 28, def: 7, interval: 1.2, range: 24, speed: 26, exp: 125, money: 0, boss: true, scale: 1.3, abno: 'ego_match', abnoFame: 10 },
  ab_woodsman: { name: '따뜻한 마음의 나무꾼', risk: 'HE', look: '도끼를 든 양철 인간', sprite: 'bot', pal: { m: '#9aa0a8', r: '#e05050' }, hp: 2200, atk: 44, def: 12, interval: 1.2, range: 24, speed: 26, exp: 275, money: 0, weapon: 'sword', boss: true, scale: 1.4, abno: 'ego_logging', abnoFame: 16 },
  ab_snowqueen: { name: '눈의 여왕', risk: 'HE', look: '몸 없이 떠 있는 푸른 옷과 큰 칼', sprite: 'cloak', pal: { m: '#4a7ab8', y: '#e8f4ff' }, hp: 2200, atk: 44, def: 12, interval: 1.2, range: 24, speed: 26, exp: 275, money: 0, weapon: 'spear', boss: true, scale: 1.4, abno: 'ego_frost', abnoFame: 16 },
  ab_singing: { name: '노래하는 기계', risk: 'HE', look: '길쭉한 직육면체 기계', sprite: 'box', pal: { m: '#8a7a6a', y: '#f0c060', r: '#c03030' }, hp: 2200, atk: 44, def: 12, interval: 1.2, range: 24, speed: 26, exp: 275, money: 0, boss: true, scale: 1.4, abno: 'ego_harmony', abnoFame: 16 },
  ab_teddy: { name: '행복한 테디', risk: 'HE', look: '털이 빠지고 눈 하나가 없는 낡은 곰인형', sprite: 'bear', pal: { m: '#a07a5a', w: '#e8d8c0', e: '#120e14' }, hp: 2200, atk: 44, def: 12, interval: 1.2, range: 24, speed: 26, exp: 275, money: 0, boss: true, scale: 1.4, abno: 'ego_paw', abnoFame: 16 },
  ab_redshoes: { name: '빨간 구두', risk: 'HE', look: '멈추지 않고 춤추는 빨간 구두', sprite: 'human', pal: { h: '#c8a070', c: '#c02020', p: '#e02020', s: '#f0d0c0' }, hp: 2200, atk: 44, def: 12, interval: 1.2, range: 24, speed: 26, exp: 275, money: 0, weapon: 'sword', boss: true, scale: 1.4, abno: 'ego_sanguine', abnoFame: 16 },
  ab_judgement: { name: '심판 새', risk: 'WAW', look: '붕대를 감고 저울을 든 외눈의 새', sprite: 'bird', pal: { w: '#3a3430', m: '#e8e0d0', r: '#c8a040', e: '#ffd84a' }, hp: 4500, atk: 70, def: 20, interval: 0.7, range: 24, speed: 60, exp: 563, money: 0, boss: true, scale: 1.5, abno: 'ego_justitia', abnoFame: 25 },
  ab_redhood: { name: '붉은 두건의 용병', risk: 'WAW', look: '붉은 옷과 두건, 이빨 달린 가면의 용병', sprite: 'human', pal: { h: '#c02020', c: '#a01818', p: '#2a1a1a', s: '#e8d0c0' }, hp: 4500, atk: 70, def: 20, interval: 1.2, range: 110, speed: 26, exp: 563, money: 0, weapon: 'gun', ranged: true, boss: true, scale: 1.5, abno: 'ego_crimson', abnoFame: 25 },
  ab_magicalgirl: { name: '증오의 여왕', risk: 'WAW', look: '애니메이션풍 마법소녀', sprite: 'human', pal: { h: '#f080c0', c: '#f8a0d0', p: '#ffffff', s: '#f8e0d8' }, hp: 4500, atk: 70, def: 20, interval: 1.2, range: 24, speed: 26, exp: 563, money: 0, weapon: 'spear', boss: true, scale: 1.5, abno: 'ego_lovehate', abnoFame: 25 },
  ab_current: { name: '꿈꾸는 해류', risk: 'WAW', look: '턱이 두 개인 상어, 사람의 다리', sprite: 'shark', pal: { m: '#4a6a8a', w: '#f0f0f0', e: '#ffd84a', p: '#d8b494' }, hp: 4500, atk: 70, def: 20, interval: 1.2, range: 24, speed: 26, exp: 563, money: 0, boss: true, scale: 1.5, abno: 'ego_rapture', abnoFame: 25 },
  ab_snowapple: { name: '백설공주의 사과', risk: 'WAW', look: '사과 머리에 식물의 몸', sprite: 'plant', pal: { r: '#c02030', g: '#3a7a3a', e: '#120e14' }, hp: 4500, atk: 70, def: 20, interval: 1.2, range: 24, speed: 26, exp: 563, money: 0, boss: true, scale: 1.5, abno: 'ego_greenstem', abnoFame: 25 },
  ab_nakednest: { name: '벌거벗은 둥지', risk: 'WAW', look: '구멍이 숭숭 난 갈색 덩어리', sprite: 'blob', pal: { m: '#7a5a3a', e: '#2a1a14', r: '#a05a4a' }, hp: 4500, atk: 70, def: 20, interval: 1.2, range: 24, speed: 26, exp: 563, money: 0, boss: true, scale: 1.5, abno: 'ego_exuviae', abnoFame: 25 },
  ab_firebird: { name: '불새', risk: 'WAW', look: '불에 그을린 새', sprite: 'bird', pal: { w: '#5a3a2a', m: '#ff8a2a', r: '#ffd84a', e: '#ffe070' }, hp: 4500, atk: 70, def: 20, interval: 0.7, range: 24, speed: 60, exp: 563, money: 0, boss: true, scale: 1.5, abno: 'ego_feather', abnoFame: 25 },
  ab_orchestra: { name: '고요한 오케스트라', risk: 'ALEPH', look: '팔다리 없는 마네킹 지휘자, 음표 모양 옷깃', sprite: 'cloak', pal: { m: '#1a1a22', y: '#f0f0f0' }, hp: 9500, atk: 110, def: 30, interval: 1.2, range: 24, speed: 26, exp: 1188, money: 0, boss: true, scale: 1.7, abno: 'ego_dacapo', abnoFame: 40 },
  ab_nothing: { name: '아무 것도 없는', risk: 'ALEPH', look: '살갗에 눈과 입이 가득한 기형의 인간형', sprite: 'blob', pal: { m: '#c87a6a', e: '#120e14', r: '#8a2a2a' }, hp: 9500, atk: 110, def: 30, interval: 1.2, range: 24, speed: 26, exp: 1188, money: 0, boss: true, scale: 1.7, abno: 'ego_mimicry', abnoFame: 40 },
  ab_mountain: { name: '웃는 시체들의 산', risk: 'ALEPH', look: '창백한 가면 얼굴이 박힌 검은 덩어리', sprite: 'blob', pal: { m: '#1a1418', e: '#e8e4dc', r: '#3a2a2a' }, hp: 9500, atk: 110, def: 30, interval: 1.2, range: 24, speed: 26, exp: 1188, money: 0, boss: true, scale: 1.7, abno: 'ego_smile', abnoFame: 40 },
  ab_whitenight: { name: '백야', risk: 'ALEPH', look: '빛나는 날개와 후광의 존재', sprite: 'cloak', pal: { m: '#f4f0e0', y: '#ffd84a' }, hp: 9500, atk: 110, def: 30, interval: 1.2, range: 24, speed: 26, exp: 1188, money: 0, boss: true, scale: 1.7, abno: 'ego_paradise', abnoFame: 40 },
});
const ABNO_CHANCE = 0.005;   // 웨이브마다
const ABNO_RISK = {"ZAYIN":{"minLv":0,"w":5},"TETH":{"minLv":0,"w":4},"HE":{"minLv":1,"w":3},"WAW":{"minLv":2,"w":2},"ALEPH":{"minLv":3.5,"w":1}};
const ABNO_KEYS = ['ab_punishing', 'ab_onesin', 'ab_forsaken', 'ab_beauty', 'ab_spiderbud', 'ab_meatlantern', 'ab_voiddream', 'ab_oldlady', 'ab_scorched', 'ab_woodsman', 'ab_snowqueen', 'ab_singing', 'ab_teddy', 'ab_redshoes', 'ab_judgement', 'ab_redhood', 'ab_magicalgirl', 'ab_current', 'ab_snowapple', 'ab_nakednest', 'ab_firebird', 'ab_orchestra', 'ab_nothing', 'ab_mountain', 'ab_whitenight'];

// E.G.O 무기: 해당 추출물로 단조한다 (특성은 게임 속 해석)
const EGO = {
  beak: { name: '부리', trait: 'bleed', color: '#e04a4a', desc: '징벌 새의 E.G.O' },
  penitence: { name: '참회', trait: 'sinking', color: '#e8e0c0', desc: '단 한번의 악과 수백 가지의 선행의 E.G.O' },
  regret: { name: '후회', trait: 'tremor', color: '#8a8a9a', desc: '버려진 살인마의 E.G.O' },
  horn: { name: '뿔', trait: 'rupture', color: '#a0703a', desc: '미녀와 야수의 E.G.O' },
  redeyes: { name: '적안', trait: 'bleed', color: '#c02030', desc: '거미봉오리의 E.G.O' },
  lantern: { name: '초롱', trait: 'tremor', color: '#f0d070', desc: '고기 초롱의 E.G.O' },
  ecstasy: { name: '황홀한 꿈', trait: 'sinking', color: '#9a8af0', desc: '공허한 꿈의 E.G.O' },
  solitude: { name: '외로움', trait: 'sinking', color: '#8a8aa0', desc: '늙은 여인의 E.G.O' },
  match: { name: '4번째 성냥불', trait: 'burn', color: '#ff7a2a', desc: '불타버린 소녀의 E.G.O' },
  logging: { name: '벌목', trait: 'rupture', color: '#c8c0b0', desc: '따뜻한 마음의 나무꾼의 E.G.O' },
  frost: { name: '서리조각', trait: 'poise', color: '#9ad8ff', desc: '눈의 여왕의 E.G.O' },
  harmony: { name: '하모니', trait: 'tremor', color: '#e8c070', desc: '노래하는 기계의 E.G.O' },
  paw: { name: '곰발바닥', trait: 'tremor', color: '#b08a6a', desc: '행복한 테디의 E.G.O' },
  sanguine: { name: '핏빛욕망', trait: 'bleed', color: '#e02040', desc: '빨간 구두의 E.G.O' },
  justitia: { name: '유스티티아', trait: 'poise', color: '#e8d8a0', desc: '심판 새의 E.G.O' },
  crimson: { name: '붉은 흉터', trait: 'bleed', color: '#d02020', desc: '붉은 두건의 용병의 E.G.O' },
  lovehate: { name: '사랑과 증오의 이름으로', trait: 'charge', color: '#ff80c0', desc: '증오의 여왕의 E.G.O' },
  rapture: { name: '황홀', trait: 'sinking', color: '#5a8ab0', desc: '꿈꾸는 해류의 E.G.O' },
  greenstem: { name: '녹색줄기', trait: 'rupture', color: '#4aa04a', desc: '백설공주의 사과의 E.G.O' },
  exuviae: { name: '허물', trait: 'rupture', color: '#a07a4a', desc: '벌거벗은 둥지의 E.G.O' },
  feather: { name: '명예로운 깃털', trait: 'burn', color: '#ff9a3a', desc: '불새의 E.G.O' },
  dacapo: { name: '다카포', trait: 'tremor', color: '#e8e8f0', desc: '고요한 오케스트라의 E.G.O' },
  mimicry: { name: '미미크리', trait: 'bleed', color: '#c84a4a', desc: '아무 것도 없는의 E.G.O' },
  smile: { name: '웃음', trait: 'rupture', color: '#8a8a8a', desc: '웃는 시체들의 산의 E.G.O' },
  paradise: { name: '실낙원', trait: 'poise', color: '#fff4c0', desc: '백야의 E.G.O' },
};

// ---------- P사: 차원 장비 ----------
Object.assign(FORMS, {
  pbag:   { name: '차원가방', kind: 'pack', tiers: ['차원 주머니', '차원가방', '차원 배낭', '차원 금고', '주머니 차원'], atk: 0, def: 0, hp: 0, capacity: 3 },
  pglove: { name: '차원장갑', kind: 'pack', tiers: ['차원 장갑', '차원장갑', '차원 건틀릿', '차원 수갑', '열린 손'], atk: 0, def: 0, hp: 0, capacity: 2 },
});

// ---------- H사: 환 ----------
Object.assign(MATERIALS, {
  hwan:      { name: '환',   grade: 3, cat: 'item', color: '#d8b070', price: 0 },
  nureum:    { name: '누름환', grade: 3, cat: 'item', color: '#7a9ab0', price: 0 },
  serum_k:   { name: 'K 혈청', grade: 5, cat: 'item', color: '#6fdc8c', price: 0 },
  serum_r:   { name: 'R 혈청', grade: 5, cat: 'item', color: '#ff7a5a', price: 0 },
  serum_w:   { name: 'W 혈청', grade: 5, cat: 'item', color: '#5fd0ff', price: 0 },
  arbiter_shard: { name: '조율자의 파편', grade: 5, cat: 'metal', color: '#eef0f8', price: 0, adj: '파편' },
  // 외곽 아인족의 생물적 특성 — 흑수환의 재료 (지파마다 바탕 생물이 다르다)
  hb_ja:   { name: '아인족의 정수 · 자',       grade: 5, cat: 'outskirts', color: '#8a8a9a', price: 0 },
  hb_chuk: { name: '아인족의 정수 · 축(소)',   grade: 5, cat: 'outskirts', color: '#a06a3a', price: 0 },
  hb_in:   { name: '아인족의 정수 · 인(호랑이)', grade: 5, cat: 'outskirts', color: '#e09a2a', price: 0 },
  hb_myo:  { name: '아인족의 정수 · 묘(토끼)', grade: 5, cat: 'outskirts', color: '#e8e0f0', price: 0 },
  hb_sa:   { name: '아인족의 정수 · 사(뱀)',   grade: 5, cat: 'outskirts', color: '#5ab04a', price: 0 },
  hb_o:    { name: '아인족의 정수 · 오(말)',   grade: 5, cat: 'outskirts', color: '#8a5a3a', price: 0 },
  hb_mi:   { name: '아인족의 정수 · 미(양)',   grade: 5, cat: 'outskirts', color: '#d8d0b0', price: 0 },
  hb_yu:   { name: '아인족의 정수 · 유(닭)',   grade: 5, cat: 'outskirts', color: '#e04a3a', price: 0 },
});
const OUTSKIRTS_MATS = ['hb_ja', 'hb_chuk', 'hb_in', 'hb_myo', 'hb_sa', 'hb_o', 'hb_mi', 'hb_yu'];
MAT_ORDER.push('hwan', 'nureum', 'serum_k', 'serum_r', 'serum_w', 'arbiter_shard', ...OUTSKIRTS_MATS);
const HWAN_COST = 300 * KRW, NUREUM_COST = 400 * KRW, HEUKSU_COST = 2000 * KRW, HWAN_SKILL_REQ = 10;
// 흑수환 (H사 흑수 지파 참고) — 외곽 아인족의 생물적 특성을 빌린다. 인원당 한 번.
// 모든 지파의 공통 키워드는 파열. 진·신·술·해는 능력이 밝혀지지 않아 쓰지 않는다.
const BLACKWATER = {
  hb_ja:   { name: '흑수 - 자', color: '#a8a8b8', desc: '인해전술 — 공격 시 10% 확률로 한 번 더 친다(절반 위력)', side: '' },
  hb_chuk: { name: '흑수 - 축', color: '#c07a3a', atk: 1.2, desc: '정면 돌파와 강한 힘 — 기본 공격력 1.2배', side: '식욕 폭증 — 급여 2배' },
  hb_in:   { name: '흑수 - 인', color: '#f0a02a', desc: '일기토 — 보스·강적에게 주는 피해 1.25배', side: '' },
  hb_myo:  { name: '흑수 - 묘', color: '#f0e8ff', move: 1.5, spd: 0.92, desc: '빠른 기동과 치고 빠지기 — 이동 1.5배 · 공격 속도 조금 증가', side: '' },
  hb_sa:   { name: '흑수 - 사', color: '#6ac85a', hp: 0.9, desc: '암살과 기습 — 적마다 첫 타격 1.5배 · 치명 +10%', side: '독성 혈액 — 최대 체력 -10%' },
  hb_o:    { name: '흑수 - 오', color: '#a87048', def: 1.2, hp: 1.1, desc: '돌파와 방어, 장기전 — 기본 방어 1.2배 · 기본 체력 1.1배 · 약한 경직', side: '' },
  hb_mi:   { name: '흑수 - 미', color: '#e8e0c0', desc: '공성과 강한 돌진 — 적 방어 25% 무시 · 침잠', side: '착란 상태의 돌진 — 자동 후퇴하지 않는다' },
  hb_yu:   { name: '흑수 - 유', color: '#ff5a4a', desc: '대규모 난전 — 주변 적에게 20% 피해 · 화상', side: '극심한 호전성 — 쓰러지면 사망 확률 60%' },
};
const BW_LEGACY = { os_carapace: 'hb_o', os_heart: 'hb_chuk', os_scale: 'hb_myo' };   // 예전 세이브 변환

// ---------- 외곽 (조율자를 이기고 추출된 뒤) ----------
Object.assign(ENEMIES, {
  os_beast:    { name: '외곽 짐승',     sprite: 'dog',   pal: { d: '#4a3a3a', e: '#ffcc40' }, hp: 520,  atk: 34, def: 8,  interval: 0.9, range: 18, speed: 55, exp: 50, money: 20 },
  os_crawler:  { name: '외곽 갑충',     sprite: 'bot',   pal: { m: '#4a5a3a', r: '#c8ff60' }, hp: 800,  atk: 28, def: 18, interval: 1.4, range: 22, speed: 22, exp: 50, money: 20 },
  os_drifter:  { name: '외곽 비늘 생물', sprite: 'cloak', pal: { m: '#2a4a5a', y: '#80ffe0' }, hp: 600,  atk: 38, def: 10, interval: 1.1, range: 26, speed: 32, exp: 50, money: 20, weapon: 'spear' },
  os_hwanbeast:{ name: '환으로 빚어진 것', sprite: 'bot', pal: { m: '#3a2a3a', r: '#ff4080' }, hp: 6000, atk: 70, def: 24, interval: 1.3, range: 30, speed: 20, exp: 600, money: 300, boss: true, scale: 1.8 },
  berserk:     { name: '광폭화한 해결사', sprite: 'human', pal: { h: '#1a1a1a', c: '#2a0a10', p: '#100808', s: '#8a6a6a' }, hp: 800, atk: 40, def: 10, interval: 0.9, range: 24, speed: 40, exp: 80, money: 0, weapon: 'sword', boss: true, scale: 1.3 },
});
krwEnemies();
const OUTSKIRTS_ZONES = [
  { name: '외곽 — 무너진 경계', req: 9,
    pal: { sky: '#1a1e18', far: '#242a20', mid: '#2e3628', ground: '#1e221a', line: '#2a3024', edge: '#38402e', win: '#c8ff60' },
    enemies: ['os_beast', 'os_crawler'], boss: 'os_hwanbeast', waveSize: [1, 3],
    drops: { blackiron: 3, silk: 3, hb_chuk: 1, hb_o: 1, hb_ja: 1, hb_myo: 1, stigma: 1 }, rare: ['arbiter_shard', 'hb_in'], fame: 20 },
  { name: '외곽 — 갈대 늪', req: 9,
    pal: { sky: '#141c20', far: '#1c2a30', mid: '#24363c', ground: '#162024', line: '#1e2c30', edge: '#2a3c42', win: '#80ffe0' },
    enemies: ['os_drifter', 'os_beast'], boss: 'os_hwanbeast', waveSize: [1, 3],
    drops: { dawn: 3, silk: 2, hb_sa: 1, hb_mi: 1, hb_myo: 1, ink: 2 }, rare: ['hb_sa', 'arbiter_shard'], fame: 25 },
  { name: '외곽 — 깊은 폐허', req: 9,
    pal: { sky: '#1c141c', far: '#2a1c2a', mid: '#36243a', ground: '#1e161e', line: '#2c1e2c', edge: '#3c2a3c', win: '#ff4080' },
    enemies: ['os_crawler', 'os_drifter'], boss: 'os_hwanbeast', waveSize: [2, 3],
    drops: { stigma: 3, dawn: 2, hb_yu: 1, hb_in: 1, hb_chuk: 1, pendulum: 2 }, rare: ['arbiter_shard', 'hb_yu'], fame: 35 },
];
// ---------- 구마다 다른 현장: 그 구를 다스리는 날개의 색이 깊은 곳으로 갈수록 짙어진다 ----------
// DISTRICTS와 같은 순서 (14구 N사 · 11구 K사 · 18구 R사). 번호 → 그 자리의 지역을 바꾼다.
// 난이도(req·lvl·fame·waveSize)는 원래 자리의 것을 그대로 따른다.
const DISTRICT_ZONES = [
  { // 14구 — N사: 못과 망치(Nagel und Hammer)의 땅
    3: { name: '못 박힌 골목',
      pal: { sky: '#1a1614', far: '#28201c', mid: '#362a24', ground: '#1e1816', line: '#2e2420', edge: '#40322a', win: '#e0c070' },
      enemies: ['nh_nail', 'nh_penitent'], boss: 'nh_hammer',
      drops: { steel: 3, kevlar: 2, clot: 3, coil: 2, hammerhead: 2, chainlink: 2, thread: 1, lining: 1, bloodvial: 1, hook: 1, alloy: 1 }, rare: ['alloy', 'weave', 'hammerhead', 'bloodvial'] },
    5: { name: '이단 심문소',
      pal: { sky: '#181412', far: '#261e18', mid: '#352820', ground: '#1c1612', line: '#2c221a', edge: '#3e3024', win: '#ffb050' },
      enemies: ['nh_inquisitor', 'nh_brander'], boss: 'nh_gross',
      drops: { alloy: 3, weave: 3, blackiron: 2, silk: 1, fuel: 2, crystal: 2, ink: 1, pendulum: 1, hammerhead: 2, heavyplate: 1, greathilt: 1, mechhinge: 1 }, rare: ['blackiron', 'silk', 'ink', 'greathilt'] },
  },
  { // 11구 — K사: 재생 앰플의 땅
    3: { name: '앰플 밀매 골목',
      pal: { sky: '#121a16', far: '#1a2820', mid: '#22362a', ground: '#141e18', line: '#1e2c22', edge: '#2a3e30', win: '#9affc0' },
      enemies: ['k_addict', 'k_dealer'], boss: 'k_smuggler',
      drops: { steel: 3, kevlar: 3, clot: 3, bloodvial: 2, coil: 2, battery: 1, thread: 2, lining: 1, sealant: 1, alloy: 1 }, rare: ['alloy', 'weave', 'bloodvial', 'battery'] },
    5: { name: 'K사 폐기 처리장',
      pal: { sky: '#0e1814', far: '#16241c', mid: '#1e3226', ground: '#121a16', line: '#1a2a20', edge: '#26382c', win: '#c8ff60' },
      enemies: ['k_failure', 'k_disposal'], boss: 'k_bloat',
      drops: { alloy: 3, weave: 3, battery: 3, crystal: 1, bloodvial: 2, capacitor: 1, synthskin: 1, servo: 1, armmount: 1, sealant: 1, blackiron: 1 }, rare: ['blackiron', 'capacitor', 'synthskin', 'armmount'] },
    8: { name: 'K사 둥지 경계', req: 1, wing: 'K사', bg: null,
    pal: { sky: '#101a16', far: '#18281f', mid: '#20362a', ground: '#141c18', line: '#1e2c24', edge: '#2a4034', win: '#7affb0' },
    enemies: ['k_guard', 'k_cleaner'], boss: 'k_excision', waveSize: [1, 3],
    drops: { blackiron: 3, silk: 3, stigma: 2, dawn: 2, battery: 2, capacitor: 1, bloodvial: 2, synthskin: 1, servo: 1, mechcore: 1 }, rare: ['stigma', 'dawn', 'capacitor', 'synthskin'], fame: 35, lvl: 4 },
  },
  { // 18구 — R사: 제4무리와 클론의 땅
    3: { name: '클론 사육장 폐허',
      pal: { sky: '#1a1212', far: '#281a18', mid: '#36221e', ground: '#1e1414', line: '#2e1e1a', edge: '#402a24', win: '#ff9a6a' },
      enemies: ['r_stray', 'r_hound'], boss: 'r_alpha',
      drops: { steel: 3, kevlar: 2, clot: 2, fuel: 2, talon: 2, fang: 2, barb: 1, bowstring: 1, braid: 1, alloy: 1 }, rare: ['alloy', 'weave', 'talon', 'barb'] },
    5: { name: 'R사 훈련장 외곽',
      pal: { sky: '#1c1210', far: '#2a1a16', mid: '#3a221c', ground: '#1e1412', line: '#2e1c18', edge: '#422822', win: '#ff6a3a' },
      enemies: ['r_trainee', 'r_fawn'], boss: 'r_instructor',
      drops: { alloy: 3, weave: 3, fuel: 2, ember: 1, cog: 2, longbarrel: 1, trigger: 1, bowstring: 1, servo: 1, meteor: 1, blackiron: 1 }, rare: ['blackiron', 'silk', 'longbarrel', 'servo'] },
    8: { name: 'R사 둥지 경계', req: 1, wing: 'R사', bg: null,
    pal: { sky: '#1c1010', far: '#2a1616', mid: '#3a1e1c', ground: '#1e1414', line: '#2e1c1a', edge: '#442824', win: '#ff7a4a' },
    enemies: ['r_rabbit', 'r_reindeer'], boss: 'r_rhino', waveSize: [1, 3],
    drops: { blackiron: 3, silk: 3, stigma: 2, dawn: 2, ember: 2, meteor: 2, pendulum: 1, scope: 1, servo: 2, mechcore: 1 }, rare: ['stigma', 'dawn', 'scope', 'servo'], fame: 35, lvl: 4 },
  },
];
Object.assign(ENEMIES, {
  // 14구 N사 — 못과 망치
  nh_nail:      { name: '못',          sprite: 'human', pal: { h: '#5a4a3a', c: '#8a7a5a', p: '#2a2018', s: '#d8b494' }, hp: 100, atk: 15, def: 3, interval: 1.1, range: 22, speed: 30, exp: 18, money: 12, weapon: 'dagger' },
  nh_penitent:  { name: '고행자',      sprite: 'cloak', pal: { m: '#4a3a2a', y: '#e0c070' }, hp: 125, atk: 13, def: 5, interval: 1.3, range: 24, speed: 24, exp: 18, money: 14, weapon: 'whip' },
  nh_hammer:    { name: '망치',        sprite: 'human', pal: { h: '#3a2a1a', c: '#6a5a3a', p: '#2a1e14', s: '#d0a888' }, hp: 1150, atk: 33, def: 10, interval: 1.5, range: 30, speed: 20, exp: 210, money: 380, weapon: 'hammer', boss: true, scale: 1.7, ab: 'nh_zeal' },
  nh_inquisitor:{ name: '심문관',      sprite: 'human', pal: { h: '#2a2018', c: '#e8e0c8', p: '#3a2e20', s: '#d8b494' }, hp: 230, atk: 25, def: 9, interval: 1.2, range: 26, speed: 28, exp: 34, money: 30, weapon: 'hammer' },
  nh_brander:   { name: '낙인꾼',      sprite: 'cloak', pal: { m: '#3a2a1e', y: '#ff9a3a' }, hp: 210, atk: 24, def: 9, interval: 1.3, range: 24, speed: 26, exp: 34, money: 28, weapon: 'staff' },
  nh_gross:     { name: '대망치',      sprite: 'human', pal: { h: '#1e1610', c: '#f0e8d0', p: '#2a2018', s: '#c89a78' }, hp: 2900, atk: 54, def: 17, interval: 1.4, range: 32, speed: 18, exp: 480, money: 1000, weapon: 'hammer', boss: true, scale: 1.8, ab: 'nh_verdict' },
  // 11구 K사 — 앰플
  k_addict:     { name: '앰플 중독자', sprite: 'human', pal: { h: '#4a5a4a', c: '#3a4a40', p: '#1e2620', s: '#c8d8b8' }, hp: 95, atk: 14, def: 2, interval: 1.0, range: 20, speed: 34, exp: 18, money: 12, weapon: 'knuckle', ab: 'k_ampule' },
  k_dealer:     { name: '앰플 밀매상', sprite: 'cloak', pal: { m: '#24302a', y: '#9affc0' }, hp: 110, atk: 14, def: 4, interval: 1.3, range: 110, speed: 24, exp: 18, money: 20, weapon: 'gun', ranged: true },
  k_smuggler:   { name: '밀매 조직 두목', sprite: 'human', pal: { h: '#1a2a20', c: '#2e3a30', p: '#161c18', s: '#c8b098' }, hp: 1100, atk: 32, def: 10, interval: 1.4, range: 30, speed: 20, exp: 210, money: 380, weapon: 'axe', boss: true, scale: 1.7, ab: 'k_overdose' },
  k_failure:    { name: '과재생 실패작', sprite: 'blob', pal: { m: '#b88a7a', e: '#3aff9a', r: '#8a3a3a' }, hp: 260, atk: 22, def: 6, interval: 1.4, range: 22, speed: 20, exp: 34, money: 22, ab: 'k_ampule' },
  k_disposal:   { name: 'K사 폐기 담당', sprite: 'human', pal: { h: '#e8e8e8', c: '#d8e4dc', p: '#2a6a4a', s: '#e0bc9c' }, hp: 210, atk: 25, def: 10, interval: 1.2, range: 110, speed: 24, exp: 34, money: 30, weapon: 'gun', ranged: true },
  k_bloat:      { name: '비대해진 실패작', sprite: 'blob', pal: { m: '#c89a88', e: '#3aff9a', r: '#a03a3a' }, hp: 3200, atk: 48, def: 12, interval: 1.6, range: 30, speed: 14, exp: 480, money: 1000, boss: true, scale: 1.9, ab: 'k_bud' },
  // 18구 R사 — 클론과 제4무리
  r_stray:      { name: '버려진 클론', sprite: 'human', pal: { h: '#8a8a8a', c: '#4a4a4e', p: '#2a2a2e', s: '#e0c8b0' }, hp: 100, atk: 15, def: 3, interval: 1.1, range: 22, speed: 30, exp: 18, money: 12, weapon: 'dagger' },
  r_hound:      { name: '사냥 클론견', sprite: 'dog',   pal: { d: '#5a4a40', e: '#ff7a4a' }, hp: 90, atk: 15, def: 2, interval: 0.9, range: 16, speed: 48, exp: 18, money: 6 },
  r_alpha:      { name: '무리 우두머리', sprite: 'human', pal: { h: '#3a2a24', c: '#5a3a2e', p: '#241814', s: '#d8b494' }, hp: 1100, atk: 32, def: 10, interval: 1.3, range: 30, speed: 24, exp: 210, money: 380, weapon: 'claw', boss: true, scale: 1.7, ab: 'r_pack' },
  r_trainee:    { name: '토끼팀 훈련생', sprite: 'human', pal: { h: '#1e1e1e', c: '#34343a', p: '#18181a', s: '#e0bc9c' }, hp: 190, atk: 24, def: 7, interval: 0.9, range: 110, speed: 36, exp: 34, money: 28, weapon: 'gun', ranged: true },
  r_fawn:       { name: '순록팀 훈련생', sprite: 'cloak', pal: { m: '#6a4a30', y: '#ffc890' }, hp: 220, atk: 20, def: 9, interval: 1.4, range: 100, speed: 24, exp: 34, money: 30, weapon: 'staff', ranged: true, ab: 'r_antler' },
  r_instructor: { name: '제4무리 교관', sprite: 'human', pal: { h: '#141414', c: '#3a2a24', p: '#1a1412', s: '#d8b494' }, hp: 2800, atk: 52, def: 16, interval: 1.3, range: 32, speed: 22, exp: 480, money: 1000, weapon: 'lance', boss: true, scale: 1.7, ab: 'r_drill' },
  // K사 — 재생 앰플. 쓰러뜨리지 못하면 상처가 금세 아문다
  k_guard:   { name: 'K사 경비 직원', sprite: 'human', pal: { h: '#e8e8e8', c: '#f0f4f0', p: '#2a6a4a', s: '#e0bc9c' }, hp: 760, atk: 58, def: 24, interval: 1.2, range: 26, speed: 28, exp: 92, money: 85, weapon: 'shield', ab: 'k_ampule' },
  k_cleaner: { name: 'K사 적출반', sprite: 'cloak', pal: { m: '#e8f0ec', y: '#3aff9a' }, hp: 600, atk: 74, def: 16, interval: 1.0, range: 24, speed: 34, exp: 92, money: 90, weapon: 'greatsword' },
  k_excision:{ name: 'K사 적출 부장', sprite: 'human', pal: { h: '#f4f4f4', c: '#ffffff', p: '#1e5a3a', s: '#e8d0c0' }, hp: 9200, atk: 112, def: 34, interval: 1.1, range: 32, speed: 28, exp: 2000, money: 4000, weapon: 'greatsword', boss: true, scale: 1.6, ab: 'k_overdose' },
  // R사 — 제4무리. 토끼는 빠르게 쏘고, 순록은 무리를 돌보고, 코뿔소는 단단하다
  r_rabbit:  { name: 'R사 토끼팀', sprite: 'human', pal: { h: '#1a1a1a', c: '#2a2a2e', p: '#141416', s: '#e0bc9c' }, hp: 560, atk: 62, def: 14, interval: 0.8, range: 110, speed: 40, exp: 92, money: 85, weapon: 'gun', ranged: true },
  r_reindeer:{ name: 'R사 순록팀', sprite: 'cloak', pal: { m: '#5a3a24', y: '#ffb070' }, hp: 680, atk: 50, def: 18, interval: 1.4, range: 100, speed: 26, exp: 92, money: 90, weapon: 'staff', ranged: true, ab: 'r_antler' },
  r_rhino:   { name: 'R사 코뿔소팀', sprite: 'bot', pal: { m: '#6a6a72', r: '#ff5a2a' }, hp: 11000, atk: 118, def: 48, interval: 1.4, range: 30, speed: 22, exp: 2000, money: 4000, weapon: 'hammer', boss: true, scale: 1.7, ab: 'r_ram' },
});
let CITY_ZONES = null;
function applyZonesFor(outskirts, dist) {
  if (!CITY_ZONES) CITY_ZONES = ZONES.slice();
  if (dist == null) dist = (typeof S !== 'undefined' && S && S.district) || 0;
  const city = CITY_ZONES.slice(), V = DISTRICT_ZONES[dist] || {};
  for (const i in V) { const b = CITY_ZONES[i]; city[i] = Object.assign({ req: b.req, lvl: b.lvl, fame: b.fame, waveSize: b.waveSize, wing: DISTRICTS[dist].wing, bg: null }, V[i]); }
  ZONES.splice(0, ZONES.length, ...(outskirts ? OUTSKIRTS_ZONES : city));
}

// ---------- 흑수화 (전투 중 변신) ----------
// 하루 한 번, 흑수가 된 해결사가 짐승의 모습을 드러낸다. 체력 50% 아래에서 자동으로, 또는 현장에서 직접 발동.
// 변신할 때마다 침식 +6. 흑수의 눈은 지파의 빛깔로 바뀐다 (변신하지 않아도 눈빛은 남는다).
const HEISHOU_TIME = 15;
// 모습: 스프라이트(10x13) 좌표 기준 픽셀 [x, y, w, h, 색] — 오른쪽을 보는 모습
const HEISHOU_LOOK = {
  hb_ja:   { ears: [[2, -1, 2, 2, '#8a8a9a'], [6, -1, 2, 2, '#8a8a9a']], tail: [[-2, 10, 2, 1, '#c8a0a0'], [-3, 9, 1, 1, '#c8a0a0']] },
  hb_chuk: { ears: [[0, 0, 2, 1, '#e8dcc0'], [-1, -1, 1, 1, '#e8dcc0'], [8, 0, 2, 1, '#e8dcc0'], [10, -1, 1, 1, '#e8dcc0']], tail: [[-1, 9, 1, 3, '#5a3a2a']], coat: '#3a2418' },
  hb_in:   { ears: [[2, 0, 1, 1, '#f0a02a'], [7, 0, 1, 1, '#f0a02a']], stripes: [[3, 6, 1, 2], [5, 6, 1, 2], [7, 6, 1, 2], [4, 8, 1, 1], [6, 8, 1, 1]], coat: '#c87818', tail: [[-2, 9, 2, 1, '#f0a02a'], [-3, 8, 1, 1, '#1a1a1a']] },
  hb_myo:  { ears: [[3, -4, 1, 4, '#f0e8ff'], [6, -4, 1, 4, '#f0e8ff'], [3, -3, 1, 2, '#ffc0d0']], tail: [[-1, 9, 2, 2, '#ffffff']] },
  hb_sa:   { arm: [[9, 7, 2, 1, '#4a9a3a'], [11, 6, 2, 1, '#4a9a3a'], [13, 5, 1, 1, '#6ac85a'], [13, 6, 1, 1, '#ff3a3a']], coat: '#1e3a1a' },
  hb_o:    { ears: [[3, -1, 1, 1, '#8a5a3a'], [6, -1, 1, 1, '#8a5a3a']], mane: [[0, 1, 1, 4, '#3a2418']], legs: '#5a3a2a', tail: [[-2, 8, 1, 4, '#3a2418']] },
  hb_mi:   { ears: [[0, 1, 1, 2, '#e8e0c0'], [1, 3, 1, 1, '#e8e0c0'], [9, 1, 1, 2, '#e8e0c0'], [8, 3, 1, 1, '#e8e0c0']], wool: [[1, 5, 8, 1, '#f0ece0'], [0, 6, 1, 2, '#f0ece0'], [9, 6, 1, 2, '#f0ece0']] },
  hb_yu:   { ears: [[4, -2, 1, 1, '#ff3a2a'], [5, -1, 2, 1, '#ff3a2a'], [3, -1, 1, 1, '#ff3a2a']], wing: [[-2, 6, 2, 3, '#e8d8c8'], [-3, 7, 1, 2, '#c8b8a8']], coat: '#5a1410' },
};
krwEnemies();   // 이 파일에서 마지막으로 추가된 적까지
