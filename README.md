<div align="center">
  <img src="logo-with-text.png" alt="Vibe Themer Logo" width="500" style="margin-top: 15px; margin-bottom: 15px;" />
</div>

<div align="center">

[![GitHub Sponsors](https://img.shields.io/github/sponsors/mseeks?style=for-the-badge&logo=github&logoColor=white&label=Sponsor&labelColor=ea4aaa&color=ff69b4)](https://github.com/sponsors/mseeks)

</div>

---

AI-generated VS Code color themes. Describe a vibe in plain language and Vibe Themer
streams a complete theme — UI and syntax — applying each color live as the model
generates it.

<div align="center">
  <img src="media/demo.gif" alt="Vibe Themer streaming a theme from a described vibe" width="820" />
</div>

> **Reset, don't switch.** Generated themes are written as VS Code color overrides,
> so they persist until you remove them. Run **"Vibe Themer: Reset Theme
> Customizations"** to restore your original theme. Changing the theme in Settings
> will not clear them.

## Features

- **Describe a vibe** — "cozy autumn evening", "cyberpunk neon", "calm ocean
  depths" — and get a full, cohesive palette.
- **Iterate in place.** "Make it warmer", "darker background", "remove the purple
  accents" — refine instead of starting over.
- **Live streaming.** Watch the theme apply as each setting arrives.
- **Comprehensive.** Editor, activity bar, sidebar, status bar, tabs, panels,
  terminal, and syntax tokens.
- **OpenAI or Anthropic.** Pick from a short curated list — GPT-5.5 (default),
  GPT-5.4 mini, Claude Sonnet 4.6, or Claude Haiku 4.5 — or enter a custom model id.
- **Your keys, your storage.** Each provider's key lives in VS Code's encrypted
  secret storage and is never logged.

## Requirements

- VS Code 1.74.0 or higher
- An API key for your chosen provider — OpenAI ([get one](https://platform.openai.com/))
  or Anthropic ([get one](https://console.anthropic.com/))
- Internet access

## Quick start

1. Install Vibe Themer from the Marketplace.
2. Open the Command Palette (`Cmd/Ctrl+Shift+P`) and run **Vibe Themer: Change
   Theme**.
3. Enter your provider API key when prompted (stored securely, only once).
4. Describe a vibe, e.g. `warm sunset over mountains`.
5. To change back, run **Vibe Themer: Reset Theme Customizations**.

Already have a theme applied? Run Change Theme again and describe an adjustment.
Vibe Themer sends your current colors as context and streams only what changes.

## Commands

| Command | Description |
| --- | --- |
| **Vibe Themer: Change Theme** | Generate or iterate a theme from a description |
| **Vibe Themer: Reset Theme Customizations** | Remove all overrides, restore your original theme |
| **Vibe Themer: Select Model** | Pick a model from the curated list or enter a custom id |
| **Vibe Themer: Reset Model Selection** | Revert to the default model (GPT-5.5) |
| **Vibe Themer: Clear API Keys** | Remove the stored keys for all providers |

## Privacy

Only your description — and, when iterating, your current Vibe Themer overrides
under `workbench.colorCustomizations` and `editor.tokenColorCustomizations` (color
values and token-rule styling) — is sent to your chosen provider (OpenAI or
Anthropic). Nothing else from your settings, and no code, files, or analytics, is
collected. Your keys are stored in VS Code's encrypted secret storage. AI-generated
text is not filtered, so you are responsible for the prompts you write.

## Background

Vibe Themer started as an experiment in how far agent-driven development could go;
it was written entirely by an AI agent. That's ordinary now, so this README is
about the extension itself, not how it was built. For the design — a strictly-typed
functional core behind a thin VS Code shell — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Development

- `npm run compile` — type-check, lint, and bundle
- `npm test` — unit and integration suite (Node's built-in test runner)

---

Licensed under the terms in [LICENSE.txt](LICENSE.txt).
