const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
const jsCode = lines.slice(108, 268);
lines.splice(108, 160);
const scriptIdx = lines.findIndex(l => l.trim() === '<script>');
lines.splice(scriptIdx + 1, 0, ...jsCode);
fs.writeFileSync('index.html', lines.join('\n'));
console.log('Fixed index.html');
