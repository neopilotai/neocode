# Phase 1: TypeScript Strictness & ESLint Configuration

## Overview

This phase establishes a strong type-safety foundation and prevents architectural violations through enhanced linting. It's the prerequisite for all subsequent phases and has the lowest risk/highest impact.

**Duration:** 1-2 weeks | **Risk Level:** LOW | **Blockers:** None

---

## Current State Analysis

### TypeScript Configuration

**Root `tsconfig.json`:**
```json
{
  "extends": "@tsconfig/bun/tsconfig.json",
  "compilerOptions": {}
}
```

**Issues:**
- ✗ Minimal compiler options (inherits Bun defaults only)
- ✗ No strict mode enabled
- ✗ No path aliases defined
- ✗ No module resolution rules
- ✗ Individual packages define their own tsconfig (inconsistent)

**Package-level configs found:**
- `/packages/neocode/` - Has `tsconfig.json`
- `/packages/app/` - Has `tsconfig.json` (Vite-based)
- `/packages/sdk/js/` - Has `tsconfig.json` (generates code)
- `/packages/console/core/` - Uses different TypeScript settings
- `/packages/plugin/` - Custom config

**Problem:** Each package has conflicting compiler options (moduleResolution, declaration, target, etc.)

### ESLint Configuration

**Current setup (`eslint.config.js`):**
```javascript
- TypeScript ESLint parser ✓
- Recommended rules ✓
- Custom rules for no-console, no-unused-vars ✓
- Test files exempted ✓
```

**Issues:**
- ✗ Limited enforcements for architecture
- ✗ No import sorting rules
- ✗ No circular dependency detection
- ✗ No barrel file restrictions
- ✗ No TypeScript-specific best practices
- ✗ No monorepo boundary enforcement

### Code Quality Scan

**Key findings:**
- TypeScript version: 5.8.2 ✓ (Latest)
- ESLint: 9.39.2 ✓ (FlatConfig format)
- Package structure: Complex (9+ workspaces)
- Strict mode: NOT enabled
- NoImplicitAny: NOT enforced
- StrictNullChecks: NOT enforced

---

## What's Wrong Right Now?

### 1. **TypeScript Doesn't Catch Type Errors**

Without `strict: true`, code like this compiles:

```typescript
// ❌ Would compile without strict mode
function processUser(user) {  // implicit any
  return user.email.toLowerCase()  // could crash
}

// ❌ Null checks ignored
const value = getValue()
const len = value.length  // error not caught

// ❌ Any escapes type safety
let config: any = loadConfig()
config.invalidProp = "test"  // no error
```

### 2. **ESLint Doesn't Prevent Architectural Violations**

```typescript
// ❌ Frontend could import backend (no enforcement)
// packages/app/src/index.ts
import { dbQuery } from '@neocode-ai/console-core/src/db'

// ❌ Circular dependencies not detected
// packages/neocode/src/cli.ts imports SDK
// packages/sdk/js/src/index.ts imports neocode

// ❌ Barrel exports hide implementation
// packages/util/src/index.ts
export * from './db'  // hides 40 DB functions
export * from './auth'  // hides 20 auth functions
```

### 3. **Large Codebase = Large Problems Later**

The neocode project has:
- 100+ source files
- 9+ workspace packages
- Complex interdependencies
- Growing team (shared instructions mention "parallel development")

**Without strict tooling now, in 6 months:**
- Type errors cause production bugs
- Teams accidentally couple systems
- Refactoring breaks multiple packages
- Onboarding takes 2x longer

---

## Phase 1: The Solution

### Part A: Root TypeScript Config (Strict Mode)

**File:** `/vercel/share/v0-project/tsconfig.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@tsconfig/bun/tsconfig.json",
  "compilerOptions": {
    // Strictness
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    
    // Safety
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    
    // Module Resolution
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // Path Aliases (shared across all packages)
    "baseUrl": ".",
    "paths": {
      "@neocode/*": ["packages/*/src"],
      "@neocode-ai/*": ["packages/*/src"],
      "@console/*": ["packages/console/*/src"],
      "@sdk/*": ["packages/sdk/*/src"]
    },
    
    // Output
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["packages/**/*.ts", "packages/**/*.tsx"],
  "exclude": ["node_modules", "dist", "build", "coverage"]
}
```

**Why these settings:**
- `strict: true` - Enables all strict checks
- `exactOptionalPropertyTypes` - Don't allow undefined for optional props
- `noUncheckedIndexedAccess` - Prevents `obj[key]` without type guard
- `noUnusedLocals/Parameters` - Catches dead code early
- Path aliases - Replaces inconsistent `@/*` usage

### Part B: Enhanced ESLint Config

**File:** `/vercel/share/v0-project/eslint.config.js`

```javascript
import js from "@eslint/js"
import typescript from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import * as globals from "globals"

export default [
  {
    ignores: ["node_modules/**", "dist/**", "build/**", "coverage/**", "*.lock", "sst-env.d.ts"],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
        tsconfigRootDir: ".",
      },
      globals: {
        ...globals.node,
        ...globals.bun,
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      // Core TypeScript
      ...typescript.configs.strict.rules,
      ...typescript.configs.stylistic.rules,
      
      // Strict Rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/prefer-const": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      
      // Code Quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "error",
      "object-shorthand": "error",
      
      // Module Consistency
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" }
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      
      // Function Signatures
      "@typescript-eslint/explicit-function-return-types": [
        "warn",
        { allowExpressions: true, allowTypedFunctionExpressions: true }
      ],
    },
  },
  // Test files get some relaxation
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-types": "off",
    },
  },
]
```

**New rules added:**
- `strict` plugin config - TypeScript best practices
- `no-floating-promises` - Catch unhandled async code
- `await-thenable` - Type-aware async checking
- `consistent-type-imports` - Better tree-shaking
- `explicit-function-return-types` - Prevent type inference bugs

### Part C: Update Package TSConfigs

**Strategy:** Each package extends root, overrides only what's necessary.

**Example: `/packages/neocode/tsconfig.json`**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declarationDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**Why:** Removes duplication, enforces consistency, easier to update standards

---

## Implementation Steps

### Step 1: Backup Current Configs (Dev Branch)
- Create new branch: `phase-1/typescript-strictness`
- Keep original configs for reference
- Document any overrides before changes

### Step 2: Update Root tsconfig.json
- Add strict compiler options
- Define path aliases
- Set module resolution

### Step 3: Update ESLint Config
- Import strict plugin configs
- Add architecture-aware rules
- Document rule reasoning

### Step 4: Update Package TSConfigs
- Have each package extend root `tsconfig.json`
- Remove redundant options
- Add package-specific overrides only

### Step 5: Run TypeScript Check
```bash
bun run typecheck
```
**Expected:** Compilation errors (this is good - we're catching issues!)

### Step 6: Fix TypeScript Errors
- Use `as const` for strict literal types (if needed)
- Add `!` non-null assertion (sparingly, with comments)
- Refactor loose types to strict
- Add missing type annotations

**Priority fixes:**
1. Any/unknown types (highest priority)
2. Null/undefined issues
3. Return type inference
4. Generic constraints

### Step 7: Run ESLint
```bash
bun run lint
```
**Expected:** New lint violations (intentional)

### Step 8: Fix ESLint Violations
- Fix import sorting
- Remove unused variables
- Add missing type annotations

### Step 9: Automate Checks
Add to `package.json`:
```json
{
  "scripts": {
    "check": "bun run typecheck && bun run lint:check",
    "lint:check": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix"
  }
}
```

Add pre-commit hook in `husky` to prevent regressions.

### Step 10: Document Decisions
- Create `TYPESCRIPT_GUIDELINES.md`
- Document why rules are enabled
- Add migration guides for team

---

## Success Criteria

✅ All packages compile with `bun run typecheck`
✅ No ESLint violations with strict rules
✅ TypeScript `strict: true` enabled
✅ All path aliases work correctly
✅ Pre-commit hooks prevent regressions
✅ Team documentation updated
✅ Zero technical debt introduced

---

## Migration Timeline

| Task | Effort | Notes |
|------|--------|-------|
| Update root tsconfig | 1 hour | Single file change |
| Update ESLint config | 2 hours | Research, document rules |
| Update package configs | 2 hours | Parallel changes |
| Fix TypeScript errors | 4-8 hours | Depends on codebase size |
| Fix ESLint violations | 4-8 hours | Mostly automated fixes |
| Testing & validation | 2-4 hours | Verify all packages work |
| Documentation | 2 hours | Guidelines for team |
| **Total** | **17-27 hours** | Spread over 1-2 weeks |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Breaking changes in packages | MEDIUM | Test each package independently |
| CI pipeline failures | MEDIUM | Update CI to use strict config |
| Team friction | LOW | Good documentation, gradual rollout |
| Performance impact | LOW | Strict mode doesn't affect runtime |

---

## What Happens Next (Phase 2+)

Once Phase 1 is complete:

- **Phase 2:** Split neocode package (CLI/TUI/domain separation)
- **Phase 3:** Backend domain layering (infrastructure isolation)
- **Phase 4:** Frontend module restructuring (feature-based)
- **Phase 5:** SDK boundary layer (independent versioning)
- **Phase 6:** Automated enforcement (custom ESLint rules)

Each phase builds on Phase 1's foundation.

---

## Questions Before Proceeding?

1. **Backward compatibility:** Any legacy code that needs exemptions?
2. **Migration window:** Can we start now, or schedule for specific week?
3. **Team availability:** Who will help fix TypeScript errors?
4. **Documentation:** What's the best format for team guidelines?

---

**Author:** Neocode Architecture Audit
**Date:** February 2026
**Status:** Ready for Approval
