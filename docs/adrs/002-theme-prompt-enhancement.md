# ADR-002: Enhanced Theme Prompt Input with Suggestions

## Status
**Accepted** (June 2025)

## Context

### Problem Statement
The current theme generation workflow uses a basic `showInputBox` with only a placeholder text. Users face a "blank slate" problem where they might struggle to come up with creative theme descriptions, especially new users who aren't familiar with what kinds of prompts work well.

### User Experience Issues
- **Discovery Gap**: Users don't know what kinds of prompts produce good results
- **Creative Block**: Blank input can be intimidating for users wanting inspiration
- **Missing Examples**: The README has fantastic creative examples, but they're not accessible during the workflow
- **No Guidance**: Current placeholder is generic and doesn't showcase the extension's personality

### Current Implementation
```typescript
// Simple input box with basic placeholder
const themeDescription = await vscode.window.showInputBox({
    prompt: 'Describe your ideal theme vibe',
    placeHolder: 'e.g., "cozy autumn evening with golden highlights"'
});
```

### Opportunity
The README contains excellent creative examples that showcase Vibe Themer's personality:
- `"warm sunset over mountains"`
- `"existential dread but make it cozy"`
- `"finding a $20 bill in old jeans"`
- `"needs more cat energy"`
- `"what if this theme went to therapy"`

These examples could be surfaced during the input flow to inspire users and demonstrate the extension's creative capabilities.

## Decision Options

### Option A: AI-Generated Real-Time Suggestions
**Approach**: Use OpenAI API to generate creative prompt suggestions in real-time during input flow

**Pros**:
- **Dynamic and Fresh**: Every interaction provides new, creative suggestions
- **Perfect Personality Fit**: AI generating its own creative prompts is very meta and aligns with extension's AI-first identity
- **Contextual**: Could incorporate time of day, current theme, or other context for personalized suggestions
- **Unlimited Creativity**: Not constrained by pre-written examples
- **Self-Improving**: AI suggestions can evolve with model improvements

**Cons**:
- **Latency**: Real-time AI calls add 1-3 seconds to input flow
- **API Costs**: Additional OpenAI calls for every prompt session
- **Error Handling**: Need fallback when AI suggestion generation fails
- **Complexity**: More sophisticated error handling and caching required

### Option B: Static Curated Examples with QuickPick
**Approach**: Use `createQuickPick()` to show pre-written creative examples

**Pros**:
- Instant response time
- Predictable behavior
- No additional API costs
- Showcases known good examples

**Cons**:
- Static content becomes stale over time
- Limited to pre-written creativity
- Requires manual curation and maintenance
- Less aligned with AI-first philosophy

### Option C: Hybrid Approach (AI + Fallback)
**Approach**: Try AI-generated suggestions first, fallback to curated examples on failure

**Pros**:
- Best of both worlds
- Graceful degradation
- Reliability with innovation

**Cons**:
- Most complex implementation
- Inconsistent user experience
- Additional maintenance overhead

### Option D: Status Quo with Enhanced Placeholder
**Approach**: Keep current implementation but improve placeholder text

**Pros**:
- Minimal changes
- No UX disruption

**Cons**:
- Doesn't solve the core discovery problem
- Misses opportunity to showcase personality
- Limited space for examples

## Recommended Decision: Option A - AI-Generated Real-Time Suggestions

### Implementation Approach
Create an AI-powered prompt suggestion system that:
1. **Generates fresh suggestions** using OpenAI API when user opens theme prompt
2. **Shows loading state** with personality ("🤖 AI is brainstorming creative vibes...")
3. **Provides instant fallback** to curated examples if AI generation fails
4. **Allows free-form typing** for completely custom prompts alongside suggestions
5. **Maintains current workflow** with minimal disruption

### Technical Implementation
```typescript
type ThemePromptSuggestion = {
  readonly label: string;
  readonly description?: string;
  readonly source: 'ai_generated' | 'curated_fallback';
};

const generateAISuggestions = async (openai: OpenAI): Promise<ThemePromptSuggestion[]> => {
  // Call OpenAI with specialized prompt for generating creative theme suggestions
};

const createThemePromptPicker = async (context: vscode.ExtensionContext): Promise<string | undefined> => {
  // Show loading, generate AI suggestions, fallback to curated, allow typing
};
```

### AI Suggestion Prompt Strategy
The AI will be prompted to generate 4-6 creative theme suggestions as simple strings, focusing on:
- Vibe Themer's playful, creative personality
- Mix of conventional and wildly abstract concepts
- Contextual awareness when provided (time, season, current theme state)
- Range from concrete aesthetics to emotional abstractions
- Unexpected and delightful combinations

### Example AI Output Format
```json
[
  "3am coding session with warm amber highlights",
  "the feeling when your code finally compiles", 
  "if autumn had a debugging session",
  "cyberpunk cat cafe vibes",
  "existential dread but make it cozy",
  "sunset reflecting off your monitor"
]
```

### UX Flow
1. User runs "Change Theme" command
2. QuickPick opens with loading state: "🤖 AI is brainstorming creative vibes..."
3. AI generates 4-6 fresh, creative suggestions in ~2 seconds
4. User sees AI-generated suggestions with playful descriptions
5. User can either:
   - Select an AI suggestion directly
   - Start typing to filter suggestions or create custom prompt
   - Use fallback curated examples if AI generation failed
6. Theme generation proceeds as normal with selected/typed prompt

### Fallback Strategy
If AI suggestion generation fails:
- Show curated examples from README immediately
- Display subtle indicator: "✨ Using curated examples (AI suggestions unavailable)"
- Maintain full functionality without blocking user workflow

## Consequences

### Positive
- **Dynamic Creativity**: Every interaction provides fresh, unexpected suggestions
- **Perfect Brand Alignment**: AI generating its own prompts embodies the extension's AI-first philosophy
- **Contextual Intelligence**: Suggestions can be personalized based on time, current theme, or user patterns
- **Unlimited Potential**: Not constrained by pre-written examples; evolves with AI improvements
- **Personality Injection**: Real-time opportunity to showcase Vibe Themer's playful character
- **Maintained Flexibility**: Power users can still use completely custom prompts

### Negative
- **Performance Impact**: 1-3 second delay for AI suggestion generation
- **API Cost Increase**: Additional OpenAI calls for every prompt session
- **Complexity**: More sophisticated error handling, caching, and fallback logic required
- **Dependency Risk**: Feature depends on OpenAI API availability
- **Inconsistent Experience**: AI suggestions vary between sessions (though this could be positive)

### Neutral
- **Caching Strategy**: Need to decide on suggestion caching vs fresh generation
- **Context Detection**: Determining optimal context for AI suggestion generation
- **Performance Tuning**: Balancing suggestion quality vs generation speed

## Implementation Details

### File Changes Required
- `src/services/themeGenerationService.ts` - Replace `showInputBox` with AI-powered picker
- `src/services/openaiService.ts` - Add suggestion generation functionality
- `src/core/suggestionCore.ts` - New core utilities for AI suggestion logic (following naming conventions)
- `src/utils/` - Fallback curated examples and caching utilities
- Update existing command handler integration

### Type Definitions
```typescript
type ThemePromptSuggestion = {
  readonly label: string;
  readonly description?: string;
  readonly source: 'ai_generated' | 'curated_fallback';
};
```

### Data Management
- AI-generated suggestions with no caching (fresh calls each time for simplicity)
- Curated fallback examples stored as readonly arrays in core layer
- No context detection initially (simplified approach)

## Success Criteria

### User Experience
- [ ] AI generates creative, inspiring suggestions that showcase Vibe Themer personality
- [ ] Loading states provide clear feedback during suggestion generation
- [ ] Fallback to curated examples works seamlessly when AI unavailable
- [ ] Power users maintain complete creative freedom with custom input
- [ ] No blocking failures - graceful degradation in all error scenarios

### Technical
- [ ] AI suggestion generation completes in under 3 seconds
- [ ] Proper caching strategy balances freshness with performance
- [ ] No breaking changes to existing workflows
- [ ] Clean integration with current architecture and OpenAI service
- [ ] Type-safe implementation following project standards
- [ ] Comprehensive error handling for AI API failures

### Performance & Costs
- [ ] Suggestion generation adds minimal API cost per session
- [ ] Caching reduces redundant AI calls effectively
- [ ] Fallback examples load instantly when needed

### Maintenance
- [ ] AI suggestion quality remains high and creative over time
- [ ] Curated fallback examples stay relevant and inspiring
- [ ] Context detection works reliably for personalization
- [ ] Caching strategy performs well under various usage patterns

## Future Considerations

### Potential Enhancements
- **Learning from Usage**: Track which AI suggestions users select to improve generation
- **Seasonal Intelligence**: Automatic context detection based on calendar dates
- **Theme History Awareness**: Generate suggestions that complement or contrast with recent themes
- **Collaborative Suggestions**: Community-driven prompt inspiration integrated with AI generation
- **Model Experimentation**: A/B test different AI models for suggestion quality

### Alternative Approaches
- **Hybrid Caching**: Mix of real-time generation and pre-cached seasonal suggestions
- **Progressive Enhancement**: Start with static examples, upgrade to AI when API key configured
- **Command Palette Integration**: Surface AI suggestions through VS Code's command palette
- **Extension Settings**: Allow users to control suggestion generation frequency and style

---

## References
- [VS Code QuickPick API](https://code.visualstudio.com/api/references/vscode-api#QuickPick)
- [Vibe Themer README Examples](../../README.md)
- [ADR-001: Theme Iteration Feature](./001-theme-iteration-feature.md)

## Related ADRs
- ADR-001: Theme Iteration Feature - Established patterns for user input enhancement
