# Change Log

All notable changes to the "Vibe Themer" extension will be documented in this file.

## [1.0.9] - 2025-06-01

### Enhanced
- **Model Selection Filter**: Added filter to model selection list to only display GPT models
- Model selector now filters out non-GPT models for a cleaner, more focused selection experience
- Improved user experience by showing only relevant AI models that begin with "gpt"

## [1.0.8] - 2025-06-01

### Fixed
- **MAJOR FIX**: Added esbuild bundling to include runtime dependencies (openai, zod) in the extension package
- This resolves the root cause of "command not found" errors where dependencies weren't available in the marketplace version
- Extension now properly bundles all required dependencies instead of relying on external node_modules

## [1.0.7] - 2025-06-01

### Fixed
- **Critical Fix**: Made activation function synchronous to ensure commands are registered immediately
- Lowered VS Code engine requirement from ^1.100.0 to ^1.74.0 for broader compatibility
- Moved async OpenAI initialization to happen after command registration to prevent timing issues
- Added proper error handling for OpenAI initialization failures

## [1.0.6] - 2025-06-01

### Fixed
- Further refined `.vscodeignore` to a minimal set to ensure correct packaging for marketplace release. This is an attempt to resolve persistent "command not found" errors.

## [1.0.5] - 2025-06-01

### Fixed
- Resolved issue where compiled output was not included in the VSIX package, causing "command not found" errors in marketplace installs.
- Updated `.vscodeignore` to correctly include the `out/` directory and remove overly broad `.ts` exclusion.

## [1.0.4] - 2025-06-01

### Changed
- Bumped version to 1.0.4.
- Added explicit `activationEvents` for all commands to ensure extension activation on command invocation.

## [1.0.3] - 2025-06-01

### Fixed
- **Critical Fix**: Resolved "command 'vibeThemer.changeTheme' not found" error in marketplace version
- Added explicit `activationEvents` with `onStartupFinished` for reliable command registration
- Added missing `deactivate` function export for proper extension lifecycle management
- Improved extension activation reliability across different VS Code environments

## [1.0.2] - 2025-06-01

### Fixed
- **Critical Fix**: Include missing `streamingThemePrompt.txt` file in published extension package
- Resolved "ENOENT: no such file or directory" error when using theme generation
- Updated `.vscodeignore` to properly include required prompt files

## [1.0.1] - 2025-06-01

### Improved
- Optimized extension package size (reduced from 4MB+ to 159KB)
- Faster marketplace downloads and installation
- Updated dependencies for better security and compatibility
- Enhanced code style consistency with ESLint fixes
- Added GitHub Sponsors integration for project support

### Fixed
- Corrected OpenAI model reference for better compatibility
- Removed unused code and files for cleaner distribution
- Updated VS Code engine compatibility requirements

## [1.0.0] - 2025-06-01

### Added
- Initial release of Vibe Themer
- Command to change theme based on natural language descriptions using OpenAI
- OpenAI API integration for generating color palettes from text descriptions
- Multi-color theme generation (primary, secondary, accent, background, foreground)
- Secure storage of OpenAI API key
- Command to clear stored API key
- Command to reset theme customizations and restore default theme behavior
- Automatic contrast detection for text on colored backgrounds
- Fallback to user settings when no workspace is open