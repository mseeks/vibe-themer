# Vibe Themer Architecture

## Overview

Vibe Themer is a VS Code extension that generates custom color themes using AI based on natural language descriptions. The extension follows a pragmatic layered architecture with clear separation of concerns.

## Architecture Layers

### Extension Layer (`extension.ts`)
- **Responsibility**: Command registration and activation lifecycle
- **Dependencies**: VS Code API, Service Layer
- **Key Functions**: Extension activation, command registration, context management

### Service Layer (`*Service.ts`)
- **Responsibility**: Public APIs and workflow orchestration
- **Components**:
  - `themeGenerationService.ts` - Main theme generation workflow
  - `openaiService.ts` - OpenAI API integration and model management
- **Dependencies**: Core Layer, VS Code API

### Core Layer (`*Core.ts`)
- **Responsibility**: Pure domain logic and business rules
- **Components**:
  - `themeCore.ts` - Theme generation and color scheme logic
  - `openaiCore.ts` - OpenAI client management and configuration
- **Dependencies**: None (pure functions)

## Command Architecture

Commands are organized in the `commands/` directory following the Command Pattern:

- `clearApiKeyCommand.ts` - Manages OpenAI API key clearing
- `modelSelectCommand.ts` - Handles AI model selection
- `resetThemeCommand.ts` - Resets theme customizations

## Data Flow

1. **User Input** → Command handler receives user prompt
2. **Validation** → Core layer validates and processes input
3. **AI Generation** → OpenAI service generates theme data
4. **Theme Application** → Theme core applies colors to VS Code
5. **State Management** → Extension context stores theme state

## Key Design Principles

- **Type-Driven Development**: Rich TypeScript types prevent invalid states
- **Functional Programming**: Pure functions for business logic
- **Domain-Driven Design**: Clear domain models and ubiquitous language
- **Dependency Injection**: Explicit dependencies for testability

## Configuration Management

- OpenAI API keys stored securely in VS Code's secret storage
- Model preferences stored in workspace/global settings
- Theme state maintained in extension context