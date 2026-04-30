#!/usr/bin/env bash
#
# Fetch production logs and open the log viewer with data baked in.
#
# Usage:
#   ./tools/fetch-logs.sh                      # last 10000 lines, open viewer
#   ./tools/fetch-logs.sh --since 24h          # lines from the last 24 hours
#   ./tools/fetch-logs.sh --since 2026-03-25   # lines since a specific date
#   ./tools/fetch-logs.sh --lines 5000         # last 5000 lines
#   ./tools/fetch-logs.sh --all                # entire log file
#   ./tools/fetch-logs.sh --no-open            # generate but don't open browser
#   ./tools/fetch-logs.sh --raw -o logs.jsonl  # just dump raw JSON, no viewer
#
# Fetches logs, injects them into a copy of log-viewer.html (the template
# stays clean), and opens the result in the browser.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/log-viewer.html"
OUTPUT_HTML="$SCRIPT_DIR/.log-viewer-live.html"
# Required env vars: SSH_KEY, SSH_HOST (e.g. deploy@1.2.3.4), APP_NAME (used
# to locate ~/$APP_NAME/logs/app.log on the VPS and infer the DB user).
SSH_KEY="${SSH_KEY:-$HOME/.ssh/${APP_NAME:-app}_deploy}"
SSH_HOST="${SSH_HOST:?SSH_HOST not set, e.g. deploy@1.2.3.4}"
APP_NAME="${APP_NAME:?APP_NAME not set}"
LOG_FILE="~/${APP_NAME}/logs/app.log"
SINCE=""
OUTPUT=""
LINES="1000000"
ALL=false
NO_OPEN=false
RAW=false
INCLUDE_HEALTH=false

while [[ $# -gt 0 ]]; do
	case $1 in
		--since|-s)  SINCE="$2"; shift 2 ;;
		--output|-o) OUTPUT="$2"; shift 2 ;;
		--lines|-n)  LINES="$2"; shift 2 ;;
		--all|-a)    ALL=true; shift ;;
		--no-open)   NO_OPEN=true; shift ;;
		--raw)       RAW=true; shift ;;
		--include-health) INCLUDE_HEALTH=true; shift ;;
		--help|-h)   head -17 "$0" | tail -15; exit 0 ;;
		*)           echo "Unknown option: $1" >&2; exit 1 ;;
	esac
done

# Build the read command (health checks excluded by default)
if [[ "$INCLUDE_HEALTH" == true ]]; then
	READ_CMD="cat $LOG_FILE"
else
	READ_CMD="grep -v '/api/health' $LOG_FILE"
fi

# Build the remote command
if [[ -n "$SINCE" ]]; then
	if [[ "$SINCE" =~ ^[0-9]+[hH]$ ]]; then
		HOURS="${SINCE%[hH]}"
		FILTER_CMD="jq -c 'select(.time >= (now - ($HOURS * 3600)) * 1000)'"
	elif [[ "$SINCE" =~ ^[0-9]+[dD]$ ]]; then
		DAYS="${SINCE%[dD]}"
		HOURS=$((DAYS * 24))
		FILTER_CMD="jq -c 'select(.time >= (now - ($HOURS * 3600)) * 1000)'"
	else
		FILTER_CMD="jq -c 'select(.time >= (\"${SINCE}T00:00:00Z\" | fromdateiso8601 * 1000))'"
	fi
	CMD="$READ_CMD | $FILTER_CMD"
elif [[ "$ALL" == true ]]; then
	CMD="$READ_CMD"
else
	CMD="$READ_CMD | tail -n $LINES"
fi

# Raw mode: just dump JSON
if [[ "$RAW" == true ]]; then
	if [[ -n "$OUTPUT" ]]; then
		ssh -i "$SSH_KEY" "$SSH_HOST" "$CMD" 2>/dev/null > "$OUTPUT"
		LINE_COUNT=$(wc -l < "$OUTPUT" | tr -d ' ')
		echo "Wrote $LINE_COUNT lines to $OUTPUT" >&2
	else
		ssh -i "$SSH_KEY" "$SSH_HOST" "$CMD" 2>/dev/null
	fi
	exit 0
fi

# Fetch logs
echo "Fetching logs from production..." >&2
TMPFILE=$(mktemp)
ssh -i "$SSH_KEY" "$SSH_HOST" "$CMD" 2>/dev/null > "$TMPFILE"
LINE_COUNT=$(wc -l < "$TMPFILE" | tr -d ' ')
echo "Got $LINE_COUNT log lines" >&2

# Fetch org names from database
echo "Fetching org names..." >&2
ORG_NAMES_FILE=$(mktemp)
ssh -i "$SSH_KEY" "$SSH_HOST" "cd ~/${APP_NAME} && docker compose -f docker-compose.prod.yml exec -T postgres psql -U \${POSTGRES_USER:-${APP_NAME}} -t -A -F'|' -c 'SELECT id, name FROM organizations'" 2>/dev/null > "$ORG_NAMES_FILE"

# Copy template and inject data
cp "$TEMPLATE" "$OUTPUT_HTML"
python3 -c "
import json

with open('$TMPFILE', 'r') as f:
    log_data = f.read()

org_names = {}
with open('$ORG_NAMES_FILE', 'r') as f:
    for line in f:
        line = line.strip()
        if '|' in line:
            org_id, name = line.split('|', 1)
            org_names[org_id] = name

with open('$OUTPUT_HTML', 'r') as f:
    html = f.read()

start_marker = '// EMBEDDED_DATA_START'
end_marker = '// EMBEDDED_DATA_END'
start_idx = html.index(start_marker) + len(start_marker)
end_idx = html.index(end_marker)

encoded = json.dumps(log_data)
encoded_orgs = json.dumps(org_names)
new_content = html[:start_idx] + '\nconst EMBEDDED_LOG_DATA = ' + encoded + ';\nconst EMBEDDED_ORG_NAMES = ' + encoded_orgs + ';\n' + html[end_idx:]

with open('$OUTPUT_HTML', 'w') as f:
    f.write(new_content)
"

rm -f "$ORG_NAMES_FILE"

rm -f "$TMPFILE"
echo "Dashboard ready at $OUTPUT_HTML" >&2

# Open in browser
if [[ "$NO_OPEN" == false ]]; then
	if command -v open &>/dev/null; then
		open "$OUTPUT_HTML"
	elif command -v xdg-open &>/dev/null; then
		xdg-open "$OUTPUT_HTML"
	else
		echo "Open $OUTPUT_HTML in your browser" >&2
	fi
fi
