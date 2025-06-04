/**
 * Simple test utility to verify COUNT parsing functionality works correctly.
 */

import * as vscode from 'vscode';
import { parseStreamingThemeLine } from '../services/themeCore';

/**
 * Test function to verify COUNT line parsing works correctly.
 */
export async function testCountParsing(): Promise<void> {
    console.log('🧪 Testing COUNT line parsing...');

    const testCases = [
        'COUNT:125',
        'COUNT:80',
        'COUNT:150',
        'COUNT:invalid',
        'COUNT:-10',
        'COUNT:',
        'SELECTOR:editor.background=#1a1a1a',
        'MESSAGE:Testing message...'
    ];

    for (const testLine of testCases) {
        console.log(`\n📝 Testing: "${testLine}"`);
        
        const result = parseStreamingThemeLine(testLine);
        
        if (result.success) {
            console.log(`✅ Parsed successfully:`, result.setting);
            
            if (result.setting.type === 'count') {
                console.log(`🎯 Extracted count: ${result.setting.total}`);
            }
        } else {
            console.log(`❌ Parse failed: ${result.error}`);
        }
    }

    // Show summary
    vscode.window.showInformationMessage(
        '🧪 COUNT parsing test completed! Check the Output panel for detailed results.',
        { modal: false }
    );
}
