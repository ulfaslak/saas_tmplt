#!/bin/bash
# SessionEnd hook: intentionally a no-op.
# The dev server is cleaned up by /stage itself (step 1 kills any stale server
# before starting a new one). This avoids the problem where parallel sessions
# kill each other's servers.
#
# If a server is left running after all sessions end, it's harmless — the next
# /stage will clean it up.
exit 0
