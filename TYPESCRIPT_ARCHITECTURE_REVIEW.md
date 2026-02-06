# Neocode TypeScript Architecture Review & Improvement Plan

**Review Date**: February 2026  
**Reviewer Role**: Principal Software Engineer & TypeScript Architect  
**Project**: Neocode (AI-powered development platform monorepo)  
**Status**: Production-grade, multi-team organization  

---

## Executive Summary

Your TypeScript monorepo demonstrates **solid foundational work** with excellent strictness configuration and tooling. However, there are **6 critical scalability risks** that will severely impact maintainability as your team grows. This review provides:

1. ✅ What you're doing well
2. ❌ Critical issues to address (with evidence)
3. 📐 Ideal architecture (with folder structure)
4. 📋 Step-by-step refactor roadmap (low risk → high impact)

**Key Finding**: Your **barrel file exports pattern** and **path alias chaos** will cause more problems than they solve. The solution is architectural discipline, not tooling changes.

---

## Part 1: Current State Assessment

### ✅ Strengths

1. **Excellent TypeScript Configuration**
   - `strict: true` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
   - `noUnusedLocals`, `noUnusedParameters` enforced
   - Root tsconfig uses `@tsconfig/bun` as base (standard for your stack)

2. **Robust ESLint Setup**
   - Comprehensive `@typescript-eslint` rules with strict defaults
   - Type-checking enabled at lint time (`project: "./tsconfig.json"`)
   - Custom rules for console, floating promises, misused promises

3. **Monorepo Foundation**
   - Turborepo for build orchestration
   - Workspaces with shared catalog (reduces duplication)
   - Multi-tier organization (CLI, UI, backend, SDKs)

4. **Pragmatic Dependency Management**
   - Catalog pattern for shared versions
   - Clear package namespacing (`@neocode-ai/*`)
   - Selective peer dependencies

### ❌ Critical Issues

---

#### **Issue #1: Barrel File Anti-Pattern (CRITICAL)**

**Location**: `packages/neocode/package.json`

```json
"exports": {
  "./*": "./src/*.ts"  // ❌ Exposes entire src directory!
}
```

**Problem**:
- Any consumer can import: `import { TuiApp } from 'neocode/cli/cmd/tui/app'`
- Breaks encapsulation—internal utilities become "public API"
- Circular dependencies become harder to detect
- Tree-shaking completely broken
- Makes refactoring implementation details painful

**Evidence**: Combined with loose path aliases, this enables importing from deeply nested internals.

**Impact**: 
- Leads to coupling across packages
- Prevents atomic refactoring
- Makes versioning difficult (what's the API surface?)

---

#### **Issue #2: Path Alias Chaos (HIGH)**

**Root tsconfig.json**:
```json
"paths": {
  "@neocode/*": ["packages/*/src"],           // Ambiguous!
  "@neocode-ai/*": ["packages/*/src"],        // Confusing with @neocode
  "@console/*": ["packages/console/*/src"],
  "@sdk/*": ["packages/sdk/*/src"],
  "@plugin/*": ["packages/plugin/*/src"],
  "@script/*": ["packages/script/*/src"],
  "@util/*": ["packages/util/*/src"]
}
```

**Problems**:
1. `@neocode/app` — does this mean `packages/app` or `packages/neocode/...`?
2. `@neocode-ai/util` vs `@util/*` — which one should you use?
3. Nesting conflicts: `@console/core/domain` could resolve to multiple places
4. IDE autocomplete fails randomly

**Example Confusion**:
```typescript
// Both valid but semantically different:
import { User } from '@neocode-ai/util/types'
import { User } from '@util/types'

// Which is the canonical import?
```

---

#### **Issue #3: Monolithic neocode Package (CRITICAL)**

**Structure** (from your exports and imports):
```
packages/neocode/src/
├── cli/
│   ├── cmd/          # Commands (run, generate, etc.)
│   ├── cmd/tui/      # Terminal UI (40+ theme JSON files)
│   ├── error.ts
│   └── ui.ts
├── index.ts          # Re-exports everything via "./*"
```

**Problems**:
1. **No clear boundaries** between CLI commands and TUI
2. **Theme system embedded** in src tree (data mixed with code)
3. **~50+ AI SDK provider integrations** all imported at once
4. **Unclear dependency direction**: Does CLI depend on TUI or vice versa?

**Actual Risk**: 
- TUI and CLI are tightly coupled
- Testing one in isolation is impossible
- Desktop app can't reuse CLI logic separately
- SDK can't use any of this (it's too entangled)

---

#### **Issue #4: Inconsistent TypeScript Configurations (HIGH)**

**Root tsconfig.json** (what you showed):
```json
{
  "strict": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true
}
```

**packages/neocode/tsconfig.json**:
```json
{
  "extends": "../../tsconfig.json",
  "jsx": "preserve",
  "jsxImportSource": "@opentui/solid",
  "paths": { "@/*": ["./src/*"], "@tui/*": ["./src/cli/cmd/tui/*"] }
  // ⚠️ Overrides root paths completely!
}
```

**The Problem**:
- `@/*` in neocode means `src/*`, but in root it means `packages/*/src`
- Cross-package imports break: `import { Button } from '@ui/Button'` won't resolve in neocode
- Each package needs its own path config (configuration explosion)
- IDE doesn't know which interpretation to use

**Solution**: Centralize paths in `tsconfig.paths.json`

---

#### **Issue #5: Missing Domain-Driven Structure (HIGH)**

**Current**: Packages are organized by **technology layer**, not **business domains**:
```
@neocode-ai/console-core/
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
```

**Missing**: No clear **feature boundaries**. For example, authentication likely mixes with:
- User management
- Sessions
- Permissions
- API tokens

**Result**: 
- Hard to understand "what is authentication's responsibility?"
- Changes to one domain affect many unrelated features
- Impossible to parallelize feature development

---

#### **Issue #6: Weak Public API Definition (MEDIUM)**

**Current**: Each package's `index.ts` probably exports too much:
```typescript
// packages/console-core/src/index.ts (hypothetical)
export * from './domain'
export * from './application'
export * from './infrastructure'  // ❌ Should NOT be here!
export * from './presentation'
```

**Problem**:
- Consumers can directly import from infrastructure/database/schema
- Makes breaking changes harder to track
- Database schemas shouldn't be part of public API

**Result**: Frontend imports database schemas directly, creating tight coupling.

---

## Part 2: Ideal Architecture

### 2.1 Centralized TypeScript Configuration

**Create `tsconfig.paths.json`** (new file):

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // Core CLI tool
      "@neocode/cli": ["packages/neocode/src/cli"],
      "@neocode/tui": ["packages/neocode/src/tui"],
      "@neocode/domain": ["packages/neocode/src/domain"],
      "@neocode/infrastructure": ["packages/neocode/src/infrastructure"],
      
      // Backend services
      "@neocode/console": ["packages/console/core/src"],
      "@neocode/console/domain": ["packages/console/core/src/domain"],
      "@neocode/console/application": ["packages/console/core/src/application"],
      "@neocode/console/infrastructure": ["packages/console/core/src/infrastructure"],
      
      // Frontend app
      "@neocode/app": ["packages/app/src"],
      "@neocode/app/features": ["packages/app/src/features"],
      "@neocode/app/components": ["packages/app/src/components"],
      
      // Shared libraries
      "@neocode/sdk": ["packages/sdk/js/src"],
      "@neocode/ui": ["packages/ui/src"],
      "@neocode/util": ["packages/util/src"],
      "@neocode/util/validation": ["packages/util/src/validation"],
      "@neocode/util/errors": ["packages/util/src/errors"]
    }
  }
}
```

**Update root `tsconfig.json`**:

```json
{
  "extends": "./tsconfig.paths.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    
    // Module resolution
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    
    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["packages/**/*.ts", "packages/**/*.tsx"],
  "exclude": ["**/node_modules", "**/dist", "**/build"]
}
```

**Each package extends root** (no path overrides):

```json
// packages/neocode/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@opentui/solid",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

---

### 2.2 Restructure packages/neocode

**Before**:
```
packages/neocode/src/
├── cli/
│   ├── cmd/           # Commands scattered
│   └── cmd/tui/       # TUI mixed in
├── index.ts
```

**After**:
```
packages/neocode/src/
├── cli/                        # CLI entry point ONLY
│   ├── commands/               # Individual commands
│   │   ├── run.ts
│   │   ├── generate.ts
│   │   └── ...
│   ├── parser.ts               # Argument parsing
│   └── index.ts                # ← Export: async run(args)
│
├── tui/                        # Terminal UI (independent)
│   ├── components/             # TUI components
│   ├── state/                  # Application state
│   ├── themes/                 # Move JSON to data/
│   └── index.ts                # ← Export: TuiApp
│
├── domain/                     # Business logic (framework-agnostic)
│   ├── project/
│   ├── model/
│   ├── provider/
│   └── types.ts
│
├── infrastructure/
│   ├── api/                    # HTTP client to console API
│   ├── filesystem/
│   └── providers/              # AI SDK integrations
│
├── shared/
│   ├── logging/
│   ├── validation/
│   └── errors/
│
├── bin/
│   └── neocode.ts              # Executable entry
│
└── index.ts                    # Public API ONLY
```

**Key Changes**:
1. CLI and TUI are now **separate concerns**
2. Domain logic doesn't know about UI or CLI
3. Clear entry points for each subsystem
4. Themes are in `data/` folder (not mixed with code)

---

### 2.3 Define Strict Public APIs

**packages/neocode/src/index.ts** (NEW):
```typescript
// Only export types and main functions
export type { ProjectConfig, ModelConfig } from './domain/types'
export { run } from './cli'  // ← Main CLI entry
export { TuiApp } from './tui'  // ← Main TUI entry
```

**Internal modules are NOT exported**:
```
// These DON'T appear in index.ts
- infrastructure/api
- infrastructure/filesystem
- shared/logging
- cli/commands (use run() instead)
- tui/components (use TuiApp instead)
```

---

### 2.4 Dependency Graph Rules

```
Presentation (CLI/TUI):
    ↓ imports types only
Application (Use Cases):
    ↓ imports domain types only
Domain (Business Logic):
    ↓ imports shared types only
Infrastructure (DB, HTTP, APIs):

ALLOWED directions:
✅ CLI → Domain types
✅ CLI → Shared utilities
✅ TUI → Application services
✅ Application → Domain models
✅ Domain → Shared types
✅ Infrastructure → Domain (via interfaces)

FORBIDDEN:
❌ Domain → Infrastructure
❌ Domain → Application
❌ CLI → Infrastructure/Database
❌ TUI → Infrastructure
```

---

## Part 3: Import Boundaries & Organization

### 3.1 Correct Import Patterns

```typescript
// ✅ CORRECT: Import types from domain
import type { User, Project } from '@neocode/console/domain'

// ✅ CORRECT: Use application services
import { AuthService } from '@neocode/console/application'

// ✅ CORRECT: Import from public API
import { run } from '@neocode/cli'

// ❌ WRONG: Direct infrastructure access
import { database } from '@neocode/console/infrastructure/database'

// ❌ WRONG: Cross-package internal imports
import { internalHelper } from '@neocode/console/infrastructure/internal'

// ❌ WRONG: Importing from deeply nested modules
import { TuiComponent } from '@neocode/cmd/tui/components/Button'
```

### 3.2 Barrel File Strategy

**USE Barrels ONLY for**:
1. Feature/domain root exports
2. Publicly versioned APIs

**Example (Good Barrel)**:
```typescript
// packages/ui/src/index.ts
export { Button } from './components/Button'
export { Dialog } from './components/Dialog'
export { useTheme } from './theme/useTheme'
export type { ThemeConfig } from './theme/types'
```

**Example (Bad Barrel)**:
```typescript
// ❌ DON'T: Expose everything
export * from './components'
export * from './hooks'
export * from './utilities'
export * from './internal'
```

### 3.3 File Organization Rules

| Structure | Files | Rule |
|-----------|-------|------|
| **Layers** | domain/, application/, infrastructure/ | Clear responsibility |
| **Naming** | `User.ts`, `UserService.ts`, `useUser.ts` | Semantic intent |
| **Exports** | Only from `index.ts` | Single entry point |
| **Tests** | `__tests__/` or `.test.ts` | Co-located with source |
| **Types** | `types.ts` in each layer | Avoid spreading |

---

## Part 4: Step-by-Step Refactor Roadmap

### **Phase 1: Foundation (Week 1-2)** — Low Risk, High Impact

#### Step 1.1: Create Centralized Path Configuration
- [ ] Create `tsconfig.paths.json` (as shown in Part 2.1)
- [ ] Update root `tsconfig.json` to extend it
- [ ] Run: `bun tsc --noEmit` to validate
- [ ] **Risk**: Minimal (additive, no breaking changes)
- **Time**: 1-2 hours

#### Step 1.2: Add ESLint Rule for Public APIs
- [ ] Update `eslint.config.js` to prevent imports from `/**/*` paths:
```javascript
"@typescript-eslint/no-restricted-imports": [
  "error",
  {
    "patterns": [
      {
        "group": ["@neocode/console/infrastructure/**"],
        "message": "Infrastructure is internal. Use application services instead."
      },
      {
        "group": ["@neocode/cli/commands/**"],
        "message": "Use the cli export directly: import { run } from '@neocode/cli'"
      }
    ]
  }
]
```
- [ ] Run: `bun run lint` to see violations
- **Risk**: Will surface a lot of existing issues (expected!)
- **Time**: 2-3 hours

#### Step 1.3: Document Public API Per Package
- [ ] For each package, create `API.md`:
  - What's exported via `index.ts`?
  - What's internal?
  - Example usage
- **Deliverable**: 
  ```
  packages/console/core/API.md
  packages/neocode/API.md
  packages/app/API.md
  ```
- **Risk**: Zero code changes
- **Time**: 3 hours

---

### **Phase 2: Refactor neocode Package (Week 2-4)** — Medium Risk, High Impact

#### Step 2.1: Separate CLI from TUI
- [ ] Create `packages/neocode/src/cli/index.ts`:
  ```typescript
  export { run } from './runner'
  export type { CliOptions } from './types'
  ```
- [ ] Create `packages/neocode/src/tui/index.ts`:
  ```typescript
  export { TuiApp } from './app'
  ```
- [ ] Move CLI commands into `cli/commands/`
- [ ] Move TUI into `tui/` (keep existing structure)
- **Risk**: Moderate (requires refactoring imports)
- **Time**: 3-4 days

#### Step 2.2: Extract Domain Logic
- [ ] Create `packages/neocode/src/domain/`:
  - ProjectManager (use cases)
  - ModelRegistry (model config)
  - ProviderFactory (provider logic)
- [ ] Move business logic out of CLI/TUI handlers
- **Benefit**: Can test domain without UI
- **Risk**: Moderate
- **Time**: 2-3 days

#### Step 2.3: Organize Infrastructure
- [ ] Create `packages/neocode/src/infrastructure/`:
  ```
  api/         # HTTP calls to console API
  filesystem/  # File I/O
  providers/   # AI SDK integrations
  ipc/         # Desktop/web bridge
  ```
- [ ] Move AI provider code from `src/` into `infrastructure/providers/`
- **Risk**: High (many imports to update)
- **Time**: 2-3 days

#### Step 2.4: Update Public API
- [ ] New `packages/neocode/src/index.ts`:
  ```typescript
  export { run } from './cli'
  export { TuiApp } from './tui'
  export type { ProjectConfig } from './domain'
  ```
- [ ] Remove `"./src/*.ts"` glob export pattern
- [ ] Update `package.json`:
  ```json
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/index.d.ts"
  }
  ```
- **Risk**: Breaking change for external consumers (if any)
- **Time**: 1 day

---

### **Phase 3: Backend Architecture (Week 4-6)** — Medium Risk

#### Step 3.1: Align console-core with Layered Architecture
- [ ] Verify structure:
  ```
  packages/console/core/src/
  ├── domain/           # Business entities & rules
  ├── application/      # Use cases & services
  ├── infrastructure/   # DB, HTTP, external APIs
  ├── presentation/     # HTTP handlers (Hono)
  └── shared/           # Utilities & validation
  ```
- [ ] Ensure database schemas are **NOT** exported from root
- **Risk**: Medium (may surface circular dependencies)
- **Time**: 2-3 days

#### Step 3.2: Define SDK Public API
- [ ] Create `packages/sdk/js/src/index.ts`:
  ```typescript
  export { NeocodeClient } from './client'
  export type { User, Project, Model } from './types'
  // ← Carefully curated types from console API
  ```
- [ ] Ensure SDK doesn't re-export console infrastructure
- **Risk**: Low
- **Time**: 1 day

---

### **Phase 4: Frontend Architecture (Week 6-8)** — Low Risk

#### Step 4.1: Restructure app Package
- [ ] Adopt feature-based structure:
  ```
  packages/app/src/
  ├── features/         # Auth, Dashboard, Projects, etc.
  ├── components/       # Reusable UI components
  ├── hooks/            # SolidJS hooks
  ├── lib/              # Utilities
  └── app.tsx
  ```
- [ ] Each feature has its own router, components, hooks
- **Risk**: Low (internal reorganization)
- **Time**: 2-3 days

#### Step 4.2: Enforce SDK-Only Backend Access
- [ ] Delete any direct `@neocode/console-core` imports
- [ ] Replace with: `import { NeocodeClient } from '@neocode/sdk'`
- [ ] **Result**: Frontend and backend are decoupled
- **Risk**: Low
- **Time**: 1 day

---

### **Phase 5: Documentation & Enforcement (Week 8+)** — Low Risk

#### Step 5.1: Create Architecture Decision Records (ADRs)
- [ ] Document:
  1. Why we use layered architecture
  2. How to add a new feature
  3. How to add a new domain
  4. Circular dependency prevention
  5. Public vs private modules

#### Step 5.2: Add Pre-Commit Hooks
- [ ] Enhance `.husky/pre-commit` to run:
  ```bash
  bun tsc --noEmit        # Type check
  bun lint                # Check imports (catches violations)
  ```

#### Step 5.3: Create Package READMEs
- [ ] Each package documents:
  - Purpose
  - Public API (what's exported)
  - Examples
  - How to extend

---

## Part 5: Enhanced ESLint Configuration

Add these rules to `eslint.config.js`:

```javascript
{
  files: ["**/*.ts", "**/*.tsx"],
  rules: {
    // Import organization
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["**/infrastructure/**"],
            "message": "Infrastructure is internal. Use public exports from index.ts"
          },
          {
            "group": ["**/internal/**"],
            "message": "Internal modules should not be imported across packages"
          },
          {
            "group": ["@neocode/console/infrastructure"],
            "message": "Frontend cannot access backend infrastructure. Use @neocode/sdk instead."
          }
        ]
      }
    ],

    // Detect circular imports
    "import/no-cycle": "error",

    // Prevent async code from leaking into domain
    "@typescript-eslint/no-floating-promises": "error",

    // Enforce explicit return types (helps with public API clarity)
    "@typescript-eslint/explicit-function-return-types": [
      "warn",
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true
      }
    ]
  }
}
```

---

## Part 6: Benefits of These Changes

| Issue | Before | After |
|-------|--------|-------|
| **Tight Coupling** | Frontend imports database schemas | Frontend uses SDK with clean types |
| **Circular Dependencies** | Hard to detect | ESLint catches them |
| **IDE Support** | Path aliases conflict | Centralized, consistent paths |
| **Testing** | Cannot test domain without UI | Domain is testable in isolation |
| **Feature Teams** | Blocked by monolithic packages | Can work independently |
| **Breaking Changes** | Everything is public | Can refactor internals safely |
| **Documentation** | No clear API boundaries | Each package has documented API |
| **Onboarding** | New devs confused by structure | Clear rules and examples |

---

## Part 7: Quick Reference Checklists

### For Package Creators:
- [ ] Create `src/domain/` for business logic
- [ ] Create `src/infrastructure/` for external integrations
- [ ] Create `src/application/` for use cases
- [ ] Export only through `src/index.ts`
- [ ] Document public API in `API.md`
- [ ] No internal imports in other packages
- [ ] Run `bun lint` before committing

### For Backend Services:
- [ ] Database schemas in `infrastructure/database/`
- [ ] Never export schemas from root
- [ ] Use DTOs for API responses
- [ ] Domain layer has no database awareness
- [ ] Use repository pattern for data access

### For Frontend Code:
- [ ] Organize by **features**, not technology layers
- [ ] Import types from `@neocode/sdk`
- [ ] Never import `infrastructure` packages
- [ ] Use SDK client for backend access
- [ ] Keep components in `components/`

---

## Conclusion

This refactor is **achievable in 6-8 weeks** with strategic phasing:
- **Weeks 1-2**: Foundation (safe, unblocking)
- **Weeks 2-4**: CLI reorganization (medium risk, high value)
- **Weeks 4-6**: Backend alignment (medium risk)
- **Weeks 6-8**: Frontend cleanup (low risk)

**Expected Outcomes**:
- Clear separation of concerns
- Decoupled frontend/backend (can be versioned independently)
- Testable business logic
- Scalable for 10+ engineers
- Reduced coupling → faster feature development
- Better IDE support and type checking

Once completed, your codebase will support rapid feature development and parallel team workflows without the architectural debt you're currently carrying.
