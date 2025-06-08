# ADR-001: Theme Iteration Feature

## Status
**Accepted and Implemented** (v1.0.15, June 2025)

## Context

### Problem Statement
Users of Vibe Themer needed the ability to refine AI-generated themes incrementally rather than starting from scratch each time. The original implementation only supported complete theme generation, forcing users to regenerate entire themes for small adjustments like "make it warmer" or "darker background".

### User Experience Goals
- Enable incremental theme modifications using natural language
- Preserve successful theme elements while adjusting specific aspects
- Maintain the real-time streaming experience that defines Vibe Themer
- Provide intuitive iteration patterns (temperature, brightness, color adjustments)

### Technical Constraints
- Must work within existing streaming architecture
- Cannot break backwards compatibility with current theme generation
- Must handle VS Code's configuration scope complexity (workspace vs global)
- Should minimize OpenAI API costs by generating deltas rather than complete themes

## Decision

We implemented a **context-aware AI intent detection** approach that enables seamless theme iteration through three key components:

### 1. Current Theme State Reading
**Implementation**: Pure functional utilities in `themeCore.ts`
- `getCurrentThemeState()`: Reads both workbench.colorCustomizations and editor.tokenColorCustomizations
- `getCurrentCustomizationScope()`: Smart detection of workspace/global/mixed scopes
- Complete error handling with structured failure information

**Design Rationale**: 
- Non-breaking: Only reads configuration, doesn't modify existing behavior
- Type-safe: Rich TypeScript types prevent invalid state combinations
- Testable: Pure functions with clear contracts

### 2. Context Injection for AI Decision Making
**Implementation**: `formatCurrentThemeContext()` in theme generation workflow
- Sends complete current theme state to AI when customizations exist
- Graceful fallback to standard generation when no theme exists
- Context formatted as human-readable color settings for AI comprehension

**Design Rationale**:
- Leverages modern AI models' large context windows effectively
- Enables precise delta generation by showing AI exactly what exists
- Maintains single entry point (no mode switching or UI changes)

### 3. AI Intent Detection with Delta Application
**Implementation**: Enhanced streaming prompt with REMOVE value support
- AI automatically detects NEW vs ITERATION intent based on context
- Generates delta changes (10-20 settings) vs complete themes (100+ settings)
- `"REMOVE"` values clear VS Code overrides, falling back to base theme
- Existing streaming infrastructure handles delta application seamlessly

**Design Rationale**:
- Single workflow: Users describe intent, AI handles the complexity
- Performance: Faster delta application and reduced API costs
- Flexibility: Supports both additive changes and color removal

## Implementation Details

### Architecture Integration
The feature integrates cleanly with the existing layered architecture:

```
Extension Layer: Command registration unchanged
     ↓
Service Layer: themeGenerationService enhanced with context injection
     ↓  
Core Layer: themeCore.ts extended with theme state reading utilities
```

### Data Flow Enhancement
1. **User Input** → Same command handler receives prompt
2. **Context Reading** → Extract current theme state if exists
3. **AI Generation** → Enhanced prompt with current theme context
4. **Intent Detection** → AI determines NEW vs ITERATION internally
5. **Delta Application** → Stream only changed settings via existing infrastructure

### Key Technical Decisions

#### Decision: AI-Based Intent Detection
**Alternative Considered**: Separate commands or mode switching UI
**Chosen**: Single command with AI intent detection
**Rationale**: Simpler UX, leverages AI strengths, maintains single workflow

#### Decision: Complete Context Injection
**Alternative Considered**: Selective context or summarized theme data
**Chosen**: Send all current color settings to AI
**Rationale**: Modern AI models handle large context well, enables maximum precision

#### Decision: REMOVE Value Pattern
**Alternative Considered**: Separate removal API or reset mechanisms
**Chosen**: Special "REMOVE" value handled by existing streaming infrastructure
**Rationale**: Minimal code changes, leverages existing error handling, clear semantics

### Type Definitions
```typescript
type CurrentThemeState = {
  readonly colorCustomizations: Record<string, string>;
  readonly tokenColorCustomizations: Record<string, any>;
  readonly scope: 'workspace' | 'global' | 'both';
  readonly hasCustomizations: boolean;
};

type ThemeIterationMode = 'NEW' | 'ITERATION';
```

## Consequences

### Positive
- **Enhanced User Experience**: Users can refine themes incrementally with natural language
- **Performance Improvements**: Delta generation reduces API costs and application time
- **Backwards Compatible**: Existing workflows unchanged, new capability added seamlessly
- **Leverages AI Strengths**: Context awareness enables sophisticated intent detection
- **Clean Architecture**: Feature integrates without architectural changes

### Negative
- **Increased Complexity**: More sophisticated prompt engineering and context management
- **API Dependency**: More reliant on AI model quality for intent detection
- **Context Size**: Large themes increase prompt token usage

### Neutral
- **Development Commands**: Added test utilities for debugging (marked as dev-only)
- **Documentation Overhead**: Additional complexity requires comprehensive documentation

## Examples

### User Interaction Patterns
```
Base Theme Creation:
Input: "cyberpunk neon city with purple accents"
→ AI generates complete theme (100+ settings)

Theme Iteration:
Input: "make it warmer"
→ AI detects iteration intent
→ Generates 15 delta changes adding orange/red tones
→ Existing purple accents preserved

Color Removal:
Input: "remove the purple accents" 
→ AI generates REMOVE values for purple-related settings
→ Settings cleared, falling back to base theme colors
```

### Technical Implementation
```typescript
// Context injection example
const currentTheme = await getCurrentThemeState();
const prompt = currentTheme.hasCustomizations 
  ? `${basePrompt}\n\nCurrent theme context:\n${formatCurrentThemeContext(currentTheme)}`
  : basePrompt;

// Delta application example  
if (value === "REMOVE") {
  await config.update(`workbench.colorCustomizations.${setting}`, undefined, target);
} else {
  await applyColorOverride(setting, value, target);
}
```

## Alternatives Considered

### 1. Separate Iteration Command
**Approach**: `vibeThemer.iterateTheme` command distinct from `vibeThemer.changeTheme`
**Rejected Because**: Mode switching complexity, user confusion about which command to use

### 2. UI Mode Toggle
**Approach**: Setting or UI toggle between "new theme" and "iteration" modes
**Rejected Because**: Additional UI complexity, breaks the simple single-workflow experience

### 3. Keyword-Based Intent Detection
**Approach**: Client-side parsing for iteration keywords ("make it", "add", "remove")
**Rejected Because**: Brittle, doesn't handle creative language, limits user expression

### 4. Theme Versioning System
**Approach**: Maintain history of theme changes with rollback capabilities
**Rejected Because**: Significant complexity increase, unclear user value, storage overhead

## Implementation Timeline

### Phase 1: Foundation (v1.0.13)
- ✅ Current theme state reading utilities
- ✅ Type definitions and error handling
- ✅ Development test commands

### Phase 2: Context Integration (v1.0.14)  
- ✅ Context injection in theme generation workflow
- ✅ AI prompt enhancement with current theme data
- ✅ Graceful fallback for new theme generation

### Phase 3: Intent Detection (v1.0.15)
- ✅ Enhanced streaming prompt with intent detection
- ✅ REMOVE value support in validation and application
- ✅ Delta application through existing streaming infrastructure
- ✅ Comprehensive test utilities

### Phase 4: Documentation & Polish (Post v1.0.15)
- ✅ User-facing documentation in README
- 🔄 Technical documentation consolidation (this ADR)

## Future Considerations

### Potential Enhancements
- **Theme Templates**: Pre-defined iteration patterns for common adjustments
- **Undo/Redo**: Theme change history with rollback capabilities  
- **Batch Operations**: Multiple iteration requests in single API call
- **Smart Suggestions**: AI-suggested improvements based on current theme

### Monitoring & Metrics
- Track iteration vs new theme generation ratios
- Monitor delta size distribution for API cost optimization
- User satisfaction with iteration quality vs complete regeneration

### Technical Debt
- Development test commands could be removed in future major version
- Context injection could be optimized for very large existing themes
- Consider caching current theme state for repeated iterations

---

## References
- [VS Code Theme Customization API](https://code.visualstudio.com/api/extension-guides/color-theme)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vibe Themer Architecture](../ARCHITECTURE.md)

## Related ADRs
- *Future ADRs will be linked here as they are created*
