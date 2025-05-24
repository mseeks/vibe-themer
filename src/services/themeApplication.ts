/**
 * High-level theme application orchestrator.
 * Composes domain logic with VS Code adapters to provide the main API.
 */

import * as vscode from 'vscode';
import { 
    ThemeCustomizations, 
    ThemeApplicationResult, 
    ThemeApplicationDependencies,
    TokenColorRule,
    ConfigurationScope
} from '../types/theme';
import {
    determineConfigurationScope,
    prepareTokenColorCustomizations,
    validateThemeCustomizations,
    getConfigurationTargets,
    createSuccessResult,
    createFailureResult,
    createThemeApplicationError
} from './themeCore';
import { 
    createVSCodeDependencies, 
    refreshNotificationStyles 
} from './themeAdapters';

/**
 * Applies theme customizations with comprehensive error handling and user feedback.
 * This is the main entry point that orchestrates the entire theme application process.
 * 
 * Design principles:
 * - Functional composition of smaller, focused operations
 * - Explicit error handling with rich context
 * - Separation of concerns between domain logic and infrastructure
 * - Type safety that prevents invalid operations
 */
export const applyThemeCustomizations = async (
    colorCustomizations: Record<string, string>,
    tokenColors: TokenColorRule[] | undefined,
    themeDescription: string,
    dependencies?: ThemeApplicationDependencies
): Promise<ThemeApplicationResult> => {
    // Use provided dependencies or create standard VS Code dependencies
    const deps = dependencies || createVSCodeDependencies();
    
    // Create our domain object with validated input
    const customizations: ThemeCustomizations = {
        colorCustomizations,
        tokenColors: tokenColors || [],
        description: themeDescription
    };

    // Validate before attempting application
    const validationResult = validateThemeCustomizations(customizations);
    if (!validationResult.success) {
        await deps.notification.showErrorNotification(validationResult.error);
        return validationResult;
    }

    // Determine where to apply the theme based on workspace context
    const scope = determineConfigurationScope(deps.workspace.hasWorkspaceFolders);
    const targets = getConfigurationTargets(scope);

    // Apply theme with fallback strategy
    const result = await applyWithFallback(customizations, targets, deps);
    
    // Refresh notification styles as a side effect
    refreshNotificationStyles();
    
    // Provide user feedback
    if (result.success) {
        await deps.notification.showSuccessNotification(result, themeDescription);
    } else {
        await deps.notification.showErrorNotification(result.error);
    }

    return result;
};

/**
 * Applies theme customizations with fallback to alternative configuration targets.
 * Implements the retry logic as a pure functional composition.
 */
const applyWithFallback = async (
    customizations: ThemeCustomizations,
    targets: vscode.ConfigurationTarget[],
    deps: ThemeApplicationDependencies
): Promise<ThemeApplicationResult> => {
    let lastError: unknown;

    for (const target of targets) {
        try {
            await applySingleTarget(customizations, target, deps);
            
            // Success - determine which scope was actually used
            const appliedScope: ConfigurationScope = targets.length === 1 
                ? (target === vscode.ConfigurationTarget.Workspace 
                    ? { type: 'workspace', target: vscode.ConfigurationTarget.Workspace }
                    : { type: 'global', target: vscode.ConfigurationTarget.Global })
                : { type: 'both', primary: targets[0], fallback: targets[1] };
            
            return createSuccessResult(appliedScope);
        } catch (error) {
            lastError = error;
            // Continue to next target if available
        }
    }

    // All targets failed
    return createFailureResult(
        createThemeApplicationError(
            'Failed to apply theme to any configuration target',
            lastError,
            true,
            'Check VS Code permissions and try restarting the editor'
        )
    );
};

/**
 * Applies theme customizations to a single configuration target.
 * Separated for clarity and testability.
 */
const applySingleTarget = async (
    customizations: ThemeCustomizations,
    target: vscode.ConfigurationTarget,
    deps: ThemeApplicationDependencies
): Promise<void> => {
    // Apply color customizations
    await deps.configuration.update(
        'workbench.colorCustomizations', 
        customizations.colorCustomizations, 
        target
    );

    // Apply token colors if present
    if (customizations.tokenColors.length > 0) {
        const existingTokenCustomizations = deps.configuration.get('editor.tokenColorCustomizations') as Record<string, unknown> | undefined;
        const newTokenCustomizations = prepareTokenColorCustomizations(
            customizations.tokenColors,
            existingTokenCustomizations
        );
        
        await deps.configuration.update(
            'editor.tokenColorCustomizations',
            newTokenCustomizations,
            target
        );
    }
};

/**
 * Convenience function that maintains backward compatibility with the old API.
 * Transforms the legacy parameters into our new domain model.
 */
export const applyThemeCustomizationsLegacy = async (
    colorCustomizations: Record<string, string>,
    tokenColors: any[] | undefined,
    themeDescription: string
): Promise<void> => {
    // Transform legacy tokenColors format to our typed format
    const typedTokenColors: TokenColorRule[] = (tokenColors || []).map(rule => ({
        scope: rule.scope || [],
        settings: {
            foreground: rule.settings?.foreground,
            background: rule.settings?.background,
            fontStyle: rule.settings?.fontStyle
        }
    }));

    const result = await applyThemeCustomizations(
        colorCustomizations,
        typedTokenColors,
        themeDescription
    );

    // For backward compatibility, throw on failure
    if (!result.success) {
        throw new Error(result.error.message);
    }
};
