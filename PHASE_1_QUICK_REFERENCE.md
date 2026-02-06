# Phase 1: Quick Reference Card

## TL;DR - What Changed?

**TypeScript:** Now STRICT (catches more errors)  
**ESLint:** Now STRICT (enforces code quality)  
**Packages:** All extend root config (unified standards)  

---

## Quick Commands

```bash
# Check for errors
bun run typecheck          # TypeScript errors
bun run lint:check         # ESLint violations
bun run check              # Both (recommended)

# Fix automatically
bun run lint:fix           # Auto-fix ESLint
```

---

## Common Errors & Fixes

### 1. "Parameter has type 'any'"
```typescript
// ❌ Before
function process(data) { }

// ✅ After
function process(data: DataType): void { }
```

### 2. "Object is possibly 'null'"
```typescript
// ❌ Before
const email = user.email

// ✅ After
const email = user?.email ?? 'unknown'
```

### 3. "Variable declared but never used"
```typescript
// ❌ Before
const unused = 42

// ✅ After (remove it or prefix with _)
const _unused = 42  // if intentionally unused
```

### 4. "Promise not awaited"
```typescript
// ❌ Before
asyncFunction()

// ✅ After
await asyncFunction()
```

### 5. "Missing return type"
```typescript
// ❌ Before
function calculate() {
  return 42
}

// ✅ After
function calculate(): number {
  return 42
}
```

---

## Path Aliases (Use These!)

```typescript
// ✅ Good
import { foo } from '@neocode-ai/console-core'
import { bar } from '@sdk/js'
import { baz } from '@util/src'

// ❌ Bad (don't use relative paths)
import { foo } from '../../../packages/console/core/src'
```

---

## Key Rules

| Rule | Impact | Fix |
|------|--------|-----|
| No `any` | STRICT | Add explicit types |
| Null checks | STRICT | Use type guards (`?.`, `??`) |
| Unused code | ERROR | Remove or prefix with `_` |
| Floating promises | ERROR | Add `await` or `return` |
| Return types | WARN | Add explicit `: Type` |

---

## Documentation

- 📖 **TYPESCRIPT_GUIDELINES.md** - Full guide with all error solutions
- 📋 **PHASE_1_SUMMARY.md** - Overview and next steps
- 📊 **PHASE_1_IMPLEMENTATION_REPORT.md** - Technical details
- 🏗️ **ARCHITECTURE_AUDIT.md** - Why we're doing this

---

## Priority: Fix Errors in This Order

1. **any types** (blocks type safety)
2. **null checks** (prevents runtime errors)
3. **unused code** (improves quality)
4. **return types** (improves clarity)
5. **imports** (helps architecture)

---

## When You're Stuck

1. Find the error message in `TYPESCRIPT_GUIDELINES.md`
2. Review the code example provided
3. Apply the suggested fix
4. Run `bun run check` to verify

---

## Pre-Commit Checklist

Before pushing code:
```bash
□ bun run typecheck (no errors)
□ bun run lint:check (no violations)
□ Reviewed logic changes
□ PR description clear
```

---

## One-Liners

```bash
# Check everything
bun run check

# Fix what can be auto-fixed
bun run lint:fix && bun run typecheck

# See only errors (no warnings)
bun run typecheck 2>&1 | grep error
```

---

## Key Takeaways

✅ All types must be explicit  
✅ All null cases must be handled  
✅ All promises must be awaited  
✅ All code must be used  
✅ All packages follow same rules  

---

**Need help? Read TYPESCRIPT_GUIDELINES.md**
