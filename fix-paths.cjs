const fs = require('fs');
let c = fs.readFileSync('test-all.mjs', 'utf8');
c = c.replace(/\.\.\/\.\.\/packages\//g, './packages/');
fs.writeFileSync('test-all.mjs', c);
console.log('Fixed paths');
