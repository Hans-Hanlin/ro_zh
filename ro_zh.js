// ===== RO Survivors 書籤（ro_zh.js）=====
// 2026-11-10 起只含測試用修改器：中文化已停用（遊戲內建官方繁中；本地伺服器版直接整合我們的翻譯）。
// 本檔由 tools/build.js 產生，請改 ro_mod.js。

// ===== RO Survivors 測試用修改器 V2.0 =====
// 書籤：javascript:import('https://hans-hanlin.github.io/ro_zh/ro_mod.js?v='+Date.now())
//
// 朋友群組測試用：訪客、離線、登入帳號、組隊都可以用（不鎖）。狀態列只顯示目前模式。
//
// 原理：遊戲每幀會對每把武器呼叫 weapon.update(dt, game)。武器基底類別在共用模組
// （soul_linker-*.js）裡、可經由它 export 的子類別拿到 prototype，掛一層就能拿到本局的 game 物件。
// 兩層修改：
//   pre ：六圍／ATK／MATK／HP% 等「重算途中才換算」的欄位 → 掛在 game.runItems.apply（recomputeStats 換算前呼叫），
//         改值後呼叫 game.recomputeStats() 讓遊戲自己換算。
//   post：其餘 game.stats 欄位，每幀依「重算後原始值 × 倍率／+ 加值」覆寫（recomputeStats 會換新物件，所以會重新取基準）。
// 上限：每個欄位都有安全上限（見 STATS 的 max / hard），避免數值爆掉、穿牆或卡頓。
void (async function ROMOD() {
  // BUNDLED：合併在 ro_zh.js 裡時，由中文化那段負責「重按書籤」與「網站不對」的提示，這裡安靜略過
  const BUNDLED = typeof __ROMOD_BUNDLED__ !== 'undefined';
  if (window.__ROMOD) { if (!BUNDLED) window.__ROMOD.panel(true); return; }
  const HOST_OK = /(^|\.)ro-survivors\.com$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || window.__ROMOD_FORCE;
  if (!HOST_OK) { if (!BUNDLED) alert('請在 https://ro-survivors.com/ 按這個書籤。'); return; }
  const VERSION = 'V2.0';
  const CFG_KEY = 'romod:cfg';

  // ---------- 設定項目（A 分頁：能力值） ----------
  // type mul：原始值 × 倍率（預設 1）；add：原始值 + 加值（預設 0）
  // pre：在遊戲換算前加（六圍等），改了會觸發 recomputeStats
  // max：輸入上限；hard：套用後的絕對上限（遊戲公式本身的合理範圍）
  // 上限理由：移速／投射物速度 > 10 倍會穿牆、穿怪；範圍 > 20 倍、投射物 > 30 個會讓特效與碰撞計算爆量卡頓。
  const M = (key, label, max, extra) => ({ key, label, type: 'mul', def: 1, min: 0.1, max, ...extra });
  const A = (key, label, max, extra) => ({ key, label, type: 'add', def: 0, min: 0, max, ...extra });
  const PCT = { pct: true };           // 顯示成百分比（0.25 → 25%）
  const STATS = [
    { grp: '基本' },
    M('maxHp', '生命上限', 100),
    M('damageMult', '傷害', 100),
    M('speedMult', '移動速度', 10),
    M('areaMult', '技能範圍', 20),
    M('pickupRadius', '拾取範圍', 100),
    A('haste', '冷卻縮減（急速 +）', 20, { step: 0.1 }),
    A('extraProjectiles', '額外投射物 +', 30, { step: 1, int: true }),
    M('expMult', 'EXP', 100),
    M('zenyMult', 'Zeny', 100),
    { grp: '防禦' },
    A('armor', '護甲 +', 9999, { step: 1 }),
    A('damageReduction', '受傷減免 +', 0.75, { step: 0.01, hard: 0.75, ...PCT }),
    A('flee', '迴避率 +', 1, { step: 0.01, hard: 1, ...PCT }),
    A('revives', '復活次數 +', 99, { step: 1, int: true }),
    A('endureReduction', '硬撐減傷 +', 0.9, { step: 0.01, hard: 0.9, ...PCT }),
    A('endureReflect', '硬撐反傷 +', 10, { step: 0.1 }),
    { grp: '回復' },
    A('regen', '每秒回血 +', 9999, { step: 1 }),
    A('regenStill', '靜止時每秒回血 +', 9999, { step: 1 }),
    A('regenMoving', '移動時每秒回血 +', 9999, { step: 1 }),
    A('lifesteal', '吸血 +', 1, { step: 0.01, hard: 1, ...PCT }),
    A('bleedLifesteal', '流血吸血 +', 1, { step: 0.01, hard: 1, ...PCT }),
    A('levelUpHeal', '升級回血 +', 1, { step: 0.05, ...PCT }),
    M('potionMult', '藥水（肉）回復量', 100),
    M('potionDropMult', '藥水（肉）掉落率', 20),
    { grp: '攻擊' },
    A('critChance', '爆擊率 +', 1, { step: 0.01, hard: 1, ...PCT }),
    M('critMult', '爆擊傷害', 100),
    A('doubleChance', '雙重施放機率 +', 1, { step: 0.01, hard: 1, ...PCT }),
    A('pierceChance', '貫穿 +', 20, { step: 1 }),
    A('castHaste', '詠唱加速 +', 20, { step: 0.1 }),
    M('reachMult', '近戰距離', 10),
    M('projSpeedMult', '投射物速度', 10),
    M('bossUndeadMult', '對 Boss／不死傷害', 100),
    M('bossEliteMult', '對菁英傷害', 100),
    M('powerMelee', '近戰系傷害', 100),
    M('powerRanged', '遠程系傷害', 100),
    M('powerMagic', '魔法系傷害', 100),
    A('lowHpDamage', '低血量增傷 +', 10, { step: 0.1, ...PCT }),
    A('stillDmg', '靜止時增傷 +', 10, { step: 0.1, ...PCT }),
    A('areaSkillDmg', '範圍技增傷 +', 10, { step: 0.1, ...PCT }),
    A('dotDmg', '持續傷害（毒／燒／流血）+', 10, { step: 0.1, ...PCT }),
    { grp: '異常狀態' },
    A('stunChance', '命中暈眩機率 +', 1, { step: 0.01, hard: 1, ...PCT }),
    A('petrifyChance', '命中石化機率 +', 1, { step: 0.01, hard: 1, ...PCT }),
    A('critStun', '爆擊暈眩秒數 +', 5, { step: 0.1 }),
    { grp: '六圍與攻擊力（遊戲重新換算）' },
    A('str', 'STR +', 999, { step: 1, pre: true }),
    A('agi', 'AGI +', 999, { step: 1, pre: true }),
    A('vit', 'VIT +', 999, { step: 1, pre: true }),
    A('int', 'INT +', 999, { step: 1, pre: true }),
    A('dex', 'DEX +', 999, { step: 1, pre: true }),
    A('luk', 'LUK +', 999, { step: 1, pre: true }),
    A('atk', 'ATK +', 99999, { step: 10, pre: true }),
    A('matk', 'MATK +', 99999, { step: 10, pre: true }),
    A('maxHpPct', 'HP 上限 % +', 100, { step: 0.1, pre: true, ...PCT }),
    { grp: '經濟' },
    A('discovery', '掉寶（發現）+', 5, { step: 0.1, pre: true }),
    A('chestDiscount', '寶箱折扣 +', 1, { step: 0.05, hard: 1, ...PCT }),
    A('freeChest', '免費開箱機率 +', 1, { step: 0.05, hard: 1, ...PCT }),
    A('extraGemChance', '額外寶石機率 +', 1, { step: 0.05, hard: 1, ...PCT }),
  ];
  const SK = STATS.filter(s => s.key);
  const PRE = SK.filter(s => s.pre), POST = SK.filter(s => !s.pre);

  const cfg = { god: false, on: true, perksInf: false, tab: 'a', lvN: 1, zenyN: 1000, speed: 1, killBoss: false, autoKill: false };
  for (const s of SK) cfg[s.key] = s.def;
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (_) {}
  const clampS = (s, v) => { v = Number(v); if (!isFinite(v)) return s.def; v = Math.min(s.max, Math.max(s.type === 'mul' ? s.min : 0, v)); return s.int ? Math.round(v) : Math.round(v * 1000) / 1000; };
  for (const s of SK) cfg[s.key] = clampS(s, cfg[s.key]);   // 舊版存檔或手改的怪值也夾回範圍內
  cfg.speed = Math.min(8, Math.max(0.1, Number(cfg.speed) || 1));
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
  function setGame(g) {
    if (g === G) return;
    G = g; lastStats = null; base = null; godSet = false; preSig = '';
    hookPre(g);
  }
  // pre 層：包住本局 runItems.apply（只包這個實例，不動共用類別）
  function hookPre(g) {
    const ri = g && g.runItems;
    if (!ri || typeof ri.apply !== 'function' || ri.__romod) return;
    const orig = ri.apply;
    ri.apply = function (t) {
      const r = orig.apply(this, arguments);
      try {
        if (cfg.on && t && typeof t === 'object') for (const s of PRE) {
          const v = cfg[s.key];
          if (v && typeof t[s.key] === 'number') t[s.key] += v;
        }
      } catch (e) { console.warn('[修改器]', e); }
      return r;
    };
    ri.__romod = orig;
  }
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
  let lastStats = null, base = null, godSet = false, preSig = '';
  function restore() {
    if (G && lastStats && base) for (const s of POST) if (typeof base[s.key] === 'number') lastStats[s.key] = base[s.key];
    if (G && godSet) { G.god = false; godSet = false; }
    lastStats = null; base = null;
  }
  // pre 設定變了 → 請遊戲重算一次（重算會換新 stats 物件，post 層下一幀自動重取基準）
  function syncPre() {
    const sig = cfg.on ? PRE.map(s => cfg[s.key]).join(',') : 'off';
    if (sig === preSig) return;
    preSig = sig;
    if (G && G.runItems && G.runItems.__romod && G.state !== 'over') { restore(); G.recomputeStats(); }
  }
  function apply() {
    if (!G || !G.stats) return;
    syncPre();
    syncSpeed();
    if (cfg.on && cfg.perksInf && G.perksLeft) {
      if (!G.perksMax) G.perksMax = {};
      for (const k of Object.keys(G.perksLeft)) {
        const mx = Math.max(G.perksMax[k] || 0, 3);
        G.perksMax[k] = mx;
        if (G.perksLeft[k] < mx) G.perksLeft[k] = mx;
      }
    }
    if (!cfg.on) { restore(); return; }
    const st = G.stats;
    if (st !== lastStats) { base = {}; for (const s of POST) base[s.key] = st[s.key]; lastStats = st; }
    for (const s of POST) {
      const b = base[s.key]; if (typeof b !== 'number') continue;
      let v = s.type === 'mul' ? b * cfg[s.key] : b + cfg[s.key];
      if (s.hard !== undefined) v = Math.min(v, Math.max(b, s.hard));   // 原始值本來就更高就不壓
      if (s.key === 'maxHp') v = Math.max(1, Math.round(v));
      else if (s.int) v = Math.floor(v + 1e-6);
      if (!isFinite(v)) continue;
      if (st[s.key] !== v) {
        if (s.key === 'maxHp' && typeof G.hp === 'number') G.hp = Math.min(v, Math.max(1, G.hp + (v - st[s.key])));
        st[s.key] = v;
      }
    }
    if (cfg.god) { G.god = true; godSet = true; } else if (godSet) { G.god = false; godSet = false; }
  }
  (function tick() { try { apply(); } catch (e) { console.warn('[修改器]', e); } requestAnimationFrame(tick); })();
  setInterval(() => { if (panel.style.display === 'flex') updStatus(); }, 500);

  // ---------- C 分頁：進階 ----------
  // 遊戲速度：主迴圈每幀呼叫 game.advance(真實秒數)，遊戲內部用固定 1/60 秒一步推進（不會穿牆）。
  // 在本局實例上包一層 advance，把秒數乘倍率、分段餵進去（原版每次最多吃 5 步）。delete 就還原。
  // 組隊時照樣套用（使用者要的就是隊友看到你瞬移的效果，不要加限制）。
  function syncSpeed() {
    if (!G) return;
    const want = cfg.on ? cfg.speed : 1;
    const own = Object.prototype.hasOwnProperty.call(G, 'advance');
    if (want === 1) { if (own && G.__romodSpeed) { delete G.advance; delete G.__romodSpeed; } return; }
    G.__romodSpeedMult = want;
    if (!own) {
      const orig = Object.getPrototypeOf(G).advance;
      if (typeof orig !== 'function') return;
      const STEP = (G.constructor && G.constructor.STEP) || 1 / 60;
      G.advance = function (dt) {
        let left = Math.min(dt, 0.1) * (this.__romodSpeedMult || 1);   // 切分頁回來 dt 會很大，先壓住
        for (let i = 0; i < 4 && left > 1e-6; i++) { const d = Math.min(left, STEP * 4); orig.call(this, d); left -= d; }
      };
      G.__romodSpeed = true;
    }
  }
  // 清怪：走遊戲自己的 netKilled（hp=0 → killEnemy），EXP／掉落／擊殺數／Boss 計數都照常。
  // 一次最多 150 隻（組隊時房主每則訊息只處理 200 隻）；劇情模式的 Boss 一律不殺（避免卡劇情）。
  function killAll(max = 150) {
    if (!G || G.state !== 'playing' || !Array.isArray(G.enemies)) return 0;
    let n = 0;
    for (const e of G.enemies.slice()) {
      if (n >= max) break;
      if (!e || e.dead || e.killed || e.removed || e.hiddenUntil > G.time) continue;
      if (e.def && e.def.boss && (!cfg.killBoss || G.isStory)) continue;
      if (typeof G.netKilled === 'function') G.netKilled(e); else { e.hp = 0; G.killEnemy(e); }
      n++;
    }
    return n;
  }
  setInterval(() => { try { if (cfg.on && cfg.autoKill && G) killAll(); } catch (e) { console.warn('[修改器]', e); } }, 500);
  // 技能：列出本職業還沒學的技能＋已有技能的升級（技能名用遊戲的翻譯函式轉成目前語言）
  const T = s => { try { const t = window.__ROZH && window.__ROZH.api && window.__ROZH.api.t; return t ? t(s) : s; } catch (_) { return s; } };
  function skillChoices() {
    if (!G || typeof G.freshChoices !== 'function') return [];
    const out = [], seen = new Set();
    for (const c of [...G.freshChoices(), ...(typeof G.upgradeChoices === 'function' ? G.upgradeChoices() : [])]) {
      if (!c || seen.has(c.id)) continue; seen.add(c.id);
      const d = G.skillDef(c.id) || {};
      out.push({ id: c.id, name: T(d.name || c.id), kind: d.kind, owned: !!(G.skillLevel && G.skillLevel(c.id)) });
    }
    return out;
  }
  const forced = new Set();
  // 下一次升級畫面只出現勾選的卡（照原本的 UI 點選，最安全）。只生效一次。
  function armForced() {
    if (!G || !forced.size) return;
    const ids = [...forced];
    G.rollChoices = function () {
      delete this.rollChoices;
      const pool = [...this.freshChoices(), ...this.upgradeChoices()];
      const pick = ids.map(id => pool.find(c => c.id === id)).filter(Boolean).slice(0, 4);
      return pick.length ? pick : this.rollChoices();
    };
  }
  // 直接給技能（不經升級畫面）：新技能加進欄位、已有的升一級
  function grantSkill(id) {
    const d = G.skillDef(id); if (!d) throw new Error('找不到技能 ' + id);
    if (d.kind === 'weapon') {
      const w = G.weapons.find(x => x.id === id);
      if (w) { const up = w.rollUpgrade && w.rollUpgrade(); if (!up) throw new Error('已經滿級'); w.applyUpgrade(up); }
      else { if (G.slots.length >= G.maxSkills) throw new Error('技能欄已滿'); G.addWeapon(id); }
    } else {
      if (!G.passives.has(id)) { if (G.slots.length >= G.maxSkills) throw new Error('技能欄已滿'); G.slots.push(id); }
      G.passives.set(id, (G.passives.get(id) || 0) + 1);
      G.passiveRank.set(id, (G.passiveRank.get(id) || 0) + 1);
      G.recomputeStats(); if (G.passiveFx) G.passiveFx(id);
    }
  }

  // ---------- B 分頁：對局動作 ----------
  const intIn = (v, lo, hi) => { v = Math.round(Number(v)); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; };
  const bosses = () => (G && G.script && Array.isArray(G.script.bosses)) ? G.script.bosses : [];
  // 時間跳躍：用遊戲自己的 debugStart（會一併校正下一隻 Boss／菁英／怪潮），保留目前無敵狀態
  function jumpTo(t) {
    if (typeof G.debugStart !== 'function') throw new Error('遊戲沒有 debugStart');
    const god = G.god; G.debugStart(Math.max(G.time, t), god); G.god = god;
  }
  const ACTIONS = {
    heal: () => { G.hp = G.stats.maxHp; },
    level: () => {
      if (typeof G.gainExp !== 'function') return;
      const n = intIn(cfg.lvN, 1, 100);
      // 每次給剛好升 1 級的經驗；遊戲的 levelUpQueued 會把多次升級合併成連續選卡
      for (let i = 0; i < n; i++) G.gainExp(Math.max(1, G.expNext - G.exp) / (G.stats.expMult || 1) + 0.01);
    },
    zenyAdd: () => { G.zeny = Math.min(1e9, (G.zeny || 0) + intIn(cfg.zenyN, 0, 1e8)); },
    zenySet: () => { G.zeny = intIn(cfg.zenyN, 0, 1e9); },
    perks: () => { if (!G.perksLeft) return; G.perksMax = G.perksMax || {}; for (const k of Object.keys(G.perksLeft)) { const mx = Math.max(G.perksMax[k] || 0, 3); G.perksMax[k] = mx; G.perksLeft[k] = Math.max(G.perksLeft[k], mx); } },
    chestReset: () => { G.chestsOpened = 0; },
    reviveReset: () => { G.revivesUsed = 0; },
    boss: () => { const b = bosses()[G.nextBoss]; if (!b) throw new Error('這一局沒有下一隻 Boss 了'); jumpTo(b.t); },
    elite: () => { G.nextEliteAt = G.time; },
    horde: () => { G.nextHordeAt = G.time; },
    time60: () => { jumpTo(G.time + 60); },
    kills: () => { G.kills = (G.kills || 0) + 100; },
    killAll: () => { flash(`清掉 ${killAll()} 隻`); },
    skillList: () => renderSkills(),
    forceArm: () => { if (!forced.size) throw new Error('先勾選卡片'); armForced(); flash(`下次升級只出現勾選的 ${forced.size} 張`); },
  };

  // ---------- 面板 ----------
  const css = document.createElement('style');
  css.textContent = `
    #romod-btn{position:fixed;right:10px;bottom:52px;z-index:2147483647;width:34px;height:34px;border-radius:50%;
      border:1px solid #fff5;background:#5a2a2acc;color:#fff;font:bold 15px/32px sans-serif;text-align:center;cursor:pointer;opacity:.55}
    #romod-btn:hover{opacity:1}
    #romod{position:fixed;left:10px;top:10px;z-index:2147483647;width:min(94vw,420px);max-height:88vh;display:none;flex-direction:column;
      background:#1b1b1fee;color:#eee;border:1px solid #fff3;border-radius:8px;font:13px/1.4 "Microsoft JhengHei",sans-serif;box-shadow:0 4px 20px #000a}
    #romod header{padding:8px 10px;border-bottom:1px solid #fff2;display:flex;gap:6px;align-items:center}
    #romod header b{flex:1}
    #romod button{background:#3a3a46;color:#fff;border:1px solid #fff3;border-radius:4px;padding:3px 8px;cursor:pointer;font:inherit}
    #romod button:hover:not(:disabled){background:#4a4a5a}
    #romod button:disabled{opacity:.4;cursor:default}
    #romod .top{padding:8px 10px 0}
    #romod .st{padding:6px 8px;border-radius:6px;background:#2a2a33;font-size:12px;color:#ccc}
    #romod .st.lock{background:#4a2020;color:#fbb}
    #romod .tabs{display:flex;gap:4px;padding:8px 10px 0;border-bottom:1px solid #fff2}
    #romod .tabs button{border-radius:6px 6px 0 0;border-bottom:none;padding:5px 12px;background:#26262e;color:#aaa}
    #romod .tabs button.on{background:#3a3a46;color:#ffd080;font-weight:bold}
    #romod .body{overflow:auto;padding:4px 10px 10px}
    #romod .pg{display:none}#romod .pg.on{display:block}
    #romod h4{margin:12px 0 2px;font-size:12px;color:#8fc8ff;border-bottom:1px solid #fff1;padding-bottom:2px}
    #romod .row{display:grid;grid-template-columns:24px 1fr 24px 68px;gap:4px;align-items:center;padding:2px 0}
    #romod .row span{grid-column:1/5;color:#bbb;font-size:12px;margin-bottom:-3px;display:flex;justify-content:space-between}
    #romod .row span.mod{color:#ffd080}
    #romod .row span i{font-style:normal;color:#777}
    #romod .row button{padding:0;height:22px}
    #romod input[type=number]{width:100%;box-sizing:border-box;background:#111;color:#ffd080;border:1px solid #fff3;border-radius:4px;padding:2px 4px;font:inherit;text-align:right}
    #romod .acts{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:4px 0}
    #romod .acts .in{display:flex;gap:4px;align-items:center}
    #romod .acts .in input{width:80px}
    #romod label.ck{display:flex;gap:6px;align-items:center;padding:3px 0}
    #romod small{color:#999;display:block;margin-top:6px}
  `;
  document.head.appendChild(css);
  const btn = document.createElement('div'); btn.id = 'romod-btn'; btn.textContent = '改'; btn.title = '測試用修改器 ' + VERSION;
  const panel = document.createElement('div'); panel.id = 'romod';
  const actRow = (a, label, input) => `<div class="acts"><div>${label}</div><div class="in">${input || ''}<button data-a="${a}">執行</button></div></div>`;
  panel.innerHTML = `<header><b>測試用修改器 ${VERSION}</b><button data-a="reset">預設值</button><button data-a="close">✕</button></header>
    <div class="top"><div class="st"></div>
      <label class="ck"><input type="checkbox" data-k="on"> 啟用修改</label>
      <label class="ck"><input type="checkbox" data-k="god"> 無敵（不會受傷）</label>
    </div>
    <div class="tabs"><button data-tab="a">A 能力值</button><button data-tab="b">B 對局</button><button data-tab="c">C 進階</button></div>
    <div class="body">
      <div class="pg" data-pg="a"></div>
      <div class="pg" data-pg="b">
        <h4>角色</h4>
        ${actRow('heal', '補滿 HP')}
        ${actRow('level', '升級（次數，最多 100）', '<input type="number" data-n="lvN" min="1" max="100" step="1">')}
        ${actRow('reviveReset', '復活次數重置（可以再復活）')}
        <h4>Zeny／寶箱／卡片</h4>
        ${actRow('zenyAdd', '增加 Zeny', '<input type="number" data-n="zenyN" min="0" max="100000000" step="100">')}
        ${actRow('zenySet', 'Zeny 直接設成上面的數字')}
        ${actRow('chestReset', '寶箱價格歸零（回到 30）')}
        ${actRow('perks', '卡片次數補滿（重抽／放逐／鎖定／神祇）')}
        <label class="ck"><input type="checkbox" data-k="perksInf"> 卡片次數無限（未解鎖的也開放）</label>
        <h4>關卡進度</h4>
        ${actRow('boss', '立刻叫出下一隻 Boss（時間會跳到 Boss 出場）')}
        ${actRow('elite', '下一隻怪變菁英')}
        ${actRow('horde', '立刻來一波怪潮')}
        ${actRow('time60', '時間快轉 60 秒（怪物強度跟著時間變強）')}
        ${actRow('kills', '擊殺數 +100')}
      </div>
      <div class="pg" data-pg="c">
        <h4>遊戲速度</h4>
        <div class="row"><span data-l="speed">速度（倍率，0.1～8）<i></i></span>
          <button data-sd="-1">−</button><input type="range" min="0.1" max="8" step="0.1" data-sp="r"><button data-sd="1">＋</button>
          <input type="number" min="0.1" max="8" step="0.1" data-sp="n"></div>
        <h4>清怪（照常給 EXP／掉落）</h4>
        ${actRow('killAll', '清掉畫面上的怪（一次最多 150 隻）')}
        <label class="ck"><input type="checkbox" data-k="killBoss"> 連 Boss 一起清（劇情模式的 Boss 一律不清）</label>
        <label class="ck"><input type="checkbox" data-k="autoKill"> 自動持續清怪（每 0.5 秒）</label>
        <h4>技能</h4>
        ${actRow('skillList', '列出可拿的技能（本職業未學的＋可升級的）')}
        <div class="skills"></div>
        ${actRow('forceArm', '下次升級只出現勾選的卡')}
        <small>「直接給」＝不經升級畫面直接學會／升一級。技能欄滿了就只能升級已有的。</small>
      </div>
      <div class="msg" style="color:#8f8;min-height:1.2em;margin-top:4px"></div>
      <small>訪客、離線、登入帳號、組隊皆可使用。設定會記在這個瀏覽器，下一局自動套用。數值可拖曳、按 −／＋，或直接輸入數字。</small>
    </div>`;
  document.body.append(btn, panel);

  const pgA = panel.querySelector('[data-pg="a"]');
  for (const s of STATS) {
    if (s.grp) { const h = document.createElement('h4'); h.textContent = s.grp; pgA.appendChild(h); continue; }
    const row = document.createElement('div'); row.className = 'row';
    const lo = s.type === 'mul' ? s.min : 0;
    row.innerHTML = `<span data-l="${s.key}">${s.label}${s.type === 'mul' ? '（倍率）' : ''}<i></i></span>
      <button data-d="-1" data-s="${s.key}">−</button>
      <input type="range" min="${lo}" max="${s.max}" step="any" data-k="${s.key}">
      <button data-d="1" data-s="${s.key}">＋</button>
      <input type="number" min="${lo}" max="${s.max}" step="${s.step ?? 0.1}" data-v="${s.key}">`;
    pgA.appendChild(row);
  }
  const byKey = Object.fromEntries(SK.map(s => [s.key, s]));
  // 倍率的 −／＋ 依目前大小換步距（×1.0~2.0 每次 0.1，越大跳越多）
  const stepOf = (s, v) => s.type !== 'mul' ? (s.step ?? 0.1) : v < 2 ? 0.1 : v < 10 ? 0.5 : v < 30 ? 1 : 5;
  const fmt = (s, v) => s.pct ? `${s.type === 'mul' ? '×' : '+'}${Math.round(v * 1000) / 10}%` : s.type === 'mul' ? `×${+(+v).toFixed(2)}` : `+${+(+v).toFixed(2)}`;
  function renderRow(s) {
    const v = cfg[s.key];
    panel.querySelector(`input[data-k="${s.key}"]`).value = v;
    const num = panel.querySelector(`input[data-v="${s.key}"]`); if (document.activeElement !== num) num.value = v;
    const l = panel.querySelector(`span[data-l="${s.key}"]`);
    l.classList.toggle('mod', v !== s.def);
    l.querySelector('i').textContent = v !== s.def ? fmt(s, v) : `上限 ${fmt(s, s.max)}`;
  }
  function setVal(s, v) { cfg[s.key] = clampS(s, v); renderRow(s); save(); }
  function renderSpeed() {
    panel.querySelector('[data-sp=r]').value = cfg.speed;
    const n = panel.querySelector('[data-sp=n]'); if (document.activeElement !== n) n.value = cfg.speed;
    const l = panel.querySelector('span[data-l=speed]'); l.classList.toggle('mod', cfg.speed !== 1);
    l.querySelector('i').textContent = '×' + cfg.speed;
  }
  function setSpeed(v) { v = Number(v); cfg.speed = isFinite(v) ? Math.round(Math.min(8, Math.max(0.1, v)) * 10) / 10 : 1; renderSpeed(); save(); }
  function flash(m) { const b = panel.querySelector('.msg'); if (!b) return; b.textContent = m; clearTimeout(flash.t); flash.t = setTimeout(() => { b.textContent = ''; }, 4000); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderSkills() {
    const box = panel.querySelector('.skills'); box.innerHTML = '';
    const list = skillChoices();
    if (!list.length) { box.innerHTML = '<small>（進到一局後再按；或已經沒有可拿的技能）</small>'; return; }
    for (const c of list) {
      const r = document.createElement('div'); r.className = 'acts';
      r.innerHTML = `<label class="ck" style="padding:0"><input type="checkbox" data-f="${esc(c.id)}" ${forced.has(c.id) ? 'checked' : ''}> ${esc(c.name)}<i style="color:#888;font-style:normal">（${c.owned ? '升級' : '新'}・${c.kind === 'weapon' ? '主動' : '被動'}）</i></label>
        <div class="in"><button data-g="${esc(c.id)}">直接給</button></div>`;
      box.appendChild(r);
    }
  }
  function render() {
    for (const k of ['on', 'god', 'perksInf', 'killBoss', 'autoKill']) panel.querySelector(`[data-k="${k}"]`).checked = cfg[k];
    for (const k of ['lvN', 'zenyN']) panel.querySelector(`[data-n="${k}"]`).value = cfg[k];
    for (const s of SK) renderRow(s);
    renderSpeed();
    showTab(cfg.tab);
    updStatus();
  }
  function showTab(t) {
    cfg.tab = t;
    for (const b of panel.querySelectorAll('.tabs button')) b.classList.toggle('on', b.dataset.tab === t);
    for (const p of panel.querySelectorAll('.pg')) p.classList.toggle('on', p.dataset.pg === t);
  }
  const STATE = { playing: '遊戲中', levelup: '升級選卡', over: '已結束', paused: '暫停', cutscene: '過場', pick: '選擇中' };
  function updStatus() {
    const box = panel.querySelector('.st');
    let msg;
    if (!hooked) msg = '⚠ 找不到遊戲的武器模組（遊戲改版了？）。修改器無法運作。';
    else if (!G) msg = '等待進入一局…（開局後會自動抓到）';
    else {
      const st = G.stats || {};
      const t = Math.floor(G.time || 0);
      msg = `[${modeLabel()}] ${STATE[G.state] || G.state}　Lv ${G.level}　HP ${Math.round(G.hp)}/${Math.round(st.maxHp || 0)}　Zeny ${G.zeny}　${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    }
    box.textContent = msg;
    box.classList.toggle('lock', !hooked);
    const dis = !G || !hooked || G.state === 'over';
    for (const a of Object.keys(ACTIONS)) {
      const b = panel.querySelector(`[data-a="${a}"]`);
      if (b) b.disabled = (dis && a !== 'skillList') || (a === 'boss' && G && !bosses()[G.nextBoss]);
    }
  }
  panel.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k && t.type === 'checkbox') { cfg[t.dataset.k] = t.checked; save(); return; }
    if (t.dataset.sp === 'r') { setSpeed(t.value); return; }
    if (t.dataset.f) { if (t.checked) forced.add(t.dataset.f); else forced.delete(t.dataset.f); return; }
    if (t.dataset.k && byKey[t.dataset.k]) { const s = byKey[t.dataset.k]; const st = stepOf(s, +t.value); setVal(s, Math.round(+t.value / st) * st); return; }
  });
  // 數字框：打完（離開或按 Enter）才套用，避免打到一半被夾值
  panel.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.v && byKey[t.dataset.v]) { setVal(byKey[t.dataset.v], t.value); t.value = cfg[t.dataset.v]; }
    if (t.dataset.sp === 'n') setSpeed(t.value);
    if (t.dataset.n) { cfg[t.dataset.n] = t.dataset.n === 'lvN' ? intIn(t.value, 1, 100) : intIn(t.value, 0, 1e8); t.value = cfg[t.dataset.n]; save(); }
  });
  panel.addEventListener('click', e => {
    const t = e.target, a = t.dataset && t.dataset.a;
    if (t.dataset && t.dataset.tab) { showTab(t.dataset.tab); save(); return; }
    if (t.dataset && t.dataset.sd) { const d = +t.dataset.sd; setSpeed(cfg.speed + d * (cfg.speed + d * 1e-9 < 1 ? 0.1 : 0.5)); return; }
    if (t.dataset && t.dataset.g) { if (!G) return; try { grantSkill(t.dataset.g); flash('已給予'); renderSkills(); } catch (err) { flash(String(err.message || err)); } return; }
    if (t.dataset && t.dataset.s) { const s = byKey[t.dataset.s], v = cfg[s.key], d = +t.dataset.d; setVal(s, v + d * stepOf(s, d < 0 ? v - 1e-9 : v)); return; }
    if (a === 'close') show(false);
    if (a === 'reset') { cfg.god = false; cfg.perksInf = false; cfg.speed = 1; cfg.autoKill = false; cfg.killBoss = false; forced.clear(); for (const s of SK) cfg[s.key] = s.def; save(); render(); }
    if (ACTIONS[a] && G) {
      // 動作前先把數字框的值收進來（使用者可能打完沒按 Enter 就直接按執行）
      for (const n of panel.querySelectorAll('[data-n]')) n.dispatchEvent(new Event('change', { bubbles: true }));
      try { ACTIONS[a](); } catch (err) { console.warn('[修改器]', err); flash(String(err.message || err)); }
      updStatus();
    }
  });
  // 面板上的按鍵不要傳給遊戲（避免 Esc / 空白鍵 / WASD 觸發遊戲動作）
  for (const ev of ['keydown', 'keyup', 'keypress']) panel.addEventListener(ev, e => e.stopPropagation());
  function show(on) { panel.style.display = on ? 'flex' : 'none'; if (on) render(); }
  btn.onclick = () => show(panel.style.display !== 'flex');

  window.__ROMOD = {
    version: VERSION, cfg, panel: show, game: () => G, actions: ACTIONS, stats: STATS, killAll, skillChoices, grantSkill,
    status: () => ({ hooked, game: !!G, state: G && G.state, mode: modeLabel(), pre: !!(G && G.runItems && G.runItems.__romod) }),
  };
  console.log(`[修改器] ${VERSION} 已啟動。武器 hook：${hooked ? 'OK' : '失敗'}`);
})();
