/**
 * Core domain logic for theme application.
 * Pure functions that encode business rules without side effects.
 */

import * as vscode from 'vscode';
import { 
    ConfigurationScope, 
    ThemeCustomizations, 
    ThemeApplicationResult, 
    ThemeApplicationError,
    TokenColorRule 
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

    // Validate color format (basic hex validation)
    const invalidColors = Object.entries(customizations.colorCustomizations)
        .filter(([_, color]) => typeof color !== 'string' || !color.match(/^#[0-9a-fA-F]{6}$/))
        .map(([key, _]) => key);

    if (invalidColors.length > 0) {
        return {
            success: false,
            error: createThemeApplicationError(
                `Invalid color format for: ${invalidColors.join(', ')}`,
                new Error('Colors must be valid 6-digit hex codes'),
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
