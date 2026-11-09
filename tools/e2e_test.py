"""實機測試：開 ro-survivors.com（Playwright 自帶 Chromium，全新設定檔＝訪客），注入書籤，截圖。
用法：python tools/e2e_test.py [--mod] [--headed] [--play]
  --mod    同時注入 ro_mod.js
  --play   嘗試建角色並進一局（升級選卡時測修改器抓遊戲物件）
截圖存到 _research/shots/，缺字存到 _research/missing_runtime.json
"""
import sys, re, json, time, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / '_research' / 'shots'
SHOTS.mkdir(parents=True, exist_ok=True)
ZH = (ROOT / 'ro_zh.js').read_text(encoding='utf-8')
MOD = (ROOT / 'ro_mod.js').read_text(encoding='utf-8')
A = sys.argv
n = [0]


def shot(pg, name):
    n[0] += 1
    pg.screenshot(path=str(SHOTS / f'{n[0]:02d}_{name}.png'))


def click(pg, text, t=2500):
    try:
        loc = pg.locator('button:visible, [role=button]:visible, .slot:visible, li:visible').filter(has_text=re.compile('^\\s*' + re.escape(text) + '\\s*$'))
        if loc.count() == 0:
            loc = pg.get_by_text(text, exact=True)
        loc.first.click(timeout=t)
        time.sleep(1.2)
        return True
    except Exception:
        return False


with sync_playwright() as p:
    b = p.chromium.launch(headless='--headed' not in A, args=['--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1280, 'height': 800}, locale='en-US')
    logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto('https://ro-survivors.com/', wait_until='networkidle', timeout=90000)
    pg.evaluate(ZH)
    if '--mod' in A:
        pg.evaluate(MOD)
    # 等載入完成（載入中… 消失）
    for _ in range(60):
        if not pg.evaluate("() => /載入中|Cargando|Loading/.test(document.body.innerText)"):
            break
        time.sleep(1)
    shot(pg, 'home')
    st = pg.evaluate("""() => ({
      mode: window.__ROZH && window.__ROZH.mode, lang: document.documentElement.lang,
      missing: window.__ROZH ? window.__ROZH.missing.size : -1,
      mod: window.__ROMOD ? window.__ROMOD.status() : null })""")
    print(json.dumps(st, ensure_ascii=False))
    if '--play' in A:
        for t in ['開始遊戲', '進入遊戲', '遊玩', '開始']:
            if click(pg, t):
                break
        time.sleep(3)
        shot(pg, 'after_play')
        vis = "() => [...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.innerText.trim()).filter(Boolean).slice(0,40)"
        print('buttons:', pg.evaluate(vis))
        # 依序嘗試：建角 → 進廣場 → 找遠征 NPC → 出發
        for step in (A[A.index('--play') + 1].split('|') if len(A) > A.index('--play') + 1 and not A[A.index('--play') + 1].startswith('--') else []):
            if step.startswith('key:'):
                pg.keyboard.press(step[4:]); time.sleep(1.5)
            elif step.startswith('type:'):
                import random, string
                txt = step[5:].replace('RND', ''.join(random.choice(string.ascii_lowercase) for _ in range(5)))
                pg.keyboard.type(txt, delay=60); time.sleep(0.5)
            elif step.startswith('wait:'):
                time.sleep(float(step[5:]))
            elif step.startswith('js:'):
                print('js:', pg.evaluate(step[3:]))
            else:
                print(step, '->', click(pg, step))
            shot(pg, re.sub(r'[^\w一-鿿]+', '_', step)[:20])
            print('buttons:', pg.evaluate(vis))
        if '--mod' in A:
            print('mod:', pg.evaluate("() => window.__ROMOD.status()"))
    miss = pg.evaluate("() => JSON.stringify([...window.__ROZH.missing.keys()], null, 1)")
    (ROOT / '_research' / 'missing_runtime.json').write_text(miss, encoding='utf-8')
    print('\n'.join(l for l in logs if 'WebGL' not in l and 'GL Driver' not in l)[-3000:])
    if '--headed' in A:
        input('Enter 結束…')
    b.close()
