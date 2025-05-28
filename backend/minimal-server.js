const express = require('express');
const cors = require('cors');

console.log('🚀 Starting minimal server...');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal server is working!' });
});

// House wallet test route
app.get('/api/house-wallet', (req, res) => {
  res.json({
    success: true,
    houseWallet: {
      publicKey: 'TEST_PUBLIC_KEY',
      balance: 1000000000,
      balanceInSOL: 1.0
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`🌐 Test: http://localhost:${PORT}/api/test`);
  console.log(`🏦 House wallet: http://localhost:${PORT}/api/house-wallet`);
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down minimal server...');
  process.exit(0);
});
