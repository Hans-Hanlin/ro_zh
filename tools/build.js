// 產生可部署的 ro_zh.js：把 i18n/zh-TW.json 與手寫字典注入 src/ro_zh.src.js
// 用法：node tools/build.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'src', 'ro_zh.src.js'), 'utf8');
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'zh-TW.json'), 'utf8'));
const hand = fs.readFileSync(path.join(ROOT, 'src', 'hand_dict.txt'), 'utf8');
if (!src.includes('/*__ZH_TABLE__*/{}') || !src.includes('{/*__HAND_DICT__*/}')) throw new Error('placeholder missing');
const names = [];
for (const nf of ['names.json', 'names2.json', 'items.json']) {
  const p = path.join(ROOT, 'i18n', nf);
  if (fs.existsSync(p)) for (const k of Object.keys(JSON.parse(fs.readFileSync(p, 'utf8'))))
    if (!k.startsWith('_') && /^[A-Z][A-Za-z' .-]{2,}$/.test(k) && !['English', 'Español'].includes(k)) names.push(k);
}
if (!src.includes('/*__NAMES__*/[]')) throw new Error('names placeholder missing');
const out = src
  .replace('/*__NAMES__*/[]', () => JSON.stringify(names))
  .replace('/*__ZH_TABLE__*/{}', () => JSON.stringify(zh))
  .replace('{/*__HAND_DICT__*/}', () => '{' + hand + '\n  }');
// 合併修改器：ro_mod.js 原樣接在後面（ro_mod.js 本身仍可當獨立書籤用）
const mod = fs.readFileSync(path.join(ROOT, 'ro_mod.js'), 'utf8');
// 2026-11-10 起書籤停止中文化（遊戲已內建官方繁中；我們的翻譯改成直接整合進本地伺服器的遊戲，見 tools/patch_zh_local.js）。
// 書籤網址不變，ro_zh.js 只剩修改器。要恢復書籤中文化：把下面改成 true 再跑 建置.bat。
const ZH_IN_BOOKMARK = false;
if (!ZH_IN_BOOKMARK) {
  const only = [
    '// ===== RO Survivors 書籤（ro_zh.js）=====',
    '// 2026-11-10 起只含測試用修改器：中文化已停用（遊戲內建官方繁中；本地伺服器版直接整合我們的翻譯）。',
    '// 本檔由 tools/build.js 產生，請改 ro_mod.js。', '', ''].join('\n') + mod;
  fs.writeFileSync(path.join(ROOT, 'ro_zh.js'), only);
  console.log('ro_zh.js', (Buffer.byteLength(only) / 1024).toFixed(0) + ' KB（只含修改器，中文化停用）');
  return;
}
if (!mod.includes('__ROMOD_BUNDLED__')) throw new Error('ro_mod.js 缺 BUNDLED 判斷');
const bundle = out.replace(/\s*$/, '\n') +
  '\n// ======================================================================\n' +
  '// 以下為測試用修改器（由 tools/build.js 從 ro_mod.js 合併進來）\n' +
  '// ======================================================================\n' +
  'const __ROMOD_BUNDLED__ = true;\n' + mod;
fs.writeFileSync(path.join(ROOT, 'ro_zh.js'), bundle);
console.log('ro_zh.js', (Buffer.byteLength(bundle) / 1024).toFixed(0) + ' KB,', Object.keys(zh).length, 'entries（含修改器）');
