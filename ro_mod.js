// ===== RO Survivors 測試用修改器 V1.1 =====
// 書籤：javascript:import('https://hans-hanlin.github.io/ro_zh/ro_mod.js?v='+Date.now())
//
// 朋友群組測試用：訪客、離線、登入帳號、組隊都可以用（不鎖）。狀態列只顯示目前模式。
//
// 原理：遊戲每幀會對每把武器呼叫 weapon.update(dt, game)。武器基底類別在共用模組
// （soul_linker-*.js）裡、可經由它 export 的子類別拿到 prototype，掛一層就能拿到本局的 game 物件。
// 修改都套在 game.stats（每次 recomputeStats 會換新物件，所以每幀依「原始值 × 倍率」重算）。
void (async function ROMOD() {
  if (window.__ROMOD) { window.__ROMOD.panel(true); return; }
  const HOST_OK = /(^|\.)ro-survivors\.com$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || window.__ROMOD_FORCE;
  if (!HOST_OK) { alert('請在 https://ro-survivors.com/ 按這個書籤。'); return; }
  const VERSION = 'V1.1';
  const CFG_KEY = 'romod:cfg';

  // ---------- 設定項目 ----------
  // mul：stats[key] = 原始值 × 倍率；add：stats[key] = 原始值 + 加值
  const STATS = [
    { key: 'maxHp', label: '生命上限', type: 'mul', def: 1, max: 20 },
    { key: 'damageMult', label: '傷害', type: 'mul', def: 1, max: 50 },
    { key: 'speedMult', label: '移動速度', type: 'mul', def: 1, max: 3 },
    { key: 'areaMult', label: '技能範圍', type: 'mul', def: 1, max: 5 },
    { key: 'pickupRadius', label: '拾取範圍', type: 'mul', def: 1, max: 20 },
    { key: 'haste', label: '冷卻縮減（急速 +）', type: 'add', def: 0, max: 5, step: 0.1 },
    { key: 'extraProjectiles', label: '額外投射物 +', type: 'add', def: 0, max: 10, step: 1 },
    { key: 'expMult', label: 'EXP', type: 'mul', def: 1, max: 20 },
    { key: 'zenyMult', label: 'Zeny', type: 'mul', def: 1, max: 20 },
  ];
  const cfg = { god: false, on: true };
  for (const s of STATS) cfg[s.key] = s.def;
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (_) {} };

  // ---------- 目前模式（只做顯示）。修改器全模式開放，刻意沒有任何鎖定機制，不要加回去。 ----------
  function modeLabel() {
    let m = '訪客';
    try {
      const s = JSON.parse(localStorage.getItem('ro-survivors-session') || 'null');
      if (s && s.token && !s.guest) m = '帳號';
    } catch (_) {}
    if (G && G.coop) m += '・組隊';
    return m;
  }

  // ---------- 抓遊戲物件 ----------
  let G = null;            // 本局 game
  let hooked = false;
  function looksLikeGame(g) { return g && typeof g === 'object' && typeof g.recomputeStats === 'function' && 'pickups' in g && 'stats' in g; }
  function setGame(g) { if (g === G) return; G = g; lastStats = null; base = null; godSet = false; }
  async function hook() {
    const urls = [...document.querySelectorAll('link[rel="modulepreload"][href], script[type="module"][src]')]
      .map(e => e.href || e.src).filter(u => /\.m?js(\?|$)/.test(u));
    urls.sort((a, b) => (/soul_linker/.test(b) ? 1 : 0) - (/soul_linker/.test(a) ? 1 : 0));
    for (const u of urls) {
      let ns; try { ns = await import(u); } catch (_) { continue; }
      for (const v of Object.values(ns)) {
        if (typeof v !== 'function' || !v.prototype) continue;
        // 往上找到同時有 fireBoosted 與 update 的類別（武器基底）
        for (let p = v.prototype; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
          if (Object.prototype.hasOwnProperty.call(p, 'fireBoosted') && Object.prototype.hasOwnProperty.call(p, 'update')) {
            if (p.__romod) return true;
            const orig = p.update;
            p.update = function (dt, g) { if (g !== G && looksLikeGame(g)) setGame(g); return orig.apply(this, arguments); };
            p.__romod = orig;
            return true;
          }
        }
      }
    }
    return false;
  }
  hooked = await hook();

  // ---------- 每幀套用 ----------
  let lastStats = null, base = null, godSet = false;
  function restore() {
    if (G && lastStats && base) for (const s of STATS) if (typeof base[s.key] === 'number') lastStats[s.key] = base[s.key];
    if (G && godSet) { G.god = false; godSet = false; }
    lastStats = null; base = null;
  }
  function apply() {
    if (!G || !G.stats) return;
    if (!cfg.on) { restore(); return; }
    const st = G.stats;
    if (st !== lastStats) { base = {}; for (const s of STATS) base[s.key] = st[s.key]; lastStats = st; }
    for (const s of STATS) {
      const b = base[s.key]; if (typeof b !== 'number') continue;
      const want = s.type === 'mul' ? b * cfg[s.key] : b + cfg[s.key];
      const v = s.key === 'maxHp' ? Math.round(want) : s.key === 'extraProjectiles' ? Math.floor(want + 1e-6) : want;
      if (st[s.key] !== v) {
        if (s.key === 'maxHp' && typeof G.hp === 'number') G.hp = Math.min(v, Math.max(1, G.hp + (v - st[s.key])));
        st[s.key] = v;
      }
    }
    if (cfg.god) { G.god = true; godSet = true; } else if (godSet) { G.god = false; godSet = false; }
  }
  (function tick() { try { apply(); } catch (e) { console.warn('[修改器]', e); } requestAnimationFrame(tick); })();
  setInterval(() => { if (panel.style.display === 'flex') updStatus(); }, 500);

  // ---------- 一次性動作 ----------
  const ACTIONS = {
    heal: () => { G.hp = G.stats.maxHp; },
    level: () => { if (typeof G.gainExp === 'function') G.gainExp(Math.max(1, G.expNext - G.exp) / (G.stats.expMult || 1) + 0.01); },
    zeny: () => { G.zeny = (G.zeny || 0) + 1000; },
  };

  // ---------- 面板 ----------
  const css = document.createElement('style');
  css.textContent = `
    #romod-btn{position:fixed;right:10px;bottom:52px;z-index:2147483647;width:34px;height:34px;border-radius:50%;
      border:1px solid #fff5;background:#5a2a2acc;color:#fff;font:bold 15px/32px sans-serif;text-align:center;cursor:pointer;opacity:.55}
    #romod-btn:hover{opacity:1}
    #romod{position:fixed;left:10px;top:10px;z-index:2147483647;width:min(94vw,380px);max-height:85vh;display:none;flex-direction:column;
      background:#1b1b1fee;color:#eee;border:1px solid #fff3;border-radius:8px;font:13px/1.4 "Microsoft JhengHei",sans-serif;box-shadow:0 4px 20px #000a}
    #romod header{padding:8px 10px;border-bottom:1px solid #fff2;display:flex;gap:6px;align-items:center}
    #romod header b{flex:1}
    #romod button{background:#3a3a46;color:#fff;border:1px solid #fff3;border-radius:4px;padding:3px 8px;cursor:pointer}
    #romod button:disabled{opacity:.4;cursor:default}
    #romod .body{overflow:auto;padding:8px 10px}
    #romod .st{padding:6px 8px;border-radius:6px;background:#2a2a33;margin-bottom:8px;font-size:12px;color:#ccc}
    #romod .st.lock{background:#4a2020;color:#fbb}
    #romod .row{display:grid;grid-template-columns:1fr 70px 46px;gap:6px;align-items:center;padding:3px 0}
    #romod .row input[type=range]{grid-column:1/3}
    #romod .row span{grid-column:1/4;color:#ccc;font-size:12px;margin-bottom:-4px}
    #romod .row output{text-align:right;font-variant-numeric:tabular-nums;color:#ffd080}
    #romod .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    #romod label.ck{display:flex;gap:6px;align-items:center;padding:4px 0}
    #romod small{color:#999;display:block;margin-top:8px}
  `;
  document.head.appendChild(css);
  const btn = document.createElement('div'); btn.id = 'romod-btn'; btn.textContent = '改'; btn.title = '測試用修改器 ' + VERSION;
  const panel = document.createElement('div'); panel.id = 'romod';
  panel.innerHTML = `<header><b>測試用修改器 ${VERSION}</b><button data-a="reset">預設值</button><button data-a="close">✕</button></header>
    <div class="body"><div class="st"></div>
      <label class="ck"><input type="checkbox" data-k="on"> 啟用修改</label>
      <label class="ck"><input type="checkbox" data-k="god"> 無敵（不會受傷）</label>
      <div class="rows"></div>
      <div class="acts"><button data-a="heal">補滿 HP</button><button data-a="level">升 1 級</button><button data-a="zeny">+1000 Zeny</button></div>
      <small>訪客、離線、登入帳號、組隊皆可使用。設定會記在這個瀏覽器，下一局自動套用。</small>
    </div>`;
  document.body.append(btn, panel);
  const rows = panel.querySelector('.rows');
  for (const s of STATS) {
    const step = s.step ?? 0.1, min = s.type === 'mul' ? 0.1 : 0;
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<span>${s.label}${s.type === 'mul' ? '（倍率）' : ''}</span>
      <input type="range" min="${min}" max="${s.max}" step="${step}" data-k="${s.key}"><output></output>`;
    rows.appendChild(row);
  }
  const fmt = (s, v) => s.type === 'mul' ? `×${(+v).toFixed(v < 10 ? 1 : 0)}` : `+${+v}`;
  function render() {
    panel.querySelector('[data-k="on"]').checked = cfg.on;
    panel.querySelector('[data-k="god"]').checked = cfg.god;
    for (const s of STATS) {
      const r = panel.querySelector(`input[data-k="${s.key}"]`); r.value = cfg[s.key];
      r.nextElementSibling.textContent = fmt(s, cfg[s.key]);
    }
    updStatus();
  }
  const STATE = { playing: '遊戲中', levelup: '升級選卡', over: '已結束', paused: '暫停', cutscene: '過場', pick: '選擇中' };
  function updStatus() {
    const box = panel.querySelector('.st');
    let msg;
    if (!hooked) msg = '⚠ 找不到遊戲的武器模組（遊戲改版了？）。修改器無法運作。';
    else if (!G) msg = '等待進入一局…（開局後會自動抓到）';
    else {
      const st = G.stats || {};
      msg = `[${modeLabel()}] 狀態：${STATE[G.state] || G.state}　Lv ${G.level}　HP ${Math.round(G.hp)}/${Math.round(st.maxHp || 0)}　Zeny ${G.zeny}`;
    }
    box.textContent = msg;
    box.classList.toggle('lock', !hooked);
    const dis = !G || !hooked || G.state === 'over';
    for (const a of ['heal', 'level', 'zeny']) panel.querySelector(`[data-a="${a}"]`).disabled = dis;
  }
  panel.addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    cfg[k] = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
    const s = STATS.find(x => x.key === k); if (s) e.target.nextElementSibling.textContent = fmt(s, cfg[k]);
    save();
  });
  panel.addEventListener('click', e => {
    const a = e.target.dataset && e.target.dataset.a;
    if (a === 'close') show(false);
    if (a === 'reset') { cfg.god = false; for (const s of STATS) cfg[s.key] = s.def; save(); render(); }
    if (ACTIONS[a] && G) { try { ACTIONS[a](); } catch (err) { console.warn(err); } updStatus(); }
  });
  // 面板上的按鍵不要傳給遊戲（避免 Esc / 空白鍵觸發遊戲動作）
  panel.addEventListener('keydown', e => e.stopPropagation());
  function show(on) { panel.style.display = on ? 'flex' : 'none'; if (on) render(); }
  btn.onclick = () => show(panel.style.display !== 'flex');

  window.__ROMOD = {
    version: VERSION, cfg, panel: show, game: () => G,
    status: () => ({ hooked, game: !!G, state: G && G.state, mode: modeLabel() }),
  };
  console.log(`[修改器] ${VERSION} 已啟動。武器 hook：${hooked ? 'OK' : '失敗'}`);
})();
