// 從遊戲 bundle 抽出 i18n 表：L6（西→英）與 T_（英文專有名→西）
// 用法：node tools/extract_tables.js <soul_linker-*.js> <outdir> [L6,T_]
// 注意：bundle 每次改版變數名可能會變，先用 grep 'jS={es:null,en:XX}' 找出英文表變數名。
const fs = require('fs'), path = require('path');
const [src, out, list] = process.argv.slice(2);
const code = fs.readFileSync(src, 'utf8');
function grab(name) {
  const re = new RegExp('[,;\\s]' + name.replace('$', '\\$') + '=\\{');
  const m = re.exec(code); if (!m) throw new Error('not found ' + name);
  let i = m.index + m[0].length - 1, depth = 0, q = null;
  const start = i;
  for (; i < code.length; i++) {
    const ch = code[i];
    if (q) { if (ch === '\\') { i++; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
  }
  return Function('return ' + code.slice(start, i + 1))();
}
for (const n of (list || 'L6,T_').split(',')) {
  const obj = grab(n);
  fs.writeFileSync(path.join(out, n + '.json'), JSON.stringify(obj, null, 1));
  console.log(n, Object.keys(obj).length, 'keys');
}
