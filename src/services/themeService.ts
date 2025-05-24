/**
 * Theme Service - Elegant orchestration of VS Code theme customization.
 * 
 * This module provides a refined interface for applying theme customizations to VS Code.
 * It embodies functional programming principles with domain-driven design, creating
 * a beautiful separation between business logic and infrastructure concerns.
 * 
 * Design Philosophy:
 * - Pure functions for domain logic, side effects isolated to adapters
 * - Rich type system that makes invalid states unrepresentable  
 * - Functional composition over imperative control flow
 * - Explicit error handling with structured failure information
 * - Dependency injection for testability and flexibility
 */

import { applyThemeCustomizationsLegacy } from './themeApplication';

/**
 * Applies theme customizations with comprehensive error handling and user feedback.
 * 
 * This is the main public API that maintains backward compatibility while leveraging
 * our new functional architecture under the hood. The function transforms the legacy
 * interface into our refined domain model and delegates to the pure business logic.
 * 
 * @param colorCustomizations - VS Code color selector mappings (e.g., "editor.background": "#1e1e1e")
 * @param tokenColors - Syntax highlighting rules for TextMate scopes
 * @param themeDescription - Human-readable description for user feedback
 * 
 * @throws Error when theme application fails and cannot be recovered
 * 
 * @example
 * ```typescript
 * await applyThemeCustomizations(
 *   { "editor.background": "#1e1e1e", "editor.foreground": "#d4d4d4" },
 *   [{ scope: "comment", settings: { foreground: "#6a9955", fontStyle: "italic" } }],
 *   "Dark Professional Theme"
 * );
 * ```
 */
export async function applyThemeCustomizations(
    colorCustomizations: Record<string, string>,
    tokenColors: any[] | undefined,
    themeDescription: string
): Promise<void> {
    // Delegate to our refined implementation with legacy compatibility layer
    await applyThemeCustomizationsLegacy(colorCustomizations, tokenColors, themeDescription);
}