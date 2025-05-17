# Dynamic Theme Changer

A Visual Studio Code extension that dynamically changes your editor theme based on natural language descriptions using OpenAI.

## Features

This extension leverages the power of OpenAI's language models to generate custom VS Code themes based on your natural language descriptions. Simply enter a description like "warm sunset" or "ocean blue" and the AI will generate a cohesive color scheme and apply it to your workspace.

Key features include:

- **Natural language theme generation**: Describe the theme you want in plain English
- **Comprehensive theme application**: Updates multiple UI elements including activity bar, title bar, status bar, editor, and sidebar
- **Secure API key storage**: Your OpenAI API key is stored securely in VS Code's secret storage
- **Easy key management**: Commands to store and clear your API key

## Requirements

- A valid OpenAI API key (sign up at [platform.openai.com](https://platform.openai.com/))
- Visual Studio Code 1.68.0 or higher

## Getting Started

1. Install the extension from the VS Code marketplace
2. Run the command "Change Theme Dynamically" from the command palette (Ctrl+Shift+P)
3. When prompted, enter your OpenAI API key (this is stored securely and only needs to be done once)
4. Enter a description of the theme you want, like "cyberpunk neon" or "forest green"
5. Watch as your VS Code theme updates with the AI-generated color scheme

## Extension Commands

This extension contributes the following commands:

* `dynamicThemeChanger.changeTheme`: Prompts for a theme description and changes your theme
* `dynamicThemeChanger.clearApiKey`: Clears your stored OpenAI API key
* `dynamicThemeChanger.resetTheme`: Resets all theme customizations to restore default theme behavior

## How It Works

When you provide a theme description, the extension:

1. Sends your description to OpenAI's API
2. Requests a cohesive color palette with 5 colors (primary, secondary, accent, background, foreground)
3. Parses the AI response into a valid color scheme
4. Applies these colors to various VS Code UI elements through the `workbench.colorCustomizations` setting

## Privacy & Security

- Your OpenAI API key is stored securely in VS Code's built-in secret storage
- Theme descriptions you enter are sent to OpenAI for processing
- No other data is collected or transmitted

## Known Issues

- The extension requires an internet connection to communicate with the OpenAI API
- The color scheme quality depends on the clarity of your description and the AI model's interpretation
- When no workspace is open, the extension will apply theme changes to global user settings instead

## Release Notes

### 1.0.0

Initial release of Dynamic Theme Changer with OpenAI integration (May 2025)
- Change themes using natural language descriptions
- Secure OpenAI API key storage
- Multi-color palette generation for comprehensive theme changes

---

**Enjoy your personalized VS Code themes!**
