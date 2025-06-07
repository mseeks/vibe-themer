import * as vscode from 'vscode';
import { getCurrentThemeState } from '../services/themeCore.js';

/**
 * Tests the context injection by simulating the formatting logic.
 * This is a development utility to verify the feature works correctly.
 */
export async function testContextInjection(): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel('Vibe Themer Context Test');
    outputChannel.show();
    
    try {
        outputChannel.appendLine('=== Context Injection Test ===');
        outputChannel.appendLine('Testing current theme state formatting...\n');
        
        // Get current theme state
        const themeStateResult = getCurrentThemeState();
        
        if (!themeStateResult.success) {
            outputChannel.appendLine('❌ Failed to read current theme state');
            outputChannel.appendLine(`Error: ${themeStateResult.error.message}`);
            return;
        }
        
        const { state } = themeStateResult;
        
        if (!state.hasCustomizations) {
            outputChannel.appendLine('ℹ️  No current theme customizations detected');
            outputChannel.appendLine('Context injection would be skipped (standard generation)');
            
            vscode.window.showInformationMessage(
                'No theme customizations found. Generate a theme first, then test again.'
            );
            return;
        }
        
        // Simulate the context formatting logic
        const lines: string[] = [];
        
        const colorCount = Object.keys(state.colorCustomizations).length;
        if (colorCount > 0) {
            lines.push('CURRENT THEME CONTEXT:');
            lines.push(`Active workbench color overrides (${colorCount} settings):`);
            
            Object.entries(state.colorCustomizations).slice(0, 5).forEach(([key, value]) => {
                lines.push(`- ${key}: ${value}`);
            });
            
            if (colorCount > 5) {
                lines.push(`... and ${colorCount - 5} more settings`);
            }
        }
        
        const tokenCount = Object.keys(state.tokenColorCustomizations).length;
        if (tokenCount > 0) {
            if (lines.length > 0) {
                lines.push('');
            }
            lines.push(`Active syntax highlighting overrides (${tokenCount} settings):`);
            
            Object.entries(state.tokenColorCustomizations).slice(0, 3).forEach(([key, value]) => {
                lines.push(`- ${key}: ${JSON.stringify(value)}`);
            });
            
            if (tokenCount > 3) {
                lines.push(`... and ${tokenCount - 3} more settings`);
            }
        }
        
        if (lines.length > 0) {
            lines.push('');
            lines.push('User request:');
            
            const contextString = lines.join('\n');
            
            outputChannel.appendLine('✅ Context injection would be active');
            outputChannel.appendLine('Generated context string:');
            outputChannel.appendLine('---');
            outputChannel.appendLine(contextString);
            outputChannel.appendLine('---');
            
            outputChannel.appendLine(`\nScope: ${state.scope}`);
            outputChannel.appendLine(`Total settings: ${colorCount + tokenCount}`);
            
            vscode.window.showInformationMessage(
                `✅ Context injection ready! ${colorCount + tokenCount} settings would be sent to AI for better iteration support.`
            );
        }
        
    } catch (error) {
        outputChannel.appendLine(`❌ Test failed: ${error}`);
        vscode.window.showErrorMessage(`Context injection test failed: ${error}`);
    }
}
