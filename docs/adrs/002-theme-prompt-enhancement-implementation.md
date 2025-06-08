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

## Progress Summary
- **Phase 1**: ✅ **COMPLETED** - Core foundation with types and curated examples
  - 12 curated suggestions from README examples
  - Type-safe validation and utility functions
  - Full compilation success, ready for integration
- **Phase 2**: ⏳ **NEXT** - Basic QuickPick integration 
- **Phase 3**: ⏳ **PENDING** - AI suggestion generation
- **Phase 4**: ⏳ **PENDING** - Complete integration

## Simplified Approach (Per User Request)
- **No caching** - Fresh AI calls each time (later ADR will add caching)
- **No context detection** - No time/season awareness (later ADR will add context)
- **Minimal frills** - Focus on core functionality
- **Keep it simple** - 4-6 suggestions, basic error handling

---

## Implementation Steps

### Phase 1: Core Foundation ✅ **COMPLETED**
**Goal**: Type definitions and curated fallback examples
**Files**: `types/theme.ts`, `core/suggestionCore.ts`
**Deliverable**: Working fallback system with types

**Implementation Details:**
- ✅ Added `ThemePromptSuggestion` interface to `types/theme.ts`
- ✅ Added `ThemePromptSuggestionResult` type for error handling
- ✅ Created `core/suggestionCore.ts` with 12 curated examples from README
- ✅ Implemented validation functions (`isValidSuggestion`, `validateSuggestions`)
- ✅ Added utility functions for random selection and fallback scenarios
- ✅ All code follows functional programming patterns with pure functions
- ✅ Compilation successful - no breaking changes

**Curated Examples Included:**
- Creative primary examples: "warm sunset over mountains", "existential dread but make it cozy"
- Playful iterations: "needs more cat energy", "what if this theme went to therapy" 
- Sensory descriptions: "make it taste like lavender", "3am coding session with warm amber highlights"
- Abstract concepts: "cyberpunk cat cafe vibes", "if autumn had a debugging session"

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
- [x] Clean integration with existing architecture *(Phase 1 complete)*
- [x] Type-safe implementation following project standards *(Phase 1 complete)*
- [ ] Proper error handling for AI API failures
- [x] No caching (simplified approach) *(Phase 1 - no caching needed yet)*
- [x] No context detection (simplified approach) *(Phase 1 - no context needed yet)*

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
