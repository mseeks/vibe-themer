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
- **Your key, your storage.** The OpenAI key lives in VS Code's encrypted secret
  storage and is never logged.
- **Model choice.** Use any GPT model your key can access.

## Requirements

- VS Code 1.74.0 or higher
- An OpenAI API key ([get one](https://platform.openai.com/))
- Internet access

## Quick start

1. Install Vibe Themer from the Marketplace.
2. Open the Command Palette (`Cmd/Ctrl+Shift+P`) and run **Vibe Themer: Change
   Theme**.
3. Enter your OpenAI API key when prompted (stored securely, only once).
4. Describe a vibe, e.g. `warm sunset over mountains`.
5. To change back, run **Vibe Themer: Reset Theme Customizations**.

Already have a theme applied? Run Change Theme again and describe an adjustment.
Vibe Themer sends your current colors as context and streams only what changes.

## Commands

| Command | Description |
| --- | --- |
| **Vibe Themer: Change Theme** | Generate or iterate a theme from a description |
| **Vibe Themer: Reset Theme Customizations** | Remove all overrides, restore your original theme |
| **Vibe Themer: Select OpenAI Model** | Choose which GPT model to use |
| **Vibe Themer: Reset OpenAI Model Selection** | Revert to the default model |
| **Vibe Themer: Clear OpenAI API Key** | Remove the stored key |

## Privacy

Only your description — and, when iterating, your current theme's color values — is
sent to OpenAI. No code, files, or analytics are collected. Your key is stored in
VS Code's encrypted secret storage. AI-generated text is not filtered, so you are
responsible for the prompts you write.

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
