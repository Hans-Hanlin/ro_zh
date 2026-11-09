// 收集所有需翻譯的字串：L6（西→英）+ T_ 的英文專名 + bundle 裡 b("西","英") 的內嵌對照
// 用法：node tools/collect_keys.js <build 目錄> <L6.json> <T_.json> <out.json>
// 輸出 { "西文原文": "英文", ... }（英文缺的話空字串）
const fs = require('fs'), path = require('path');
const [dir, l6f, tf, outf] = process.argv.slice(2);
const L6 = JSON.parse(fs.readFileSync(l6f, 'utf8'));
const T_ = JSON.parse(fs.readFileSync(tf, 'utf8'));
const out = { ...L6 };
let addedB = 0, addedT = 0;
const STR = '"((?:[^"\\\\]|\\\\.)*)"';
const reB = new RegExp('[^\\w$.]b\\(' + STR + ',' + STR + '\\)', 'g');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const code = fs.readFileSync(path.join(dir, f), 'utf8');
  let m;
  while ((m = reB.exec(code))) {
    const es = JSON.parse('"' + m[1] + '"'), en = JSON.parse('"' + m[2] + '"');
    if (!(es in out)) { out[es] = en; addedB++; }
  }
}
// T_：英文專名 → 西文。英文本身也可能被當 key 傳進 bt（en 模式原樣顯示）
for (const [en, es] of Object.entries(T_)) {
  if (!(en in out)) { out[en] = en; addedT++; }
  if (!(es in out)) { out[es] = en; addedT++; }
}
fs.writeFileSync(outf, JSON.stringify(out, null, 1));
console.log('L6', Object.keys(L6).length, '+b()', addedB, '+T_', addedT, '=', Object.keys(out).length);
