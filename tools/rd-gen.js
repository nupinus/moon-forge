// Retro Diffusion 픽셀아트 생성 도구 (키는 .env의 RD_API_KEY — 게임 코드에 절대 넣지 말 것)
// 생성: node tools/rd-gen.js <출력이름> <width> <height> "<프롬프트>" [prompt_style] [추가JSON]
// 이어받기: node tools/rd-gen.js --task <task_id> <출력이름>
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split(/=(.*)/s).slice(0, 2)));
const API = 'https://api.retrodiffusion.ai/v2';
const H = { 'X-RD-Token': env.RD_API_KEY, 'Content-Type': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function findImages(o) {
  if (!o || typeof o !== 'object') return [];
  for (const k of ['base64_images', 'images']) if (Array.isArray(o[k])) return o[k];
  for (const v of Object.values(o)) { const r = findImages(v); if (r.length) return r; }
  return [];
}
function strip(o) { return JSON.stringify(o, (k, v) => (typeof v === 'string' && v.length > 200 ? `<${v.length} chars>` : v)); }

function saveImages(imgs, name) {
  imgs.forEach((b, n) => {
    const f = path.join(root, 'assets', 'gen', `${name}${imgs.length > 1 ? '_' + n : ''}.png`);
    fs.writeFileSync(f, Buffer.from(String(b).replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    console.log('saved', path.relative(root, f));
  });
}

async function poll(id, name) {
  for (let i = 0; i < 90; i++) {
    const r = await fetch(`${API}/inferences/tasks/${id}`, { headers: H });
    const j = await r.json();
    const st = (j.status || '').toLowerCase();
    const imgs = findImages(j);
    if (imgs.length) {
      saveImages(imgs, name);
      console.log('meta', strip(j).slice(0, 500));
      return;
    }
    if (/fail|error|cancel/.test(st)) { console.log('FAILED', strip(j).slice(0, 800)); process.exit(1); }
    await sleep(2000);
  }
  console.log('timeout; task', id);
}

(async () => {
  const a = process.argv.slice(2);
  if (a[0] === '--task') return poll(a[1], a[2]);
  const [name, w, h, prompt, style = 'rd_pro__default', extra = '{}'] = a;
  const body = Object.assign({ prompt, width: +w, height: +h, num_images: 1, prompt_style: style }, JSON.parse(extra));
  const res = await fetch(`${API}/inferences`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await res.json();
  if (findImages(j).length) return saveImages(findImages(j), name);
  if (!j.task_id) { console.log('HTTP', res.status, strip(j).slice(0, 800)); process.exit(1); }
  console.log('task', j.task_id);
  await poll(j.task_id, name);
})();
