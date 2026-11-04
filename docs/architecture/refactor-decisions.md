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

## Authorization and developer platform

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
