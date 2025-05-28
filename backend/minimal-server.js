const express = require('express');
const cors = require('cors');

console.log('🚀 Starting CeeloSol Backend Server...');

const app = express();
const PORT = process.env.PORT || 3001;

// Fixed house wallet for consistency
const HOUSE_WALLET_ADDRESS = 'GMAuqtZuYpwt3Y9EUeeEfQFJGDpsExWXG1ZegGBQwAW6';

// Middleware
app.use(cors({
  origin: ['https://ceelosol-live.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'CeeloSol Backend'
  });
});

// House wallet endpoint
app.get('/api/house-wallet', (req, res) => {
  try {
    res.json({
      success: true,
      address: HOUSE_WALLET_ADDRESS
    });
  } catch (error) {
    console.error('Error fetching house wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch house wallet'
    });
  }
});

// Activity endpoints (simplified)
app.get('/api/activity/wins', (req, res) => {
  res.json({
    success: true,
    wins: []
  });
});

app.get('/api/activity/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalGames: 0,
      totalWinnings: 0,
      houseBalance: 0
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ CeeloSol Backend running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`🏦 House wallet: http://localhost:${PORT}/api/house-wallet`);
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CeeloSol Backend...');
  process.exit(0);
});
