/**
 * Core domain logic for theme prompt suggestions.
 * Pure functions that provide curated fallback examples and validation.
 * Following the functional programming principles of the Vibe Themer architecture.
 */

import { ThemePromptSuggestion } from '../types/theme.js';

/**
 * Curated theme prompt suggestions extracted from README examples.
 * These showcase Vibe Themer's creative personality and serve as fallback
 * when AI suggestion generation is unavailable.
 */
export const CURATED_SUGGESTIONS: readonly ThemePromptSuggestion[] = [
    // Primary creative examples from quick start guide
    { 
        label: "warm sunset over mountains", 
        description: "Golden hour vibes with mountain silhouettes",
        source: 'curated_fallback' 
    },
    { 
        label: "minimal dark forest", 
        description: "Clean aesthetic with nature-inspired tones",
        source: 'curated_fallback' 
    },
    { 
        label: "vibrant retro 80s", 
        description: "Neon colors and nostalgic energy",
        source: 'curated_fallback' 
    },
    { 
        label: "the feeling of finding a $20 bill in old jeans", 
        description: "Unexpected joy and comfort",
        source: 'curated_fallback' 
    },
    { 
        label: "existential dread but make it cozy", 
        description: "Philosophical depths with warm comfort",
        source: 'curated_fallback' 
    },
    
    // Additional creative examples from iteration section
    { 
        label: "needs more cat energy", 
        description: "Playful, independent, and mysteriously elegant",
        source: 'curated_fallback' 
    },
    { 
        label: "what if this theme went to therapy", 
        description: "Self-aware colors with emotional intelligence",
        source: 'curated_fallback' 
    },
    { 
        label: "make it taste like lavender", 
        description: "Soft purple and calming neutral tones",
        source: 'curated_fallback' 
    },
    { 
        label: "3am coding session with warm amber highlights", 
        description: "Deep focus atmosphere with gentle warmth",
        source: 'curated_fallback' 
    },
    { 
        label: "cyberpunk cat cafe vibes", 
        description: "Futuristic neon meets cozy comfort",
        source: 'curated_fallback' 
    },
    { 
        label: "sunset reflecting off your monitor", 
        description: "Natural light meeting digital workspace",
        source: 'curated_fallback' 
    },
    { 
        label: "if autumn had a debugging session", 
        description: "Seasonal warmth with problem-solving energy",
        source: 'curated_fallback' 
    }
] as const;

/**
 * Validates that a theme prompt suggestion has required properties.
 * Pure function that returns boolean result for type safety.
 */
export const isValidSuggestion = (suggestion: unknown): suggestion is ThemePromptSuggestion => {
    if (typeof suggestion !== 'object' || suggestion === null) {
        return false;
    }
    
    const s = suggestion as Record<string, unknown>;
    
    return (
        typeof s.label === 'string' && 
        s.label.trim().length > 0 &&
        (s.description === undefined || typeof s.description === 'string') &&
        (s.source === 'ai_generated' || s.source === 'curated_fallback')
    );
};

/**
 * Filters and validates an array of suggestions, removing any invalid entries.
 * Pure function that ensures type safety and data integrity.
 */
export const validateSuggestions = (suggestions: unknown[]): readonly ThemePromptSuggestion[] => {
    return suggestions.filter(isValidSuggestion);
};

/**
 * Gets a random subset of curated suggestions for variety.
 * Pure function that takes a seed number for deterministic testing.
 */
export const getRandomCuratedSuggestions = (
    count: number = 6, 
    seed?: number
): readonly ThemePromptSuggestion[] => {
    if (count <= 0 || count > CURATED_SUGGESTIONS.length) {
        return CURATED_SUGGESTIONS;
    }
    
    // Use simple deterministic shuffling if seed provided, otherwise random
    const shuffled = [...CURATED_SUGGESTIONS];
    
    if (seed !== undefined) {
        // Simple deterministic shuffle using seed
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = (seed + i) % (i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
    } else {
        // Random shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
    }
    
    return shuffled.slice(0, count);
};

/**
 * Creates a fallback suggestion result for error scenarios.
 * Pure function that provides graceful degradation with curated examples.
 */
export const createFallbackSuggestions = (count: number = 6): readonly ThemePromptSuggestion[] => {
    return getRandomCuratedSuggestions(count);
};
