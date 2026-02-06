# TypeScript Strictness Guidelines

## Overview

This document provides guidance on working with the new strict TypeScript configuration implemented in Phase 1. All packages follow the root `tsconfig.json` which enforces strict type checking.

---

## Key Configuration Changes

### Root tsconfig.json (`/vercel/share/v0-project/tsconfig.json`)

The root config enables ALL strict checks:

```typescript
"strict": true,                               // Enables all strict checks
"noImplicitAny": true,                        // Must have explicit types
"strictNullChecks": true,                     // Null/undefined always explicit
"strictFunctionTypes": true,                  // Function parameter types strict
"noImplicitReturns": true,                    // Must return declared type
"noUnusedLocals": true,                       // Catch dead code
"noUnusedParameters": true,                   // Flag unused function params
"exactOptionalPropertyTypes": true,           // undefined !== optional
"noUncheckedIndexedAccess": true,             // obj[key] type is T | undefined
```

### ESLint Rules

Enhanced `eslint.config.js` enforces:

- `@typescript-eslint/no-explicit-any`: ERROR (was: WARN)
- `@typescript-eslint/no-floating-promises`: ERROR
- `@typescript-eslint/explicit-function-return-types`: WARN
- `@typescript-eslint/consistent-type-imports`: ERROR
- Import sorting and code organization

---

## Common Issues & Solutions

### 1. "Parameter implicitly has an 'any' type"

**Before (Error):**
```typescript
function processUser(user) {  // ❌ Error: any type
  return user.email.toLowerCase()
}
```

**After (Fixed):**
```typescript
interface User {
  email: string
}

function processUser(user: User): string {  // ✅ Explicit type
  return user.email.toLowerCase()
}
```

**Rule:** Always add type annotations to function parameters and return types.

---

### 2. "Object is possibly 'null'"

**Before (Error):**
```typescript
const user = fetchUser() // returns User | null
const email = user.email  // ❌ Error: user might be null
```

**After (Fixed):**
```typescript
const user = fetchUser() // returns User | null
const email = user?.email ?? 'unknown' // ✅ Handle null case
// OR
if (user) {
  const email = user.email // ✅ Inside type guard
}
```

**Rule:** Always handle null/undefined cases with type guards or optional chaining.

---

### 3. "Variable declared but never used"

**Before (Error):**
```typescript
function getData() {
  const unused = 42  // ❌ Error: unused variable
  return 'result'
}
```

**After (Fixed):**
```typescript
// Option 1: Remove unused variable
function getData() {
  return 'result'
}

// Option 2: Prefix with underscore if intentionally unused
function getData(unused: number) {
  return 'result'
}

// Option 3: Use the variable
function getData() {
  const result = 42
  return String(result)
}
```

**Rule:** Remove unused variables or prefix with `_` if intentionally skipped.

---

### 4. "Unsafe indexing"

**Before (Error):**
```typescript
const items = [1, 2, 3]
const item = items[0]  // ❌ Error: could be undefined
console.log(item.toFixed(2))  // Could crash if undefined
```

**After (Fixed):**
```typescript
const items = [1, 2, 3]
const item = items[0]
if (item !== undefined) {  // ✅ Type guard
  console.log(item.toFixed(2))
}

// OR with optional chaining
const items = [1, 2, 3]
console.log(items[0]?.toFixed(2))
```

**Rule:** When accessing potentially undefined values, use type guards or optional chaining.

---

### 5. "Floating Promise"

**Before (Error):**
```typescript
async function saveUser(user: User) {
  // ❌ Error: Promise not awaited or returned
  database.save(user)
}
```

**After (Fixed):**
```typescript
async function saveUser(user: User) {
  // ✅ Option 1: Await
  await database.save(user)
  
  // ✅ Option 2: Return
  return database.save(user)
  
  // ✅ Option 3: Explicitly ignore with void
  void database.sendEmail(user.email)
}
```

**Rule:** Always `await` or `return` promises, or explicitly `void` them.

---

### 6. "Missing return type"

**Before (Warning):**
```typescript
function calculateTotal(items: Item[]) {  // ⚠️ Warning: implicit return type
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

**After (Fixed):**
```typescript
function calculateTotal(items: Item[]): number {  // ✅ Explicit return type
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Exception: Arrow functions with single expression
const total = (items: Item[]): number => items.reduce((sum, item) => sum + item.price, 0)
```

**Rule:** Always add explicit return types to non-trivial functions.

---

### 7. "Cannot assign type X to type Y"

**Before (Error):**
```typescript
const value: string = 123  // ❌ Error: number isn't string
```

**After (Fixed):**
```typescript
// ✅ Option 1: Fix the type
const value: number = 123

// ✅ Option 2: Convert the value
const value: string = String(123)

// ✅ Option 3: Use union type (if needed)
const value: string | number = 123
```

**Rule:** Ensure assignments match declared types exactly.

---

## Path Aliases

All packages share consistent path aliases defined in root `tsconfig.json`:

```typescript
"paths": {
  "@neocode/*": ["packages/*/src"],
  "@neocode-ai/*": ["packages/*/src"],
  "@console/*": ["packages/console/*/src"],
  "@sdk/*": ["packages/sdk/*/src"]
}
```

Use these throughout the codebase:

```typescript
// ✅ Good
import { createUser } from '@neocode-ai/console-core'
import { parseFile } from '@sdk/js'

// ❌ Bad  
import { createUser } from '../../../packages/console/core/src'
import { parseFile } from 'packages/sdk/js/src'
```

---

## Migration Strategy for Existing Code

If you're migrating existing code to strict mode:

### Step 1: Fix Obvious Issues
- Remove unused variables
- Add simple type annotations
- Fix null checks

### Step 2: Use `as const` for Strict Literals
```typescript
const config = {
  level: 'info' as const,  // Type: "info" not string
  items: [1, 2, 3] as const
}
```

### Step 3: Use `!` Non-Null Assertion (Sparingly)
```typescript
// Only when you're 100% sure it's not null
const value = getValue()
const length = value!.length  // ✅ If you KNOW it's not null
```

### Step 4: Define Better Types
```typescript
// Instead of:
const items: any[] = []

// Better:
interface Item {
  id: string
  name: string
}
const items: Item[] = []
```

---

## Test File Exemptions

Test files (`.test.ts`, `.spec.ts`) have relaxed rules:

```typescript
// ✅ OK in tests (normally error)
it('should handle any input', () => {
  const data: any = getTestData()
  expect(data.value).toBe(42)
})
```

---

## Team Best Practices

1. **Always add types** - Even when TypeScript can infer them
2. **Use explicit over implicit** - `const x: number` over `const x = 5`
3. **Document complex types** - Add JSDoc for non-obvious types
4. **Avoid type assertions** - Use proper type definitions instead
5. **Create shared interfaces** - Reuse common types across packages

---

## CI/CD Integration

All commits must pass:

```bash
# Typecheck
bun run typecheck

# Lint
bun run lint:check

# Both
bun run check
```

---

## Q&A

**Q: Can I use `any`?**
A: No. Use `unknown` instead and add a type guard.

**Q: When should I use `as const`?**
A: For literal types that should never change. E.g., `'read' as const`

**Q: What about third-party libraries without types?**
A: Use `@types/*` or create `.d.ts` files in your package.

**Q: How do I fix "Unsafe use of optional chaining"?**
A: Add a null check or use ?? for fallback: `obj?.prop ?? defaultValue`

---

## Resources

- [TypeScript Handbook - Strict Mode](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [ESLint Rules Reference](https://typescript-eslint.io/rules/)
- [Neocode Architecture Audit](./ARCHITECTURE_AUDIT.md)
- [Phase 1 Implementation Plan](./PHASE_1_PLAN.md)
