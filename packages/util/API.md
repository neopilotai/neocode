# @util - Public API

## Overview

The util package provides shared utilities, types, and helper functions used across the Neocode monorepo. It contains foundational code for error handling, logging, validation, and common types.

## Public Exports

### @util/error
```typescript
import { NamedError } from "@util/error"
import { ValidationError } from "@util/error"
import { formatError } from "@util/error"
```

Error types and utilities for consistent error handling across packages.

**Exports:**
- `NamedError` - Base error class with name and message
- `ValidationError` - Type validation errors
- `NotFoundError` - Resource not found errors
- `formatError()` - Format errors for display
- `isError()` - Type guard for error objects

### @util/log
```typescript
import { Log } from "@util/log"
```

Logging utilities with support for multiple log levels.

**Exports:**
- `Log` - Main logger class
- `info()`, `warn()`, `error()` - Convenience functions

### @util/validation
```typescript
import { validateConfig } from "@util/validation"
import { validateUserInput } from "@util/validation"
```

Validation functions for configuration and user input.

**Exports:**
- `validateConfig()` - Validate configuration objects
- `validateUserInput()` - Sanitize and validate user input

### @util/types
```typescript
import type { Config } from "@util/types"
import type { Agent } from "@util/types"
```

Shared TypeScript types and interfaces used across the platform.

## Internal Structure (DO NOT IMPORT DIRECTLY)

- `src/error/` - Error handling and formatting
- `src/log/` - Logging implementation
- `src/validation/` - Validation utilities
- `src/types/` - Shared type definitions

## Usage Examples

### Error Handling
```typescript
import { NamedError, formatError } from "@util/error"

try {
  // ... operation
} catch (err) {
  const formatted = formatError(err)
  console.error(formatted)
}
```

### Validation
```typescript
import { validateConfig } from "@util/validation"

const config = validateConfig(userInput)
```

### Type Safety
```typescript
import type { Config, Agent } from "@util/types"

function processAgent(agent: Agent): Config {
  // ...
}
```

## No Breaking Changes Yet

Stable API suitable for production use.
