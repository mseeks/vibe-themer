/**
 * Test utility to verify REMOVE value functionality in theme iteration.
 */

import * as vscode from 'vscode';
import { parseStreamingThemeLine } from '../services/themeCore';

/**
 * Test function to verify REMOVE value parsing and handling works correctly.
 */
export async function testRemoveValues(): Promise<void> {
    console.log('🧪 Testing REMOVE value functionality...');

    const testCases = [
        'SELECTOR:editor.background=REMOVE',
        'SELECTOR:activityBar.background=remove',
        'SELECTOR:statusBar.background=Remove',
        'TOKEN:comment=REMOVE',
        'TOKEN:keyword=remove,bold',
        'SELECTOR:editor.foreground=#ffffff',
        'TOKEN:string=#00ff00,italic'
    ];

    let successCount = 0;
    let failureCount = 0;

    for (const testLine of testCases) {
        console.log(`\n📝 Testing: "${testLine}"`);
        
        const result = parseStreamingThemeLine(testLine);
        
        if (result.success) {
            console.log(`✅ Parsed successfully:`, result.setting);
            successCount++;
            
            if (result.setting.type === 'selector') {
                const isRemove = result.setting.color.trim().toUpperCase() === 'REMOVE';
                console.log(`🎯 Selector "${result.setting.name}" - ${isRemove ? 'REMOVE' : 'COLOR'}: ${result.setting.color}`);
            } else if (result.setting.type === 'token') {
                const isRemove = result.setting.color.trim().toUpperCase() === 'REMOVE';
                console.log(`🎯 Token "${result.setting.scope}" - ${isRemove ? 'REMOVE' : 'COLOR'}: ${result.setting.color}`);
            }
        } else {
            console.log(`❌ Parse failed: ${result.error}`);
            failureCount++;
        }
    }

    // Show summary
    console.log(`\n📊 Test Summary: ${successCount} passed, ${failureCount} failed`);
    
    vscode.window.showInformationMessage(
        `🧪 REMOVE value test completed! ${successCount} passed, ${failureCount} failed. Check the Output panel for detailed results.`,
        { modal: false }
    );
}
