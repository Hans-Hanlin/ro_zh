// ===== RO Survivors 繁體中文化書籤 =====
// 書籤內容（放到 GitHub Pages 後把網址換成你的）：
//   javascript:import('https://hans-hanlin.github.io/ro_zh/ro_zh.js?v='+Date.now())
//
// V2 原理：
//   遊戲自帶 i18n：bt(西文原文) 會去查 jS[設定語言] 這張表（es 為原文、en 為英文表）。
//   本書籤從遊戲已載入的模組裡找到「設定物件 / 設定函式 / 翻譯函式」，
//   把 zh-TW 這張繁中表掛進 jS，再把語言切到 zh-TW，遊戲就會自己用中文重畫所有畫面。
//   缺的字串會退回英文，並記到「中」面板的缺字清單。
//   DOM / canvas 文字替換保留為備援（處理不經過 i18n 的少數字串）。
//
// 本檔由 tools/build.js 產生，請改 src/ro_zh.src.js 與 i18n/*.json，不要直接改 ro_zh.js。
void (async function ROZH() {
  if (window.__ROZH) { window.__ROZH.panel(true); return; }
  const HOST_OK = /(^|\.)ro-survivors\.com$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || window.__ROZH_FORCE;
  if (!HOST_OK) { alert('請在 RO Survivors 遊戲頁面（https://ro-survivors.com/）按這個書籤。'); return; }

  const VERSION = 'V2.1';
  const LANG = 'zh-TW';
  const LANG_NAME = '繁體中文';
  const PREV_KEY = 'rozh:prevLang';
  const SETTINGS_KEY = 'ro-survivors:settings';

  // ---------- 繁中表（西文原文 key → 中文），build 時注入 ----------
  const ZH = /*__ZH_TABLE__*/{};
  // 手寫補充字典（西 / 英 key 都有），給 DOM 備援用
  const HAND = {/*__HAND_DICT__*/};
  Object.assign(ZH, window.__ROZH_EXTRA || {});

  const CJK = /[㐀-鿿]/;
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const missing = new Map();   // 缺字 → 次數
  const NUM = /\d+(?:,\d+)?/g;
  const normNum = s => { let i = 0; return s.replace(NUM, () => `{${i++}}`); };
  function noteMissing(k) {
    if (!k || k.length > 400 || CJK.test(k) || !/[A-Za-zÀ-ÿ]{2,}/.test(k)) return;
    // 縮寫（HP、STR、Lv…）保留原文，不算缺字
    if (/^[A-Z]{2,5}$|^(Lv|Job|Esc|OK|BETA|Survivors|Discord)\b/.test(k)) return;
    // 單一個詞、又不在遊戲字串表裡的，多半是玩家暱稱 → 不記
    if (!/\s/.test(k) && !(EN && hasOwn(EN, k))) return;
    if (/\d/.test(k)) { const n = normNum(k); if (hasOwn(ZH, n)) return; k = n; }
    missing.set(k, (missing.get(k) || 0) + 1);
  }

  // ---------- 1. 找出遊戲的 i18n 模組 ----------
  // 設定物件 Ta：有 lang / music / sfx 欄位
  // 設定函式 XM：Object.assign(Ta, x) 後寫 localStorage 並通知訂閱者
  // 翻譯函式 bt：(key, vars) => 查表後把 {name} 換成 vars
  function probe(ns) {
    const api = {};
    for (const v of Object.values(ns)) {
      if (!v) continue;
      if (typeof v === 'object' && !Array.isArray(v) && 'lang' in v && 'music' in v && 'sfx' in v) api.settings = v;
      else if (Array.isArray(v) && v.length && v.every(x => x && typeof x.id === 'string' && typeof x.name === 'string') && v.some(x => x.id === 'es')) api.langs = v;
      else if (typeof v === 'function') {
        let src = ''; try { src = Function.prototype.toString.call(v); } catch (_) {}
        if (src.length > 400) continue;
        if (/Object\.assign\(\w+,\w+\);try\{localStorage\.setItem\(/.test(src)) api.set = v;
        else if (/\.replace\(\/\\\{\(\\w\+\)\\\}\/g/.test(src) && /\[\w+\.lang\]/.test(src) && /\?\?/.test(src)) api.t = v;
      }
    }
    return api.settings && api.set && api.t ? api : null;
  }
  async function findApi() {
    const urls = [...document.querySelectorAll('link[rel="modulepreload"][href], script[type="module"][src]')]
      .map(e => e.href || e.src).filter(u => /\.m?js(\?|$)/.test(u));
    urls.sort((a, b) => (/soul_linker|index|main/.test(b) ? 1 : 0) - (/soul_linker|index|main/.test(a) ? 1 : 0));
    for (const u of urls) {
      try { const api = probe(await import(u)); if (api) return api; } catch (_) {}
    }
    return null;
  }
  const api = await findApi();

  // ---------- 2. 把 zh-TW 表掛進遊戲 ----------
  let EN = null;            // 遊戲的英文表（缺字時退回英文）
  const REV = new Map();    // 英文 → 中文（DOM 備援用）
  let injected = false;
  const TABLE = new Proxy(ZH, {
    get(t, k) {
      if (typeof k !== 'string') return undefined;
      if (hasOwn(t, k)) return t[k];
      if (OFFICIAL && hasOwn(OFFICIAL, k)) return OFFICIAL[k];
      noteMissing(k);
      return EN && hasOwn(EN, k) ? EN[k] : undefined;
    },
    has(t, k) { return hasOwn(t, k) || (!!OFFICIAL && hasOwn(OFFICIAL, k)) || (!!EN && hasOwn(EN, k)); },
  });

  // 遊戲 2026-11-09 改版起內建官方 zh-TW（jS 已經有自己的 'zh-TW' 表）。
  // 這時改成「我們的表優先、官方表補缺」：官方有、我們沒有的新字串直接用官方中文。
  let OFFICIAL = null;
  function inject() {
    if (!api) return false;
    const S = api.settings;
    // jS[Ta.lang] 查不到語言時會往 Object.prototype 找 —— 暫時放一個 getter 攔住，認出 jS（{es:null, en:{…}}）。
    // 用一個遊戲沒有的暫時代號觸發，官方已內建 zh-TW 時也攔得到。
    const PROBE = '__rozh_probe__';
    let holder = null;
    Object.defineProperty(Object.prototype, PROBE, {
      configurable: true, enumerable: false,
      get() {
        if (this && hasOwn(this, 'es') && hasOwn(this, 'en') && this.es === null && this.en && typeof this.en === 'object') holder = this;
        return undefined;
      },
    });
    const prev = S.lang;
    try { S.lang = PROBE; api.t('Cerrar'); } catch (_) {} finally { S.lang = prev; delete Object.prototype[PROBE]; }
    if (holder) {
      EN = holder.en;
      const off = holder[LANG];
      if (off && typeof off === 'object' && off !== TABLE) OFFICIAL = off;
      Object.defineProperty(holder, LANG, { value: TABLE, writable: true, enumerable: true, configurable: true });
      injected = true;
    }
    if (!injected) return false;
    for (const [es, en] of Object.entries(EN)) if (typeof en === 'string' && hasOwn(ZH, es) && !REV.has(en)) REV.set(en, ZH[es]);
    // 語言清單加上繁中（選項面板 / 左上語言選單會用到）
    if (api.langs && !api.langs.some(x => x.id === LANG)) api.langs.push({ id: LANG, name: LANG_NAME });
    return true;
  }
  const isZh = () => !api || api.settings.lang === LANG;
  function switchToZh() {
    const S = api.settings;
    if (S.lang !== LANG) { try { localStorage.setItem(PREV_KEY, S.lang); } catch (_) {} }
    api.set({ lang: LANG });   // 遊戲會重譯靜態 DOM 並廣播 ro-lang，各面板自己重畫
  }
  // 沒裝書籤時遊戲認不得 zh-TW（會變成西文）。離開頁面時把存檔裡的語言改回原本的。
  function restoreStoredLang() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY); if (!raw) return;
      const s = JSON.parse(raw);
      if (s.lang === LANG) { s.lang = localStorage.getItem(PREV_KEY) || 'en'; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
    } catch (_) {}
  }

  let mode = 'dom';
  if (api && inject()) {
    mode = 'i18n';
    switchToZh();
    // 官方已內建 zh-TW 時，存檔裡的 zh-TW 沒裝書籤也能用，就不用改回去
    if (!OFFICIAL) {
      addEventListener('pagehide', restoreStoredLang);
      addEventListener('beforeunload', restoreStoredLang);
    }
  } else {
    console.warn('[RO 中文化] 找不到遊戲 i18n 模組，改用 DOM 替換模式（翻譯會比較不完整）。');
  }

  // ---------- 3. DOM 備援替換 ----------
  const RULES = [
    [/^Lv\.?\s*(\d+)$/i, (m, n) => `Lv ${n}`],
    [/^(Nivel|Level)\s+(\d+)$/i, (m, _, n) => `等級 ${n}`],
    [/^(Oleada|Wave)\s+(\d+)$/i, (m, _, n) => `第 ${n} 波`],
    [/^(Piso|Floor)\s+(\d+)$/i, (m, _, n) => `第 ${n} 層`],
  ];
  // 英文專有名（怪物 / 職業 / 城鎮），用來處理「MVP Mastering」「普隆德拉南方 · MVP Mastering」這種拼接字串
  const NAMES = /*__NAMES__*/[];
  const NAME_RE = NAMES.length ? new RegExp('(?<![A-Za-z])(' + NAMES.slice().sort((a, b) => b.length - a.length)
    .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-z])', 'g') : null;
  const MIXED = /^(MVP|Mini|Jefe|Boss)\s/;
  function subNames(t) { return NAME_RE ? t.replace(NAME_RE, n => hasOwn(ZH, n) ? ZH[n] : n) : t; }
  function lookup(raw, record) {
    const t = raw.trim();
    if (!t) return null;
    // 已經有中文、或「MVP 名字」格式：只替換裡面的英文專名
    if (CJK.test(t) || MIXED.test(t)) { const s = subNames(t); return s !== t ? s : null; }
    let v = hasOwn(ZH, t) ? ZH[t] : REV.get(t) ?? (hasOwn(HAND, t) ? HAND[t] : undefined);
    if (v !== undefined) return v;
    const nc = t.replace(/[:：]$/, '');
    if (nc !== t) { const w = lookup(nc, false); if (w !== null) return w + '：'; }
    for (const [re, to] of RULES) if (re.test(t)) return t.replace(re, to);
    // 「名字 · 職業」「Sword · 武器」這類用 · 拼起來的：逐段完全比對（暱稱段比不到就原樣保留）
    if (t.includes(' · ')) {
      const parts = t.split(' · '), outp = parts.map(p => { const z = lookup(p, false); return z === null ? p : z; });
      if (outp.some((p, i) => p !== parts[i])) return outp.join(' · ');
    }
    // 「· Poring」這種前置分隔點（清單項目）：去掉點再查名字
    const dot = t.match(/^([·•]\s*)(.+)$/);
    if (dot) { const z = lookup(dot[2], false); if (z !== null) return dot[1] + z; }
    // 帶數字的字串：數字換成 {0}{1}… 查模板，再把數字填回去（「12 / 340 EXP」→ 模板「{0} / {1} EXP」）
    if (/\d/.test(t)) {
      const n = normNum(t);
      if (n !== t && hasOwn(ZH, n)) { const nums = t.match(NUM); return ZH[n].replace(/\{(\d+)\}/g, (m, i) => nums[+i] ?? m); }
    }
    if (record && !/^(https?:|mailto:|@)/.test(t)) noteMissing(t);
    return null;
  }
  function tr(raw, record = true) {
    const zh = lookup(raw, record);
    if (zh === null) return raw;
    const m = raw.match(/^(\s*)[\s\S]*?(\s*)$/);
    return (m ? m[1] : '') + zh + (m ? m[2] : '');
  }
  const SKIP_TAG = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT', 'SELECT']);
  // 聊天、玩家暱稱、好友名單不翻
  const SKIP_SEL = '#rozh-panel,#rozh-btn,#romod,#chat-log,#chat-form,.tr-chat,#friends,#lobby-friends,#pb-name,#hud-name>span,#cc-name,#fr-name,[contenteditable]';
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  let busy = false;
  function fixText(node) {
    const p = node.parentElement;
    if (!p || SKIP_TAG.has(p.tagName) || p.closest(SKIP_SEL)) return;
    const v = tr(node.nodeValue);
    if (v !== node.nodeValue) node.nodeValue = v;
  }
  function fixAttrs(el) {
    if (!el.getAttribute || (el.closest && el.closest(SKIP_SEL))) return;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const t = tr(v, false); if (t !== v) el.setAttribute(a, t); } }
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value) { const t = tr(el.value, false); if (t !== el.value) el.value = t; }
  }
  function walk(root) {
    if (!root || !isZh()) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    busy = true;
    try {
      if (root.nodeType === 1) fixAttrs(root);
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let n;
      while ((n = w.nextNode())) { if (n.nodeType === 3) fixText(n); else fixAttrs(n); }
    } finally { busy = false; }
  }
  const mo = new MutationObserver(records => {
    if (busy || !isZh()) return;
    for (const r of records) {
      if (r.type === 'characterData') fixText(r.target);
      else if (r.type === 'attributes') fixAttrs(r.target);
      else for (const n of r.addedNodes) walk(n);
    }
  });
  // 讓遊戲先重畫完再掃一次
  setTimeout(() => {
    walk(document.body);
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }, 50);
  addEventListener('ro-lang', () => setTimeout(() => walk(document.body), 0));

  // ---------- 4. Canvas 文字（只在 DOM 備援模式用；i18n 模式下遊戲自己會畫中文，
  //            而 canvas 分不出玩家暱稱，硬換可能把跟怪物同名的暱稱翻掉） ----------
  if (mode !== 'i18n') {
    const CTX = CanvasRenderingContext2D.prototype;
    const canvasMap = s => { if (typeof s !== 'string' || CJK.test(s)) return s; const z = lookup(s, false); return z === null ? s : z; };
    for (const fn of ['fillText', 'strokeText', 'measureText']) {
      const orig = CTX[fn];
      CTX[fn] = function (text, ...rest) { try { text = canvasMap(text); } catch (_) {} return orig.call(this, text, ...rest); };
    }
  }

  // ---------- 5. 語言選單加上「繁體中文」 ----------
  function addLangItems() {
    for (const list of document.querySelectorAll('.sp-lang-list')) {
      if (list.querySelector(`[data-lang="${LANG}"]`)) continue;
      const li = document.createElement('li');
      li.setAttribute('role', 'option'); li.tabIndex = -1; li.dataset.lang = LANG;
      li.innerHTML = `${LANG_NAME}<small>ZH</small>`;
      list.appendChild(li);
    }
    // 選項面板裡的語言按鈕（有 data-lang="en" 的同層加一顆）
    for (const en of document.querySelectorAll('button[data-lang="en"]')) {
      if (en.parentElement.querySelector(`[data-lang="${LANG}"]`)) continue;
      const b = en.cloneNode(false); b.dataset.lang = LANG; b.textContent = LANG_NAME;
      b.classList.toggle('active', isZh()); b.classList.toggle('selected', isZh());
      en.after(b);
    }
  }
  if (mode === 'i18n') { addLangItems(); new MutationObserver(addLangItems).observe(document.body, { childList: true, subtree: true }); }

  // ---------- 6. 樣式 + 「中」面板（缺字清單） ----------
  const css = document.createElement('style');
  css.textContent = `
    html[lang="${LANG}"] body{font-family:Nunito,"Segoe UI","Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif}
    #rozh-btn{position:fixed;right:10px;bottom:10px;z-index:2147483647;width:34px;height:34px;border-radius:50%;
      border:1px solid #fff5;background:#222c;color:#fff;font:bold 15px/32px sans-serif;text-align:center;cursor:pointer;opacity:.55}
    #rozh-btn:hover{opacity:1}
    #rozh-panel{position:fixed;right:10px;bottom:52px;z-index:2147483647;width:min(92vw,440px);max-height:65vh;display:none;
      flex-direction:column;background:#1b1b1fee;color:#eee;border:1px solid #fff3;border-radius:8px;font:13px/1.4 "Microsoft JhengHei",sans-serif;box-shadow:0 4px 20px #000a}
    #rozh-panel header{padding:8px 10px;border-bottom:1px solid #fff2;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    #rozh-panel header b{flex:1}
    #rozh-panel button{background:#3a3a46;color:#fff;border:1px solid #fff3;border-radius:4px;padding:3px 8px;cursor:pointer}
    #rozh-panel textarea{flex:1;min-height:200px;margin:8px;background:#111;color:#ddd;border:1px solid #fff2;font:12px monospace;resize:none}
    #rozh-panel small{padding:0 10px 8px;color:#aaa}
  `;
  document.head.appendChild(css);
  const btn = document.createElement('div');
  btn.id = 'rozh-btn'; btn.textContent = '中'; btn.title = 'RO 中文化 ' + VERSION;
  const panel = document.createElement('div');
  panel.id = 'rozh-panel';
  panel.innerHTML = `<header><b></b><button data-a="toggle"></button><button data-a="refresh">重新整理</button><button data-a="copy">複製</button><button data-a="close">✕</button></header>
    <textarea readonly spellcheck="false"></textarea>
    <small>模式：${mode === 'i18n' ? (OFFICIAL ? '我們的譯名優先＋官方繁中補缺' : '遊戲內建語言（完整）') : 'DOM 替換（備援）'}。下面是畫面出現過、繁中表還沒有的字串（JSON）。複製貼給 AI 翻好後放進 i18n/overrides.json 重新 build。</small>`;
  document.body.append(btn, panel);
  const ta = panel.querySelector('textarea');
  function refresh() {
    const obj = {};
    [...missing.entries()].sort((a, b) => b[1] - a[1]).forEach(([k]) => { obj[k] = (EN && hasOwn(EN, k) && EN[k] !== k) ? `（英：${EN[k]}）` : ''; });
    ta.value = JSON.stringify(obj, null, 1);
    panel.querySelector('b').textContent = `RO 中文化 ${VERSION}（缺 ${missing.size} 條）`;
    panel.querySelector('[data-a="toggle"]').textContent = isZh() ? '切回原文' : '切成中文';
    panel.querySelector('[data-a="toggle"]').style.display = mode === 'i18n' ? '' : 'none';
  }
  function showPanel(on) { panel.style.display = on ? 'flex' : 'none'; if (on) refresh(); }
  btn.onclick = () => showPanel(panel.style.display !== 'flex');
  panel.onclick = e => {
    const a = e.target.dataset && e.target.dataset.a;
    if (a === 'close') showPanel(false);
    if (a === 'refresh') refresh();
    if (a === 'toggle') {
      if (isZh()) { let p = 'en'; try { p = localStorage.getItem(PREV_KEY) || 'en'; } catch (_) {} api.set({ lang: p === LANG ? 'en' : p }); }
      else switchToZh();
      refresh();
    }
    if (a === 'copy') {
      ta.select();
      (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).catch(() => document.execCommand('copy'));
      e.target.textContent = '已複製'; setTimeout(() => e.target.textContent = '複製', 1200);
    }
  };

  window.__ROZH = { version: VERSION, mode, official: () => OFFICIAL, zh: ZH, en: () => EN, missing, walk, panel: showPanel, api };
  console.log(`[RO 中文化] ${VERSION} 已啟動（${mode} 模式，表 ${Object.keys(ZH).length} 條）。缺字：window.__ROZH.missing`);
})();
