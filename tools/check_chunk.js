// 驗證翻譯檔：key 齊全、佔位符 {x} 與 HTML 標籤一致、值非空
// 用法：node tools/check_chunk.js <src.json> <zh.json>
const fs = require('fs');
const [srcF, zhF] = process.argv.slice(2);
const src = JSON.parse(fs.readFileSync(srcF, 'utf8'));
let zh;
try { zh = JSON.parse(fs.readFileSync(zhF, 'utf8')); } catch (e) { console.log('JSON 解析失敗:', e.message); process.exit(1); }
const ph = s => (s.match(/\{\w+\}/g) || []).sort().join(',');
const tags = s => (s.match(/<\/?[a-z][^>]*>/gi) || []).map(t => t.replace(/\s.*?>/, '>')).sort().join(',');
const errs = [];
for (const k of Object.keys(src)) {
  if (!(k in zh)) { errs.push(['缺 key', k]); continue; }
  const v = zh[k];
  if (typeof v !== 'string' || !v.trim()) { errs.push(['空值', k]); continue; }
  if (ph(k) !== ph(v)) errs.push(['佔位符不符', k, v]);
  if (tags(k) !== tags(v)) errs.push(['HTML 標籤不符', k, v]);
}
for (const k of Object.keys(zh)) if (!(k in src)) errs.push(['多出的 key（key 被改過？）', k]);
const noCjk = Object.entries(zh).filter(([k, v]) => /[A-Za-zÀ-ÿ]{4,}/.test(k) && !/[㐀-鿿]/.test(v));
console.log(`總數 ${Object.keys(src).length}，錯誤 ${errs.length}，未含中文 ${noCjk.length}`);
errs.slice(0, 40).forEach(e => console.log(JSON.stringify(e)));
if (noCjk.length) console.log('未含中文（確認是否應保留原文）:', JSON.stringify(noCjk.slice(0, 40)));
process.exit(errs.length ? 1 : 0);
