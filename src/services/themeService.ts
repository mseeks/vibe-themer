import { getContrastColor, adjustColor, isDarkTheme } from '../utils/colorUtils';
import * as vscode from 'vscode';
import { forceNotificationStyleRefresh } from './notificationService';

/**
 * Applies the given theme colors and token colors to VS Code settings.t { getContrastColor, adjustColor } from '../utils/colorUtils';
import * as vscode from 'vscode';

/**
 * Applies the given theme colors and token colors to VS Code settings.
 * @param colors The normalized color palette
 * @param tokenColors The token color rules (optional)
 * @param themeDescription The theme description (for notifications)
 */
export async function applyThemeCustomizations(
    colors: { primary: string; secondary: string; accent: string; background: string; foreground: string },
    tokenColors: any[] | undefined,
    themeDescription: string
) {
    const config = vscode.workspace.getConfiguration();
    
    // Reset theme customizations first to avoid conflicts
    const allThemesNotificationOverride = {
        "[*]": {
            "notification.background": colors.background,
            "notification.foreground": colors.foreground,
            "notification.buttonBackground": colors.accent,
            "notification.buttonForeground": getContrastColor(colors.accent),
            "notification.buttonHoverBackground": adjustColor(colors.accent, 1.1),
            "notification.infoBackground": adjustColor(colors.background, 1.05),
            "notification.infoForeground": colors.foreground,
            "notification.warningBackground": adjustColor(colors.accent, 0.9),
            "notification.warningForeground": getContrastColor(adjustColor(colors.accent, 0.9)),
            "notification.errorBackground": "#ff6347",
            "notification.errorForeground": "#ffffff"
        }
    };
    
    // Apply the [*] notification override first
    await config.update('workbench.colorCustomizations', allThemesNotificationOverride, vscode.ConfigurationTarget.Global);
    
    const currentColorCustomizations = config.get('workbench.colorCustomizations') || {};
    const newCustomizations = {
        ...currentColorCustomizations,
        // Activity Bar
        "activityBar.background": colors.primary,
        "activityBar.foreground": getContrastColor(colors.primary),
        "activityBar.activeForeground": getContrastColor(colors.primary),
        "activityBar.inactiveForeground": adjustColor(getContrastColor(colors.primary), 0.6),
        "activityBar.activeBorder": colors.accent,
        "activityBar.activeBackground": adjustColor(colors.primary, 1.05),
        "activityBarBadge.background": colors.accent,
        "activityBarBadge.foreground": getContrastColor(colors.accent),
        // Input fields
        "input.background": adjustColor(colors.background, 0.95),
        "input.foreground": colors.foreground,
        "input.border": colors.secondary,
        "input.placeholderForeground": adjustColor(colors.foreground, 0.6),
        "inputOption.activeBorder": colors.accent,
        "inputOption.activeForeground": colors.accent,
        "inputOption.activeBackground": adjustColor(colors.background, 0.9),
        "inputValidation.errorBackground": "#ff000033",
        "inputValidation.errorBorder": "#ff0000",
        // Terminal
        "terminal.background": colors.background,
        "terminal.foreground": colors.foreground,
        "terminalCursor.background": colors.background,
        "terminalCursor.foreground": colors.accent,
        "terminal.ansiBlack": adjustColor(colors.background, 0.5),
        "terminal.ansiBlue": colors.accent,
        "terminal.ansiCyan": adjustColor(colors.accent, 1.2),
        "terminal.ansiGreen": adjustColor(colors.secondary, 1.3),
        "terminal.ansiMagenta": adjustColor(colors.primary, 1.2),
        "terminal.ansiRed": "#ff6347",
        "terminal.ansiYellow": "#ffd700",
        "terminal.ansiWhite": colors.foreground,
        "terminal.ansiBrightBlack": adjustColor(colors.background, 0.7),
        "terminal.ansiBrightBlue": adjustColor(colors.accent, 1.3),
        "terminal.ansiBrightCyan": adjustColor(colors.accent, 1.4),
        "terminal.ansiBrightGreen": adjustColor(colors.secondary, 1.5),
        "terminal.ansiBrightMagenta": adjustColor(colors.primary, 1.4),
        "terminal.ansiBrightRed": "#ff7f50",
        "terminal.ansiBrightYellow": "#ffd700",
        "terminal.ansiBrightWhite": "#ffffff",
        // Lists and trees
        "list.activeSelectionBackground": colors.primary,
        "list.activeSelectionForeground": getContrastColor(colors.primary),
        "list.hoverBackground": adjustColor(colors.background, 0.95),
        "list.hoverForeground": colors.foreground,
        "list.inactiveSelectionBackground": adjustColor(colors.primary, 0.7),
        "list.inactiveSelectionForeground": getContrastColor(adjustColor(colors.primary, 0.7)),
        "list.highlightForeground": colors.accent,
        "list.focusHighlightForeground": colors.accent,
        "list.focusForeground": getContrastColor(colors.primary),
        "list.focusBackground": adjustColor(colors.primary, 0.8),
        // Links
        "textLink.foreground": colors.accent,
        "textLink.activeForeground": adjustColor(colors.accent, 1.2),
        "pickerGroup.foreground": colors.accent,
        "pickerGroup.border": colors.secondary,
        // Extension view
        "extensionButton.prominentForeground": getContrastColor(colors.accent),
        "extensionButton.prominentBackground": colors.accent,
        "extensionButton.prominentHoverBackground": adjustColor(colors.accent, 1.1),
        "extensionIcon.starForeground": colors.accent,
        "extensionIcon.verifiedForeground": colors.accent,
        "extensionIcon.preReleaseForeground": adjustColor(colors.accent, 0.8),
        "extensionBadge.remoteBackground": colors.primary,
        "extensionBadge.remoteForeground": getContrastColor(colors.primary),
        // Search
        "searchEditor.findMatchBackground": adjustColor(colors.accent, 0.3),
        "searchEditor.findMatchBorder": colors.accent,
        "search.resultsInfoForeground": colors.accent,
        "search.matchBackground": adjustColor(colors.accent, 0.3),
        "search.matchBorder": colors.accent,
        "searchMatch.highlight": adjustColor(colors.accent, 0.3),
        "editor.findMatchBackground": adjustColor(colors.accent, 0.3),
        "editor.findMatchBorder": colors.accent,
        "editor.findMatchHighlightBackground": adjustColor(colors.accent, 0.2),
        "editor.findRangeHighlightBackground": adjustColor(colors.accent, 0.1),
        // Buttons
        "button.background": colors.accent,
        "button.foreground": getContrastColor(colors.accent),
        "button.hoverBackground": adjustColor(colors.accent, 1.1),
        // Title Bar
        "titleBar.activeBackground": colors.primary,
        "titleBar.activeForeground": getContrastColor(colors.primary),
        "titleBar.inactiveBackground": colors.secondary,
        "titleBar.inactiveForeground": getContrastColor(colors.secondary),
        // Status Bar
        "statusBar.background": colors.secondary,
        "statusBar.foreground": getContrastColor(colors.secondary),
        "statusBar.noFolderBackground": colors.accent,
        "statusBar.noFolderForeground": getContrastColor(colors.accent),
        "statusBarItem.prominentBackground": colors.accent,
        "statusBarItem.prominentHoverBackground": colors.accent,
        // Editor
        "editor.background": colors.background,
        "editor.foreground": colors.foreground,
        "editorLineNumber.foreground": adjustColor(colors.foreground, 0.5),
        "editorLineNumber.activeForeground": colors.foreground,
        "editorCursor.foreground": colors.accent,
        "editor.selectionBackground": adjustColor(colors.accent, 0.3),
        "editor.selectionHighlightBackground": adjustColor(colors.accent, 0.15),
        "editor.lineHighlightBackground": adjustColor(colors.background, colors.background === "#ffffff" ? 0.95 : 1.1),
        "editor.lineHighlightBorder": "transparent",
        "editorGutter.background": adjustColor(colors.background, 0.98),
        "editorGutter.modifiedBackground": adjustColor(colors.accent, 0.8),
        "editorGutter.addedBackground": adjustColor(colors.secondary, 1.3),
        "editorGutter.deletedBackground": "#ff6347",
        "editorSuggestWidget.background": colors.background,
        "editorSuggestWidget.foreground": colors.foreground,
        "editorSuggestWidget.highlightForeground": colors.accent,
        "editorSuggestWidget.selectedBackground": adjustColor(colors.accent, 0.2),
        // Editor Tabs and Groups
        "editorGroupHeader.tabsBackground": adjustColor(colors.background, 0.9),
        "tab.activeBackground": colors.background,
        "tab.activeForeground": colors.accent,
        "tab.activeBorderTop": colors.accent,
        "tab.inactiveBackground": adjustColor(colors.background, 0.8),
        "tab.inactiveForeground": adjustColor(colors.foreground, 0.6),
        // Sidebar
        "sideBar.background": colors.background,
        "sideBar.foreground": colors.foreground,
        "sideBar.border": colors.secondary,
        "sideBarTitle.foreground": colors.accent,
        "sideBarSectionHeader.background": adjustColor(colors.background, 0.9),
        "sideBarSectionHeader.foreground": colors.accent,
        // Breadcrumbs
        "breadcrumb.foreground": colors.foreground,
        "breadcrumb.focusForeground": colors.accent,
        "breadcrumb.activeSelectionForeground": colors.accent,
        // Scrollbar
        "scrollbarSlider.background": adjustColor(colors.primary, 0.3),
        "scrollbarSlider.hoverBackground": adjustColor(colors.primary, 0.4),
        "scrollbarSlider.activeBackground": adjustColor(colors.primary, 0.6),
        // Panel
        "panel.background": colors.background,
        "panel.border": colors.secondary,
        "panelTitle.activeForeground": colors.accent,
        "panelTitle.inactiveForeground": adjustColor(colors.foreground, 0.6),
        // Quick Pick (Command Palette)
        "quickInput.background": colors.background,
        "quickInput.foreground": colors.foreground,
        "quickInputTitle.background": adjustColor(colors.background, 0.9),
        "quickInputList.focusBackground": colors.primary,
        "quickInputList.focusForeground": getContrastColor(colors.primary),
        // Settings UI
        "settings.headerForeground": colors.accent,
        "settings.modifiedItemIndicator": colors.accent,
        "settings.dropdownBackground": colors.background,
        "settings.dropdownForeground": colors.foreground,
        "settings.dropdownBorder": colors.secondary,
        "settings.checkboxBackground": colors.background,
        "settings.checkboxForeground": colors.foreground,
        "settings.checkboxBorder": colors.secondary,
        "settings.textInputBackground": colors.background,
        "settings.textInputForeground": colors.foreground,
        "settings.textInputBorder": colors.secondary,
        "settings.numberInputBackground": colors.background,
        "settings.numberInputForeground": colors.foreground,
        "settings.numberInputBorder": colors.secondary,
        // Tree View
        "tree.indentGuidesStroke": adjustColor(colors.foreground, 0.4),
        "focusBorder": colors.accent,
        "foreground": colors.foreground,
        "widget.shadow": "#00000030",
        "selection.background": adjustColor(colors.accent, 0.3),
        // Notification colors - duplicated in [*] override at the top
        "notification.background": colors.background,
        "notification.foreground": colors.foreground,
        "notification.buttonBackground": colors.accent,
        "notification.buttonForeground": getContrastColor(colors.accent),
        "notification.buttonHoverBackground": adjustColor(colors.accent, 1.1),
        "notification.infoBackground": adjustColor(colors.background, 1.05),
        "notification.infoForeground": colors.foreground,
        "notification.warningBackground": adjustColor(colors.accent, 0.9),
        "notification.warningForeground": getContrastColor(adjustColor(colors.accent, 0.9)),
        "notification.errorBackground": "#ff6347",
        "notification.errorForeground": "#ffffff",
        
        // Ensure notification center colors also match
        "notificationCenter.border": colors.secondary,
        "notificationCenterHeader.foreground": getContrastColor(colors.secondary),
        "notificationCenterHeader.background": colors.secondary,
        "notificationToast.border": colors.secondary,
        "notifications.foreground": colors.foreground,
        "notifications.background": colors.background,
        "notifications.border": colors.secondary,
    };
    const configTarget = vscode.workspace.workspaceFolders 
        ? vscode.ConfigurationTarget.Workspace 
        : vscode.ConfigurationTarget.Global;
    try {
        // Force Global settings first
        await config.update('workbench.colorCustomizations', newCustomizations, vscode.ConfigurationTarget.Global);
        
        // Also apply to workspace if it exists
        if (vscode.workspace.workspaceFolders) {
            await config.update('workbench.colorCustomizations', newCustomizations, vscode.ConfigurationTarget.Workspace);
        }
        
        if (tokenColors && tokenColors.length > 0) {
            const currentTokenColorCustomizations = config.get('editor.tokenColorCustomizations') || {};
            const newTokenColorCustomizations = {
                ...currentTokenColorCustomizations,
                "textMateRules": tokenColors
            };
            await config.update('editor.tokenColorCustomizations', newTokenColorCustomizations, vscode.ConfigurationTarget.Global);
            if (vscode.workspace.workspaceFolders) {
                await config.update('editor.tokenColorCustomizations', newTokenColorCustomizations, vscode.ConfigurationTarget.Workspace);
            }
            
            // Force refresh the notification styles
            forceNotificationStyleRefresh();
            
            // Show a test notification with the new colors
            setTimeout(() => {
                const testNotification = vscode.window.showInformationMessage(
                    `Theme updated with syntax highlighting based on: "${themeDescription}"`,
                    { modal: false },
                    'Reload Window',
                    'Test Notification'
                ).then(selection => {
                    if (selection === 'Reload Window') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    } else if (selection === 'Test Notification') {
                        // Show additional notifications to test styling
                        vscode.window.showWarningMessage(`This is a test warning notification using theme colors`);
                        vscode.window.showErrorMessage(`This is a test error notification using theme colors`);
                    }
                });
            }, 1000);
        } else {
            // Force refresh the notification styles
            forceNotificationStyleRefresh();
            
            // Show a test notification with the new colors
            setTimeout(() => {
                const testNotification = vscode.window.showInformationMessage(
                    `Theme updated based on: "${themeDescription}"`,
                    { modal: false },
                    'Reload Window',
                    'Test Notification'
                ).then(selection => {
                    if (selection === 'Reload Window') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    } else if (selection === 'Test Notification') {
                        // Show additional notifications to test styling
                        vscode.window.showWarningMessage(`This is a test warning notification using theme colors`);
                        vscode.window.showErrorMessage(`This is a test error notification using theme colors`);
                    }
                });
            }, 1000);
        }
    } catch (updateError) {
        // If updating workspace settings fails, try user settings
        if (configTarget === vscode.ConfigurationTarget.Workspace) {
            try {
                await config.update('workbench.colorCustomizations', newCustomizations, vscode.ConfigurationTarget.Global);
                if (tokenColors && tokenColors.length > 0) {
                    const currentTokenColorCustomizations = config.get('editor.tokenColorCustomizations') || {};
                    const newTokenColorCustomizations = {
                        ...currentTokenColorCustomizations,
                        "textMateRules": tokenColors
                    };
                    await config.update('editor.tokenColorCustomizations', newTokenColorCustomizations, vscode.ConfigurationTarget.Global);
                }
                vscode.window.showInformationMessage(`Theme updated in user settings based on: "${themeDescription}"`);
            } catch (globalError: any) {
                throw new Error(`Failed to update settings: ${globalError.message}`);
            }
        } else {
            throw updateError;
        }
    }
}