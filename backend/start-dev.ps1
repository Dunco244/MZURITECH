# MzuriTech Dev Starter
# Saves you from manually updating .env every time
# Place this file in your backend folder and double-click to run

$BackendPath = "C:\Users\ADMIN\Downloads\KIBET'S SCHOOL PROJECT\backend"
$CloudflaredExe = "C:\cloudflared\cloudflared.exe"
$EnvFile = Join-Path $BackendPath ".env"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  MzuriTech - Starting Dev Environment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check cloudflared exists
if (-not (Test-Path $CloudflaredExe)) {
    Write-Host " ERROR: cloudflared.exe not found at $CloudflaredExe" -ForegroundColor Red
    Write-Host " Download it from: https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Yellow
    pause
    exit
}

# Step 2: Start cloudflared in background and capture output
Write-Host " [1/3] Starting Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host "        (waiting for URL, takes ~15 seconds...)" -ForegroundColor Gray

$cfUrl = $null
$job = Start-Job -ScriptBlock {
    param($exe)
    & $exe tunnel --url  import.meta.env.VITE_API_URL || 'http://localhost:5000' 2>&1
} -ArgumentList $CloudflaredExe

# Wait for the trycloudflare URL to appear in output (max 30 seconds)
$timeout = 30
$elapsed = 0
while (-not $cfUrl -and $elapsed -lt $timeout) {
    Start-Sleep -Seconds 1
    $elapsed++
    $output = Receive-Job $job -Keep
    foreach ($line in $output) {
        if ($line -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $cfUrl = $matches[0]
            break
        }
    }
}

if (-not $cfUrl) {
    Write-Host " ERROR: Could not get Cloudflare URL. Check your internet connection." -ForegroundColor Red
    Remove-Job $job -Force
    pause
    exit
}

Write-Host " [1/3] Tunnel URL: $cfUrl" -ForegroundColor Green

# Step 3: Update .env file automatically
Write-Host " [2/3] Updating .env file..." -ForegroundColor Yellow

$callbackUrl = "$cfUrl/api/payment/mpesa/callback"
$envContent = Get-Content $EnvFile
$envContent = $envContent -replace "MPESA_CALLBACK_URL=.*", "MPESA_CALLBACK_URL=$callbackUrl"
$envContent | Set-Content $EnvFile

Write-Host " [2/3] .env updated with: $callbackUrl" -ForegroundColor Green

# Step 4: Start backend
Write-Host " [3/3] Starting backend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Tunnel:   $cfUrl" -ForegroundColor White
Write-Host "  Callback: $callbackUrl" -ForegroundColor White
Write-Host "  Backend:   import.meta.env.VITE_API_URL || 'http://localhost:5000'" -ForegroundColor White
Write-Host "  Frontend: https://mzuritech.netlify.app -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Keep this window OPEN while developing!" -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop everything." -ForegroundColor Gray
Write-Host ""

Set-Location $BackendPath
npm start

# Cleanup cloudflared job when backend stops
Remove-Job $job -Force