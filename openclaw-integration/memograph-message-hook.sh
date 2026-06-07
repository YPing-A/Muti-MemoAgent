#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Memograph — OpenClaw Message Preprocess Hook
# ─────────────────────────────────────────────────────────────
# Low-sample dialogue ingestion.
# Only writes important messages to memory:
#   - Messages longer than 100 characters
#   - Messages containing key Chinese/English trigger words
# ─────────────────────────────────────────────────────────────
# Usage: pipe message text as $1 to this script
# ─────────────────────────────────────────────────────────────

if [ ${#1} -gt 100 ] || echo "$1" | grep -qiE "记住|偏好|喜欢|不喜欢|习惯|流程|配置|密码|token|key"; then
  memograph memo "$1" --type fact --source dialogue 2>/dev/null || true
fi
