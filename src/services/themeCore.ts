/**
 * Core theme application logic with integrated orchestration.
 * Combines pure domain logic with theme application lifecycle management.
 */

import * as vscode from 'vscode';
import { 
    ConfigurationScope, 
    ThemeCustomizations, 
    ThemeApplicationResult, 
    ThemeApplicationError,
    TokenColorRule,
    CurrentThemeState,
    CurrentThemeResult 
} from '../types/theme';

/**
 * Determines the appropriate configuration scope based on workspace context.
 * Encodes the business rule: prefer workspace if available, fall back to global.
 */
export const determineConfigurationScope = (hasWorkspaceFolders: boolean): ConfigurationScope => {
    if (hasWorkspaceFolders) {
        return {
            type: 'both',
            primary: vscode.ConfigurationTarget.Global,
            fallback: vscode.ConfigurationTarget.Workspace
        };
    }
    
    return {
        type: 'global',
        target: vscode.ConfigurationTarget.Global
    };
};

/**
 * Transforms token colors into the format expected by VS Code.
 * Handles the impedance mismatch between our domain model and VS Code's API.
 */
export const prepareTokenColorCustomizations = (
    tokenColors: readonly TokenColorRule[],
    existingCustomizations?: Record<string, unknown> | {}
): Record<string, unknown> => {
    const base = existingCustomizations || {};
    
    if (tokenColors.length === 0) {
        return base as Record<string, unknown>;
    }

    return {
        ...base,
        textMateRules: tokenColors
    };
};

/**
 * Creates a structured error from an unknown cause.
 * Provides consistent error handling across the application.
 */
export const createThemeApplicationError = (
    message: string,
    cause: unknown,
    recoverable: boolean = true,
    suggestedAction?: string
): ThemeApplicationError => ({
    message,
    cause,
    recoverable,
    suggestedAction
});

/**
 * Validates theme customizations before application.
 * Ensures we don't attempt to apply invalid data.
 */
export const validateThemeCustomizations = (
    customizations: ThemeCustomizations
): ThemeApplicationResult => {
    // Basic validation - could be expanded with more sophisticated rules
    if (!customizations.colorCustomizations || typeof customizations.colorCustomizations !== 'object') {
        return {
            success: false,
            error: createThemeApplicationError(
                'Invalid color customizations provided',
                new Error('Color customizations must be a valid object'),
                false,
                'Check the theme generation logic'
            )
        };
    }

    // Validate color format (supports 3, 6, and 8-digit hex codes, plus alpha transparency)
    const invalidColors = Object.entries(customizations.colorCustomizations)
        .filter(([_, color]) => {
            if (typeof color !== 'string') {return true;}
            
            // Allow 3-digit (#rgb), 6-digit (#rrggbb), and 8-digit (#rrggbbaa) hex codes
            // Also allow CSS color keywords like 'transparent'
            const hexPattern = /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/;
            const isValidHex = hexPattern.test(color);
            const isValidKeyword = ['transparent', 'inherit', 'initial', 'unset'].includes(color.toLowerCase());
            
            return !isValidHex && !isValidKeyword;
        })
        .map(([key, _]) => key);

    if (invalidColors.length > 0) {
        return {
            success: false,
            error: createThemeApplicationError(
                `Invalid color format for: ${invalidColors.join(', ')}`,
                new Error('Colors must be valid hex codes (#rgb, #rrggbb, #rrggbbaa) or CSS color keywords'),
                false,
                'Use the color normalization utilities'
            )
        };
    }

    return { success: true, appliedScope: { type: 'global', target: vscode.ConfigurationTarget.Global } };
};

/**
 * Determines which configuration targets to attempt based on scope.
 * Encodes the retry logic as a pure transformation.
 */
export const getConfigurationTargets = (scope: ConfigurationScope): vscode.ConfigurationTarget[] => {
    switch (scope.type) {
        case 'workspace':
            return [scope.target];
        case 'global':
            return [scope.target];
        case 'both':
            return [scope.primary, scope.fallback];
    }
};

/**
 * Creates success result with applied scope information.
 */
export const createSuccessResult = (appliedScope: ConfigurationScope): ThemeApplicationResult => ({
    success: true,
    appliedScope
});

/**
 * Creates failure result with error information.
 */
export const createFailureResult = (error: ThemeApplicationError): ThemeApplicationResult => ({
    success: false,
    error
});

/**
 * Applies theme customizations with comprehensive error handling and user feedback.
 * This is the main entry point that orchestrates the entire theme application process.
 * 
 * Design principles:
 * - Functional composition of smaller, focused operations
 * - Explicit error handling with rich context
 * - Direct VS Code API usage for simplicity
 * - Type safety that prevents invalid operations
 */
export const applyThemeCustomizations = async (
    colorCustomizations: Record<string, string>,
    tokenColors: TokenColorRule[] | undefined,
    themeDescription: string,
    suppressNotifications: boolean = false
): Promise<ThemeApplicationResult> => {
    // Create our domain object with validated input
    const customizations: ThemeCustomizations = {
        colorCustomizations,
        tokenColors: tokenColors || [],
        description: themeDescription
    };

    // Validate before attempting application
    const validationResult = validateThemeCustomizations(customizations);
    if (!validationResult.success) {
        if (!suppressNotifications) {
            await vscode.window.showErrorMessage(validationResult.error.message);
        }
        return validationResult;
    }

    // Determine where to apply the theme based on workspace context
    const hasWorkspaceFolders = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
    const scope = determineConfigurationScope(hasWorkspaceFolders);
    const targets = getConfigurationTargets(scope);

    // Apply theme with fallback strategy
    const result = await applyWithFallback(customizations, targets);
    
    // Provide user feedback
    if (result.success && !suppressNotifications) {
        const scopeDescription = describeScopeApplication(result.appliedScope);
        const message = `Theme "${themeDescription}" applied ${scopeDescription}`;
        await vscode.window.showInformationMessage(message);
    } else if (!result.success && !suppressNotifications) {
        await vscode.window.showErrorMessage(result.error.message);
    }

    return result;
};

/**
 * Applies theme customizations with fallback to alternative configuration targets.
 * Implements the retry logic as a pure functional composition.
 */
const applyWithFallback = async (
    customizations: ThemeCustomizations,
    targets: vscode.ConfigurationTarget[]
): Promise<ThemeApplicationResult> => {
    let lastError: unknown;

    for (const target of targets) {
        try {
            await applySingleTarget(customizations, target);
            
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
    target: vscode.ConfigurationTarget
): Promise<void> => {
    const config = vscode.workspace.getConfiguration();
    
    // Apply color customizations
    await config.update(
        'workbench.colorCustomizations', 
        customizations.colorCustomizations, 
        target
    );

    // Apply token colors if present
    if (customizations.tokenColors.length > 0) {
        const existingTokenCustomizations = config.get('editor.tokenColorCustomizations') as Record<string, unknown> | undefined;
        const newTokenCustomizations = prepareTokenColorCustomizations(
            customizations.tokenColors,
            existingTokenCustomizations
        );
        
        await config.update(
            'editor.tokenColorCustomizations',
            newTokenCustomizations,
            target
        );
    }
};

/**
 * Describes how the scope was applied for user feedback.
 */
const describeScopeApplication = (scope: ConfigurationScope): string => {
    switch (scope.type) {
        case 'workspace':
            return 'to workspace settings';
        case 'global':
            return 'to global settings';
        case 'both':
            return 'to global settings (with workspace fallback)';
    }
};

/**
 * Represents a single streaming theme setting.
 * Encodes the business rule that each setting must have a type and target.
 */
export type StreamingThemeSetting = 
    | { readonly type: 'selector'; readonly name: string; readonly color: string }
    | { readonly type: 'token'; readonly scope: string; readonly color: string; readonly fontStyle?: string };

/**
 * Result of parsing a streaming theme line.
 * Success contains the parsed setting, failure contains error information.
 */
export type StreamingParseResult = 
    | { readonly success: true; readonly setting: StreamingThemeSetting }
    | { readonly success: false; readonly error: string; readonly line: string };

/**
 * Parses a single line from streaming theme generation.
 * Handles both SELECTOR: and TOKEN: format lines.
 * 
 * Business rule: Each line must follow the exact streaming format specification.
 */
export const parseStreamingThemeLine = (line: string): StreamingParseResult => {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
        return { 
            success: false, 
            error: 'Empty line', 
            line 
        };
    }

    if (trimmedLine.startsWith('SELECTOR:')) {
        const content = trimmedLine.substring(9); // Remove 'SELECTOR:'
        const [name, color] = content.split('=');
        
        if (!name || !color) {
            return { 
                success: false, 
                error: 'Invalid selector format - expected name=color', 
                line 
            };
        }

        if (!validateStreamingColor(color)) {
            return { 
                success: false, 
                error: 'Invalid color format', 
                line 
            };
        }

        return {
            success: true,
            setting: {
                type: 'selector',
                name: name.trim(),
                color: color.trim()
            }
        };
    }

    if (trimmedLine.startsWith('TOKEN:')) {
        const content = trimmedLine.substring(6); // Remove 'TOKEN:'
        const [scope, colorAndStyle] = content.split('=');
        
        if (!scope || !colorAndStyle) {
            return { 
                success: false, 
                error: 'Invalid token format - expected scope=color[,fontStyle]', 
                line 
            };
        }

        const [color, fontStyle] = colorAndStyle.split(',');
        
        if (!validateStreamingColor(color)) {
            return { 
                success: false, 
                error: 'Invalid color format', 
                line 
            };
        }

        return {
            success: true,
            setting: {
                type: 'token',
                scope: scope.trim(),
                color: color.trim(),
                fontStyle: fontStyle?.trim()
            }
        };
    }

    return { 
        success: false, 
        error: 'Line must start with SELECTOR: or TOKEN:', 
        line 
    };
};

/**
 * Validates that a color string meets basic format requirements.
 * Reuses hex validation logic for streaming theme colors.
 */
const validateStreamingColor = (color: string): boolean => {
    // Hex color validation (3, 6, or 8 digit hex codes)
    const hexPattern = /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/;
    const isValidHex = hexPattern.test(color);
    const isValidKeyword = ['transparent', 'inherit', 'initial', 'unset'].includes(color.toLowerCase());
    
    return isValidHex || isValidKeyword;
};

/**
 * Applies a single streaming theme setting immediately.
 * Enables real-time theme updates as settings are received.
 */
export const applyStreamingThemeSetting = async (
    setting: StreamingThemeSetting,
    hasWorkspaceFolders: boolean
): Promise<ThemeApplicationResult> => {
    try {
        const config = vscode.workspace.getConfiguration();
        const scope = determineConfigurationScope(hasWorkspaceFolders);
        const targets = getConfigurationTargets(scope);

        if (setting.type === 'selector') {
            // Apply color customization incrementally
            for (const target of targets) {
                try {
                    const existingColors = config.get('workbench.colorCustomizations') as Record<string, string> || {};
                    const updatedColors = {
                        ...existingColors,
                        [setting.name]: setting.color
                    };
                    
                    await config.update('workbench.colorCustomizations', updatedColors, target);
                    
                    // Success on first target - determine which scope was used
                    const appliedScope: ConfigurationScope = targets.length === 1 
                        ? (target === vscode.ConfigurationTarget.Workspace 
                            ? { type: 'workspace', target: vscode.ConfigurationTarget.Workspace }
                            : { type: 'global', target: vscode.ConfigurationTarget.Global })
                        : { type: 'both', primary: targets[0], fallback: targets[1] };
                    
                    return createSuccessResult(appliedScope);
                } catch (error) {
                    // Continue to next target
                    continue;
                }
            }
        } else if (setting.type === 'token') {
            // Apply token color customization incrementally
            for (const target of targets) {
                try {
                    const existingTokens = config.get('editor.tokenColorCustomizations') as Record<string, unknown> || {};
                    const existingRules = (existingTokens.textMateRules as any[]) || [];
                    
                    // Create new token rule
                    const newRule = {
                        scope: setting.scope,
                        settings: {
                            foreground: setting.color,
                            ...(setting.fontStyle && { fontStyle: setting.fontStyle })
                        }
                    };
                    
                    // Update existing rules or add new one
                    const updatedRules = [...existingRules.filter(rule => rule.scope !== setting.scope), newRule];
                    const updatedTokens = {
                        ...existingTokens,
                        textMateRules: updatedRules
                    };
                    
                    await config.update('editor.tokenColorCustomizations', updatedTokens, target);
                    
                    // Success on first target
                    const appliedScope: ConfigurationScope = targets.length === 1 
                        ? (target === vscode.ConfigurationTarget.Workspace 
                            ? { type: 'workspace', target: vscode.ConfigurationTarget.Workspace }
                            : { type: 'global', target: vscode.ConfigurationTarget.Global })
                        : { type: 'both', primary: targets[0], fallback: targets[1] };
                    
                    return createSuccessResult(appliedScope);
                } catch (error) {
                    // Continue to next target
                    continue;
                }
            }
        }

        // All targets failed
        return createFailureResult(
            createThemeApplicationError(
                `Failed to apply ${setting.type} setting: ${setting.type === 'selector' ? setting.name : setting.scope}`,
                new Error('All configuration targets failed'),
                true,
                'Check VS Code permissions and try restarting the editor'
            )
        );

    } catch (error) {
        return createFailureResult(
            createThemeApplicationError(
                `Error applying streaming theme setting`,
                error,
                true,
                'Check the setting format and try again'
            )
        );
    }
};

// =============================================================================
// Current Theme State Reading
// =============================================================================

/**
 * Reads current workbench color customizations from VS Code configuration.
 * Checks both workspace and global scopes to capture the complete state.
 */
export const getCurrentColorCustomizations = (): Record<string, string> => {
    const config = vscode.workspace.getConfiguration();
    
    // Get both workspace and global settings
    const workspaceColors = config.get<Record<string, string>>('workbench.colorCustomizations', {});
    const globalColors = config.get<Record<string, string>>('workbench.colorCustomizations', {});
    
    // Workspace settings take precedence over global
    return {
        ...globalColors,
        ...workspaceColors
    };
};

/**
 * Reads current token color customizations from VS Code configuration.
 * Combines workspace and global scopes with workspace taking precedence.
 */
export const getCurrentTokenColorCustomizations = (): Record<string, unknown> => {
    const config = vscode.workspace.getConfiguration();
    
    // Get both workspace and global settings
    const workspaceTokens = config.get<Record<string, unknown>>('editor.tokenColorCustomizations', {});
    const globalTokens = config.get<Record<string, unknown>>('editor.tokenColorCustomizations', {});
    
    // Workspace settings take precedence over global
    return {
        ...globalTokens,
        ...workspaceTokens
    };
};

/**
 * Determines the effective scope of current customizations.
 * Returns where the customizations are actually stored.
 */
export const getCurrentCustomizationScope = (): 'workspace' | 'global' | 'both' => {
    const config = vscode.workspace.getConfiguration();
    
    const workspaceColors = config.get<Record<string, string>>('workbench.colorCustomizations', {});
    const globalColors = config.get<Record<string, string>>('workbench.colorCustomizations', {});
    const workspaceTokens = config.get<Record<string, unknown>>('editor.tokenColorCustomizations', {});
    const globalTokens = config.get<Record<string, unknown>>('editor.tokenColorCustomizations', {});
    
    const hasWorkspaceCustomizations = Object.keys(workspaceColors).length > 0 || Object.keys(workspaceTokens).length > 0;
    const hasGlobalCustomizations = Object.keys(globalColors).length > 0 || Object.keys(globalTokens).length > 0;
    
    if (hasWorkspaceCustomizations && hasGlobalCustomizations) {
        return 'both';
    }
    
    if (hasWorkspaceCustomizations) {
        return 'workspace';
    }
    
    if (hasGlobalCustomizations) {
        return 'global';
    }
    
    return 'global'; // Default scope when no customizations exist
};

/**
 * Reads the complete current theme state from VS Code configuration.
 * This captures both color and token customizations with scope information.
 */
export const getCurrentThemeState = (): CurrentThemeResult => {
    try {
        const colorCustomizations = getCurrentColorCustomizations();
        const tokenColorCustomizations = getCurrentTokenColorCustomizations();
        const scope = getCurrentCustomizationScope();
        
        const hasCustomizations = 
            Object.keys(colorCustomizations).length > 0 || 
            Object.keys(tokenColorCustomizations).length > 0;
        
        return {
            success: true,
            state: {
                colorCustomizations,
                tokenColorCustomizations,
                hasCustomizations,
                scope
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: createThemeApplicationError(
                'Failed to read current theme state',
                error,
                true,
                'Check VS Code configuration and try again'
            )
        };
    }
};
