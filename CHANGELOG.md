# Change Log

All notable changes to the "Vibe Themer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.0.2] - 2024-12-15

### Fixed
- **Critical Fix**: Include missing `streamingThemePrompt.txt` file in published extension package
- Resolved "ENOENT: no such file or directory" error when using theme generation
- Updated `.vscodeignore` to properly include required prompt files

## [1.0.1] - 2024-12-10

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

## [1.0.0] - 2024-12-01

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