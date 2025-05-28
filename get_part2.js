const fs = require('fs');

const content = fs.readFileSync('src/services/TreasuryMonitor.js', 'utf8');
const lines = content.split('\n');
const part2 = lines.slice(150).join('\n');
const encoded = Buffer.from(part2).toString('base64');
console.log(encoded);
