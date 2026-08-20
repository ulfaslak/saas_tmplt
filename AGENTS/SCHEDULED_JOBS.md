# Scheduled Jobs

Every recurring job in the system, where it is defined, and how you would know
if it stopped.

**Why this file exists.** A recurring job with no registry and no
absence-alarm is a job you will discover is broken at the worst possible
moment — a backup sync can sit dead for months while `launchctl list` reports
it loaded and healthy, and nothing anywhere reports its absence. So every job
below names its **alarm**: the concrete thing that fires (or the check a
session runs) when the job stops running. Any new recurring job must be added
here with one.

**The macOS launchd traps** — all of which make a laptop-side job look healthy
while doing nothing. Check for all three when adding any launchd job:

1. **`StartCalendarInterval` on a laptop.** It does not fire if the machine is
   asleep at the appointed minute. Use `StartInterval`, which fires on wake
   once the interval has elapsed.
2. **TCC on `~/Documents`.** A launchd agent running `/bin/bash` has no Full
   Disk Access, so it cannot read anything under `~/Documents` —
   `Operation not permitted`, exit 126. Install the script it runs to a copy
   outside that tree. **Running the script by hand does not test this**,
   because your terminal has its own TCC grant and succeeds where the agent
   fails.
3. **`StartInterval` fires inside a DARKWAKE.** A sleeping laptop wakes for
   ~45-second maintenance windows with the network coming and going. Anything
   that needs sustained network must tolerate being killed mid-run, or gate on
   a real wake.

---

## Registry

| Job | Where defined | Cadence | What it does | Alarm |
|---|---|---|---|---|
| Prod DB backup | `docker-compose.prod.yml` (`backup` service) | Daily | `pg_dump -Fc` into `~/<APP_NAME>/backups/`, 30-day retention | Offsite sync mirrors the dir — a stale newest-file there is the signal; check `ls -t` on both ends |
| Offsite backup sync | `scripts/backup-sync.plist` (launchd, human's machine) + `scripts/sync-backups.sh` | Daily | rsync VPS backups to `~/<APP_NAME>-backups/`, mirroring retention | `ls -t ~/<APP_NAME>-backups/ \| head -1` — newest dump older than ~2 days means the sync or the dump is dead |
| TLS cert renewal | `nginx/nginx.conf` (native ACME) | Automatic before expiry | Renews the Let's Encrypt cert | Browser cert-expiry warning is the last resort; `openssl s_client` check on the domain is the proactive one |

> ⚠️ **Template placeholder.** Verify these rows against your deployed setup
> during bootstrap (cadences and paths), improve the alarms where you can, and
> add a row for every job you create (pg-boss crons, cleanup tasks, digest
> emails, …). Delete this admonition once verified.
