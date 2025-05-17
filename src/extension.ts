// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Store OpenAI client instance
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

	// Get OpenAI API key on activation
	let apiKey = await context.secrets.get('openaiApiKey');
	if (!apiKey) {
		apiKey = await vscode.window.showInputBox({
			prompt: 'Enter your OpenAI API Key',
			ignoreFocusOut: true, // Keep input box open even if focus moves
			password: true, // Mask the input
		});
		if (apiKey) {
			await context.secrets.store('openaiApiKey', apiKey);
			vscode.window.showInformationMessage('OpenAI API Key stored successfully!');
			openai = new OpenAI({ apiKey });
		} else {
			vscode.window.showErrorMessage('OpenAI API Key is required for this extension to work.');
			return; // Deactivate if no key is provided
		}
	} else {
		openai = new OpenAI({ apiKey });
	}

	// Register command to change theme based on natural language description
	let changeThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.changeTheme', async () => {
		if (!openai) {
			vscode.window.showErrorMessage('OpenAI client not initialized. Please ensure API key is set.');
			// Attempt to re-initialize or prompt for key again
			apiKey = await context.secrets.get('openaiApiKey');
			if (!apiKey) {
				apiKey = await vscode.window.showInputBox({
					prompt: 'Enter your OpenAI API Key',
					ignoreFocusOut: true,
					password: true,
				});
				if (apiKey) {
					await context.secrets.store('openaiApiKey', apiKey);
					openai = new OpenAI({ apiKey });
					vscode.window.showInformationMessage('OpenAI API Key stored.');
				} else {
					vscode.window.showErrorMessage('OpenAI API Key is required.');
					return;
				}
			} else {
				openai = new OpenAI({ apiKey });
			}
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
							{ 
								role: "system", 
								content: "You are a color theme assistant. Given a description, create a cohesive color palette with 5 colors as JSON. Format as: {\"primary\":\"#hexcolor\",\"secondary\":\"#hexcolor\",\"accent\":\"#hexcolor\",\"background\":\"#hexcolor\",\"foreground\":\"#hexcolor\"}. All values must be valid hex colors."
							},
							{ 
								role: "user", 
								content: themeDescription 
							}
						],
						max_completion_tokens: 2000
					});

					const colorResponse = completion.choices[0]?.message?.content?.trim();
					
					try {
						// Parse the JSON response
						const colorPalette = JSON.parse(colorResponse || '{}');
						const { primary, secondary, accent, background, foreground } = colorPalette;

						// Validate all colors are valid hex codes
						const validHexPattern = /^#[0-9A-Fa-f]{6}$/;
						if (![primary, secondary, accent, background, foreground].every(c => validHexPattern.test(c))) {
							throw new Error('Invalid color format received');
						}
						
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
								{ 
									role: "system", 
									content: "You are a code editor theme designer. Create syntax highlighting colors for programming languages based on a color palette. Return JSON with token types and their colors. Include common scopes like 'comment', 'string', 'keyword', 'function', 'variable', 'number', 'operator', 'type', 'class', 'parameter', and others you consider important. Format: [{\"scope\":\"token-type\",\"settings\":{\"foreground\":\"#hexcolor\",\"fontStyle\":\"italic|bold|underline|none\"}}]. Colors should coordinate with the base theme."
								},
								{ 
									role: "user", 
									content: `Create syntax highlighting colors based on this theme palette: primary=${primary}, secondary=${secondary}, accent=${accent}, background=${background}, foreground=${foreground}. Theme description: ${themeDescription}`
								}
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
							"activityBar.activeBorder": accent,
							"activityBar.activeBackground": primary,
							"activityBar.inactiveForeground": getContrastColor(primary, 0.6),
							"activityBarBadge.background": accent,
							"activityBarBadge.foreground": getContrastColor(accent),
							
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
							"editorCursor.foreground": accent,
							"editor.selectionBackground": adjustColor(accent, 0.3),
							"editor.selectionHighlightBackground": adjustColor(accent, 0.15),
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
							"panelTitle.inactiveForeground": adjustColor(foreground, 0.6)
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
				// Empty object to clear all color customizations
				await config.update('workbench.colorCustomizations', {}, configTarget);
				
				// Also reset token color customizations
				await config.update('editor.tokenColorCustomizations', {}, configTarget);
				
				// Clear the last generated theme
				lastGeneratedTheme = undefined;
				
				vscode.window.showInformationMessage('All theme customizations cleared. Your selected theme should now display correctly.');
			} catch (error) {
				// If updating workspace settings fails, try user settings
				if (configTarget === vscode.ConfigurationTarget.Workspace) {
					try {
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
}

// Helper function to determine a contrasting color (black or white) for text
function getContrastColor(hexcolor: string, opacity: number = 1): string {
	hexcolor = hexcolor.replace("#", "");
	const r = parseInt(hexcolor.substring(0, 2), 16);
	const g = parseInt(hexcolor.substring(2, 4), 16);
	const b = parseInt(hexcolor.substring(4, 6), 16);
	const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
	
	// If opacity is provided and less than 1, return rgba
	if (opacity < 1) {
		return (yiq >= 128) ? 
			`rgba(0, 0, 0, ${opacity})` : 
			`rgba(255, 255, 255, ${opacity})`;
	}
	
	return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

// Helper function to adjust color brightness/opacity
function adjustColor(hexcolor: string, factor: number): string {
	// If the factor is 1 or undefined, return the original color
	if (factor === 1) {
		return hexcolor;
	}
	
	// Remove the # if it exists
	hexcolor = hexcolor.replace("#", "");
	
	// Parse the hex color
	let r = parseInt(hexcolor.substring(0, 2), 16);
	let g = parseInt(hexcolor.substring(2, 4), 16);
	let b = parseInt(hexcolor.substring(4, 6), 16);
	
	if (factor > 1) {
		// Brighten
		r = Math.min(255, Math.round(r * factor));
		g = Math.min(255, Math.round(g * factor));
		b = Math.min(255, Math.round(b * factor));
	} else {
		// Darken
		r = Math.round(r * factor);
		g = Math.round(g * factor);
		b = Math.round(b * factor);
	}
	
	// Convert back to hex
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function deactivate() {}

