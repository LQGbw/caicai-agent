# Build log

## 2026-09-23 — V0 vertical slice

- Started from an empty repository.
- Chose Next.js with a handwritten tool loop and local JSON repository.
- Added a public-price provider boundary instead of hard-coding an unverified city source.
- Added demo mode so product behavior can be inspected before API setup.

Open questions:

- Which city and which shopping channels should the first public-price provider cover?
- After real usage, is price comparison or duplicate-purchase prevention the stronger value?

## Yuxi source study

Reviewed the open-source Yuxi agent runtime for applicable patterns. Adopted:

- Tool failures become bounded, recoverable tool results; raw exception details stay out of model context.
- Tool execution traces are separate from the final user-facing answer.
- Runtime loops have an explicit step limit.

Deliberately not adopted in V0: LangGraph, RAG, MCP, subagents, sandboxing, multi-tenancy, and distributed run queues.

## 2026-09-28 — First-user profile evidence

- City confirmed as Hangzhou.
- Frequent channels: wet markets, Xiaoxiang Supermarket, and Sam's Club.
- Added shopping channels to the explicit profile because price evidence must be compared within compatible retail contexts.
- Monthly salary was deliberately not stored. Grocery budget is a more relevant, less sensitive decision input.
- Added frequent activity areas: Linping District, Xiasha, Jiubao, and Passenger Transport Center.
- Stored user-facing place labels separately from normalized districts so future price sources can match at the most specific trustworthy level.

## 2026-09-28 — First public price provider

- Connected the Ministry of Commerce public search to the latest Hangzhou Municipal Commerce Bureau weekly grocery-market report.
- Extract only explicitly labeled farmers' market retail prices; wholesale values are ignored.
- The source is a Hangzhou city-level weekly baseline. It does not claim district, Xiaoxiang Supermarket, Sam's Club, or real-time store precision.
- Added unit conversion, food aliases, a short cache, closed-failure behavior, and parsing tests.

## 2026-09-30 — Single-server Docker deployment

- The first user chose to move the self-use Agent from a Mac-only process to a dedicated container on a Tencent Cloud server.
- Added a minimal standalone Next.js image and a single-container Compose service.
- Kept the JSON repository for V0, but placed `/app/data` on a named volume so container replacement does not erase personal state.
- Bound the application to the server loopback interface. Public HTTPS and access protection remain the reverse proxy's responsibility.
- Kept secrets as runtime environment variables and outside the image.
- Tencent Cloud could not reach Docker Hub reliably during the first deployment. The base image is now configurable, with Compose defaulting to the official Node image mirrored by AWS Public ECR; the Dockerfile still supports the original Docker Hub image.
- Added one shared Caddy edge proxy for `caicai.vickykit.top`, automatic HTTPS, and hashed Basic Authentication. The proxy uses an external `web` Docker network so future self-use tools can reuse ports 80/443 without exposing their application ports.
- Before publishing the source repository, separated the user's live JSON state from the public seed state. Git and Docker build contexts now exclude `data/grocery-state.json`; a fresh environment initializes it from a non-personal example file, while the existing server volume remains unchanged.

## 2026-10-11 — Mobile conversation UI

- Real use exposed that the original landing-page layout was too long and configuration-heavy for a phone at the market.
- Replaced the home page with a compact conversation flow and a bottom composer for text, camera, and voice.
- Moved the personal profile to `/profile` and model connection settings to `/settings`.
- Removed the user-facing tool trace and the explanatory "what it just did" section. Tool execution remains bounded internally, but the shopping interface now shows only evidence and actionable advice.
- API credentials saved from the settings page are stored only in the server data volume with restrictive file permissions; the browser can read status and a last-four hint, never the plaintext key.
