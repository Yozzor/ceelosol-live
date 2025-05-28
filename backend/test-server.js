const express = require('express');
const app = express();
const PORT = 3001;

console.log('🚀 Starting simple test server...');

app.get('/test', (req, res) => {
  res.json({ message: 'Test server is working!' });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}/test`);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  process.exit(0);
});
