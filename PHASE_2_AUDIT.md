# Phase 2: Restructure packages/neocode - Audit Report

## Current Structure Analysis

### Directory Layout
```
packages/neocode/src/
├── index.ts                    (CLI entry point - 145 lines of yargs setup)
├── cli/
│   ├── cmd/
│   │   ├── run.ts              (CLI command)
│   │   ├── generate.ts         (CLI command)
│   │   ├── ... (15+ other CLI commands)
│   │   ├── tui/
│   │   │   ├── thread.ts       (TUI entry command - mixes CLI & TUI concerns)
│   │   │   ├── attach.ts       (TUI command)
│   │   │   ├── app.tsx         (TUI React app)
│   │   │   ├── worker.ts       (Worker thread for TUI)
│   │   │   ├── context/        (TUI React contexts)
│   │   │   ├── routes/         (TUI screens)
│   │   │   ├── component/      (TUI components)
│   │   │   ├── ui/             (TUI UI primitives)
│   │   │   └── util/           (TUI utilities)
│   ├── ui.ts                   (CLI UI utilities)
│   ├── error.ts                (Error formatting)
│   ├── ui/                     (CLI UI components - unclear purpose)
│   ├── bootstrap.ts            (CLI setup)
│   └── network.ts              (Network options for CLI)
├── server/                     (HTTP server - used by TUI)
├── provider/                   (Domain logic)
├── agent/                      (Domain logic)
├── tool/                       (Domain logic)
├── permission/                 (Domain logic)
├── util/                       (Shared utilities)
├── flag/                       (Config management)
├── installation/               (Installation info)
└── ... (other domain modules)
```

### Key Findings

#### 1. **CLI-TUI Coupling Issues**

**Evidence**:
- `TuiThreadCommand` (line 22-23 in index.ts) is imported as a CLI command
- `TuiThreadCommand` internally calls `tui()` function which loads React components
- The entire TUI system (`/cli/cmd/tui/`) is nested under `cli/cmd/` directory
- `AttachCommand` and `TuiThreadCommand` are treated as regular CLI commands but have TUI dependencies

**Impact**: 
- CLI parser setup tightly coupled to TUI initialization
- TUI components are not reusable outside CLI context
- Makes testing CLI without TUI impossible

#### 2. **Entry Point Confusion**

**Current behavior**:
- `index.ts` is both the CLI runner AND the package entry point
- It directly executes yargs parser - not exportable
- External consumers cannot programmatically invoke CLI

**Breaking changes needed**:
- Create separate `/src/bin/neocode.ts` (executable)
- Create `/src/cli/index.ts` (exportable CLI API)
- Create `/src/index.ts` (public package API)

#### 3. **Missing Domain Layer**

**Found in codebase**:
- Domain logic scattered across multiple packages:
  - `provider/` (domain entity)
  - `agent/` (domain entity)
  - `tool/` (domain entity)
  - `server/` (HTTP interface)
  - `permission/` (business logic)

**Problem**: No clear domain types/contracts file. Business logic mixed with HTTP routing and CLI concerns.

#### 4. **Infrastructure Mixed with Commands**

**Evidence**:
- `run.ts` imports from:
  - `../ui` (CLI UI)
  - `../../server/server` (HTTP server)
  - `../../provider/provider` (domain)
  - `../../agent/agent` (domain)
  - Multiple tool classes

**Better approach**: Commands should call domain services, not directly depend on infrastructure.

#### 5. **Path Alias Fragmentation**

**Current**:
- Mix of relative imports: `../ui`, `../../flag/flag`
- Mix of absolute imports: `@/cli/cmd/cmd`
- Creates inconsistency in what's considered "internal"

#### 6. **Barrel File Anti-pattern**

**Current index.ts**:
- Imports 26+ individual command classes
- Re-exports everything implicitly
- No way to distinguish public from internal exports

---

## Refactoring Strategy

### Target Structure
```
packages/neocode/
├── bin/
│   └── neocode.ts              (Executable entry - only CLI logic)
├── src/
│   ├── index.ts                (Public API - exports only)
│   ├── cli/
│   │   ├── index.ts            (export async function run(args: string[]))
│   │   ├── parser.ts           (yargs configuration - extracted)
│   │   ├── commands/           (all command files)
│   │   └── error.ts            (CLI-specific error handling)
│   ├── tui/
│   │   ├── index.ts            (export class TuiApp)
│   │   ├── app.tsx             (main React app)
│   │   ├── worker.ts           (worker thread)
│   │   ├── context/
│   │   ├── routes/
│   │   ├── component/
│   │   └── ui/
│   ├── domain/
│   │   ├── types.ts            (all domain entity types)
│   │   ├── provider.ts         (domain service)
│   │   ├── agent.ts            (domain service)
│   │   ├── tool.ts             (domain service)
│   │   └── ... (other domain)
│   ├── infrastructure/
│   │   ├── server.ts
│   │   ├── http/
│   │   ├── rpc/
│   │   └── ... (providers, adapters)
│   ├── shared/
│   │   ├── log.ts
│   │   ├── error.ts
│   │   ├── validation.ts
│   │   └── ... (utilities)
│   └── data/
│       └── themes/
└── package.json
```

### Implementation Steps (with effort estimates)

| Step | Description | Risk | Effort |
|------|-------------|------|--------|
| 2.1 ✅ | **Audit complete** - Dependencies mapped | Low | Done |
| 2.2 | Create new directory structure | Low | 1h |
| 2.3 | Move files incrementally (with imports updated) | Medium | 3h |
| 2.4 | Extract parser from index.ts → cli/parser.ts | Medium | 1h |
| 2.5 | Separate CLI logic into cli/index.ts | Medium | 2h |
| 2.6 | Move TUI into independent tui/index.ts | Medium-High | 2h |
| 2.7 | Create domain/ with types.ts | Low | 1h |
| 2.8 | Create public API in src/index.ts | Low | 30m |
| 2.9 | Create bin/neocode.ts executable | Low | 30m |
| 2.10 | Update dependent packages (console, app, sdk) | Medium | 2h |
| 2.11 | Type check & ESLint validation | Low | 30m |

**Total estimated effort**: 13.5 hours (can be split across multiple sessions)

---

## Circular Dependencies Found

None critical, but some concerning patterns:
- `/cli/cmd/run.ts` imports `Server` which imports server routes which import `PermissionNext`
- `/cli/cmd/tui/worker.ts` creates circular through RPC calls

**Action**: These are acceptable; restructuring will clarify dependency flow.

---

## Breaking Changes Summary

1. **CLI API**: External callers need to update from direct import to calling `run()` function
2. **TUI API**: TUI components no longer importable directly; must use public API
3. **Command classes**: No longer exported from main entry point

**Mitigation**: Create migration guide documenting new imports.

---

## Next Steps

Proceed with Step 2.2: Create new directory structure with zero breaking changes (additive only).
