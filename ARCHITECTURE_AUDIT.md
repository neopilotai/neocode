# Neocode Architecture Audit & Scalability Roadmap

**Project Type**: Enterprise AI-powered development platform (Monorepo using Turborepo)  
**Current Setup**: Bun package manager, TypeScript, SolidJS for UI, Hono for API, Drizzle ORM for database  
**Date**: February 2026

---

## Executive Summary

The **Neocode** project is a sophisticated monorepo hosting multiple interconnected systems:
- **neocode**: Core CLI tool + TUI application
- **@neocode-ai/app**: SolidJS web application (Vite-based)
- **@neocode-ai/console**: Backend services (core, function, resource, mail)
- **@neocode-ai/sdk**: JavaScript SDK for integrations
- **UI, Util, Script, Plugin**: Shared libraries
- **Desktop, Web, Enterprise**: Platform-specific implementations

While the project demonstrates solid foundational architecture, there are **critical scalability risks** that will compound as the codebase grows. This audit identifies 6 major anti-patterns and provides a phased refactor roadmap.

---

## Part 1: Current State Audit

### 1.1 Project Structure Overview

```
neocode/ (root)
├── packages/
│   ├── neocode/              # CLI + TUI (monolithic, ~500+ files expected)
│   ├── app/                  # SolidJS web UI (Vite)
│   ├── console/              # Backend services (core, function, resource, mail)
│   │   ├── core/             # Main API + database (uses Drizzle + PlanetScale)
│   │   ├── function/         # Serverless functions
│   │   ├── resource/         # Resource management
│   │   └── mail/             # Email services
│   ├── desktop/              # Tauri desktop app
│   ├── ui/                   # Shared UI components (SolidJS)
│   ├── util/                 # Utility functions
│   ├── script/               # Build & runtime scripts
│   ├── plugin/               # Plugin system
│   ├── sdk/js/               # JS SDK
│   ├── slack/                # Slack integration
│   ├── function/             # Function package
│   ├── containers/           # Container configuration
│   ├── enterprise/           # Enterprise features
│   ├── web/                  # Web platform
│   ├── docs/                 # Documentation
│   └── ...
├── sdks/                     # External SDKs (VSCode, etc.)
├── github/                   # GitHub Actions
├── nix/                      # Nix configuration
├── .neocode/                 # neocode internal config
└── root config files
```

**Package count**: ~20+ packages in workspace  
**Shared dependencies**: 40+ catalog entries in root package.json  
**Build system**: Turborepo with minimal configuration

---

### 1.2 Current Architecture Patterns

#### ✅ What Works Well:

1. **Monorepo organization**: Using Turborepo with shared catalog is solid
2. **Clear package separation**: UI, SDK, core, CLI are reasonably isolated
3. **Type safety**: Strict TypeScript configuration, ESLint with no-explicit-any warnings
4. **Testing approach**: Playwright e2e tests, bun test for units
5. **Dependency management**: Catalog pattern reduces duplication

#### ❌ Major Issues Identified:

---

### **Issue #1: Monolithic neocode Package (CRITICAL)**

**Problem**: The `packages/neocode` appears to be a catch-all for CLI, TUI, and utilities. Expected structure suggests:
- `src/cli/` (CLI commands)
- `src/cli/cmd/tui/` (Terminal UI - very deep nesting)
- Likely mixed concerns (I/O, business logic, presentation)

**Risk**: As features grow, this becomes unmaintainable. Tight coupling between CLI and TUI makes testing and reuse difficult.

**Current Evidence**:
- 40+ JSON theme files in `src/cli/cmd/tui/context/theme/`
- Multiple independent concerns bundled together
- Exports use glob pattern: `"./*": "./src/*.ts"` (exposes everything)

**Expected Codebase Size**: ~2000+ files, scattered across deeply nested folders

---

### **Issue #2: Tight Coupling: Frontend → Backend (CRITICAL)**

**Problem**: 
- `@neocode-ai/app` directly depends on `@neocode-ai/sdk`
- `@neocode-ai/sdk` presumably imports from `@neocode-ai/console-core`
- Direct database model imports in frontend code (e.g., Drizzle schemas)
- No clear API boundary layer

**Risk**: 
- Circular dependencies possible
- Frontend breaks with backend changes
- Shared type definitions create coupling
- Hard to version independently

**Example**: If console-core exports database schemas and both app and CLI import them, a schema change affects all consumers simultaneously.

---

### **Issue #3: Missing Domain Separation (CRITICAL)**

**Problem**: No clear domain boundaries between features:
- User management, authentication, projects, sessions, models, providers all mixed
- No clear where "domain logic" lives vs "infrastructure"
- Likely mixing application concerns (use cases) with infrastructure (DB, HTTP)

**Evidence**:
- `console/core` handles: STS, email, PlanetScale, Stripe, Drizzle all at package level
- No visible service/repository pattern
- Direct Drizzle calls likely scattered throughout

**Risk**: 
- Hard to test business logic without full database
- Impossible to swap implementations (e.g., change DB provider)
- Feature teams can't work independently

---

### **Issue #4: TypeScript Configuration Inconsistencies (HIGH)**

**Problem**: Multiple tsconfig.json files with conflicting settings:

```
Root tsconfig.json:
- Extends @tsconfig/bun (minimal config)
- No compilerOptions set

packages/neocode/tsconfig.json:
- Extends @tsconfig/bun (different than app!)
- Custom paths: @/* → ./src/*, @tui/* → ./src/cli/cmd/tui/*
- jsxImportSource: @opentui/solid

packages/app/tsconfig.json:
- Completely different!
- strict: true, noUncheckedIndexedAccess: true
- composite: true, emitDeclarationOnly: true
- Different jsx settings and paths
```

**Risk**:
- Type checking inconsistency
- Path resolution varies by package
- Module resolution confusion
- IDE intellisense fails randomly

---

### **Issue #5: Path Alias Chaos (MEDIUM-HIGH)**

**Problem**: No standardized path alias convention:
- `@/*` means different things in different packages
- `@tui/*`, `@neocode-ai/*` are package-scoped but not cross-package discoverable
- Deeply nested aliases make refactoring hard

**Expected Issues**:
- Circular imports via different paths
- Relative imports nested 5+ levels deep
- IDE autocompletion confusion

---

### **Issue #6: Barrel File Anti-Pattern (MEDIUM)**

**Problem**: Likely pervasive use of `index.ts` barrel files:
- `packages/neocode/src/index.ts` exports `"./*": "./src/*.ts"` (exposes entire src/)
- Hides implementation details
- Makes tree-shaking impossible
- Circular dependencies hard to detect

**Evidence**: `exports: { "./*": "./src/*.ts" }` in neocode package.json

---

## Part 2: Ideal Architecture

### 2.1 Recommended Folder Structure

```
neocode/ (root)
├── packages/
│   ├── neocode/                    # Unified CLI application
│   │   ├── src/
│   │   │   ├── cli/                # ← CLI commands & entry point
│   │   │   │   ├── commands/       # Individual command implementations
│   │   │   │   ├── parser/         # Argument parsing (Yargs)
│   │   │   │   └── index.ts        # ← Only export: run()
│   │   │   │
│   │   │   ├── tui/                # ← Terminal UI (Solid + OpenTUI)
│   │   │   │   ├── components/     # TUI components
│   │   │   │   ├── state/          # Application state (context)
│   │   │   │   ├── themes/         # Theme system (move JSON to data/)
│   │   │   │   └── index.ts        # ← Only export: TuiApp
│   │   │   │
│   │   │   ├── domain/             # ← Business logic (framework-agnostic)
│   │   │   │   ├── project/        # Project management use cases
│   │   │   │   ├── model/          # Model configuration
│   │   │   │   ├── provider/       # Provider management
│   │   │   │   └── types.ts        # ← Domain types (NOT data schemas)
│   │   │   │
│   │   │   ├── infrastructure/     # ← External integrations
│   │   │   │   ├── api/            # HTTP client to console API
│   │   │   │   ├── filesystem/     # File I/O operations
│   │   │   │   ├── ipc/            # IPC for desktop/web bridge
│   │   │   │   └── providers/      # AI provider integrations
│   │   │   │
│   │   │   ├── shared/             # ← Utilities (must be framework-agnostic)
│   │   │   │   ├── logging/
│   │   │   │   ├── validation/     # Zod schemas (reusable)
│   │   │   │   └── errors/         # Custom error types
│   │   │   │
│   │   │   ├── bin/                # ← Executable entry point
│   │   │   │   └── neocode.ts
│   │   │   │
│   │   │   └── index.ts            # ← ONLY export types + run()
│   │   │
│   │   └── tsconfig.json           # Strict configuration
│   │
│   ├── @neocode-ai/
│   │   ├── console-core/           # Backend API + Database
│   │   │   ├── src/
│   │   │   │   ├── domain/         # ← Business logic
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── user/
│   │   │   │   │   ├── project/
│   │   │   │   │   └── subscription/
│   │   │   │   │
│   │   │   │   ├── application/    # ← Use cases & DTOs
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── project/
│   │   │   │   │   └── dto/        # Data Transfer Objects (NOT domain models)
│   │   │   │   │
│   │   │   │   ├── infrastructure/ # ← Database, HTTP, external services
│   │   │   │   │   ├── database/
│   │   │   │   │   │   ├── schema/ # ← Drizzle schemas (DO NOT export to frontend)
│   │   │   │   │   │   └── repositories/
│   │   │   │   │   ├── api/
│   │   │   │   │   └── integrations/ # Stripe, email, etc.
│   │   │   │   │
│   │   │   │   ├── presentation/   # ← HTTP handlers (Hono routes)
│   │   │   │   │   ├── handlers/
│   │   │   │   │   ├── middleware/
│   │   │   │   │   └── routes.ts
│   │   │   │   │
│   │   │   │   ├── shared/
│   │   │   │   │   ├── errors/
│   │   │   │   │   ├── validation/
│   │   │   │   │   └── logger/
│   │   │   │   │
│   │   │   │   └── index.ts        # Export: app(), types
│   │   │   │
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── sdk/                    # ← JavaScript SDK (API client)
│   │   │   ├── src/
│   │   │   │   ├── client/         # HTTP client (generated from OpenAPI)
│   │   │   │   ├── types/          # ← Public API types ONLY (not schemas)
│   │   │   │   ├── hooks/          # React/SolidJS hooks (optional)
│   │   │   │   └── index.ts        # ← Export: Client, types
│   │   │   │
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── app/                    # ← Frontend SolidJS app
│   │   │   ├── src/
│   │   │   │   ├── features/       # Feature modules (instead of pages/)
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── projects/
│   │   │   │   │   └── models/
│   │   │   │   │
│   │   │   │   ├── components/     # ← Reusable UI components ONLY
│   │   │   │   │   ├── layout/
│   │   │   │   │   ├── common/
│   │   │   │   │   └── icons/
│   │   │   │   │
│   │   │   │   ├── hooks/          # ← SolidJS hooks
│   │   │   │   │   ├── useAuth.ts
│   │   │   │   │   ├── useProjects.ts
│   │   │   │   │   └── api.ts      # ← API client hook
│   │   │   │   │
│   │   │   │   ├── lib/            # ← Utilities (framework-agnostic)
│   │   │   │   │   ├── api-client.ts
│   │   │   │   │   ├── validation/
│   │   │   │   │   └── formatting/
│   │   │   │   │
│   │   │   │   ├── routes.ts       # ← Router configuration
│   │   │   │   └── app.tsx         # ← Main app component
│   │   │   │
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── ui/                     # ← Shared UI library (SolidJS)
│   │   │   ├── src/
│   │   │   │   ├── components/     # Headless components
│   │   │   │   ├── primitives/     # Low-level building blocks
│   │   │   │   ├── theme/          # Theme system
│   │   │   │   └── index.ts        # ← Export: components, theme
│   │   │   │
│   │   │   └── tsconfig.json
│   │   │
│   │   └── util/                   # ← Shared utilities
│   │       ├── src/
│   │       │   ├── string/
│   │       │   ├── array/
│   │       │   ├── object/
│   │       │   ├── validation/     # ← Shared Zod schemas
│   │       │   └── index.ts
│   │       │
│   │       └── tsconfig.json
│   │
│   ├── desktop/                    # Tauri desktop app
│   ├── web/                        # Web platform
│   ├── enterprise/                 # Enterprise features
│   ├── plugin/                     # Plugin system
│   ├── slack/                      # Slack integration
│   └── ...
│
├── tsconfig.json                   # ← Base config (strict settings)
├── tsconfig.paths.json             # ← Shared path aliases
├── turbo.json
├── eslint.config.js                # ← Stricter ESLint rules
└── package.json
```

---

### 2.2 Dependency Graph (Target State)

```
Presentation Layer (UI/CLI):
    ↓ (import only types & hooks)
Application Layer (Use Cases):
    ↓ (import only domain models)
Domain Layer (Business Logic):
    ↓ (import only types)
Infrastructure Layer (DB, HTTP, APIs):

Rules:
- Domain ← CANNOT import from Infrastructure, Application, or Presentation
- Application ← CANNOT import from Presentation, but CAN import Infrastructure
- Infrastructure ← can import from Domain & Application
- Presentation ← can import from Application & Domain
```

**Current Problem**: All layers import directly from each other (circular dependencies possible)

---

## Part 3: TypeScript Configuration Improvements

### 3.1 Root tsconfig.json (Enhanced Strictness)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    // Strictness
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": true,
    
    // Module Resolution
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": false,
    
    // Interoperability
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    
    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    
    // Skip library check for speed
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    
    // Path mapping (centralized)
    "baseUrl": ".",
    "paths": {
      "@neocode/neocode": ["packages/neocode/src"],
      "@neocode/neocode/*": ["packages/neocode/src/*"],
      
      "@neocode/console-core": ["packages/console/core/src"],
      "@neocode/console-core/*": ["packages/console/core/src/*"],
      
      "@neocode/sdk": ["packages/sdk/js/src"],
      "@neocode/sdk/*": ["packages/sdk/js/src/*"],
      
      "@neocode/app": ["packages/app/src"],
      "@neocode/app/*": ["packages/app/src/*"],
      
      "@neocode/ui": ["packages/ui/src"],
      "@neocode/ui/*": ["packages/ui/src/*"],
      
      "@neocode/util": ["packages/util/src"],
      "@neocode/util/*": ["packages/util/src/*"]
    }
  },
  "include": ["packages/**/*.ts", "packages/**/*.tsx"],
  "exclude": ["**/node_modules", "**/dist", "**/build"]
}
```

### 3.2 Package-Level tsconfig.json (Extends Root)

Each package should extend root with minimal overrides:

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

## Part 4: Code Organization Rules

### 4.1 Import Boundaries

```typescript
// ✅ ALLOWED (respects layer hierarchy)
// From Presentation → Application
import { useAuth } from '@neocode/app/application/auth'

// From Application → Domain
import type { User } from '@neocode/console-core/domain/user'

// From Infrastructure → Domain
import type { IUserRepository } from '@neocode/console-core/domain/user'

// ❌ BANNED (circular or wrong direction)
// From Domain → Infrastructure
import { UserRepository } from '@neocode/console-core/infrastructure'

// From Presentation → Infrastructure
import { database } from '@neocode/console-core/infrastructure/database'

// Cross-package internal imports
import { internalHelper } from '@neocode/console-core/internal/helper'
```

### 4.2 Public vs Private Modules

**Public Exports** (via index.ts):
```typescript
// packages/console-core/src/index.ts
export type { User, Project } from './domain/user'
export type { IAuthService } from './application/auth'
export { createApp } from './presentation/app'
```

**Private modules** (NOT exported from index.ts):
- `infrastructure/database/schema` - Drizzle models (only for internal repositories)
- `infrastructure/database/client` - Database connection
- `internal/*` - Helper utilities not part of public API

### 4.3 Barrel File Strategy

**USE SPARINGLY**:
- ✅ Feature root: `features/auth/index.ts` exports all auth components
- ✅ Domain root: `domain/user/index.ts` exports all user types
- ❌ Avoid: Deeply nested barrels (encourages incorrect imports)
- ❌ Avoid: Wildcard exports in barrels

**Example**:
```typescript
// packages/app/src/features/auth/index.ts (OK)
export { AuthProvider } from './AuthProvider'
export { useAuth } from './useAuth'
export { LoginForm } from './LoginForm'

// packages/app/src/features/auth/internal/helper.ts (private)
// ← NOT exported, for internal use only

// packages/app/src/features/auth/lib/validation.ts (reusable)
// ← Exported from index.ts for use by other features
```

### 4.4 File & Folder Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UserCard.tsx`, `LoginForm.tsx` |
| Utilities | camelCase | `formatDate.ts`, `parseJSON.ts` |
| Hooks | camelCase, prefix `use` | `useAuth.ts`, `useProjects.ts` |
| Types | PascalCase | `User.ts`, `Project.ts` |
| Domain Models | PascalCase | `User.ts`, `Subscription.ts` |
| Domain Services | PascalCase, suffix `Service` | `AuthService.ts` |
| Repositories | PascalCase, suffix `Repository` | `UserRepository.ts` |
| Factories | PascalCase, suffix `Factory` | `UserFactory.ts` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` |
| Configs | camelCase | `tailwind.config.ts` |
| Tests | `.test.ts` or `.spec.ts` | `auth.test.ts` |

---

## Part 5: ESLint & Developer Experience Enhancements

### 5.1 Enhanced ESLint Config

```javascript
// eslint.config.js (Replace current)
import js from "@eslint/js"
import typescript from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import * as globals from "globals"

export default [
  {
    ignores: ["node_modules/**", "dist/**", "build/**", "coverage/**", "*.lock", "sst-env.d.ts", ".next/**"],
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
      },
      globals: {
        ...globals.node,
        ...globals.bun,
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      ...typescript.configs.strict.rules,
      
      // Strict type safety
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { 
        argsIgnorePattern: "^_" 
      }],
      "@typescript-eslint/no-unnecessary-type-constraint": "error",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      
      // Import organization
      "import/no-cycle": "error",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            // Prevent importing database schema outside infrastructure
            "@neocode/*/infrastructure/database/schema",
            // Prevent importing internal utilities
            "@neocode/*/internal/**",
          ]
        }
      ],
      
      // Code quality
      "prefer-const": "error",
      "no-var": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-eval": "error",
      
      // Async/Promise
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]
```

### 5.2 Prettier Configuration

```json
{
  "semi": false,
  "printWidth": 120,
  "trailingComma": "es5",
  "singleQuote": true,
  "arrowParens": "avoid",
  "useTabs": false,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

---

## Part 6: Refactor Roadmap

### Phase 1: Foundation (Weeks 1-2) - LOW RISK

**Goal**: Set up TypeScript and ESLint infrastructure without breaking existing code.

1. **Create root tsconfig.json** with strict settings
2. **Centralize path aliases** in single tsconfig.paths.json
3. **Update all package tsconfigs** to extend root
4. **Enhance ESLint rules** gradually (warnings first, then errors)
5. **Update Prettier config** for consistency
6. **Document import boundaries** in ARCHITECTURE.md

**Deliverables**:
- [ ] Updated tsconfig hierarchy
- [ ] Centralized path aliases
- [ ] Enhanced ESLint config
- [ ] Architecture documentation

**Expected Issues**: IDE intellisense may need restart; no functional changes.

---

### Phase 2: Monolithic Package Separation (Weeks 3-4) - MEDIUM RISK

**Goal**: Split `packages/neocode` into CLI + TUI + Domain + Infrastructure.

1. **Extract domain logic** from CLI/TUI into `src/domain/`
2. **Create TUI layer** under `src/tui/` (copy existing components, refactor later)
3. **Create CLI layer** under `src/cli/` (consolidate commands)
4. **Create infrastructure layer** under `src/infrastructure/` (API client, file I/O)
5. **Update exports** in index.ts (only CLI & TUI entry points)
6. **Update bin/neocode.ts** to use new structure

**Deliverables**:
- [ ] Reorganized neocode package structure
- [ ] Separated CLI, TUI, domain, infrastructure
- [ ] Updated entry points and exports
- [ ] Tests pass with new structure

**Testing**: Run existing e2e tests to ensure no breakage.

---

### Phase 3: Backend Domain Separation (Weeks 5-6) - MEDIUM-HIGH RISK

**Goal**: Restructure `packages/console/core` into layered architecture.

1. **Extract domain models** from database schemas into `src/domain/`
2. **Create repositories** under `src/infrastructure/database/repositories/`
3. **Move business logic** to domain services
4. **Create DTOs** in `src/application/` (separate from domain models)
5. **Move Hono routes** to `src/presentation/`
6. **Update exports** to hide internal infrastructure

**Deliverables**:
- [ ] Domain-driven architecture in console-core
- [ ] Repositories pattern implemented
- [ ] DTOs for API responses
- [ ] Infrastructure hidden from public API
- [ ] API still functions (no breaking changes)

**Testing**: Run API tests; ensure Stripe, email, etc. still work.

---

### Phase 4: Frontend Architecture (Weeks 7-8) - LOW-MEDIUM RISK

**Goal**: Restructure `packages/app` using feature-based organization.

1. **Create features/** folder structure (auth, dashboard, projects, models)
2. **Move pages into features** as separate modules
3. **Create shared components/** for reusable UI (NOT feature-specific)
4. **Create hooks/** with consistent patterns
5. **Update lib/** with utilities (API client, validation)
6. **Remove feature cross-imports** (enforce single direction)

**Deliverables**:
- [ ] Feature-based folder structure
- [ ] Shared vs feature-specific components clearly separated
- [ ] Consistent hook patterns
- [ ] No circular imports between features

**Testing**: Run e2e tests; UI should look identical.

---

### Phase 5: SDK Extraction & API Boundary (Weeks 9-10) - MEDIUM RISK

**Goal**: Make SDK the only frontend↔backend bridge.

1. **Generate SDK from console-core** OpenAPI spec (auto-generated)
2. **Move all API calls** from app to SDK via hooks
3. **Remove app direct imports** of console-core models
4. **Create SDK types** (separate from domain models)
5. **Version SDK independently** (can be released separately)

**Deliverables**:
- [ ] OpenAPI spec generated from console-core
- [ ] SDK auto-generated from OpenAPI
- [ ] All API calls in app use SDK
- [ ] No direct console-core imports in app
- [ ] SDK can be independently versioned

**Testing**: API contracts must remain stable; frontend should work identically.

---

### Phase 6: Advanced Dependency Management (Weeks 11-12) - LOW RISK

**Goal**: Enforce architectural rules automatically.

1. **Add import-auditor** or **eslint-plugin-import** to prevent dependency violations
2. **Create CI check** for circular dependencies (via madge)
3. **Add boundary test** for each layer (can't import from wrong direction)
4. **Document allowed imports** per package in each README

**Deliverables**:
- [ ] Import rule enforcement in CI/CD
- [ ] Circular dependency detection
- [ ] Documented import contracts
- [ ] Failed CI if rules violated

---

## Part 7: Benefits & Expected Outcomes

### After Phase 1 (Type Safety + Linting):
- ✅ Consistent TypeScript strictness across packages
- ✅ IDE intellisense works correctly
- ✅ No more mysterious "module not found" errors
- ✅ Type safety catches bugs earlier

### After Phase 2 (neocode Separation):
- ✅ CLI can be tested independently of TUI
- ✅ Domain logic reusable in other packages (web, desktop)
- ✅ Easier to add new CLI commands
- ✅ Reduced bundle size for web version (no TUI code)

### After Phase 3 (Backend Layering):
- ✅ Business logic testable without database
- ✅ Can swap database implementations
- ✅ Easier for new contributors to understand
- ✅ Breaking schema changes don't ripple to frontend

### After Phase 4 (Frontend Features):
- ✅ Developers own entire feature end-to-end
- ✅ Code splitting works efficiently
- ✅ Feature can be easily removed/replaced
- ✅ Testing becomes localized per feature

### After Phase 5 (SDK):
- ✅ Frontend & backend can be versioned independently
- ✅ Multiple frontend implementations possible (mobile, desktop, web)
- ✅ Clear API contract (OpenAPI spec)
- ✅ Easier to onboard third-party integrations

### After Phase 6 (Enforcement):
- ✅ Regressions prevented automatically
- ✅ New contributors can't accidentally break architecture
- ✅ Code reviews focus on logic, not structure
- ✅ Scaled team can move faster with less coordination

---

## Part 8: Risk Mitigation

| Phase | Risk | Mitigation |
|-------|------|-----------|
| 1-2 | Breaking IDE | Restart IDE, clear cache |
| 2 | CLI/TUI stops working | Comprehensive e2e tests before merging |
| 3 | API breaks | Maintain backward-compatible API, gradual migration |
| 4 | UI breaks | Run e2e tests, visual regression testing |
| 5 | SDK desync | Auto-generate SDK from spec, version in lockstep |
| 6 | Rules too strict | Start with warnings, gradually enforce |

---

## Part 9: Long-Term Maintenance

### Post-Refactor:

1. **Code Review Checklist**: Ensure each PR respects layer boundaries
2. **Architecture Decision Records (ADR)**: Document why we chose layered architecture
3. **Contributor Guide**: Update onboarding with import rules
4. **Metrics**: Track cyclomatic complexity, test coverage, build times
5. **Quarterly Review**: Check if architecture still fits project needs

---

## Recommendations & Next Steps

### Immediate Actions (This Week):
- [ ] Review this audit with team leads
- [ ] Validate proposed folder structure against actual codebase
- [ ] Identify any blockers or disagreements

### Before Phase 1:
- [ ] Create feature branch: `refactor/architecture-v2`
- [ ] Set up CI checks for type safety + linting
- [ ] Communicate timeline to team

### During Refactor:
- [ ] Use incremental commits (one folder/module at a time)
- [ ] Keep main branch stable (merge phases independently)
- [ ] Daily sync on blockers
- [ ] Update docs as you go

---

## Questions for Team

1. **neocode package scope**: What exactly does it handle? (CLI only? TUI? Domain logic?)
2. **Shared types**: Where do domain models live? Are they in multiple packages?
3. **Database access**: Can infrastructure/database schemas currently be imported by frontend?
4. **Desktop/Web differences**: Is there significant code duplication we should unify?
5. **Plugin system**: How do plugins interact with core? Does this impose constraints?
6. **Timeline**: How aggressive can we be with this refactor? (affects risk tolerance)
7. **Team size**: How many developers? (affects communication overhead)

---

## Conclusion

The Neocode project has solid foundations but needs **systematic refactoring** to scale past 20-30 developers. This audit provides a **phased, low-risk roadmap** that respects existing code while establishing clear boundaries.

**Starting with TypeScript + ESLint strictness (Phase 1) is essential** before doing structural refactoring, as it will catch many issues early.

The proposed architecture follows **Clean Architecture principles** (domain-driven design), proven in enterprise systems at scale.

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Status**: Ready for Review & Team Discussion
