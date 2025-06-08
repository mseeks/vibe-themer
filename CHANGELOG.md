# Change Log

All notable changes to the "Vibe Themer" extension will be documented in this file.

## [1.0.15] - 2025-06-07

### Added
- **🚧 Theme Iteration Feature Complete**: Users can now modify existing themes incrementally using natural language
- **AI Intent Detection**: AI automatically detects whether user input is for a new theme or iteration
- **REMOVE Value Support**: AI can now remove unwanted customizations with "REMOVE" values
- **Delta Application**: Incremental theme changes apply only modified settings for faster, more precise updates

### Enhanced
- **Smarter Theme Modification**: Use commands like "make it warmer", "darker background", or "remove the purple accents"
- **Context-Aware AI**: AI understands current theme state for intelligent iteration decisions
- **Surgical Precision**: Target specific theme aspects while preserving successful elements
- **Seamless Experience**: No mode switching required - AI determines intent automatically

### Technical
- Enhanced streaming prompt with NEW vs ITERATION mode detection
- Updated `validateStreamingColor()` to accept "REMOVE" values for clearing customizations
- Modified `applyStreamingThemeSetting()` to handle REMOVE values for both selector and token settings
- Added comprehensive test utility `testRemoveValue` for development verification
- Complete integration enables AI to generate delta changes or complete themes based on user intent

## [1.0.14] - 2025-06-07

### Added
- **Context Injection for Theme Iteration**: AI now receives complete current theme state for better iteration support
- **Enhanced Theme Generation**: When modifying existing themes, AI gets context about all current color and token customizations
- **Development Test Command**: Added `testContextInjection` command to verify context injection functionality

### Enhanced  
- **Smarter AI Decisions**: AI can now make informed decisions about theme modifications by seeing existing customizations
- **Foundation for Iteration**: Prepares groundwork for incremental theme modification workflow
- **Graceful Fallback**: Context injection activates only when customizations exist, ensuring backwards compatibility

### Technical
- Added `formatCurrentThemeContext()` function to format theme state for AI consumption
- Enhanced theme generation service to inject current theme context into AI prompts
- Implemented safe context reading with comprehensive error handling
- Added comprehensive test utilities for development and validation

## [1.0.13] - 2025-06-07

### Added
- **Content Disclaimer**: Added clear disclaimer about AI-generated text content not being moderated by the extension
- **Enhanced Progress Accuracy**: AI now estimates and reports the expected number of theme settings for more accurate progress tracking
- **Test Utility**: Added development command for testing settings count parsing accuracy

### Enhanced
- **Improved UX**: Refined progress messages to reduce visual clutter and provide clearer feedback during theme generation
- **Streaming Prompt Optimization**: Enhanced AI prompt with painter's workflow methodology for more complete and cohesive theme generation
- **Documentation**: Added comprehensive publishing workflow instructions for proper version management and release process

### Documentation
- Added content disclaimer in Privacy & Security section to clarify user responsibility for AI-generated content
- Enhanced Copilot instructions with detailed publishing workflow requirements
- Improved prompt engineering documentation for better theme generation consistency

### Technical
- Enhanced progress reporting with AI-estimated settings count for better user feedback
- Optimized streaming theme generation workflow for improved completeness
- Added utilities for parsing and validating AI-generated settings count estimates

## [1.0.12] - 2025-06-04

### Added
- **Foundation for Theme Iteration**: Implemented current theme state reading utilities as the first step towards incremental theme modification
- Added `getCurrentThemeState()` and related utilities to read existing VS Code theme customizations
- Added development test command "Test Current Theme State (Dev)" for verifying theme state reading functionality
- Added comprehensive TypeScript types for current theme state operations (`CurrentThemeState`, `CurrentThemeResult`)

### Documentation
- Added detailed implementation documentation in `docs/CURRENT_THEME_STATE.md`
- Updated feature specification in `docs/THEME_ITERATION.md` with implementation progress tracking
- Enhanced Copilot instructions to reference ongoing development work and documentation structure

### Technical
- Smart scope detection automatically identifies workspace vs global theme customizations
- Non-breaking implementation - all new functionality is purely additive
- Foundation established for future incremental theme modification capabilities

## [1.0.10] - 2025-06-03

### Fixed
- **Critical Fix**: Resolved resource file loading issue in packaged extension installations
- Moved `streamingThemePrompt.txt` from `src/prompts/` to `prompts/` (root level) to ensure inclusion in published package
- Updated file loading to use VS Code's proper `context.asAbsolutePath()` API for reliable resource path resolution
- Added error handling for missing prompt files with descriptive error messages
- This fixes the extension failing on other machines due to prompt file not being accessible after installation

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