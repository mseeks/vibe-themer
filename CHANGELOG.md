# Change Log

All notable changes to the "Vibe Themer" extension will be documented in this file.

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