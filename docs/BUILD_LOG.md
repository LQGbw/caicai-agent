# Build log

## 2026-10-25 — Learning content and API configuration correction

- Real self-use failed on `datawhalechina/deepagents-in-action`: slicing README HTML, badges and directory listings created incomprehensible tasks. Replace that path with actual `content/` or `docs/` Markdown discovery and explicit reading coverage.
- Provide an attributed, editorial eight-task introduction based on chapters 1–2, explicitly labeled as reviewed rather than model-generated. Existing browser progress is preserved, and old slices are identified as legacy.
- Add a protected AI planning endpoint that reads actual selected chapters, adapts to a stated goal, returns explanatory tasks and reference reasoning, validates fields and rejects citations to unread material. Never expose configured paid model execution publicly.
- Settings logs showed GET requests but no PATCH/save request; runtime had no key or settings file. Make unsaved edits visible and add a test of the saved text-model connection, without claiming that this tests images or transcription.
- Add explicit provider protocol selection (Responses, compatible Chat, Anthropic Messages) instead of assuming third-party Claude uses Responses. Model output still requests validated tools; it never writes storage itself.
- User reported `invalid url` when saving. Normalize whitespace, missing HTTPS schemes and accidentally pasted endpoint suffixes; return field-specific Chinese validation errors. Keep secrets out of logs and output. OCR expansion was explicitly deferred in favor of a low-cost text demo.

## 2026-10-25 — Five-minute learning activity requested by first user

- The user clarified the product is a general practice and learning assistant, with grocery, coffee, and fitness as initial scenarios, and explicitly requested a GitHub/material-to-learning-task demo for spare five-minute sessions.
- This is a new requested validation direction, not evidence of retention or a completed usage study. Add a bounded `/learn` experiment without rewriting the grocery workflow.
- The public demo splits provided source sections into short reading and recall tasks without a paid model. Label this limitation; it is not a full codebase analysis or personalized AI curriculum.
- Keep progress and notes in the current browser, separate from the server's private grocery state. Checkbox completion is self-reported activity, not verified mastery.
- Public GitHub import reads only public README content through a fixed GitHub API host. Private settings and model APIs remain protected at the proxy.

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
