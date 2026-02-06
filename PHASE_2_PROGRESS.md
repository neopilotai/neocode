# Phase 2 Progress: Restructure packages/neocode

## Completed ✅

### Step 2.1: Audit Complete
- Analyzed current directory structure
- Identified CLI-TUI coupling in `/cli/cmd/tui/`
- Documented all 26 CLI commands
- Created `PHASE_2_AUDIT.md` with detailed findings

### Step 2.2: New Directory Structure (Additive)
Created new files with zero breaking changes:
- `/src/cli/parser.ts` - Extracted yargs configuration (106 lines)
- `/src/cli/index.ts` - Public CLI API with `run()` function (88 lines)
- `/src/domain/types.ts` - Placeholder for domain types
- `/src/infrastructure/server.ts` - Placeholder for server layer
- `/src/shared/index.ts` - Placeholder for shared utilities
- `/src/tui/index.ts` - Placeholder for TUI entry point
- `/bin/neocode.ts` - Executable entry point (13 lines)
- `/src/index.ts` - Public package API (24 lines)

### Step 2.3: Parser Extraction
Moved yargs configuration from `src/index.ts` to `src/cli/parser.ts`:
- `createParser()` function encapsulates all yargs setup
- Marked as `@internal` to prevent direct usage
- All 26 commands registered in centralized location
- Middleware preserved for logging initialization

### Step 2.4: CLI Entry Point
Created `/src/cli/index.ts` with `run()` function:
- Public API for programmatic CLI invocation
- Wraps parser with comprehensive error handling
- Handles NamedError, ResolveMessage, and standard errors
- Proper exit code management
- Ready for external consumers

### Step 2.5: Executable Entry Point
Created `/bin/neocode.ts`:
- Shebang for direct execution
- Delegates to `run()` from CLI module
- Clean separation of concerns

### Step 2.6: Public API Definition
Created `/src/index.ts` with minimal, curated exports:
- Exports `run()` for CLI invocation
- Domain types available (placeholder)
- Clear documentation of public vs. internal
- No barrel file anti-pattern

---

## Architecture Achieved So Far

```
CLI Flow:
  bin/neocode.ts
    ↓
  src/cli/index.ts (run function)
    ↓
  src/cli/parser.ts (yargs setup)
    ↓
  ./cmd/* (individual commands)

Package Entry:
  src/index.ts (public API only)
    ├── → src/cli (run function)
    ├── → src/tui (future TUI API)
    └── → src/domain/types (future domain types)

Import Pattern:
  ✅ Public: import { run } from '@neocode/cli'
  ❌ Internal: import { TuiThreadCommand } from '@neocode/cli/cmd/tui'
  ❌ Internal: import { createParser } from '@neocode/cli/parser'
```

---

## Remaining Work for Phase 2

### Step 2.7: TUI Separation (Medium-High Risk)
- Extract TUI from `/cli/cmd/tui/` to `/tui/`
- Create `/src/tui/index.ts` with public TUI API
- Update `TuiThreadCommand` to use new TUI module
- Move theme files to `/src/data/themes/`

### Step 2.8: Domain Layer (Medium Risk)
- Extract domain types to `/src/domain/types.ts`
- Create domain services for provider, agent, tool
- Remove UI dependencies from domain layer
- Update commands to use domain services

### Step 2.9: Infrastructure Layer (Low Risk)
- Move `/src/server/` logic to `/src/infrastructure/`
- Create `/src/infrastructure/rpc/` for RPC logic
- Create `/src/infrastructure/http/` for HTTP routing

### Step 2.10: Shared Utilities (Low Risk)
- Move `/src/util/` items to `/src/shared/`
- Update imports across codebase
- Reorganize by functionality (log, error, validation)

### Step 2.11: Update Dependent Packages (Medium Risk)
- Update `/packages/console/core` imports
- Update `/packages/app` imports
- Update `/packages/sdk` imports
- Update ESLint rules to catch new violations

### Step 2.12: Validation & Testing (Low Risk)
- Run `bun tsc --noEmit` (type check)
- Run `bun lint` (import boundary rules)
- Smoke test CLI commands
- Smoke test TUI

---

## Key Metrics

| Metric | Value |
|--------|-------|
| New directories created | 5 |
| New files created | 8 |
| Files modified | 1 (src/index.ts - replaced) |
| Breaking changes so far | 0 |
| Lines of code moved | ~150 |
| Type checking | ⏳ Pending full validation |

---

## Next Steps

1. **Run validation**: `bun tsc --noEmit` to check for any import issues
2. **Step 2.7**: Extract TUI separation (highest priority next)
3. **Step 2.8**: Build domain layer with types
4. **Step 2.9**: Consolidate infrastructure
5. **Steps 2.10-2.12**: Complete remaining refactoring

---

## Migration Guide (For External Consumers)

### Old Way (❌ No longer works)
```ts
import { RunCommand } from '@neocode/cli/cmd/run'
const cmd = new RunCommand()
```

### New Way (✅ Public API)
```ts
import { run } from '@neocode/cli'
await run(['run', 'src/index.ts'])
```

---

## ESLint Boundary Enforcement

The Phase 1 ESLint rules will now catch:
- Direct imports from `@neocode/cli/cmd/*` ❌
- Deep relative imports to commands ❌
- Imports from internal modules not in public API ❌

This encourages using the public `run()` function instead of internal command classes.
