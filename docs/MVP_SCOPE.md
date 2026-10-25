# V0 scope

## 2026-10-25 learning experiment

The owner explicitly expanded the validation direction to a general activity and learning assistant. A separate `/learn` demo supports public GitHub chapters or pasted material, short source-based tasks, checkboxes, notes and browser-local resume. After observed failure of README slicing, protected model generation and reviewed starter lessons are admitted. Full repository analysis, automatic mastery judgments and cloud progress sync remain outside this experiment.

## Core job

During a real grocery trip, answer: “What is this, is this price reasonable, and should I buy it?” Then remember the observation.

## Included

- Text plus optional food/price-tag photo
- Push-to-record voice transcription
- Structured food and price understanding
- Tool calls for profile, personal price history, inventory, public reference lookup, and saving observations
- A short buy / skip / uncertain recommendation with confidence and evidence
- Editable single-user profile
- Local persistence and a Supabase-ready schema

## Excluded

- Ordering, payment, retailer integrations
- Weekly menu planning and a recipe catalog
- Notifications and automatic expiry jobs
- Health recommendations
- Multiple users, authentication, and sharing
- Vector search, MCP, multi-agent orchestration

## Feature admission rule

A new feature enters V0 only when a real self-use session fails without it, and the failure is recorded in `docs/BUILD_LOG.md`.

## Dogfood checkpoint

- 10 real shopping sessions
- 30 price observations
- At least 3 decisions changed because of the agent
- At least one prevented duplicate purchase or waste event
