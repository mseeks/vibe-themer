# Vibe Themer — contributor & agent guide

Vibe Themer is a VS Code extension that turns a plain-language "vibe" into a
complete color theme (UI + syntax), streaming each setting from an LLM and
applying it live as it arrives. It supports OpenAI and Anthropic models.

This file is the working guide for anyone — human or agent — changing this repo.
The deep design rationale lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md);
read it before any non-trivial change.

## Architecture in one breath

Functional core, imperative shell (hexagonal). The center is pure and total; every
side effect (VS Code, the network, the clock) sits behind an interface and is
swapped for an in-memory fake in tests. Dependencies point inward:

```
fp → domain → protocol → ports → application → adapters → extension.ts
                          (the seam: interfaces)   (the shell)
```

- **`src/fp/`** — the functional prelude. `Result` / `Option` / `AsyncResult`
  (errors and absence as values, never thrown), `pipe`, `matchTag` (exhaustive
  tagged-union matching), `Brand` (nominal types), `Redacted` (secrets that can't
  be printed), and a small parser-combinator set. One import surface: `from '../fp'`.
- **`src/domain/`** — value objects and rules. Every value has a **smart
  constructor and no other way in**, so holding the value proves it's valid:
  `Vibe`, `ColorValue`, `WorkbenchSelector`, `TokenScope`, `FontStyle`, `ApiKey`
  (wrapped in `Redacted`), `Provider`, `Model`, `StreamingDirective`,
  `ThemeSetting`, `CurrentTheme`, `Coverage`. Errors are tagged unions.
- **`src/protocol/`** — `streamingParser.ts` decodes one wire line
  (`COUNT:` / `SELECTOR:` / `TOKEN:` / `MESSAGE:`) into a fully-typed directive,
  using the fp combinators for structure and the domain constructors for fields.
- **`src/ports/`** — the seam. One interface per effect (`ModelGateway`,
  `ConfigStore`, `SecretStore`, `Preferences`, `PromptLibrary`, `Ui`, `Clock`,
  `Logger`), bundled into a single `Capabilities` record, plus the port-error
  unions and their `UserMessage` rendering.
- **`src/application/`** — use cases returning `Result`: `generateTheme` (the
  streaming loop), `provisionApiKey` (the key state machine), and the maintenance
  commands. Decisions are delegated to pure functions; effects go through ports.
- **`src/adapters/`** — the shell. `adapters/vscode/*` implement ports against the
  VS Code API; `adapters/openai/` and `adapters/anthropic/` implement
  `ProviderAdapter` against their SDKs; `adapters/gateway.ts` is the dispatcher.
- **`src/commands.ts` + `src/extension.ts`** — `commands.ts` is the single source
  of truth for command IDs and handlers; `extension.ts` is the composition root
  (build adapters, assemble `Capabilities`, register commands — synchronous).

**The hard rule:** `vscode`, `openai`, and `@anthropic-ai/sdk` are imported *only*
in `src/adapters/**` and `src/extension.ts`. The core never sees them.

## Models & providers

- `Provider = 'openai' | 'anthropic'`; a `Model` is `{ provider, id }`.
- `ModelGateway` (a provider-blind façade) dispatches each call to a per-provider
  `ProviderAdapter`. The application layer never branches on provider.
- Model choice comes from a small curated `CATALOG` in `src/domain/model.ts`
  (latest flagship + mini per provider) plus a custom-id escape hatch; default is
  `gpt-5.5`. Bump those strings as new models ship — the catalog is the one place.
- Each provider's API key is validated by prefix (`sk-` vs `sk-ant-`) and stored
  separately in VS Code `SecretStorage`. Keys are `Redacted` from validation
  onward and unwrapped (`expose`) only at the SDK boundary.

### Adding a provider

It's a closed set, so the compiler will walk you through it. Touch points:
`Provider` union + `allProviders` + `providerInfo` (`domain/provider.ts`), the
prefix rule in `hasValidPrefix` (`domain/apiKey.ts`), a `CATALOG` entry
(`domain/model.ts`), a new `adapters/<provider>/gateway.ts` returning a
`ProviderAdapter`, the `SecretStore` storage key (`adapters/vscode/secrets.ts`),
and the wiring in `extension.ts`.

## Conventions

- **Illegal states unrepresentable.** Reach for a branded type + smart constructor
  before a validation function you have to remember to call. Parse, don't validate.
- **No throws in the core.** Return `Result`/`Option`. `matchTag` every tagged
  union exhaustively (the compiler enforces it). Don't reach around the types.
- **Secrets.** Never log, print, or interpolate a raw key. It lives in `Redacted`;
  `expose` has a tiny, audited set of call sites at the SDK edge — keep it that way.
- **Commands.** Add via `COMMAND_IDS` in `commands.ts`; a test asserts they match
  `package.json`. Never re-type a command-id string literal elsewhere.
- **Style.** Match the surrounding code. Comments justify *why*, not *what*. Stale
  comments and docs are bugs — fix them in the same change that invalidates them.

## Build, test, verify

| Command | What it does |
|---|---|
| `npm run check-types` | `tsc --noEmit` at maximum strictness over `src` + `test` |
| `npm run lint` | ESLint over `src` + `test` |
| `npm run compile` | check-types + lint + the esbuild extension bundle |
| `npm test` | esbuild-bundles `test/run.ts`, runs it on Node's `node:test` |

Nothing is done until **`npm run compile` and `npm test` both pass.** Add the
*discriminating* test that only the new behavior could break, not coverage padding.
The whole core is exercised against in-memory fakes (`test/support/harness.ts`) —
no VS Code, no network — so most logic is testable without booting the editor.

To run it in the editor: open this folder in VS Code and press `F5` (Extension
Development Host), then run **Vibe Themer: Change Theme** from the Command Palette.
