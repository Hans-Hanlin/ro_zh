// 檢查武器基底類別 mo 的子類別有沒有覆寫 update(dt, game)
const fs = require('fs');
const c = fs.readFileSync(process.argv[2], 'utf8');
const subs = [...c.matchAll(/class ([\w$]+) extends mo\{/g)].map(m => [m[1], m.index]);
for (const [name, idx] of subs) {
  // 粗略找類別本體：到下一個 "class " 為止
  const end = c.indexOf('class ', idx + 10);
  const body = c.slice(idx, end > 0 ? end : idx + 20000);
  console.log(name, 'overrides update:', /[}{;]update\(e,t\)\{|[}{;]update\(t,n\)\{/.test(body), 'len', body.length);
}
