import { createParser } from "./parser"
import { Log } from "../util/log"
import { UI } from "./ui"
import { FormatError } from "./error"
import { NamedError } from "@neocode-ai/util/error"
import { EOL } from "os"
import { ResolveMessage } from "bun"

/**
 * Run the Neocode CLI with the given arguments
 *
 * @example
 * ```ts
 * import { run } from '@neocode/cli'
 * await run(['run', 'src/index.ts'])
 * ```
 *
 * @param args - Command line arguments (typically process.argv.slice(2))
 * @returns Promise that resolves when CLI completes or rejects on error
 */
export async function run(args: string[]): Promise<void> {
  process.on("unhandledRejection", (e) => {
    Log.Default.error("rejection", {
      e: e instanceof Error ? e.message : e,
    })
  })

  process.on("uncaughtException", (e) => {
    Log.Default.error("exception", {
      e: e instanceof Error ? e.message : e,
    })
  })

  const cli = createParser(args)

  try {
    await cli.parse()
  } catch (e) {
    let data: Record<string, any> = {}
    if (e instanceof NamedError) {
      const obj = e.toObject()
      Object.assign(data, {
        ...obj.data,
      })
    }

    if (e instanceof Error) {
      Object.assign(data, {
        name: e.name,
        message: e.message,
        cause: e.cause?.toString(),
        stack: e.stack,
      })
    }

    if (e instanceof ResolveMessage) {
      Object.assign(data, {
        name: e.name,
        message: e.message,
        code: e.code,
        specifier: e.specifier,
        referrer: e.referrer,
        position: e.position,
        importKind: e.importKind,
      })
    }
    Log.Default.error("fatal", data)
    const formatted = FormatError(e)
    if (formatted) UI.error(formatted)
    if (formatted === undefined) {
      UI.error("Unexpected error, check log file at " + Log.file() + " for more details" + EOL)
      console.error(e instanceof Error ? e.message : String(e))
    }
    process.exitCode = 1
  } finally {
    // Some subprocesses don't react properly to SIGTERM and similar signals.
    // Most notably, some docker-container-based MCP servers don't handle such signals unless
    // run using `docker run --init`.
    // Explicitly exit to avoid any hanging subprocesses.
    process.exit()
  }
}

/**
 * @internal - Use run() instead
 */
export { createParser } from "./parser"
