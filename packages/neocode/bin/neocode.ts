#!/usr/bin/env bun

/**
 * Neocode CLI executable entry point
 * This file is the entry point when running `neocode` command
 */

import { run } from "../src/cli"
import { hideBin } from "yargs/helpers"

// Run CLI with command-line arguments
await run(hideBin(process.argv))
