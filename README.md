# RO Survivors 繁體中文化書籤

把 https://ro-survivors.com （仙境傳說同人 survivors 網頁遊戲）整個變成繁體中文：
介面、技能、天賦、卡片、劇情對白、NPC、怪物名、道具名。另附一支測試用修改器。

## 安裝（一次）
1. 瀏覽器新增書籤（先隨便加一個，再按右鍵「編輯」），名稱隨意（例如「RO 中文」），網址整行貼上：
   ```
   javascript:import('https://hans-hanlin.github.io/ro_zh/ro_zh.js?v='+Date.now())
   ```
2. 打開 https://ro-survivors.com/ ，點一下書籤。畫面變中文、右下角出現「中」就成功。
   每次重新整理頁面後要再點一次書籤。
3. 書籤每次都會抓最新版，作者更新後不用重裝。

> 書籤列沒顯示：Chrome／Edge 按 `Ctrl+Shift+B`。

## 使用
- 右上角語言選單會多一個「繁體中文」，可以在中／英／西之間切換。
- 「中」按鈕：
  - **切回原文／切成中文**
  - **缺字清單**：畫面出現過、還沒翻譯的字串（JSON）。複製貼給 AI 翻好，放進 `i18n/overrides.json`，跑 `建置.bat`，push。
- 不會翻：玩家暱稱、聊天內容、輸入框。
- 不碰伺服器：只改你自己瀏覽器裡的語言設定。離開頁面時會把遊戲存檔裡的語言改回原本的，
  所以沒點書籤時遊戲照常顯示英文／西文。

## 測試用修改器（ro_mod.js V1.1）
- 書籤：`javascript:import('https://hans-hanlin.github.io/ro_zh/ro_mod.js?v='+Date.now())`
- 朋友群組測試用：訪客、離線、登入帳號、組隊**都可以用**。面板狀態列會顯示目前是 [訪客] / [帳號] / [・組隊]。
- 點左下「改」打開面板（進到一局後會自動抓到遊戲）：
  - 無敵
  - 倍率：生命上限、傷害、移動速度、技能範圍、拾取範圍、EXP、Zeny
  - 加值：冷卻縮減（急速）、額外投射物
  - 按鈕：補滿 HP、升 1 級、+1000 Zeny
- 設定會記在瀏覽器，下一局自動套用；按「預設值」全部恢復。

## 維護（給開發者）
```
i18n/zh/*.json       遊戲字串翻譯（key = 西文原文）
i18n/names*.json     怪物 / 職業 / 城鎮名
i18n/items.json      道具 / 卡片名
i18n/unify.json      統一譯名（整批替換）
i18n/overrides.json  手動修正（最優先）
src/ro_zh.src.js     中文化原始碼
建置.bat             合併翻譯 → 產生 ro_zh.js → 語法檢查
```
遊戲改版後若「中」面板顯示「DOM 替換（備援）」模式，代表書籤找不到遊戲的語言模組，需要更新 `src/ro_zh.src.js` 的 `probe()`。
新增的遊戲字串可用 `node tools/extract_tables.js` / `collect_keys.js` 從新版 bundle 重抽，再補翻。
