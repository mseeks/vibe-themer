import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getContrastColor, adjustColor, isDarkTheme } from '../utils/colorUtils';

/**
 * Registers the command to export the current theme as a VS Code theme file.
 * @param context The extension context
 * @param lastGeneratedThemeRef Reference to the lastGeneratedTheme variable (should be an object with a 'current' property)
 */
export function registerExportThemeCommand(context: vscode.ExtensionContext, lastGeneratedThemeRef: { current?: any }) {
    const exportThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.exportTheme', async () => {
        try {
            const lastGeneratedTheme = lastGeneratedThemeRef.current;
            if (!lastGeneratedTheme) {
                vscode.window.showErrorMessage('No theme has been generated yet. Please create a theme first.');
                return;
            }

            const themeName = await vscode.window.showInputBox({
                prompt: 'Enter a name for your theme',
                placeHolder: lastGeneratedTheme?.name || 'My Custom Theme',
                value: lastGeneratedTheme?.name || 'My Custom Theme'
            });
            if (!themeName) {
                vscode.window.showInformationMessage('Theme export cancelled.');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Exporting theme...',
                cancellable: false
            }, async () => {
                const { colors } = lastGeneratedTheme;
                const themeData = {
                    name: themeName,
                    type: isDarkTheme(colors.background) ? 'dark' : 'light',
                    colors: {
                        // ...same color assignments as before...
                        "activityBar.background": colors.primary,
                        "activityBar.foreground": getContrastColor(colors.primary),
                        "activityBar.activeForeground": getContrastColor(colors.primary),
                        "activityBar.inactiveForeground": adjustColor(getContrastColor(colors.primary), 0.6),
                        "activityBar.activeBorder": colors.accent,
                        "activityBar.activeBackground": adjustColor(colors.primary, 1.05),
                        "activityBarBadge.background": colors.accent,
                        "activityBarBadge.foreground": getContrastColor(colors.accent),
                        "input.background": adjustColor(colors.background, 0.95),
                        "input.foreground": colors.foreground,
                        "input.border": colors.secondary,
                        "input.placeholderForeground": adjustColor(colors.foreground, 0.6),
                        "inputOption.activeBorder": colors.accent,
                        "inputOption.activeForeground": colors.accent,
                        "inputOption.activeBackground": adjustColor(colors.background, 0.9),
                        "terminal.background": colors.background,
                        "terminal.foreground": colors.foreground,
                        "terminalCursor.background": colors.background,
                        "terminalCursor.foreground": colors.accent,
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
                        "textLink.foreground": colors.accent,
                        "textLink.activeForeground": adjustColor(colors.accent, 1.2),
                        "extensionButton.prominentForeground": getContrastColor(colors.accent),
                        "extensionButton.prominentBackground": colors.accent,
                        "extensionButton.prominentHoverBackground": adjustColor(colors.accent, 1.1),
                        "extensionIcon.starForeground": colors.accent,
                        "extensionIcon.verifiedForeground": colors.accent,
                        "extensionIcon.preReleaseForeground": adjustColor(colors.accent, 0.8),
                        "extensionBadge.remoteBackground": colors.primary,
                        "extensionBadge.remoteForeground": getContrastColor(colors.primary),
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
                        "button.background": colors.accent,
                        "button.foreground": getContrastColor(colors.accent),
                        "button.hoverBackground": adjustColor(colors.accent, 1.1),
                        "titleBar.activeBackground": colors.primary,
                        "titleBar.activeForeground": getContrastColor(colors.primary),
                        "titleBar.inactiveBackground": colors.secondary,
                        "titleBar.inactiveForeground": getContrastColor(colors.secondary),
                        "statusBar.background": colors.secondary,
                        "statusBar.foreground": getContrastColor(colors.secondary),
                        "statusBar.noFolderBackground": colors.accent,
                        "statusBar.noFolderForeground": getContrastColor(colors.accent),
                        "statusBarItem.prominentBackground": colors.accent,
                        "statusBarItem.prominentHoverBackground": colors.accent,
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
                        "editorGroupHeader.tabsBackground": adjustColor(colors.background, 0.9),
                        "tab.activeBackground": colors.background,
                        "tab.activeForeground": colors.accent,
                        "tab.activeBorderTop": colors.accent,
                        "tab.inactiveBackground": adjustColor(colors.background, 0.8),
                        "tab.inactiveForeground": adjustColor(colors.foreground, 0.6),
                        "sideBar.background": colors.background,
                        "sideBar.foreground": colors.foreground,
                        "sideBar.border": colors.secondary,
                        "sideBarTitle.foreground": colors.accent,
                        "sideBarSectionHeader.background": adjustColor(colors.background, 0.9),
                        "sideBarSectionHeader.foreground": colors.accent,
                        "breadcrumb.foreground": colors.foreground,
                        "breadcrumb.focusForeground": colors.accent,
                        "breadcrumb.activeSelectionForeground": colors.accent,
                        "scrollbarSlider.background": adjustColor(colors.primary, 0.3),
                        "scrollbarSlider.hoverBackground": adjustColor(colors.primary, 0.4),
                        "scrollbarSlider.activeBackground": adjustColor(colors.primary, 0.6),
                        "panel.background": colors.background,
                        "panel.border": colors.secondary,
                        "panelTitle.activeForeground": colors.accent,
                        "panelTitle.inactiveForeground": adjustColor(colors.foreground, 0.6),
                        "quickInput.background": colors.background,
                        "quickInput.foreground": colors.foreground,
                        "quickInputTitle.background": adjustColor(colors.background, 0.9),
                        "quickInputList.focusBackground": colors.primary,
                        "quickInputList.focusForeground": getContrastColor(colors.primary),
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
                        "tree.indentGuidesStroke": adjustColor(colors.foreground, 0.4),
                        "focusBorder": colors.accent,
                        "foreground": colors.foreground,
                        "widget.shadow": "#00000030",
                        "selection.background": adjustColor(colors.accent, 0.3),
                    },
                    tokenColors: lastGeneratedTheme?.tokenColors || []
                };

                const themeFileName = `${themeName.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
                const saveUri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.workspace.workspaceFolders
                        ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeFileName)
                        : vscode.Uri.file(path.join(process.env.HOME || process.env.USERPROFILE || '', themeFileName)),
                    filters: { 'JSON Files': ['json'] },
                    saveLabel: 'Export Theme'
                });
                if (saveUri) {
                    await vscode.workspace.fs.writeFile(
                        saveUri,
                        Buffer.from(JSON.stringify(themeData, null, 2))
                    );
                    vscode.window.showInformationMessage(
                        `Theme exported to ${saveUri.fsPath}. To use this theme as a VS Code extension, you'll need to create a theme extension project.`,
                        'Show Instructions'
                    ).then(selection => {
                        if (selection === 'Show Instructions') {
                            const instructionsContent = [
                                '# How to Use Your Exported Theme as a VS Code Extension',
                                '',
                                '1. Create a new VS Code extension project:',
                                '   ```',
                                '   npm install -g yo generator-code',
                                '   mkdir my-theme-extension',
                                '   cd my-theme-extension',
                                '   yo code',
                                '   ```',
                                '   Select "New Color Theme" when prompted',
                                '',
                                '2. Copy your exported theme JSON file to the "themes" folder in your new project',
                                '',
                                '3. Update the package.json file to reference your theme file',
                                '',
                                '4. Package and install your theme extension:',
                                '   ```',
                                '   vsce package',
                                '   code --install-extension my-theme-extension-0.0.1.vsix',
                                '   ```',
                                '',
                                'For more details, see [VS Code Theme Extension Documentation](https://code.visualstudio.com/api/extension-guides/color-theme)'
                            ].join('\n');
                            const tmpFile = path.join(os.tmpdir(), 'theme-instructions.md');
                            fs.writeFileSync(tmpFile, instructionsContent);
                            vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(tmpFile));
                        }
                    });
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to export theme: ${error.message}`);
        }
    });
    context.subscriptions.push(exportThemeCommand);
}
