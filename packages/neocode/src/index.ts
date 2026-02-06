/**
 * Neocode CLI and TUI SDK
 *
 * This is the public API for the Neocode package. Only exported items here
 * are considered part of the stable public API. Internal modules should not
 * be imported directly.
 *
 * @example
 * ```ts
 * import { run } from '@neocode/cli'
 * await run(['run', 'src/index.ts'])
 * ```
 */

// CLI - Public API for programmatic CLI invocation
export { run } from "./cli"
export type { } from "./cli"

// TUI - Public API for programmatic TUI invocation (if needed in future)
export { } from "./tui"

// Domain - Public types for SDK consumers
export type { } from "./domain/types"
