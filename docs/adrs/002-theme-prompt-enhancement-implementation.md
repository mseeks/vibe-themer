# ADR-002: Theme Prompt Enhancement - Implementation Plan

## Overview
Implementation tracking for [ADR-002: Enhanced Theme Prompt Input with AI-Generated Suggestions](./002-theme-prompt-enhancement.md)

*This file was moved from `docs/IMPLEMENTATION_PLAN.md` to better organize ADR-related documentation.*

## Current State
- Simple `showInputBox` at line 156 in `themeGenerationService.ts`
- Basic prompt and placeholder text
- No inspiration or creative guidance for users

## Target State  
- AI-powered QuickPick with real-time generated suggestions
- Fallback to curated examples if AI fails
- Free-form typing alongside suggestions
- Minimal disruption to existing workflow

## Simplified Approach (Per User Request)
- **No caching** - Fresh AI calls each time (later ADR will add caching)
- **No context detection** - No time/season awareness (later ADR will add context)
- **Minimal frills** - Focus on core functionality
- **Keep it simple** - 4-6 suggestions, basic error handling

---

## Implementation Steps

### Phase 1: Core Foundation
**Goal**: Type definitions and curated fallback examples
**Files**: `types/theme.ts`, `core/suggestionCore.ts`
**Deliverable**: Working fallback system with types

```typescript
// New types for suggestions
type ThemePromptSuggestion = {
  readonly label: string;
  readonly description?: string;
  readonly source: 'ai_generated' | 'curated_fallback';
};

// Curated examples from README
const CURATED_SUGGESTIONS: readonly ThemePromptSuggestion[] = [
  { label: "warm sunset over mountains", source: 'curated_fallback' },
  { label: "cozy autumn evening with golden highlights", source: 'curated_fallback' },
  // ... more examples
];
```

### Phase 2: Basic QuickPick Integration
**Goal**: Replace showInputBox with QuickPick showing curated examples
**Files**: `themeGenerationService.ts`
**Deliverable**: Working QuickPick with curated suggestions

```typescript
// Replace showInputBox with createQuickPick
const suggestion = await showThemePromptPicker();
if (!suggestion) return;
```

### Phase 3: AI Suggestion Generation
**Goal**: Add AI-powered suggestion generation  
**Files**: `services/openaiService.ts`, `core/suggestionCore.ts`
**Deliverable**: AI generates fresh creative suggestions

```typescript
// Generate 4-6 creative suggestions using OpenAI
const aiSuggestions = await generateAISuggestions(openai);
```

### Phase 4: Complete Integration
**Goal**: Full QuickPick with AI + fallback + typing
**Files**: `themeGenerationService.ts`, error handling
**Deliverable**: Complete feature working end-to-end

```typescript
// Loading state → AI suggestions → fallback on error → free typing
const result = await showThemePromptPickerWithAI(context);
```

---

## Success Criteria

### Functional Requirements
- [ ] AI generates 4-6 creative suggestions in ~2 seconds
- [ ] Fallback to curated examples on AI failure
- [ ] Users can type custom prompts alongside suggestions
- [ ] Loading state shows progress with personality
- [ ] No breaking changes to existing workflow

### Technical Requirements  
- [ ] Clean integration with existing architecture
- [ ] Type-safe implementation following project standards
- [ ] Proper error handling for AI API failures
- [ ] No caching (simplified approach)
- [ ] No context detection (simplified approach)

### User Experience
- [ ] Creative, inspiring suggestions showcase Vibe Themer personality
- [ ] Graceful degradation - never blocks user workflow
- [ ] Power users maintain complete freedom with custom input
- [ ] Loading states provide clear feedback

---

## Testing Strategy

### Manual Testing
- [ ] AI suggestion generation works with valid API key
- [ ] Fallback works when AI unavailable
- [ ] Custom typing works alongside suggestions
- [ ] Loading states are clear and engaging
- [ ] Error handling is graceful

### Edge Cases
- [ ] No internet connection
- [ ] Invalid OpenAI API key
- [ ] OpenAI API rate limits
- [ ] Very slow AI responses
- [ ] Empty/invalid AI responses

---

## Future Enhancements (Later ADRs)
- Suggestion caching for performance
- Context detection (time/season/current theme)
- Learning from user selections
- Seasonal intelligence
- Advanced error recovery

---

## Notes
- Following existing layered architecture
- Maintaining functional programming patterns
- Type-driven development approach
- Each phase delivers working functionality
- Simplified implementation as requested
