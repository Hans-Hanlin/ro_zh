# HANDOFF — RO Survivors 中文化書籤 + 測試用修改器

交接給 Claude Code 繼續實作。日期：2026-11-09。

> **2026-11-09 桌機進度更新**（詳見 `開發日誌.md`、`CLAUDE.md`）：
> - §4 第 1～4 步已完成。找到遊戲內建 i18n → `ro_zh.js` 升到 **V2**（注入 zh-TW 表，約 6,600 條）；
>   `ro_mod.js` 升到 **V1** 固定選單（hook 武器 `update(dt, game)` 取得遊戲物件）。皆已用 Playwright 實機驗證。
> - 下方 §2 的 V1／V0 描述與 §4 待辦保留作為歷史紀錄。
> - ✅ §1「修改器只在訪客／離線解鎖」已**作廢**（當初誤以為是對外營利用）。使用者確認：這是朋友群組使用的測試工具，
>   以 §6 為準，**訪客／離線／登入／組隊全部開放**（ro_mod.js V1.1）。
> - §4 第 5 步已完成：https://hans-hanlin.github.io/ro_zh/ （repo `Hans-Hanlin/ro_zh`）。
> - 剩下：譯名人工校對（`docs/譯名待確認.md`）。

## 1. 目標
把 https://ro-survivors.com （Ragnarok Online 同人 survivors 網頁遊戲）做成：
1. **ro_zh.js** — 繁體中文化書籤（bookmarklet），目標是「完整中文化」。
2. **ro_mod.js** — 測試用修改器書籤，**訪客／離線／登入／組隊全模式開放**（2026-11-09 使用者確認；舊版「只在訪客解鎖」為誤會，已作廢）。

參考範本：D2 Survivors 的中文化書籤 `d2_zh.js`
（https://jtnhrbpvvm-spec.github.io/taiwan_game2/D2修改版/d2_zh.js），同一位台灣作者做的，
含中文化 + 修改器（`D2ED` 區塊）。書籤用法：
`javascript:import('https://<host>/xxx.js?v='+Date.now())`

## 2. 目前狀態（V1 / V0）

### ro_zh.js（V1）
- 字典 `DICT`（西文 + 英文 → 繁中）+ `RULES`（帶數字的樣板 regex）。
- `MutationObserver`（childList / characterData / attributes: placeholder,title,aria-label,alt）
  + `TreeWalker` 全文替換；跳過 SCRIPT/STYLE/TEXTAREA/INPUT/CODE/PRE 與 contentEditable。
- hook `CanvasRenderingContext2D.prototype.fillText / strokeText`，canvas 文字走同一本字典。
- 右下角「中」按鈕 → 面板列出**缺字**（畫面出現過、字典沒有的字串，JSON 格式），可一鍵複製。
- `window.__ROZH = { version, dict, missing, walk, panel }`；書籤前可先設 `window.__ROZH_EXTRA = {...}` 追加字典。
- 字典目前只涵蓋 index.html 靜態抓得到的 UI 文字（首頁、帳號、建角、背包/卡片/寵物、NPC 名、選項、暫停、死亡）。
  **技能／裝備／卡片／天賦／怪物／地圖／升級選卡 的文字都還沒有**，要靠實際遊玩收缺字。

### ro_mod.js（V0 探測版）
- 在 `Object.prototype` 上對一組常見欄位名（hp, maxHp, speed, atk, exp, zeny, str/agi/vit/int/dex/luk…）
  定義 setter，攔截第一次 `this.xxx = 數字` 的物件，記錄到 `found` / `order`。
- 面板列出抓到的物件與數字欄位，可直接改、可勾選鎖定（rAF 每幀寫回）。
- 「匯出」把最近 30 個物件的欄位 dump 成 JSON（複製到剪貼簿 + console）。
- ~~鎖定條件 `guestMode()`~~（歷史：V0 曾在非訪客模式鎖住。已作廢，V1.1 起無任何鎖定）。

兩支檔案 `node --check` 皆通過。尚未在真實瀏覽器驗證。

## 3. 已知事實（從網頁抓到的）
- UI 是 **DOM**（不是 canvas 點陣字），靜態 HTML 原文是**西班牙文**；使用者看到英文，
  代表遊戲有 runtime i18n 層（可能依 `navigator.language` 選 es/en）。→ 若能找到 i18n 物件，
  直接塞一組 zh-Hant 會比 DOM 替換乾淨得多，優先調查。
- 有帳號系統、好友、頻道聊天、玩家間交易（Comerciar / Puntos Kafra）、紀錄（Récord）、成就。
- 有訪客模式（角色存在瀏覽器）與離線版（「Versión offline: juegas solo y sin conexión」、存在本機 PC，
  見 /descargas.html）。訪客角色上傳到帳號後「可用不可交易」。
- 相關頁：/talents.html（天賦總表，可做為天賦字典來源）、/legal.html、/credits.html、/descargas.html。
- 作者 Reven4nt（x.com/Reven4nt），hello@ro-survivors.com，Discord 連結尚未公開。
- 在雲端環境抓不到遊戲的 JS bundle（WebFetch 會剝掉 `<script>`），**本機 DevTools 才看得到**。

## 4. 下一步（建議順序）
1. **本機開 DevTools → Sources**，找主 bundle（看 index.html 的 `<script src>`），把檔名記進這份文件。
   - grep 字串表 / i18n 物件（搜 `"Cerrar"`、`"Invitado"`、`navigator.language`、`lang`）。
   - 若有 i18n 字典：ro_zh.js 改成直接注入 zh-Hant（或把 en 表整包換成中文），MutationObserver 留作 fallback。
   - 若沒有：從 bundle 把所有字串抽出來（技能、裝備、卡片、天賦、怪物、地圖、選卡說明），交給 AI 翻成繁中回填 `DICT`。
2. **/talents.html** 整頁抓下來翻譯，天賦名與說明先補進字典。
3. 跑一輪遊戲收缺字（「中」→ 複製），翻譯回填，`VERSION` → V2。
4. 修改器：
   - 用 ro_mod.js「匯出」或直接讀 bundle，確認玩家物件的真實欄位名與取得方式
     （D2 範本是用 `Object.prototype` 上一個不列舉的 getter 攔 `build.unspent` 認出 build 物件，可仿照）。
   - 改成像 D2ED 那樣的固定選單：生命上限、傷害倍率、受傷倍率、移速、拾取範圍、冷卻倍率、全技能等級、
     屬性點、Zeny/卡普拉點數（卡普拉點數若與伺服器同步就不要碰）。
   - ~~改進訪客判斷、登入時鎖住~~（已作廢：全模式開放。登入判斷只用來在狀態列顯示 [訪客]/[帳號]）。
   - 「記住本局修改」可參考 D2 的 `d2zh:runKeep`（localStorage）作法，但只存訪客存檔。
5. 架到 GitHub Pages，書籤網址換成正式的；README 補圖文安裝教學給群組。

## 5. 檔案
- `ro_zh.js` — 中文化書籤 V1
- `ro_mod.js` — 修改器 V0 探測版
- `README.md` — 架設與補字典流程（給使用者看）
- `HANDOFF.md` — 本文件（給 Claude Code 看）

## 6. 約束 / 注意
- 書籤只改使用者自己瀏覽器裡的畫面與記憶體，**不碰伺服器、不自動化任何網路請求**。
- 修改器可在訪客／離線模式／登入狀態／組隊中啟用（**以此條為準**）。
- 替換文字時不要動 `<input>` / `<textarea>` / 聊天輸入框內容；玩家暱稱、聊天內容不翻。
- 字典 key 比對是 trim 後、忽略結尾「:」；新增條目保持 `'原文': '中文'` 一行一條，西／英兩版都放。
- 中文字型靠系統 fallback（Microsoft JhengHei / PingFang TC / Noto Sans TC），canvas 文字變長時
  可能超出原框，必要時參考 d2_zh.js 的 `d2zhWrap` 做自動換行／縮字。
