#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Muti-MemoAgent — OpenClaw Auto-Install (macOS/Linux)
# ─────────────────────────────────────────────────────────────
# Usage:
#   bash install.sh                          # install to default ~/.openclaw/workspace
#   bash install.sh /custom/workspace/path   # install to custom path
#
# This script initializes Memograph within your OpenClaw workspace
# so that memories auto-sync on git commit.
# ─────────────────────────────────────────────────────────────

set -euo pipefail

WORKSPACE="${1:-$HOME/.openclaw/workspace}"

echo "🧠 Muti-MemoAgent — OpenClaw Integration Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Target workspace: $WORKSPACE"

# Ensure workspace exists
mkdir -p "$WORKSPACE"

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo "❌ Node.js is required. Please install Node.js 18+ first."
  exit 1
fi

# Check for npx
if ! command -v npx &>/dev/null; then
  echo "❌ npx is required. Please ensure Node.js is installed correctly."
  exit 1
fi

cd "$WORKSPACE"

echo "📦 Initializing Memograph..."
npx @memograph/cli init
echo "✅ Memograph initialized."

# Hook installation
HOOKS_DIR="$WORKSPACE/hooks"
mkdir -p "$HOOKS_DIR"

# Copy hooks from this script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/memograph-hook.sh" ]; then
  cp "$SCRIPT_DIR/memograph-hook.sh" "$HOOKS_DIR/"
  chmod +x "$HOOKS_DIR/memograph-hook.sh"
  echo "✅ Startup hook installed."
fi

if [ -f "$SCRIPT_DIR/memograph-message-hook.sh" ]; then
  cp "$SCRIPT_DIR/memograph-message-hook.sh" "$HOOKS_DIR/"
  chmod +x "$HOOKS_DIR/memograph-message-hook.sh"
  echo "✅ Message hook installed."
fi

echo ""
echo "🎉 Muti-MemoAgent installed successfully!"
echo "   Memories will auto-sync on git commit."
echo "   Start a new OpenClaw session to activate hooks."
echo ""
echo "   Dashboard: cd $(pwd) && npx serve dashboard/dist"
echo "   MCP Server: npx @memograph/mcp-server"
