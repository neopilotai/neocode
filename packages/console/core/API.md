# @console/core - Public API

## Overview

The console core package provides shared types, hooks, and utilities for the console system. It serves as the foundation for console-related functionality across the platform.

## Public Exports

### @console/core
```typescript
export type { ConsoleConfig } from "./types"
export { createConsoleClient } from "./client"
export { useConsoleContext } from "./context"
```

Core types and utilities for console functionality.

### @console/types
```typescript
import type { Agent } from "@console/types"
import type { LogEntry } from "@console/types"
import type { SessionData } from "@console/types"
```

Shared type definitions for console data structures.

**Exports:**
- `Agent` - Agent configuration and state
- `LogEntry` - Log line structure
- `SessionData` - User session information
- `ConsoleConfig` - Console configuration

## Internal Structure (DO NOT IMPORT DIRECTLY)

- `src/types/` - Type definitions
- `src/client/` - API client implementation
- `src/context/` - React context providers
- `src/lib/` - Utility functions

## Usage Examples

### Using Console Client
```typescript
import { createConsoleClient } from "@console/core"

const client = createConsoleClient({
  apiUrl: "https://api.example.com",
  apiKey: process.env.NEOCODE_API_KEY
})

const agents = await client.getAgents()
```

### Type Imports
```typescript
import type { Agent, LogEntry } from "@console/types"

function processAgent(agent: Agent): void {
  console.log(agent.name)
}
```

## Stability

Core API is stable and suitable for production use. Type additions may occur without breaking changes.
