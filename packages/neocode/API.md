# @neocode/neocode - Public API

## Overview

The neocode package provides the main CLI and TUI (Terminal User Interface) for the Neocode platform. It orchestrates all CLI commands and serves as the primary entry point for end users.

## Public Exports

### @neocode/cli
```typescript
import { RunCommand } from "@neocode/cli"
import { GenerateCommand } from "@neocode/cli"
import { AgentCommand } from "@neocode/cli"
// ... other commands
```

Main CLI commands exported as a public API for command orchestration.

**Modules:**
- `RunCommand` - Execute Neocode agents
- `GenerateCommand` - Generate code using AI
- `AgentCommand` - Manage and configure agents
- `AuthCommand` - Authentication and authorization
- `UpgradeCommand` - Upgrade Neocode CLI
- And more CLI commands...

### @neocode/tui
```typescript
import { TuiThreadCommand } from "@neocode/tui"
import { AttachCommand } from "@neocode/tui"
```

Terminal UI components and commands for interactive workflows.

### @neocode/core
```typescript
import { Installation } from "@neocode/core"
```

Core utilities and shared logic for CLI operations.

## Internal Structure (DO NOT IMPORT DIRECTLY)

- `src/cli/` - Command implementations and orchestration
- `src/cli/cmd/` - Individual command handlers
- `src/cli/cmd/tui/` - Terminal UI implementations
- `src/util/` - Utility functions
- `src/services/` - External service integrations

## Usage Examples

### Running a Command
```typescript
import { RunCommand } from "@neocode/cli"

const cmd = new RunCommand()
await cmd.execute(options)
```

### Using Installation
```typescript
import { Installation } from "@neocode/core"

const installation = new Installation()
const config = await installation.load()
```

## Breaking Changes

- **v2.0**: Restructured TUI module; use `@neocode/tui` instead of direct internal paths
- **v1.5**: Deprecated `@neocode/*` wildcard imports; use specific command imports

## Migration Guide

### Old (Don't use)
```typescript
import { SomeCommand } from "@neocode/cli/src/internal/commands"
```

### New (Use this)
```typescript
import { SomeCommand } from "@neocode/cli"
```
