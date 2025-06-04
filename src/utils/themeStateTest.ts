/**
 * Simple manual test for current theme state reading functionality.
 * This can be invoked from the VS Code extension host to verify our implementation.
 */

import * as vscode from 'vscode';
import { getCurrentThemeState } from '../services/themeCore';

/**
 * Manual test function to verify current theme state reading.
 * Call this from the extension to test the functionality.
 */
export async function testCurrentThemeReading(): Promise<void> {
    console.log('🧪 Testing current theme state reading...');
    
    // Read the current theme state
    const result = getCurrentThemeState();
    
    if (!result.success) {
        console.error('❌ Failed to read current theme state:', result.error);
        vscode.window.showErrorMessage(`Theme state test failed: ${result.error.message}`);
        return;
    }
    
    const { state } = result;
    
    console.log('✅ Current theme state reading successful!');
    console.log('📊 Theme State Summary:');
    console.log(`  - Has customizations: ${state.hasCustomizations}`);
    console.log(`  - Scope: ${state.scope}`);
    console.log(`  - Color customizations count: ${Object.keys(state.colorCustomizations).length}`);
    console.log(`  - Token customizations count: ${Object.keys(state.tokenColorCustomizations).length}`);
    
    if (state.hasCustomizations) {
        console.log('🎨 Current Color Customizations:');
        Object.entries(state.colorCustomizations).forEach(([key, value]) => {
            console.log(`  - ${key}: ${value}`);
        });
        
        if (Object.keys(state.tokenColorCustomizations).length > 0) {
            console.log('🔤 Current Token Customizations:');
            console.log(JSON.stringify(state.tokenColorCustomizations, null, 2));
        }
    } else {
        console.log('🚫 No theme customizations currently active');
    }
    
    // Show user-friendly message
    const message = state.hasCustomizations 
        ? `Found ${Object.keys(state.colorCustomizations).length} color settings and token customizations in ${state.scope} scope`
        : 'No theme customizations currently active';
        
    vscode.window.showInformationMessage(`Theme State Test: ${message}`);
}
