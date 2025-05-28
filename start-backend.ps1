Write-Host "🚀 Starting CeeloSol Backend Server..." -ForegroundColor Green

# Navigate to backend directory
Set-Location "backend"

Write-Host "📦 Building TypeScript..." -ForegroundColor Yellow
& pnpm build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host "🚀 Starting server on port 3001..." -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Press Ctrl+C to stop the server" -ForegroundColor Cyan
    Write-Host ""
    
    # Start the server
    & node dist/server.js
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
