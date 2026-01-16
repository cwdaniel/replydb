#!/usr/bin/env node
/**
 * Setup Helper for Threads TODO Demo
 *
 * This script helps you configure the environment variables needed
 * to connect to Threads.
 *
 * Usage:
 *   npx tsx scripts/setup.ts
 *   npx tsx scripts/setup.ts --decode DTdl3mxEg_u
 *   npx tsx scripts/setup.ts --validate
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * Decode a Threads/Instagram shortcode to a media ID.
 */
function decodeShortcode(shortcode: string): string {
  let mediaId = BigInt(0);
  for (const char of shortcode) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character in shortcode: ${char}`);
    }
    mediaId = mediaId * BigInt(64) + BigInt(index);
  }
  return mediaId.toString();
}

/**
 * Extract shortcode from a Threads URL.
 */
function extractShortcode(url: string): string | null {
  // Match patterns like:
  // https://www.threads.com/@username/post/DTdl3mxEg_u
  // https://threads.com/@username/post/DTdl3mxEg_u
  const match = url.match(/threads\.com\/@[\w.]+\/post\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Parse a Threads URL or shortcode and return the media ID.
 */
function parseThreadsInput(input: string): { shortcode: string; mediaId: string } {
  let shortcode: string;

  if (input.includes("threads.com")) {
    const extracted = extractShortcode(input);
    if (!extracted) {
      throw new Error("Could not extract shortcode from URL");
    }
    shortcode = extracted;
  } else {
    shortcode = input;
  }

  const mediaId = decodeShortcode(shortcode);
  return { shortcode, mediaId };
}

/**
 * Create readline interface for user input.
 */
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input.
 */
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Validate existing configuration.
 */
function validateConfig(): void {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    console.log("❌ No .env.local file found");
    console.log("   Run this script without --validate to create one");
    return;
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const lines = content.split("\n");
  const config: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) {
      config[match[1]] = match[2];
    }
  }

  console.log("\n📋 Configuration Status:\n");

  const required = ["THREAD_ID", "READ_DOC_ID", "HEADERS_JSON"];
  const optional = ["WRITE_DOC_ID"];

  for (const key of required) {
    if (config[key]) {
      console.log(`✅ ${key}: ${config[key].slice(0, 30)}${config[key].length > 30 ? "..." : ""}`);
    } else {
      console.log(`❌ ${key}: Missing (required)`);
    }
  }

  for (const key of optional) {
    if (config[key]) {
      console.log(`✅ ${key}: ${config[key].slice(0, 30)}${config[key].length > 30 ? "..." : ""}`);
    } else {
      console.log(`⚪ ${key}: Not set (optional)`);
    }
  }

  // Validate HEADERS_JSON is valid JSON
  if (config.HEADERS_JSON) {
    try {
      const headers = JSON.parse(config.HEADERS_JSON);
      if (!headers.Cookie) {
        console.log("\n⚠️  Warning: HEADERS_JSON doesn't contain a Cookie field");
      }
    } catch {
      console.log("\n❌ Error: HEADERS_JSON is not valid JSON");
    }
  }

  console.log("");
}

/**
 * Print instructions for getting doc_ids and headers.
 */
function printInstructions(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    How to Get Threads API Credentials                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

📍 STEP 1: Open your Threads post in a browser
   Example: https://www.threads.com/@username/post/ABC123

📍 STEP 2: Open DevTools
   Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)

📍 STEP 3: Go to Network tab
   - Click "Network" tab
   - Check "Preserve log"
   - Filter by "graphql" or "Fetch/XHR"

📍 STEP 4: Refresh the page
   Look for GraphQL requests (they go to /api/graphql)

📍 STEP 5: Get READ_DOC_ID
   - Click on a GraphQL request
   - Go to "Payload" tab
   - Find "doc_id" - copy that number
   - Look for requests that fetch post/replies data

📍 STEP 6: Get WRITE_DOC_ID (optional)
   - Post a test reply on Threads
   - Find the GraphQL request for the reply
   - Copy its "doc_id"

📍 STEP 7: Get Headers
   - Click on any GraphQL request
   - Go to "Headers" tab
   - Find and copy the full "Cookie" header value
   - Find and copy the "X-CSRFToken" header value

══════════════════════════════════════════════════════════════════════════════
`);
}

/**
 * Interactive setup wizard.
 */
async function runWizard(): Promise<void> {
  const rl = createReadline();

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     Threads TODO - Setup Wizard                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // Step 1: Get Thread URL/ID
    console.log("STEP 1: Thread URL or Shortcode\n");
    const threadInput = await prompt(
      rl,
      "Enter your Threads post URL or shortcode:\n> "
    );

    if (!threadInput) {
      console.log("❌ No input provided. Exiting.");
      rl.close();
      return;
    }

    const { shortcode, mediaId } = parseThreadsInput(threadInput);
    console.log(`\n✅ Decoded shortcode "${shortcode}" to media ID: ${mediaId}\n`);

    // Step 2: Instructions
    console.log("─".repeat(78));
    printInstructions();

    // Step 3: Get doc_ids
    console.log("STEP 2: Enter your doc_ids\n");

    const readDocId = await prompt(rl, "READ_DOC_ID (required):\n> ");
    if (!readDocId) {
      console.log("❌ READ_DOC_ID is required. Exiting.");
      rl.close();
      return;
    }

    const writeDocId = await prompt(
      rl,
      "\nWRITE_DOC_ID (press Enter to use READ_DOC_ID):\n> "
    );

    // Step 4: Get headers
    console.log("\n" + "─".repeat(78));
    console.log("\nSTEP 3: Enter your headers\n");

    const cookie = await prompt(rl, "Cookie header value:\n> ");
    if (!cookie) {
      console.log("❌ Cookie is required. Exiting.");
      rl.close();
      return;
    }

    const csrfToken = await prompt(rl, "\nX-CSRFToken header value (optional):\n> ");

    // Build headers JSON
    const headers: Record<string, string> = { Cookie: cookie };
    if (csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }
    const headersJson = JSON.stringify(headers);

    // Step 5: Generate .env.local
    console.log("\n" + "─".repeat(78));
    console.log("\n📝 Generating .env.local...\n");

    const envContent = `# Threads TODO Demo Configuration
# Generated by setup wizard

THREAD_ID=${mediaId}
READ_DOC_ID=${readDocId}
${writeDocId ? `WRITE_DOC_ID=${writeDocId}` : "# WRITE_DOC_ID= (using READ_DOC_ID)"}
HEADERS_JSON=${headersJson}
`;

    const envPath = path.join(process.cwd(), ".env.local");

    if (fs.existsSync(envPath)) {
      const overwrite = await prompt(
        rl,
        "⚠️  .env.local already exists. Overwrite? (y/N): "
      );
      if (overwrite.toLowerCase() !== "y") {
        console.log("\n📋 Here's the configuration to add manually:\n");
        console.log(envContent);
        rl.close();
        return;
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Created ${envPath}\n`);

    console.log("🎉 Setup complete! Run 'npm run dev' to start the app.\n");

  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  } finally {
    rl.close();
  }
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Threads TODO Setup Helper

Usage:
  npx tsx scripts/setup.ts              Interactive setup wizard
  npx tsx scripts/setup.ts --decode <shortcode|url>   Decode a shortcode/URL to media ID
  npx tsx scripts/setup.ts --validate   Validate existing .env.local
  npx tsx scripts/setup.ts --help       Show this help

Examples:
  npx tsx scripts/setup.ts --decode DTdl3mxEg_u
  npx tsx scripts/setup.ts --decode "https://www.threads.com/@user/post/DTdl3mxEg_u"
`);
    return;
  }

  if (args.includes("--decode")) {
    const index = args.indexOf("--decode");
    const input = args[index + 1];

    if (!input) {
      console.error("❌ Please provide a shortcode or URL to decode");
      process.exit(1);
    }

    try {
      const { shortcode, mediaId } = parseThreadsInput(input);
      console.log(`\nShortcode: ${shortcode}`);
      console.log(`Media ID:  ${mediaId}\n`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error: ${error.message}`);
      }
      process.exit(1);
    }
    return;
  }

  if (args.includes("--validate")) {
    validateConfig();
    return;
  }

  // Default: run interactive wizard
  await runWizard();
}

main().catch(console.error);
