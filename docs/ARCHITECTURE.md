# Theme Service Architecture

## Design Philosophy

This refactored theme service embodies the principles of **functional programming** combined with **domain-driven design** to create elegant, maintainable, and testable code. The architecture prioritizes:

### 1. **Precision Through Types**
- Rich type system that makes invalid states unrepresentable
- Domain types that encode business rules in the type system
- Compilation catches logic errors that would otherwise be runtime failures

### 2. **Functional Composition**
- Pure functions for core business logic
- Side effects isolated to adapter layers
- Small, focused functions that compose into larger operations
- Explicit dependency injection for testability

### 3. **Domain-Driven Design**
- Clear separation between domain logic and infrastructure concerns
- Ubiquitous language reflected in type names and function signatures
- Domain objects that represent real business concepts

## Architecture Layers

```
┌─────────────────────────────────────┐
│          Public API Layer           │  ← themeService.ts (backward compatibility)
├─────────────────────────────────────┤
│       Theme Application Layer       │  ← themeApplication.ts (orchestration)
├─────────────────────────────────────┤
│         Domain Logic Layer          │  ← themeCore.ts (pure business logic)
├─────────────────────────────────────┤
│         Adapter Layer              │  ← themeAdapters.ts (VS Code integration)
├─────────────────────────────────────┤
│          Types Layer               │  ← theme.ts (domain types)
└─────────────────────────────────────┘
```

## Key Design Decisions

### **Why Rich Types Over Runtime Validation?**

Instead of validating configuration targets at runtime:
```typescript
// Old approach - runtime checks
if (configTarget === vscode.ConfigurationTarget.Workspace) {
    // handle workspace
} else {
    // handle global
}
```

We use the type system to encode business rules:
```typescript
// New approach - types encode the rules
type ConfigurationScope = 
    | { readonly type: 'workspace'; readonly target: vscode.ConfigurationTarget.Workspace }
    | { readonly type: 'global'; readonly target: vscode.ConfigurationTarget.Global }
    | { readonly type: 'both'; readonly primary: vscode.ConfigurationTarget; readonly fallback: vscode.ConfigurationTarget };
```

**Benefits:**
- Compiler prevents invalid combinations
- Self-documenting code
- Impossible to forget to handle a case
- Refactoring safety

### **Why Functional Composition Over Imperative Control Flow?**

Instead of nested try/catch blocks and complex control flow:
```typescript
// Old approach - imperative with nested error handling
try {
    await config.update('workbench.colorCustomizations', colors, target);
    try {
        await config.update('editor.tokenColorCustomizations', tokens, target);
    } catch (tokenError) {
        // Handle token error
    }
} catch (colorError) {
    if (target === workspace) {
        try {
            // Retry with global
        } catch (globalError) {
            throw new Error(`Failed: ${globalError.message}`);
        }
    }
}
```

We compose pure functions with explicit error handling:
```typescript
// New approach - functional composition
const result = await applyWithFallback(customizations, targets, deps);
if (!result.success) {
    await deps.notification.showErrorNotification(result.error);
    return result;
}
```

**Benefits:**
- Easier to reason about
- Each function has a single responsibility
- Error handling is explicit and structured
- Testable in isolation

### **Why Dependency Injection Over Direct VS Code API Usage?**

Instead of directly calling VS Code APIs throughout the code:
```typescript
// Old approach - tightly coupled to VS Code
const config = vscode.workspace.getConfiguration();
await config.update('workbench.colorCustomizations', colors, target);
vscode.window.showInformationMessage('Theme applied');
```

We inject dependencies through interfaces:
```typescript
// New approach - dependency injection
interface ConfigurationProvider {
    readonly update: (section: string, value: unknown, target: ConfigurationTarget) => Promise<void>;
}

const applyTheme = async (deps: ThemeApplicationDependencies) => {
    await deps.configuration.update('workbench.colorCustomizations', colors, target);
    await deps.notification.showSuccessNotification(result, description);
};
```

**Benefits:**
- Enables comprehensive testing with mocks
- Flexible - can swap implementations
- Pure business logic separated from infrastructure
- Clear contracts through interfaces

## Usage Examples

### **Basic Usage** (maintains backward compatibility)
```typescript
import { applyThemeCustomizations } from './services/themeApplication';

await applyThemeCustomizations(
    { "editor.background": "#1e1e1e" },
    [{ scope: "comment", settings: { foreground: "#6a9955" } }],
    "Dark Professional"
);
```

### **Advanced Usage** (with custom dependencies)
```typescript
import { applyThemeCustomizations } from './services/themeApplication';
import { SilentNotificationStrategy, createVSCodeDependencies } from './services/themeAdapters';

// For batch operations without user notifications
const silentDeps = createVSCodeDependencies(new SilentNotificationStrategy());
const result = await applyThemeCustomizations(colors, tokens, description, silentDeps);
```

### **Testing** (with mocked dependencies)
```typescript
import { createTestDependencies } from './services/themeTestUtils';

const { deps, mocks } = createTestDependencies(true); // has workspace folders
const result = await applyThemeCustomizations(colors, tokens, description, deps);

// Verify the configuration was updated correctly
const updates = mocks.config.getUpdateLog();
expect(updates).toContainEqual({
    section: 'workbench.colorCustomizations',
    value: colors,
    target: vscode.ConfigurationTarget.Global
});
```

## Error Handling Philosophy

Errors are treated as **domain objects** with rich context:

```typescript
interface ThemeApplicationError {
    readonly message: string;        // User-facing error description
    readonly cause?: unknown;        // Technical details for debugging
    readonly recoverable: boolean;   // Can the user retry this operation?
    readonly suggestedAction?: string; // What should the user do?
}
```

This approach provides:
- **Actionable feedback** for users
- **Rich context** for debugging
- **Structured handling** across the application
- **Type safety** in error scenarios

## Benefits of This Architecture

### **For Maintainability**
- Clear separation of concerns
- Small, focused functions
- Self-documenting through types
- Easy to add new features

### **For Testing**
- Pure functions are trivial to test
- Dependency injection enables comprehensive mocking
- Domain logic tested separately from infrastructure
- Test utilities provide reusable patterns

### **For Extension**
- New notification strategies can be added easily
- Different configuration providers for different environments
- Theme validation rules can be enhanced
- Error handling can be customized per use case

### **For Reliability**
- Type system prevents entire classes of bugs
- Explicit error handling with structured recovery
- Functional approach reduces side effect surprises
- Comprehensive validation before applying changes

This architecture demonstrates how **functional programming principles** and **domain-driven design** can transform imperative, error-prone code into elegant, reliable, and maintainable solutions.
