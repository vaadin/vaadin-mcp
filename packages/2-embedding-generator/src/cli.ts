#!/usr/bin/env bun

/**
 * CLI entry point for the simplified embedding generator
 */

import { runCLI } from './index.js';

// Simply delegate to the main CLI function
runCLI().catch(console.error); 