/**
 * Curated example vibes, shown in the QuickPick to solve the blank-page problem.
 * Pure data; the UI adapter samples and shuffles them for variety per session.
 * (These are v1's five README examples, unchanged.)
 */

import { type Suggestion } from '../ports';

export const curatedSuggestions: ReadonlyArray<Suggestion> = [
  { label: 'warm sunset over mountains' },
  { label: 'minimal dark forest' },
  { label: 'vibrant retro 80s' },
  { label: 'the feeling of finding a $20 bill in old jeans' },
  { label: 'existential dread but make it cozy' },
];
