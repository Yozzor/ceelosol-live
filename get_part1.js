const fs = require('fs');

const content = fs.readFileSync('src/services/TreasuryMonitor.js', 'utf8');
const lines = content.split('\n');
const part1 = lines.slice(0, 150).join('\n');
const encoded = Buffer.from(part1).toString('base64');
console.log(encoded);
