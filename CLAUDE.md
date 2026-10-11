# Persistent project context

## Product objective

Build a self-use grocery decision agent for a cooking beginner. The first learning goal is a real loop: multimodal input -> tool calls -> state -> decision -> memory.

## Architecture rules

1. UI, agent orchestration, tools, storage, and external price providers stay separate.
2. The model may request tools but only application code validates and executes them.
3. Observing a price is not the same as buying. Inventory changes only after explicit purchase confirmation.
4. Every price verdict includes source, sample size, and confidence. Insufficient evidence is a valid result.
5. Local development must work without OpenAI or Supabase credentials.

## Dependencies deliberately avoided

- No agent framework until the handwritten loop becomes painful.
- No vector database, MCP, multi-agent runtime, or background jobs in V0.
- No UI component library; the interface is intentionally small.

## Accepted tradeoffs

- Local JSON storage is single-user and not safe for serverless deployment. It is behind a repository boundary for later replacement by Supabase.
- Public price providers start as an interface with an unavailable result. City-specific sources are added only after the user's city and source terms are confirmed.
- Demo mode parses a small set of foods and prices; real image understanding requires an API key.
