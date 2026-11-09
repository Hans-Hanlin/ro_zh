// 收集 bundle 資料裡的英文專有名詞（職業、怪物、道具、卡片…的 name 欄位，以及怪物名陣列）
// 這些在 es/en 兩種語言都顯示英文原名，不在 i18n 表裡，要另外翻。
// 用法：node tools/collect_names.js <build 目錄> <zh-TW.json> <out.json>
const fs = require('fs'), path = require('path');
const [dir, zhF, outF] = process.argv.slice(2);
const zh = JSON.parse(fs.readFileSync(zhF, 'utf8'));
const names = new Map(); // name -> context
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const code = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of code.matchAll(/\bid:"([\w-]+)",(?:[\w]+:"[^"]*",)*?name:"([^"]{2,60})"/g))
    if (!names.has(m[2])) names.set(m[2], m[1]);
  for (const m of code.matchAll(/\bname:"([A-Z][^"]{1,60})"/g))
    if (!names.has(m[1])) names.set(m[1], '');
  // 大寫開頭英文名組成的陣列（例如怪物清單）
  for (const m of code.matchAll(/\[("[A-Z][A-Za-z' .-]{1,30}"(?:,"[A-Z][A-Za-z' .-]{1,30}"){5,})\]/g))
    for (const s of JSON.parse('[' + m[1] + ']')) if (!names.has(s)) names.set(s, 'list');
}
const out = {};
for (const [n, ctx] of names) {
  if (n in zh) continue;
  if (!/[A-Za-z]{2,}/.test(n)) continue;
  if (/[áéíóúñ¿¡]/i.test(n)) continue; // 西文的話應該已在 i18n 表
  out[n] = ctx;
}
fs.writeFileSync(outF, JSON.stringify(out, null, 1));
console.log('names', names.size, 'need translate', Object.keys(out).length);
