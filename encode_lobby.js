const fs = require('fs');

const content = fs.readFileSync('src/components/LobbyBrowser.js', 'utf8');
const encoded = Buffer.from(content).toString('base64');

console.log('Encoded LobbyBrowser:');
console.log(encoded);
