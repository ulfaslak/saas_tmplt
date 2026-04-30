# Usage Stats

Fetch production logs and open the visual dashboard. Just run the fetch script:

```bash
./tools/fetch-logs.sh
```

This SSHes into production, fetches the last 10,000 log lines, injects them into `tools/log-viewer.html`, and opens it in the browser.

Options you can pass:
- `--since 24h` or `--since 7d` — filter by time
- `--since YYYY-MM-DD` — filter from a specific date
- `--lines 20000` — fetch more lines
- `--all` — fetch the entire log file

After running the script and opening the viewer, give the human a brief summary of what was fetched (line count, any errors from the fetch itself). The viewer handles all the visualization — no need to parse logs in the conversation.
