# Vibe Themer Architecture (v2)

Vibe Themer turns a natural-language "vibe" into a VS Code color theme, streaming
each setting from the configured model provider (OpenAI or Anthropic) and applying
it live. v2 is a ground-up rewrite
around a **functional core, imperative shell** (hexagonal / ports-and-adapters)
design with strict, domain-driven typing.

## The guiding idea

Make illegal states unrepresentable, then push every side effect to the edge.
The center of the program is pure and total; the messy parts (VS Code, the network,
the clock) live behind interfaces and are swapped for fakes in tests.

```
        ┌──────────────────────────────────────────────┐
        │ extension.ts  (composition root)              │
        │   builds adapters → Capabilities → commands   │
        └───────────────┬───────────────┬──────────────┘
                        │               │
                 adapters/         application/         ← orchestration (impure-ish)
          (vscode, providers)      use cases             returns Result, no throws
                        │               │
                        └──────┬────────┘
                               │ depends only on
                        ports/  (interfaces)            ← the seam
                               │
                     domain/ + protocol/ + fp/          ← pure, total, no I/O
```

Dependencies point inward. `domain`, `protocol`, and `fp` know nothing about VS
Code or the model SDKs. `application` depends on `ports` (interfaces), never on
adapters. `adapters` and `extension.ts` are the only files that import `vscode`,
`openai`, or `@anthropic-ai/sdk`.

## Layers

### `fp/` — the functional prelude

A small, dependency-free kernel: `Result`/`Option`/`AsyncResult` (errors and
absence as values, never thrown), `pipe`, `matchTag` (exhaustive tagged-union
matching), `Brand` (nominal types), `Redacted` (secrets that can't be printed),
and a tiny parser-combinator set. One import surface: `import { ... } from './fp'`.

### `domain/` — value objects and rules

Every domain value has a **smart constructor** and no other way in, so possession
of the value is proof it's valid: `Vibe`, `ColorValue` (Hex | Named | Remove),
`WorkbenchSelector`, `TokenScope`, `FontStyle`, `ApiKey` (wrapped in `Redacted`),
`Provider`, `Model` (`{provider, id}`), `StreamingDirective`, `ThemeSetting`,
`ConfigurationScope`,
`CurrentTheme`, `Coverage`. Errors are tagged unions with centralized rendering.

### `protocol/` — the streaming grammar

`streamingParser.ts` decodes one wire line (`COUNT:` / `SELECTOR:` / `TOKEN:` /
`MESSAGE:`) using the combinators for structure and the domain constructors for
field validation. A parsed directive is fully well-typed.

### `ports/` — the seam

Interfaces for every effect: `ModelGateway` (the provider-blind façade),
`ConfigStore`, `SecretStore`, `Preferences`, `PromptLibrary`, `Ui`, `Clock`,
`Logger`, bundled into one `Capabilities` record. Plus the port-error unions and
their `UserMessage` rendering.

### `application/` — use cases

Pure-ish orchestration returning `Result`: `generateTheme` (the streaming loop),
`provisionApiKey` (the key state machine), and the maintenance commands
(`resetTheme`, `clearApiKey`, `selectModel`, `resetModel`). Decisions are
delegated to pure functions (`parseLine`, `progressPercent`, `coverage`); effects
go through ports.

### `adapters/` — the shell

`adapters/vscode/*` implement the ports against the VS Code API.
`adapters/openai/` and `adapters/anthropic/` each implement a `ProviderAdapter`
against their SDK, classifying errors by HTTP status; `adapters/gateway.ts` is the
provider-blind `ModelGateway` that dispatches each call to the right one. Thin and
obviously correct.

### `commands.ts` + `extension.ts`

`commands.ts` is the single source of truth for command IDs and their handlers
(a test asserts these match `package.json`). `extension.ts` is the composition
root: build adapters, assemble `Capabilities`, register commands — fully
synchronous activation.

## Why this shape

- **Testability.** The entire core runs against in-memory fakes (`test/support/
  harness.ts`), so the full Change Theme flow — streaming, live application,
  cancellation, error tolerance — is exercised with no VS Code and no network.
- **Safety by type.** Branded values, `Redacted` secrets, and exhaustive matches
  turn whole classes of v1 bugs (a leaked key, an invalid color, an unhandled
  variant) into compile errors.
- **One direction of dependency.** Swapping an adapter (or a model provider) never
  touches the core.

## Adding a provider

`Provider` is a closed union, so the compiler walks you through every site. The
full checklist (none of it in the pure use cases):

1. `src/domain/provider.ts` — add the variant to `Provider` and `allProviders`,
   and a `providerInfo` case (display name + key prefix + hint).
2. `src/domain/apiKey.ts` — extend `hasValidPrefix` if the new prefix overlaps an
   existing one (the way `sk-` is a prefix of `sk-ant-`).
3. `src/domain/model.ts` — add a `CATALOG` entry so it's offered in the picker.
4. `src/adapters/<provider>/gateway.ts` — implement `ProviderAdapter`
   (`verify` + `streamTheme`); reuse `adapters/classify.ts` for status mapping.
5. `src/adapters/vscode/secrets.ts` — add the storage key in `STORAGE_KEY`.
6. `src/extension.ts` — construct the adapter and pass it to `createModelGateway`.

Steps 1 and 6 won't type-check until the others are done, which is the point: the
union and the `Record<Provider, ProviderAdapter>` make a half-wired provider a
compile error.

## Configuration & secrets

- API keys: one per provider in VS Code `SecretStorage`, wrapped in `Redacted`
  from validation onward.
- Selected model: a `Model` (`{provider, id}`) in `globalState` via the
  `Preferences` port (default `gpt-5.5` on OpenAI), chosen from a curated catalog.
- Theme state: read per-scope via `config.inspect()` so global vs workspace are
  actually distinguished.

Two design decisions behind this are written up in
[ADR-003](adrs/003-override-model-and-error-budgets.md): why a generated theme is
settings *overrides* rather than an installable theme file, and why the streaming
loop carries two separate error budgets (malformed output vs settings writes).

## Testing & build

- `npm run check-types` — `tsc --noEmit` at maximum strictness over `src` + `test`.
- `npm test` — esbuild bundles `test/run.ts` and runs it on Node's built-in
  `node:test` (no test-runner dependency, single process).
- `npm run compile` — check-types + ESLint + the esbuild extension bundle.
