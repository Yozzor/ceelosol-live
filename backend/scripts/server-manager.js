#!/usr/bin/env node

/**
 * Server Manager Script for CeeloSol Backend
 * Helps prevent port conflicts and manage server instances
 */

const { exec, spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3001;

// Check if port is in use
function checkPort(port) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
    
    exec(command, (error, stdout) => {
      resolve(stdout.trim().length > 0);
    });
  });
}

// Kill processes using the port
function killPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1];
          }).filter(pid => pid && pid !== '0');
          
          if (pids.length > 0) {
            const uniquePids = [...new Set(pids)];
            uniquePids.forEach(pid => {
              exec(`taskkill /F /PID ${pid}`, () => {});
            });
            console.log(`🔪 Killed processes on port ${port}: ${uniquePids.join(', ')}`);
          }
        }
        resolve();
      });
    } else {
      exec(`lsof -ti :${port} | xargs kill -9`, resolve);
    }
  });
}

// Start server
async function startServer(mode = 'dev') {
  console.log(`🚀 Starting CeeloSol Backend Server...`);
  
  // Check if port is in use
  const portInUse = await checkPort(PORT);
  if (portInUse) {
    console.log(`⚠️  Port ${PORT} is already in use. Attempting to free it...`);
    await killPort(PORT);
    
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Start the server
  const command = mode === 'dev' ? 'pnpm dev' : 'pnpm start';
  console.log(`📦 Running: ${command}`);
  
  const serverProcess = spawn('pnpm', mode === 'dev' ? ['dev'] : ['start'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server manager...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
  
  serverProcess.on('close', (code) => {
    console.log(`\n📊 Server process exited with code ${code}`);
    process.exit(code);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args.includes('--prod') ? 'prod' : 'dev';

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CeeloSol Backend Server Manager

Usage:
  node scripts/server-manager.js [options]

Options:
  --dev     Start in development mode (default)
  --prod    Start in production mode
  --help    Show this help message

Examples:
  node scripts/server-manager.js          # Start in dev mode
  node scripts/server-manager.js --prod   # Start in production mode
  `);
  process.exit(0);
}

// Start the server
startServer(mode).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
