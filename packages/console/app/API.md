# @console/app - Public API

## Overview

The console app package provides the web-based admin console UI for Neocode. It contains React components, hooks, and pages for managing agents, viewing logs, and configuration.

## Public Exports

### @console/app
```typescript
export { ConsoleApp } from "./app"
export { useAuth } from "./hooks/useAuth"
export { useAgent } from "./hooks/useAgent"
```

Main app component and custom hooks for console functionality.

### @console/components
```typescript
import { AgentList } from "@console/components"
import { LogViewer } from "@console/components"
import { ConfigForm } from "@console/components"
```

Reusable UI components for the console interface.

**Exports:**
- `AgentList` - Display list of agents
- `LogViewer` - Real-time log viewer
- `ConfigForm` - Configuration editor
- `DashboardLayout` - Main layout wrapper

### @console/hooks
```typescript
import { useAuth } from "@console/hooks"
import { useAgent } from "@console/hooks"
import { useApiClient } from "@console/hooks"
```

Custom React hooks for state management and API integration.

**Exports:**
- `useAuth()` - Authentication state and methods
- `useAgent()` - Agent management
- `useApiClient()` - API communication
- `useLocalStorage()` - Persistent state

### @console/types
```typescript
import type { Agent } from "@console/types"
import type { LogEntry } from "@console/types"
```

TypeScript types and interfaces for console data structures.

## Internal Structure (DO NOT IMPORT DIRECTLY)

- `src/pages/` - Next.js page components
- `src/components/` - Internal UI components
- `src/hooks/` - Custom hooks implementation
- `src/services/` - API and business logic
- `src/lib/` - Utilities and helpers

## Usage Examples

### Embedding Console
```typescript
import { ConsoleApp } from "@console/app"

export default function MyPage() {
  return <ConsoleApp apiUrl="https://api.example.com" />
}
```

### Using Hooks
```typescript
import { useAuth, useAgent } from "@console/hooks"

function MyComponent() {
  const { user, login } = useAuth()
  const { agents, loading } = useAgent()
  
  return <div>...</div>
}
```

### Component Usage
```typescript
import { AgentList, LogViewer } from "@console/components"

function Dashboard() {
  return (
    <>
      <AgentList onSelect={(id) => console.log(id)} />
      <LogViewer agentId={selectedId} />
    </>
  )
}
```

## Breaking Changes

- **v1.0**: Initial public release
- Component API is considered stable

## Migration Guide

### Accessing Internal State
Don't access internal state directly. Use provided hooks instead.

```typescript
// ❌ Don't do this
import { authStore } from "@console/app/src/services/auth"

// ✅ Do this instead
import { useAuth } from "@console/hooks"
const { user } = useAuth()
```
