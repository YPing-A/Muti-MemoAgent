const fs = require('fs');
const dir = 'C:/Users/Admin/github/memograph/';
['README.md','README_zh.md','LICENSE','package.json','setup.cjs'].forEach(f => {
  const p = dir + f;
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/ran162154/g, 'YPing-A');
    fs.writeFileSync(p, c);
    console.log('OK ' + f);
  }
});
