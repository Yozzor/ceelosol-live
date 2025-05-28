const fs = require('fs');

const content = fs.readFileSync('src/services/TreasuryMonitor.js', 'utf8');
const encoded = Buffer.from(content).toString('base64');
console.log(encoded);
