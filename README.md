# VibeThemer

A Visual Studio Code extension that uses AI to generate and apply beautiful, cohesive color themes from natural language descriptions. Powered by OpenAI.

---

## Features

- **AI-powered theme generation**: Describe your vibe (e.g., "cozy night", "retro neon", "forest morning") and instantly get a matching color palette for your editor.
- **Comprehensive theme application**: Updates all major UI elements—activity bar, title bar, status bar, editor, sidebar, input fields, terminals, lists/trees, buttons, and more.
- **Syntax highlighting**: AI also generates matching syntax token colors for code.
- **Secure API key storage**: Your OpenAI API key is stored securely in VS Code's secret storage.
- **Easy key management**: Commands to store, clear, and manage your API key.
- **Model selection**: Choose which OpenAI model to use for theme generation.
- **Reset**: Instantly reset all theme customizations and return to your default theme.

## Requirements

- A valid OpenAI API key ([get one here](https://platform.openai.com/))
- Visual Studio Code 1.68.0 or higher
- Internet connection (for OpenAI API access)

## Getting Started

1. **Install** VibeThemer from the VS Code Marketplace (or sideload this extension).
2. Run the command **"Change Theme Dynamically"** from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
3. When prompted, enter your OpenAI API key (stored securely, only needed once).
4. Enter a description of your desired theme, like `cyberpunk neon`, `autumn dusk`, or `minimal light`.
5. Watch as your VS Code theme updates with a unique, AI-generated color scheme and syntax highlighting.

## Extension Commands

| Command                           | Description                                              |
| --------------------------------- | -------------------------------------------------------- |
| `dynamicThemeChanger.changeTheme` | Prompts for a theme description and changes your theme   |
| `dynamicThemeChanger.clearApiKey` | Clears your stored OpenAI API key                        |
| `dynamicThemeChanger.resetTheme`  | Resets all theme customizations to restore default theme |
| `dynamicThemeChanger.selectModel` | Select which OpenAI model to use                         |
| `dynamicThemeChanger.resetModel`  | Reset the selected OpenAI model                          |

## How It Works

1. You describe your desired theme in plain English.
2. The extension sends your description to OpenAI, requesting a palette with 5 colors: primary, secondary, accent, background, foreground.
3. The AI response is parsed and normalized for VS Code.
4. The extension applies these colors to all major UI elements and generates syntax highlighting token colors.

## Privacy & Security

- Your OpenAI API key is stored securely in VS Code's built-in secret storage.
- Theme descriptions are sent to OpenAI for processing. No other data is collected or transmitted.
- You can clear your API key at any time using the provided command.

## Known Issues

- Requires an internet connection for OpenAI API access.
- The quality of generated themes depends on the clarity of your description and the AI model's interpretation.
- When no workspace is open, theme changes apply to global user settings.

## Release Notes

### 1.0.0
- Initial release as VibeThemer (formerly Dynamic Theme Changer)
- AI-powered theme and syntax color generation
- Secure API key storage and management
- Theme reset functionality
- OpenAI model selection support

---

**Enjoy your personalized VS Code vibes!**
