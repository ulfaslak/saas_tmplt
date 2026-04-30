#!/bin/bash
# PostToolUse hook: runs prettier --check on .svelte/.ts/.tsx files after Edit/Write
f=$(jq -r '.tool_input.file_path')
echo "$f" | grep -qE '\.(svelte|ts|tsx)$' || exit 0
cd "$(git rev-parse --show-toplevel)/app" && npx prettier --check "$f" 2>&1 | head -5
