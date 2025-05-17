// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { normalizeHexColor, getContrastColor, adjustColor, isDarkTheme } from './utils/colorUtils';
import { initializeOpenAIClient, getOpenAIClient } from './services/openaiService';
import { loadPromptTemplates, PromptTemplates } from './services/promptService';

// Reference to the OpenAI client instance
let openai: OpenAI | undefined;

// Interface for theme data
interface ThemeData {
    name: string;
    description: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        foreground: string;
    };
    tokenColors?: any;
}

// Store the last generated theme
let lastGeneratedTheme: ThemeData | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "dynamic-theme-changer" is now active!');

    // Load prompt templates
    let promptTemplates: PromptTemplates;
    try {
        promptTemplates = loadPromptTemplates(context);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Error loading prompt templates: ${error.message}`);
        return; // Deactivate if templates can't be loaded
    }

    // Initialize OpenAI client
    const initialized = await initializeOpenAIClient(context);
    if (!initialized) {
        return; // Deactivate if no key is provided
    }
    
    // Get the initialized OpenAI client
    openai = getOpenAIClient();

    // Register command to change theme based on natural language description
    let changeThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.changeTheme', async () => {
        // Make sure we have the OpenAI client
        if (!openai) {
            vscode.window.showErrorMessage('OpenAI client not initialized. Please ensure API key is set.');
            // Attempt to re-initialize or prompt for key again
            const initialized = await initializeOpenAIClient(context);
            if (!initialized) {
                return; // Exit if initialization failed
            }
            // Get the initialized OpenAI client
            openai = getOpenAIClient();
        }

        const themeDescription = await vscode.window.showInputBox({
            prompt: 'Describe the theme you want (e.g., "warm and cozy", "futuristic dark blue")',
            placeHolder: 'e.g., "ocean vibes"'
        });

        if (!themeDescription) {
            vscode.window.showInformationMessage('No theme description provided.');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating theme colors...",
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: "Generating base colors..." });
                    
                    // First create base colors
                    const completion = await openai!.chat.completions.create({
                        model: "o3",
                        messages: [
                            { role: "system", content: promptTemplates.baseColorsPrompt },
                            { role: "user", content: themeDescription }
                        ],
                        max_completion_tokens: 2000
                    });

                    const colorResponse = completion.choices[0]?.message?.content?.trim();
                    console.log('Raw color response from OpenAI:', colorResponse);
                    
                    try {
                        // Define ColorPalette type for proper typing
                        interface ColorPalette {
							primary?: string;
							secondary?: string;
							accent?: string;
							background?: string;
							foreground?: string;
							[key: string]: string | undefined;
						}
						
						// Parse the JSON response with enhanced error handling
						let colorPalette: ColorPalette = {};
						try {
							// First attempt: direct JSON parsing
							console.log('Attempting to parse JSON directly');
							colorPalette = JSON.parse(colorResponse || '{}') as ColorPalette;
						} catch (jsonError) {
							console.error('Failed to parse JSON:', jsonError);
							
							// Try to extract a JSON object if the model included extra text
							const jsonMatch = colorResponse?.match(/\{[\s\S]*\}/);
							if (jsonMatch) {
								try {
									console.log('Attempting to parse extracted JSON:', jsonMatch[0]);
									colorPalette = JSON.parse(jsonMatch[0]);
								} catch (extractError) {
									console.error('Failed to parse extracted JSON:', extractError);
									
									// Try more aggressive fixes for common JSON issues
									let fixedJson = jsonMatch[0];
									console.log('Attempting to fix JSON formatting issues');
									
									// Fix missing quotes around property names
									fixedJson = fixedJson.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, '$1"$2":');
									
									// Fix single quotes instead of double quotes
									fixedJson = fixedJson.replace(/'/g, '"');
									
									// Remove trailing commas
									fixedJson = fixedJson.replace(/,\s*(\}|\])/g, '$1');
									
									// Remove comments
									fixedJson = fixedJson.replace(/\/\/.*$/gm, '');
									
									console.log('Fixed JSON attempt:', fixedJson);
									
									try {
										colorPalette = JSON.parse(fixedJson);
										console.log('Successfully parsed fixed JSON');
									} catch (fixError) {
										console.error('Failed to parse fixed JSON:', fixError);
										
										// Last resort: manual extraction of color values using regex
										console.log('Attempting manual extraction of color values');
										colorPalette = {};
										
										// Extract each color property separately using regex
										const primaryMatch = colorResponse?.match(/primary['":\s]+([#0-9a-zA-Z]+)/);
										const secondaryMatch = colorResponse?.match(/secondary['":\s]+([#0-9a-zA-Z]+)/);
										const accentMatch = colorResponse?.match(/accent['":\s]+([#0-9a-zA-Z]+)/);
										const backgroundMatch = colorResponse?.match(/background['":\s]+([#0-9a-zA-Z]+)/);
										const foregroundMatch = colorResponse?.match(/foreground['":\s]+([#0-9a-zA-Z]+)/);
										
										if (primaryMatch) colorPalette.primary = primaryMatch[1];
										if (secondaryMatch) colorPalette.secondary = secondaryMatch[1];
										if (accentMatch) colorPalette.accent = accentMatch[1];
										if (backgroundMatch) colorPalette.background = backgroundMatch[1];
										if (foregroundMatch) colorPalette.foreground = foregroundMatch[1];
										
										console.log('Manually extracted values:', colorPalette);
										
										// Check if we found at least some values
										if (Object.keys(colorPalette).length === 0) {
											throw new Error('Could not extract any color values from API response');
										}
									}
								}
							} else {
								// Try a last-ditch effort to extract individual color values
								console.log('No JSON object found, attempting manual extraction');
								colorPalette = {};
								
								// Extract each color property separately using regex
								const primaryMatch = colorResponse?.match(/primary['":\s]+([#0-9a-zA-Z]+)/);
								const secondaryMatch = colorResponse?.match(/secondary['":\s]+([#0-9a-zA-Z]+)/);
								const accentMatch = colorResponse?.match(/accent['":\s]+([#0-9a-zA-Z]+)/);
								const backgroundMatch = colorResponse?.match(/background['":\s]+([#0-9a-zA-Z]+)/);
								const foregroundMatch = colorResponse?.match(/foreground['":\s]+([#0-9a-zA-Z]+)/);
								
								if (primaryMatch) colorPalette.primary = primaryMatch[1];
								if (secondaryMatch) colorPalette.secondary = secondaryMatch[1];
								if (accentMatch) colorPalette.accent = accentMatch[1];
								if (backgroundMatch) colorPalette.background = backgroundMatch[1];
								if (foregroundMatch) colorPalette.foreground = foregroundMatch[1];
								
								console.log('Manually extracted values:', colorPalette);
								
								// Check if we found at least some values
								if (Object.keys(colorPalette).length === 0) {
									throw new Error('Could not extract any color values from API response');
								}
							}
						}

						// Log raw color values before processing
						console.log('Raw color palette from OpenAI:', colorPalette);
						
						// Extract colors from palette with proper defaults
						const rawPrimary = colorPalette?.primary;
						const rawSecondary = colorPalette?.secondary;
						const rawAccent = colorPalette?.accent;
						const rawBackground = colorPalette?.background;
						const rawForeground = colorPalette?.foreground;
						
						// Log each raw color before normalization
						console.log('Raw color values before normalization:', { 
							primary: rawPrimary, 
							secondary: rawSecondary, 
							accent: rawAccent, 
							background: rawBackground, 
							foreground: rawForeground 
						});
						
						// Set defaults for missing colors
						const defaultColors = {
							primary: '#007acc',    // VS Code blue
							secondary: '#444444',  // Dark gray
							accent: '#ff8c00',     // Orange accent
							background: '#1e1e1e', // Dark theme background
							foreground: '#d4d4d4'  // Dark theme text
						};
						
						// Attempt to normalize/fix color formats
						let primary = normalizeHexColor(rawPrimary || defaultColors.primary);
						let secondary = normalizeHexColor(rawSecondary || defaultColors.secondary);
						let accent = normalizeHexColor(rawAccent || defaultColors.accent);
						let background = normalizeHexColor(rawBackground || defaultColors.background);
						let foreground = normalizeHexColor(rawForeground || defaultColors.foreground);
						
						console.log('Normalized color values:', { primary, secondary, accent, background, foreground });

						// Check color contrast and fix if needed
						const contrastCheck = (bg: string, fg: string, name: string) => {
							// Simple check for minimum contrast - if both are too similar, adjust one
							bg = bg.replace('#', '');
							fg = fg.replace('#', '');
							const bgR = parseInt(bg.substring(0, 2), 16);
							const bgG = parseInt(bg.substring(2, 4), 16);
							const bgB = parseInt(bg.substring(4, 6), 16);
							const fgR = parseInt(fg.substring(0, 2), 16);
							const fgG = parseInt(fg.substring(2, 4), 16);
							const fgB = parseInt(fg.substring(4, 6), 16);
							
							const luminanceDiff = Math.abs(
								(0.299 * bgR + 0.587 * bgG + 0.114 * bgB) - 
								(0.299 * fgR + 0.587 * fgG + 0.114 * fgB)
							);
							
							if (luminanceDiff < 75) { // Threshold for readable contrast
								console.log(`Increasing contrast for ${name}, current luminance diff: ${luminanceDiff}`);
								// Adjust foreground color by 20% in each channel to improve contrast
								const adjustedFg = '#' + [fgR, fgG, fgB].map(val => {
									if (val < 128) {
										return Math.max(0, val - 50).toString(16).padStart(2, '0');
									} else {
										return Math.min(255, val + 50).toString(16).padStart(2, '0');
									}
								}).join('');
								console.log(`Adjusted ${name} foreground from #${fg} to ${adjustedFg} for better contrast`);
								return adjustedFg;
							}
							return '#' + fg;
						};
						
						// Ensure foreground has good contrast with background
						foreground = contrastCheck(background, foreground, 'foreground');
						
						// Validate all colors with more flexible pattern (ensure it starts with # and has valid hex chars)
						const validHexPattern = /^#[0-9a-f]{6}$/i;
						let invalidColors = [];
						
						// Check each color after normalization
						if (!validHexPattern.test(primary)) invalidColors.push(`primary: ${primary}`);
						if (!validHexPattern.test(secondary)) invalidColors.push(`secondary: ${secondary}`);
						if (!validHexPattern.test(accent)) invalidColors.push(`accent: ${accent}`);
						if (!validHexPattern.test(background)) invalidColors.push(`background: ${background}`);
						if (!validHexPattern.test(foreground)) invalidColors.push(`foreground: ${foreground}`);
						
						// If there are still invalid colors after normalization, use fallbacks but continue
						if (invalidColors.length > 0) {
							console.warn(`Some colors remained invalid after normalization: ${invalidColors.join(', ')}`);
							console.warn('Using fallback colors for invalid values');
							
							// Apply defaults for any invalid colors
							if (!validHexPattern.test(primary)) primary = defaultColors.primary;
							if (!validHexPattern.test(secondary)) secondary = defaultColors.secondary;
							if (!validHexPattern.test(accent)) accent = defaultColors.accent;
							if (!validHexPattern.test(background)) background = defaultColors.background;
							if (!validHexPattern.test(foreground)) foreground = defaultColors.foreground;
							
							// Ensure everything is lowercase
							primary = primary.toLowerCase();
							secondary = secondary.toLowerCase();
							accent = accent.toLowerCase();
							background = background.toLowerCase();
							foreground = foreground.toLowerCase();
							
							// Show warning to user but continue
							vscode.window.showWarningMessage('Some colors were invalid and have been replaced with fallbacks.');
						}
						
						// Update the colorPalette with normalized values
						colorPalette = { primary, secondary, accent, background, foreground };
						
						// Store the theme data
						lastGeneratedTheme = {
							name: `Custom Theme - ${themeDescription}`,
							description: `Theme generated from: "${themeDescription}"`,
							colors: {
								primary,
								secondary,
								accent,
								background,
								foreground
							}
						};

						progress.report({ message: "Generating syntax highlighting colors..." });
						
						// Now generate token colors for syntax highlighting
						const tokenCompletion = await openai!.chat.completions.create({
							model: "o3",
							messages: [
								{ role: "system", content: promptTemplates.tokenColorsPrompt },
								{ role: "user", content: `Create syntax highlighting colors based on this theme palette: primary=${primary}, secondary=${secondary}, accent=${accent}, background=${background}, foreground=${foreground}. Theme description: ${themeDescription}` }
							],
							max_completion_tokens: 2000
						});
						
						const tokenColorsResponse = tokenCompletion.choices[0]?.message?.content?.trim();
						let tokenColors;
						
						try {
							// Parse the JSON response for token colors
							tokenColors = JSON.parse(tokenColorsResponse || '[]');
							
							// Store token colors in theme data
							if (lastGeneratedTheme) {
								lastGeneratedTheme.tokenColors = tokenColors;
							}
						} catch (tokenError: any) {
							console.error('Token color parsing error:', tokenError);
							vscode.window.showWarningMessage('Could not generate syntax highlighting colors. Using basic theme only.');
							tokenColors = [];
						}

						// Apply the colors to VS Code theme
						const config = vscode.workspace.getConfiguration();
						const currentColorCustomizations = config.get('workbench.colorCustomizations') || {};
						
						const newCustomizations = {
							...currentColorCustomizations,
							// Activity Bar
							"activityBar.background": primary,
							"activityBar.foreground": getContrastColor(primary),
							"activityBar.activeForeground": getContrastColor(primary),
							"activityBar.inactiveForeground": adjustColor(getContrastColor(primary), 0.6),
							"activityBar.activeBorder": accent,
							"activityBar.activeBackground": adjustColor(primary, 1.05),
							"activityBarBadge.background": accent,
							"activityBarBadge.foreground": getContrastColor(accent),
							
							// Input fields
							"input.background": adjustColor(background, 0.95),
							"input.foreground": foreground,
							"input.border": secondary,
							"input.placeholderForeground": adjustColor(foreground, 0.6),
							"inputOption.activeBorder": accent,
							"inputOption.activeForeground": accent,
							"inputOption.activeBackground": adjustColor(background, 0.9),
							"inputValidation.errorBackground": "#ff000033",
							"inputValidation.errorBorder": "#ff0000",
							
							// Terminal
							"terminal.background": background,
							"terminal.foreground": foreground,
							"terminalCursor.background": background,
							"terminalCursor.foreground": accent,
							"terminal.ansiBlack": adjustColor(background, 0.5),
							"terminal.ansiBlue": accent,
							"terminal.ansiCyan": adjustColor(accent, 1.2),
							"terminal.ansiGreen": adjustColor(secondary, 1.3),
							"terminal.ansiMagenta": adjustColor(primary, 1.2),
							"terminal.ansiRed": "#ff6347",
							"terminal.ansiYellow": "#ffd700",
							"terminal.ansiWhite": foreground,
							"terminal.ansiBrightBlack": adjustColor(background, 0.7),
							"terminal.ansiBrightBlue": adjustColor(accent, 1.3),
							"terminal.ansiBrightCyan": adjustColor(accent, 1.4),
							"terminal.ansiBrightGreen": adjustColor(secondary, 1.5),
							"terminal.ansiBrightMagenta": adjustColor(primary, 1.4),
							"terminal.ansiBrightRed": "#ff7f50",
							"terminal.ansiBrightYellow": "#ffd700",
							"terminal.ansiBrightWhite": "#ffffff",
							
							// Lists and trees
							"list.activeSelectionBackground": primary,
							"list.activeSelectionForeground": getContrastColor(primary),
							"list.hoverBackground": adjustColor(background, 0.95),
							"list.hoverForeground": foreground,
							"list.inactiveSelectionBackground": adjustColor(primary, 0.7),
							"list.inactiveSelectionForeground": getContrastColor(adjustColor(primary, 0.7)),
							"list.highlightForeground": accent,
							"list.focusHighlightForeground": accent,
							"list.focusForeground": getContrastColor(primary),
							"list.focusBackground": adjustColor(primary, 0.8),
							
							// Links - Fix for extension manager and other links
							"textLink.foreground": accent,
							"textLink.activeForeground": adjustColor(accent, 1.2),
							"pickerGroup.foreground": accent,
							"pickerGroup.border": secondary,
							
							// Extension view
							"extensionButton.prominentForeground": getContrastColor(accent),
							"extensionButton.prominentBackground": accent,
							"extensionButton.prominentHoverBackground": adjustColor(accent, 1.1),
							"extensionIcon.starForeground": accent,
							"extensionIcon.verifiedForeground": accent,
							"extensionIcon.preReleaseForeground": adjustColor(accent, 0.8),
							"extensionBadge.remoteBackground": primary,
							"extensionBadge.remoteForeground": getContrastColor(primary),
							
							// Search
							"searchEditor.findMatchBackground": adjustColor(accent, 0.3),
							"searchEditor.findMatchBorder": accent,
							"search.resultsInfoForeground": accent,
							"search.matchBackground": adjustColor(accent, 0.3),
							"search.matchBorder": accent,
							"searchMatch.highlight": adjustColor(accent, 0.3),
							"editor.findMatchBackground": adjustColor(accent, 0.3),
							"editor.findMatchBorder": accent,
							"editor.findMatchHighlightBackground": adjustColor(accent, 0.2),
							"editor.findRangeHighlightBackground": adjustColor(accent, 0.1),
							
							// Buttons
							"button.background": accent,
							"button.foreground": getContrastColor(accent),
							"button.hoverBackground": adjustColor(accent, 1.1),
							
							// Title Bar
							"titleBar.activeBackground": primary,
							"titleBar.activeForeground": getContrastColor(primary),
							"titleBar.inactiveBackground": secondary,
							"titleBar.inactiveForeground": getContrastColor(secondary),
							
							// Status Bar
							"statusBar.background": secondary,
							"statusBar.foreground": getContrastColor(secondary),
							"statusBar.noFolderBackground": accent,
							"statusBar.noFolderForeground": getContrastColor(accent),
							"statusBarItem.prominentBackground": accent,
							"statusBarItem.prominentHoverBackground": accent,
							
							// Editor
							"editor.background": background,
							"editor.foreground": foreground,
							"editorLineNumber.foreground": adjustColor(foreground, 0.5),
							"editorLineNumber.activeForeground": foreground, // Active line number highlighting
							"editorCursor.foreground": accent,
							"editor.selectionBackground": adjustColor(accent, 0.3),
							"editor.selectionHighlightBackground": adjustColor(accent, 0.15),
							"editor.lineHighlightBackground": adjustColor(background, background === "#ffffff" ? 0.95 : 1.1), // Line highlight
							"editor.lineHighlightBorder": "transparent",
							"editorGutter.background": adjustColor(background, 0.98), // Gutter background
							"editorGutter.modifiedBackground": adjustColor(accent, 0.8),
							"editorGutter.addedBackground": adjustColor(secondary, 1.3),
							"editorGutter.deletedBackground": "#ff6347",
							"editorSuggestWidget.background": background,
							"editorSuggestWidget.foreground": foreground,
							"editorSuggestWidget.highlightForeground": accent,
							"editorSuggestWidget.selectedBackground": adjustColor(accent, 0.2),
							
							// Editor Tabs and Groups
							"editorGroupHeader.tabsBackground": adjustColor(background, 0.9),
							"tab.activeBackground": background,
							"tab.activeForeground": accent,
							"tab.activeBorderTop": accent,
							"tab.inactiveBackground": adjustColor(background, 0.8),
							"tab.inactiveForeground": adjustColor(foreground, 0.6),
							
							// Sidebar
							"sideBar.background": background,
							"sideBar.foreground": foreground,
							"sideBar.border": secondary,
							"sideBarTitle.foreground": accent,
							"sideBarSectionHeader.background": adjustColor(background, 0.9),
							"sideBarSectionHeader.foreground": accent,
							
							// Breadcrumbs
							"breadcrumb.foreground": foreground,
							"breadcrumb.focusForeground": accent,
							"breadcrumb.activeSelectionForeground": accent,
							
							// Scrollbar
							"scrollbarSlider.background": adjustColor(primary, 0.3),
							"scrollbarSlider.hoverBackground": adjustColor(primary, 0.4),
							"scrollbarSlider.activeBackground": adjustColor(primary, 0.6),
							
							// Panel
							"panel.background": background,
							"panel.border": secondary,
							"panelTitle.activeForeground": accent,
							"panelTitle.inactiveForeground": adjustColor(foreground, 0.6),
							
							// Quick Pick (Command Palette)
							"quickInput.background": background,
							"quickInput.foreground": foreground,
							"quickInputTitle.background": adjustColor(background, 0.9),
							"quickInputList.focusBackground": primary,
							"quickInputList.focusForeground": getContrastColor(primary),
							
							// Settings UI
							"settings.headerForeground": accent,
							"settings.modifiedItemIndicator": accent,
							"settings.dropdownBackground": background,
							"settings.dropdownForeground": foreground,
							"settings.dropdownBorder": secondary,
							"settings.checkboxBackground": background,
							"settings.checkboxForeground": foreground,
							"settings.checkboxBorder": secondary,
							"settings.textInputBackground": background,
							"settings.textInputForeground": foreground,
							"settings.textInputBorder": secondary,
							"settings.numberInputBackground": background,
							"settings.numberInputForeground": foreground,
							"settings.numberInputBorder": secondary,
							
							// Tree View (File Explorer, etc.)
							"tree.indentGuidesStroke": adjustColor(foreground, 0.4),
							"focusBorder": accent,
							"foreground": foreground,
							"widget.shadow": "#00000030",
							"selection.background": adjustColor(accent, 0.3),
						};
						
						// Choose appropriate configuration target based on whether a workspace is open
						const configTarget = vscode.workspace.workspaceFolders 
							? vscode.ConfigurationTarget.Workspace 
							: vscode.ConfigurationTarget.Global;

						try {
							await config.update('workbench.colorCustomizations', newCustomizations, configTarget);
							
							// Apply token color customizations
							if (tokenColors && tokenColors.length > 0) {
								const currentTokenColorCustomizations = config.get('editor.tokenColorCustomizations') || {};
								
								// Create the updated token color customizations
								const newTokenColorCustomizations = {
									...currentTokenColorCustomizations,
									"textMateRules": tokenColors
								};
								
								await config.update('editor.tokenColorCustomizations', newTokenColorCustomizations, configTarget);
								vscode.window.showInformationMessage(`Theme updated with syntax highlighting based on: "${themeDescription}"`);
							} else {
								vscode.window.showInformationMessage(`Theme updated based on: "${themeDescription}"`);
							}
						} catch (updateError) {
							// If updating workspace settings fails, try user settings
							if (configTarget === vscode.ConfigurationTarget.Workspace) {
								try {
									await config.update('workbench.colorCustomizations', newCustomizations, vscode.ConfigurationTarget.Global);
									
									// Also update token colors at global level
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
					} catch (error: any) {
						console.error('Color parsing error:', error);
						vscode.window.showErrorMessage(`Could not generate a valid color theme. Error: ${error.message}`);
					}
				} catch (error: any) {
					console.error('OpenAI API error:', error);
					vscode.window.showErrorMessage(`Error generating theme: ${error.message}`);
				}
			});
		} catch (error: any) {
			console.error('Extension error:', error);
			vscode.window.showErrorMessage(`Error communicating with OpenAI: ${error.message}`);
		}
	});

	context.subscriptions.push(changeThemeCommand);

	// Command to clear API key
	let clearApiKeyCommand = vscode.commands.registerCommand('dynamicThemeChanger.clearApiKey', async () => {
		await context.secrets.delete('openaiApiKey');
		openai = undefined; // Clear the OpenAI client instance
		vscode.window.showInformationMessage('OpenAI API Key cleared. You will be prompted for it again on next use.');
	});
	context.subscriptions.push(clearApiKeyCommand);
	
	// Command to reset theme customizations
	let resetThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.resetTheme', async () => {
		try {
			// Try to reset workspace settings first
			const config = vscode.workspace.getConfiguration();
			const configTarget = vscode.workspace.workspaceFolders 
				? vscode.ConfigurationTarget.Workspace 
				: vscode.ConfigurationTarget.Global;
			
			try {
				console.log('Resetting theme customizations at target:', configTarget === vscode.ConfigurationTarget.Workspace ? 'Workspace' : 'Global');
				
				// First check if there are any customizations to clear
				const currentColorCustomizations = config.get('workbench.colorCustomizations');
				const currentTokenColorCustomizations = config.get('editor.tokenColorCustomizations');
				
				console.log('Current color customizations:', currentColorCustomizations);
				console.log('Current token color customizations:', currentTokenColorCustomizations);
				
				// Reset both workbench and token color customizations
				await Promise.all([
					config.update('workbench.colorCustomizations', undefined, configTarget),
					config.update('editor.tokenColorCustomizations', undefined, configTarget)
				]);
				
				// Try both ways - with empty object and with undefined
				if (Object.keys(config.get('workbench.colorCustomizations') || {}).length > 0) {
					await config.update('workbench.colorCustomizations', {}, configTarget);
				}
				
				if (Object.keys(config.get('editor.tokenColorCustomizations') || {}).length > 0) {
					await config.update('editor.tokenColorCustomizations', {}, configTarget);
				}
				
				// Clear the last generated theme
				lastGeneratedTheme = undefined;
				
				// Also try to reset at the other level just to be sure
				const otherTarget = configTarget === vscode.ConfigurationTarget.Workspace 
					? vscode.ConfigurationTarget.Global 
					: vscode.ConfigurationTarget.Workspace;
				
				try {
					await Promise.all([
						config.update('workbench.colorCustomizations', undefined, otherTarget),
						config.update('editor.tokenColorCustomizations', undefined, otherTarget)
					]);
				} catch (otherError) {
					// Ignore errors when trying to reset the other target
					console.log('Note: Could not reset at other target level (expected if no workspace)');
				}
				
				// Verify customizations are cleared
				const verifyColorCustomizations = config.get('workbench.colorCustomizations');
				const verifyTokenCustomizations = config.get('editor.tokenColorCustomizations');
				
				console.log('Verified color customizations after reset:', verifyColorCustomizations);
				console.log('Verified token color customizations after reset:', verifyTokenCustomizations);
				
				// Force a theme reload by temporarily changing the theme and changing back
				const currentTheme = config.get('workbench.colorTheme');
				const tempTheme = currentTheme === 'Default Dark+' ? 'Default Light+' : 'Default Dark+';
				
				try {
					// Quick toggle of theme to force refresh
					await config.update('workbench.colorTheme', tempTheme, vscode.ConfigurationTarget.Global);
					setTimeout(async () => {
						await config.update('workbench.colorTheme', currentTheme, vscode.ConfigurationTarget.Global);
					}, 300);
				} catch (themeError) {
					console.log('Theme toggle failed (non-critical):', themeError);
				}
				
				vscode.window.showInformationMessage('All theme customizations cleared. Your selected theme should now display correctly.');
			} catch (error) {
				console.error('Error during primary reset:', error);
				
				// If updating workspace settings fails, try user settings
				if (configTarget === vscode.ConfigurationTarget.Workspace) {
					try {
						await config.update('workbench.colorCustomizations', undefined, vscode.ConfigurationTarget.Global);
						await config.update('editor.tokenColorCustomizations', undefined, vscode.ConfigurationTarget.Global);
						
						// Try with empty object as well
						await config.update('workbench.colorCustomizations', {}, vscode.ConfigurationTarget.Global);
						await config.update('editor.tokenColorCustomizations', {}, vscode.ConfigurationTarget.Global);
						
						// Clear the last generated theme
						lastGeneratedTheme = undefined;
						
						vscode.window.showInformationMessage('Global theme customizations cleared.');
					} catch (globalError: any) {
						throw new Error(`Failed to reset theme: ${globalError.message}`);
					}
				} else {
					throw error;
				}
			}
		} catch (error: any) {
			console.error('Theme reset error:', error);
			vscode.window.showErrorMessage(`Failed to reset theme customizations: ${error.message}`);
		}
	});
	context.subscriptions.push(resetThemeCommand);
	
	// Command to export the current theme as a VS Code theme file
	let exportThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.exportTheme', async () => {
		try {
			if (!lastGeneratedTheme) {
				vscode.window.showErrorMessage('No theme has been generated yet. Please create a theme first.');
				return;
			}
			
			// Ask the user for a theme name
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
				title: "Exporting theme...",
				cancellable: false
			}, async () => {
				const { colors } = lastGeneratedTheme!;
				
				// Create theme JSON structure
				const themeData = {
					"name": themeName,
					"type": isDarkTheme(colors.background) ? "dark" : "light",
					"colors": {
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
						
						// Terminal
						"terminal.background": colors.background,
						"terminal.foreground": colors.foreground,
						"terminalCursor.background": colors.background,
						"terminalCursor.foreground": colors.accent,
						
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
						
						// Links - Fix for extension manager and other links
						"textLink.foreground": colors.accent,
						"textLink.activeForeground": adjustColor(colors.accent, 1.2),
						
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
						"editorLineNumber.activeForeground": colors.foreground, // Active line number highlighting
						"editorCursor.foreground": colors.accent,
						"editor.selectionBackground": adjustColor(colors.accent, 0.3),
						"editor.selectionHighlightBackground": adjustColor(colors.accent, 0.15),
						"editor.lineHighlightBackground": adjustColor(colors.background, colors.background === "#ffffff" ? 0.95 : 1.1), // Line highlight
						"editor.lineHighlightBorder": "transparent",
						"editorGutter.background": adjustColor(colors.background, 0.98), // Gutter background
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
						
						// Tree View (File Explorer, etc.)
						"tree.indentGuidesStroke": adjustColor(colors.foreground, 0.4),
						"focusBorder": colors.accent,
						"foreground": colors.foreground,
						"widget.shadow": "#00000030",
						"selection.background": adjustColor(colors.accent, 0.3),
					},
					"tokenColors": lastGeneratedTheme?.tokenColors || []
				};
				
				// Show save dialog
				const themeFileName = `${themeName.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
				
				// Different approaches based on whether we're in a workspace
				const saveUri = await vscode.window.showSaveDialog({
					defaultUri: vscode.workspace.workspaceFolders 
						? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, themeFileName)
						: vscode.Uri.file(path.join(process.env.HOME || process.env.USERPROFILE || '', themeFileName)),
					filters: {
						'JSON Files': ['json']
					},
					saveLabel: 'Export Theme'
				});
				
				if (saveUri) {
					// Write the file
					await vscode.workspace.fs.writeFile(
						saveUri,
						Buffer.from(JSON.stringify(themeData, null, 2))
					);
					
					// Show success message with instructions
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
							
							// Create a temporary file with the instructions
							const tmpFile = path.join(os.tmpdir(), 'theme-instructions.md');
							fs.writeFileSync(tmpFile, instructionsContent);
							
							// Open the instructions file
							vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(tmpFile));
						}
					});
				}
			});
		} catch (error: any) {
			console.error('Theme export error:', error);
			vscode.window.showErrorMessage(`Failed to export theme: ${error.message}`);
		}
	});
	context.subscriptions.push(exportThemeCommand);
}

// Helper functions for color formatting moved to utils/colorUtils.ts

// All color utility functions moved to utils/colorUtils.ts

export function deactivate() {}

