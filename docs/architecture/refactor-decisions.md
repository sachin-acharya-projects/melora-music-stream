# Melora Refactor — Architecture Decisions

Status: accepted working baseline for the `refactor` branch  
Production branch: `main` (read-only; never target it with refactor commits)

## Product boundaries

Melora remains a personal music streaming and library-management service. The web application is in scope; the existing mobile application is not part of this refactor. YouTube Music remains the current playback/catalog source. The domain model must not assume that it will be the only future source: uploads and additional providers may be introduced later.

## Identity and authentication

- Melora owns its user accounts and authorization policy.
- Native Melora authentication remains available.
- External identity providers are configurable OIDC providers, not hard-coded products. The first implementation configures providers globally through an administrator-managed interface.
- A user may link multiple external identities to one Melora account after authenticating to the existing Melora account.
- An OIDC subject is identified by the pair (issuer, subject). Email equality alone must never silently merge or link accounts.
- Provider discovery, authorization-code flow, state/nonce validation, issuer/audience/signature validation, and callback URL validation are mandatory.
- Existing Google sign-in is migrated as one OIDC provider without breaking existing Google-linked accounts.

## OIDC implementation notes

The first provider-neutral OIDC slice is implemented on `refactor`:

- Administrator endpoints: `/api/v1/admin/oidc-providers` (GET/POST) and `/api/v1/admin/oidc-providers/{id}` (PATCH/DELETE).
- Public enabled-provider discovery: `GET /api/v1/auth/providers`.
- Browser sign-in: `GET /api/v1/auth/providers/{id}/login`.
- Authenticated account linking: `POST /api/v1/auth/providers/{id}/link`; the response contains an authorization URL for the browser to navigate to.
- Callback: the provider administration response includes the exact `redirect_uri` to register at the identity provider.
- Linked identity management: `GET /api/v1/auth/identities` and `DELETE /api/v1/auth/identities/{identity_id}`.
- One-time token exchange: `POST /api/v1/auth/oidc/exchange`.

Provider setup sequence:

1. Set a dedicated `OIDC_SECRET_ENCRYPTION_KEY` environment variable. Generate it with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. Keep the key stable and back it up securely; changing it makes existing provider secrets undecryptable.
2. Create a disabled provider using the admin endpoint. A temporary client ID is acceptable for this initial creation.
3. Copy the returned `redirect_uri` into the identity provider's allowed redirect/callback URI list.
4. PATCH the provider with its real client ID and client secret, then enable it.
5. Confirm that the public provider list shows it before testing sign-in.

The client secret is encrypted at rest with Fernet and is never returned by provider APIs. The OIDC flow uses Authlib's authorization-code integration with S256 PKCE, session-bound state and nonce, and ID-token validation. JWTs are not placed in the callback URL: the callback places a 60-second, single-use handoff code in the URL fragment; only its SHA-256 digest is stored, and the frontend exchanges it for Melora tokens. Auto-provisioning requires a verified email; a matching email never links an existing account automatically. Provider disable/delete operations are blocked when they would remove a user's only usable sign-in method. The current web UI exposes enabled providers on login and linked-identity controls in the profile page.

This is an implementation slice, not a production-readiness claim: run the test suite and security review, exercise the flow against a real test OIDC provider, and validate deployment callback URLs before enabling a provider in production. Existing Google sign-in remains on its legacy route until its provider record and existing identities are migrated safely.

## Authorization and developer platform

The first delegated authorization foundation is now implemented on `refactor`:

- Canonical scopes live in `backend/app/core/scopes.py`; the public catalog is available at `GET /api/v1/developer/scopes`.
- Unknown scopes fail closed. Each scope includes a description, category, sensitivity flag, and admin-only flag.
- A user's maximum grant is derived from their current Melora role. Regular users cannot grant server-administration scopes.
- Delegated access JWTs are marked `credential_type=delegated`, carry a sorted explicit `scopes` claim, and expire after `DELEGATED_ACCESS_TOKEN_EXPIRE_MINUTES` (15 minutes by default).
- `require_scopes(...)` rejects ordinary browser-session JWTs, validates delegated claims against the user's current role, and checks endpoint-required scopes. Resource handlers must additionally enforce target ownership and their explicit admin policy.
- Personal access tokens are now implemented on this foundation:

- `POST /api/v1/developer/tokens` creates a named PAT with explicit scopes and a 1–365 day expiry (30 days by default). The raw `mlpat_` token is returned only in the creation response.
- `GET /api/v1/developer/tokens` lists metadata only; raw values and hashes are never returned.
- `DELETE /api/v1/developer/tokens/{id}` revokes a token owned by the current user.
- Only a SHA-256 digest is stored. Authentication checks revocation, expiry, owner account status, and the user's current scope ceiling; successful use updates `last_used_at`.
- PATs are accepted by the same `require_scopes(...)` endpoint dependency as scoped delegated JWTs. Browser-session JWTs remain ineligible for delegated-only routes.

This is the shared foundation for OAuth app grants and M2M clients. Those credential types are not yet issued, and existing music endpoints have not yet all been migrated to delegated scope enforcement.

A single authorization policy must be shared by browser sessions, personal access tokens, OAuth applications, and machine clients.

A single authorization policy must be shared by browser sessions, personal access tokens, OAuth applications, and machine clients.

- Personal access tokens are stored as hashes, shown only once, scoped, expiring, and revocable.
- OAuth applications are registered with redirect URI validation and explicit scope declarations. Users may approve a subset of requested scopes.
- An application's maximum requested/approved scopes cannot exceed the registering user's effective permissions. The same limit is checked again at authorization time.
- Machine-to-machine clients use client credentials and their own explicit service identity and grants. They do not silently inherit a human user's permissions.
- Every API operation checks identity, token/client grant, requested scope, target-user boundary, resource ownership, and role policy.
- Admin and automation capabilities are separate high-risk scopes and are never implied by ordinary library scopes.
- Access tokens are short-lived. Refresh tokens rotate and support revocation/reuse detection.
- Webhooks are signed, retryable, and support per-event subscriptions and secret rotation.

Initial scope families (final names are versioned with the API):
- identity/profile: read and update
- library, songs, albums, artists, playlists, follows, and history: read/write/delete as appropriate
- player: control
- media: upload/import
- settings: read/update
- admin: narrowly separated administrative operations
- automation: trigger approved user-owned workflows

## Architecture constraints

- Keep the existing FastAPI, SQLAlchemy, Alembic, PostgreSQL, Redis, React, TypeScript, and TanStack Query stack unless an audit demonstrates a concrete reason to change it.
- Add migrations; do not mutate production data or rely on create-all in production.
- Preserve existing API behavior during migration where possible. Introduce versioned endpoints for new developer-facing APIs.
- Centralize authorization rather than scattering scope checks across endpoints.
- Keep provider-specific music identifiers behind a provider-neutral metadata and source-reference model.
- Do not store raw OAuth client secrets, PATs, refresh tokens, or webhook secrets in plaintext.
- Never log credentials or authorization codes.

## UI direction

Preserve Melora's identity and recognizable workflows, but redesign the web information architecture where it improves clarity. Prioritize listening, search/discovery, library management, and a persistent player. Developer settings, connected identity providers, sessions/tokens, OAuth apps, M2M clients, and webhooks belong in a coherent account/security/developer area. Avoid generic dashboard styling, excessive borders, and decorative card grids.

## Delivery sequence

1. Inventory routes, models, migrations, services, tests, deployment assumptions, and existing frontend flows.
2. Add identity-provider and linked-identity foundations with safe migration of existing Google identities.
3. Implement generic OIDC configuration and account linking; retain native account authentication.
4. Introduce centralized authorization primitives and scope catalog.
5. Add PAT lifecycle, OAuth application registration/consent/token exchange, and M2M client credentials.
6. Add user-scoped API access, audit events, webhooks, rate limits, and developer documentation.
7. Redesign the web application and add identity/developer management screens.
8. Improve provider-neutral music metadata and selected listening/library workflows.
9. Run backend/frontend tests, migrations, security checks, and deployment compatibility checks.

## Safety and release

All work is committed only to `refactor`. No merge to `main`, deployment, production migration, or production configuration change is authorized by this plan. A pull request and explicit user review are required before any merge.
