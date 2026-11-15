// index.html → dist/play.html (claude.ai 아티팩트 게시용: doctype/head/body 제거, 외부 폰트 CSS 제거)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = src.split(/<body>/)[1].split(/<\/body>/)[0].replace(/\?v=\d+/g, '');
const out = `<title>문 포지</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="css/style.css">
${body.trim()}
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'play.html'), out);
console.log('dist/play.html written', out.length);
