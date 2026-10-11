# Architecture

```text
Browser (text / photo / recorded audio)
             |
             v
       Next.js API routes
             |
             v
       Grocery agent loop
       |      |       |
       v      v       v
   profile  prices  inventory   <- validated tools
       \      |       /
        local repository
             |
      data/grocery-state.json

Public price source interface ---> Hangzhou MOFCOM weekly-report provider
```

With `OPENAI_API_KEY`, the Responses API chooses function tools. The application executes each call and returns the result until the model emits a structured decision. Without a key, a deterministic demo agent uses the same repository and response type.

## Price evidence order

1. Same user's observations at the same store
2. Same user's observations in the same city
3. Compatible public retail source for the city
4. Public wholesale source, clearly labeled as context only
5. No verdict when none of the above is sufficient

Wholesale, farm-gate, wet-market, and supermarket prices must never be silently merged.

The first provider searches the Ministry of Commerce public site for the latest Hangzhou weekly market report and extracts only paragraphs explicitly labeled as retail monitoring of farmers' markets. It ignores wholesale paragraphs, converts yuan/kg to yuan/jin when requested, caches the report for 30 minutes, and fails closed when the page cannot be parsed. Its evidence is city-level context, not district-, store-, Xiaoxiang-, or Sam's Club-level pricing.

The first target market is Hangzhou. Keep evidence separated for wet markets, Xiaoxiang Supermarket, and Sam's Club; do not form one blended “Hangzhou price”.

## Geographic matching

Keep the user's familiar place name and its normalized administrative district as separate fields. The first user's activity areas are:

- Linping District -> Linping District
- Xiasha -> Qiantang District
- Jiubao -> Shangcheng District
- Passenger Transport Center -> Shangcheng District

Price evidence should fall back in this order: exact store, activity area, administrative district plus shopping channel, city plus shopping channel. Never imply neighborhood-level precision when only city-level data is available.
