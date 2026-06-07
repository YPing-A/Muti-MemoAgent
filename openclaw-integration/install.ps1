# ─────────────────────────────────────────────────────────────
# Muti-MemoAgent — OpenClaw Auto-Install (Windows)
# ─────────────────────────────────────────────────────────────
# Usage:
#   .\install.ps1                            # install to default workspace
#   .\install.ps1 -Workspace C:\custom\path  # install to custom path
#
# This script initializes Memograph within your OpenClaw workspace
# so that memories auto-sync on git commit.
# ─────────────────────────────────────────────────────────────

param(
    [string]$Workspace = "$env:USERPROFILE\.openclaw\workspace"
)

Write-Host "🧠 Muti-MemoAgent — OpenClaw Integration Installer" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "Target workspace: $Workspace"

# Ensure workspace exists
if (-not (Test-Path $Workspace)) {
    New-Item -ItemType Directory -Path $Workspace -Force | Out-Null
    Write-Host "✅ Created workspace directory: $Workspace"
}

# Check for Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion detected"
} catch {
    Write-Host "❌ Node.js is required. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check for npx
try {
    $npxVersion = npx --version
} catch {
    Write-Host "❌ npx is required. Please ensure Node.js is installed correctly." -ForegroundColor Red
    exit 1
}

Set-Location $Workspace

Write-Host "📦 Initializing Memograph..." -ForegroundColor Yellow
npx @memograph/cli init
Write-Host "✅ Memograph initialized." -ForegroundColor Green

# Hook installation
$hooksDir = Join-Path $Workspace "hooks"
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Copy hooks
$hookSrc = Join-Path $scriptDir "memograph-hook.sh"
if (Test-Path $hookSrc) {
    Copy-Item $hookSrc (Join-Path $hooksDir "memograph-hook.sh")
    Write-Host "✅ Startup hook installed."
}

$msgHookSrc = Join-Path $scriptDir "memograph-message-hook.sh"
if (Test-Path $msgHookSrc) {
    Copy-Item $msgHookSrc (Join-Path $hooksDir "memograph-message-hook.sh")
    Write-Host "✅ Message hook installed."
}

Write-Host ""
Write-Host "🎉 Muti-MemoAgent installed successfully!" -ForegroundColor Green
Write-Host "   Memories will auto-sync on git commit."
Write-Host "   Start a new OpenClaw session to activate hooks."
Write-Host ""
Write-Host "   Dashboard: npx serve $Workspace\..\..\github\memograph\dashboard\dist"
Write-Host "   MCP Server: npx @memograph/mcp-server"
