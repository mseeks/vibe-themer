/**
 * Simple runner script to demonstrate the OpenAI service architecture.
 * This demonstrates the power of our refactored functional architecture.
 */

import { 
    demonstrateRefactoredArchitecture,
    demonstrateAdvancedTestingCapabilities,
    demonstrateAPIFlexibility 
} from './openaiArchitectureDemo';
import { demonstrateOpenAIServiceUsage } from '../services/openaiTestUtils';

async function runAllDemos() {
    console.log('🚀 Starting OpenAI Service Architecture Demonstrations\n');
    
    try {
        // Run the main architecture demo
        await demonstrateRefactoredArchitecture();
        
        // Run the advanced testing demo
        await demonstrateAdvancedTestingCapabilities();
        
        // Show API flexibility
        demonstrateAPIFlexibility();
        
        // Run the test utils demo
        console.log('\n=== Running Test Utils Demo ===\n');
        await demonstrateOpenAIServiceUsage();
        
        console.log('\n✨ All demonstrations completed successfully!');
        console.log('\nKey takeaways:');
        console.log('• Functional programming creates more reliable, testable code');
        console.log('• Rich types prevent entire classes of bugs');
        console.log('• Dependency injection enables comprehensive testing');
        console.log('• Layered architecture separates concerns beautifully');
        console.log('• The refactored codebase is both elegant and practical');
        
    } catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}

export { runAllDemos };
