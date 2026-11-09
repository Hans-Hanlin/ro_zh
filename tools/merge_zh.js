// 合併 i18n/zh/zh_*.json → i18n/zh-TW.json，並套用 i18n/unify.json 的統一譯名替換
// 用法：node tools/merge_zh.js [--audit 詞1,詞2,...]
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const dir = path.join(ROOT, 'i18n', 'zh');
const all = {};
for (const f of fs.readdirSync(dir).filter(f => /^zh_\d+\.json$/.test(f)).sort())
  Object.assign(all, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));

// 統一譯名：[[錯誤寫法, 正確寫法], ...]，依序對所有譯文做字串替換
const unifyF = path.join(ROOT, 'i18n', 'unify.json');
const unify = fs.existsSync(unifyF) ? JSON.parse(fs.readFileSync(unifyF, 'utf8')).replace : [];
let hits = 0;
for (const k of Object.keys(all)) {
  let v = all[k];
  for (const [from, to] of unify) if (v.includes(from)) { v = v.split(from).join(to); hits++; }
  all[k] = v;
}
// 英文專有名（不覆蓋既有條目）
for (const nf of ['names.json', 'names2.json', 'items.json']) { const namesF = path.join(ROOT, 'i18n', nf);
if (fs.existsSync(namesF)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(namesF, 'utf8'))))
  if (!k.startsWith('_') && !(k in all)) all[k] = v; }
// 手動覆寫（最優先）
const overF = path.join(ROOT, 'i18n', 'overrides.json');
if (fs.existsSync(overF)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(overF, 'utf8'))))
  if (!k.startsWith('_')) all[k] = v;

fs.writeFileSync(path.join(ROOT, 'i18n', 'zh-TW.json'), JSON.stringify(all, null, 1));
console.log('合併', Object.keys(all).length, '條；統一譯名替換', hits, '次');

const ai = process.argv.indexOf('--audit');
if (ai > 0) {
  const V = Object.values(all).join('\n');
  for (const w of process.argv[ai + 1].split(',')) {
    const n = V.split(w).length - 1;
    console.log(w.padEnd(8, '　'), n);
  }
}
