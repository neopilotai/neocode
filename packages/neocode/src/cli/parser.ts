import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { RunCommand } from "./cmd/run"
import { GenerateCommand } from "./cmd/generate"
import { Log } from "../util/log"
import { AuthCommand } from "./cmd/auth"
import { AgentCommand } from "./cmd/agent"
import { UpgradeCommand } from "./cmd/upgrade"
import { UninstallCommand } from "./cmd/uninstall"
import { ModelsCommand } from "./cmd/models"
import { UI } from "./ui"
import { Installation } from "../installation"
import { ServeCommand } from "./cmd/serve"
import { DebugCommand } from "./cmd/debug"
import { StatsCommand } from "./cmd/stats"
import { McpCommand } from "./cmd/mcp"
import { GithubCommand } from "./cmd/github"
import { ExportCommand } from "./cmd/export"
import { ImportCommand } from "./cmd/import"
import { AttachCommand } from "./cmd/tui/attach"
import { TuiThreadCommand } from "./cmd/tui/thread"
import { AcpCommand } from "./cmd/acp"
import { WebCommand } from "./cmd/web"
import { PrCommand } from "./cmd/pr"
import { SessionCommand } from "./cmd/session"

/**
 * Create and configure the yargs CLI parser
 * @internal - Use run() from cli/index.ts instead of direct parser access
 */
export function createParser(argv: string[]) {
  const cli = yargs(argv)
    .parserConfiguration({ "populate--": true })
    .scriptName("neocode")
    .wrap(100)
    .help("help", "show help")
    .alias("help", "h")
    .version("version", "show version number", Installation.VERSION)
    .alias("version", "v")
    .option("print-logs", {
      describe: "print logs to stderr",
      type: "boolean",
    })
    .option("log-level", {
      describe: "log level",
      type: "string",
      choices: ["DEBUG", "INFO", "WARN", "ERROR"],
    })
    .middleware(async (opts) => {
      await Log.init({
        print: process.argv.includes("--print-logs"),
        dev: Installation.isLocal(),
        level: (() => {
          if (opts.logLevel) return opts.logLevel as Log.Level
          if (Installation.isLocal()) return "DEBUG"
          return "INFO"
        })(),
      })

      process.env.AGENT = "1"
      process.env.NEOCODE = "1"

      Log.Default.info("neocode", {
        version: Installation.VERSION,
        args: process.argv.slice(2),
      })
    })
    .usage("\n" + UI.logo())
    .completion("completion", "generate shell completion script")
    .command(AcpCommand)
    .command(McpCommand)
    .command(TuiThreadCommand)
    .command(AttachCommand)
    .command(RunCommand)
    .command(GenerateCommand)
    .command(DebugCommand)
    .command(AuthCommand)
    .command(AgentCommand)
    .command(UpgradeCommand)
    .command(UninstallCommand)
    .command(ServeCommand)
    .command(WebCommand)
    .command(ModelsCommand)
    .command(StatsCommand)
    .command(ExportCommand)
    .command(ImportCommand)
    .command(GithubCommand)
    .command(PrCommand)
    .command(SessionCommand)
    .fail((msg, err) => {
      if (
        msg?.startsWith("Unknown argument") ||
        msg?.startsWith("Not enough non-option arguments") ||
        msg?.startsWith("Invalid values:")
      ) {
        if (err) throw err
        cli.showHelp("log")
      }
      if (err) throw err
      process.exit(1)
    })
    .strict()

  return cli
}
