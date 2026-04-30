# Impersonate

Create an impersonation session to log in as any user in production. Requires SSH access to the production VPS.

> ⚠️ **Template note.** Replace `<SSH_KEY_PATH>`, `<DEPLOY_USER>`, `<HOST_IP>`, `<APP_DIR>`, `<DB_USER>`, and `<DB_NAME>` with your project's values.

## Usage

`/impersonate` — interactive mode, asks for user email
`/impersonate <user-email>` — create session for the given user

## Steps

1. **Find the user.** If an email is provided as `$ARGUMENTS`, use it. Otherwise, ask.
   Query the production database to find the user ID:
   ```bash
   ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "docker compose -f <APP_DIR>/docker-compose.prod.yml exec -T postgres psql -U <DB_USER> -d <DB_NAME> -t -A -c \"SELECT id, name, email FROM \\\"user\\\" WHERE email = '<email>'\""
   ```
   If no user is found, show an error and stop.

2. **Generate a password.** Create a random 12-character alphanumeric password locally:
   ```bash
   openssl rand -base64 9
   ```

3. **Create the session.** SSH into the VPS and run the impersonate script inside the app container:
   ```bash
   ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "cd <APP_DIR> && docker compose -f docker-compose.prod.yml exec -T app npx tsx scripts/impersonate.ts --user-id <user-id> --password <password> --ttl 3600"
   ```

4. **Present the result.** Show the user:
   - The impersonation URL
   - The password (they need to enter it at the URL)
   - The TTL (1 hour by default)
   - Reminder: closing the browser tab ends the session automatically

## Notes

- Sessions expire after the TTL (default 1 hour) or when the browser tab is closed
- Each session has a tight audit window (`created_at → expires_at`) for traceability
- To end a session early, run:
  ```bash
  ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "docker compose -f <APP_DIR>/docker-compose.prod.yml exec -T postgres psql -U <DB_USER> -d <DB_NAME> -c \"UPDATE impersonation_sessions SET expires_at = now() WHERE token = '<token>'\""
  ```
