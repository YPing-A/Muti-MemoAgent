#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Memograph — OpenClaw Startup Hook
# ─────────────────────────────────────────────────────────────
# Runs on OpenClaw session start.
# Syncs any un-synced memories from the last session.
# ─────────────────────────────────────────────────────────────
# Installation: Place this in ~/.openclaw/workspace/hooks/
# ─────────────────────────────────────────────────────────────

memograph sync --since-last 2>/dev/null || true
