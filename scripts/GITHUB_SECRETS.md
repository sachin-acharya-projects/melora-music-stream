# GitHub Secrets for the Melora deploy workflow

All values are set as **repository-level secrets**: GitHub → _Settings → Secrets and
variables → Actions → New repository secret_.

The deploy workflow (`.github/workflows/deploy.yml`) reads these secrets, builds the
server `.env` from them, and pipes it on stdin into the server's deploy script
(`scripts/melora-deploy`).

The recommended way to create/update them is the helper script:

```bash
./scripts/set_secret.sh           # keeps existing values
./scripts/set_secret.sh --force   # overwrites existing values
```

Value source priority inside `set_secret.sh`: an exported env var → a local
`.env.production` file → the root `.env` → auto-generated (for secrets only).

---

## Infrastructure (Tailscale + server)

| Secret            | Required | Default | Purpose                                                                                                                                 |
| ----------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `TS_CLIENT_ID`    | yes      | —       | Tailscale OAuth client ID used by the CI runner (tag `tag:ci`). Create an OAuth client in the Tailscale admin console.                  |
| `TS_AUDIENCE`     | yes      | —       | Tailscale OAuth audience, format `api.tailscale.com/<TS_CLIENT_ID>`.                                                                    |
| `SERVER_HOST`     | yes      | —       | Tailscale IP / hostname of the homeserver the stack runs on (e.g. `100.79.128.21`). Used by the CI runner for the Tailscale `ping` and SSH (`tailscale ssh`). |
| `SERVER_USERNAME` | yes      | —       | SSH user CI connects as on the server (e.g. `github-deploy`). This account may `sudo -n` only the deploy script.                        |

## Deploy script

| Secret               | Required | Default                         | Purpose                                                     |
| -------------------- | -------- | ------------------------------- | ----------------------------------------------------------- |
| `DEPLOY_SCRIPT_PATH` | no | `/usr/local/sbin/melora-deploy` | Root-only path to the deploy script, invoked via `sudo -n`. |
| `MELORA_PROJECT_DIR` | no | `/opt/melora` | Where the stack lives on the server. Injected into the server `.env`; `melora-deploy` reads it and creates the dir as root if missing. |

## App config

| Secret           | Required | Default                   | Purpose                                                                                                                                                                                                                                                                            |
| ---------------- | -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`           | no       | `8000`                    | Host port mapped to the container's nginx (host `PORT` → container `80`).                                                                                                                                                                                                          |
| `DEBUG`          | no       | `false`                   | Backend `DEBUG` flag.                                                                                                                                                                                                                                                              |
| `REGISTRY_IMAGE` | no       | `melora-fullstack:latest` | Image `repo:tag` for the private registry. Single source of truth: CI pushes `REGISTRY_HOST/REGISTRY_IMAGE` and the server pulls the same reference (`REGISTRY_NAMESPACE` is derived from this, so there is **no** `REGISTRY_NAMESPACE` secret). |
| `REGISTRY_HOST`  | no       | —                         | Registry hostname served by the homelab caddy over the tailnet (HTTPS — no insecure-registry needed), e.g. `registry.sachinacharya.name.np`. |
| `MELORA_DOMAIN`  | no       | —                         | Public domain the homelab caddy (caddy-docker-proxy) routes to this stack via the compose labels, e.g. `melora.sachinacharya.name.np`. |
| `REDIS_PORT`     | no       | `6379`                    | Redis host port binding.                                                                                                                                                                                                                                                           |
| `POSTGRES_USER`  | no       | `melora`                  | Postgres user.                                                                                                                                                                                                                                                                     |
| `POSTGRES_DB`    | no       | `melora`                  | Postgres database name.                                                                                                                                                                                                                                                            |

## App secrets (auto-generated unless overridden)

| Secret              | Required | Default                       | Purpose                                                                                            |
| ------------------- | -------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | yes      | auto (`openssl rand -hex 24`) | Postgres password. Never use the default locally.                                                  |
| `JWT_SECRET_KEY`    | yes      | auto (`openssl rand -hex 32`) | Signs JWT access/refresh tokens and the OAuth session cookie. Must stay stable across deployments. |

## Google OAuth

Required only if login is enabled; create the client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

| Secret                 | Required  | Default                                             | Purpose                                                                                                                                                                                                                           |
| ---------------------- | --------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | for login | —                                                   | Google OAuth client ID.                                                                                                                                                                                                           |
| `GOOGLE_CLIENT_SECRET` | for login | —                                                   | Google OAuth client secret.                                                                                                                                                                                                       |
| `GOOGLE_REDIRECT_URI`  | for login | `http://localhost:8000/api/v1/auth/google/callback` | Must be registered as an authorized redirect URI in the Google Console. For localhost (exempt from Google's HTTPS requirement) use `http://localhost:PORT/api/v1/auth/google/callback`; for any other host it must be `https://`. |

## App URLs / CORS

| Secret                 | Required | Default                 | Purpose                                                                            |
| ---------------------- | -------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `FRONTEND_URL`         | no       | `http://localhost:8000` | Where the backend redirects after a successful OAuth login (the app's public URL). |
| `BACKEND_CORS_ORIGINS` | no       | `["*"]`                 | Allowed CORS origins, JSON array string, e.g. `["https://melora.sachinacharya.name.np"]`.     |

---

## Quick reference

```bash
TS_CLIENT_ID
TS_AUDIENCE
SERVER_HOST
SERVER_USERNAME
DEPLOY_SCRIPT_PATH
MELORA_PROJECT_DIR
PORT
DEBUG
REGISTRY_IMAGE
REGISTRY_HOST
MELORA_DOMAIN
REDIS_PORT
POSTGRES_USER
POSTGRES_DB
POSTGRES_PASSWORD
JWT_SECRET_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
FRONTEND_URL
BACKEND_CORS_ORIGINS
```

## Notes

- Secrets are only written into the server's `.env` **during a deploy**; the deploy
  script removes it again afterwards (the running containers keep their env).
- `REGISTRY_NAMESPACE` is **not** a secret — the workflow derives
  `${REGISTRY_HOST}/${REGISTRY_IMAGE}` from the secrets above.
- Some values look like they could live in repo variables or `.env.production`;
  they are stored as GitHub Secrets so the workflow can inject them onto the server
  without committing anything. `scripts/set_secret.sh` keeps existing secrets unless
  `--force` is passed.
