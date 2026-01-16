/**
 * Snapshot Script
 *
 * Connects to a Threads thread and outputs a snapshot of the current state
 * as JSON. Useful for backup, debugging, and analysis.
 *
 * Usage:
 *   THREAD_ID=xxx READ_DOC_ID=yyy HEADERS_JSON='{}' node dist/scripts/snapshot.js
 *   node dist/scripts/snapshot.js --thread-id xxx --doc-id yyy
 */

import { ReplyDB } from "../src/index.js";
import { ThreadsAdapter } from "../src/adapters/threads/index.js";

interface SnapshotOutput {
  metadata: {
    threadId: string;
    timestamp: string;
    recordCount: number;
    eventCount: number;
  };
  records: Record<string, unknown>;
  events: Array<{
    replyId: string;
    authorId: string;
    createdAt: string;
    op: string;
    id?: string;
    content?: unknown;
  }>;
}

function getConfig(): {
  threadId: string;
  readDocId: string;
  headers: Record<string, string>;
} {
  // Try command line args first
  const args = process.argv.slice(2);
  let threadId = process.env.THREAD_ID;
  let readDocId = process.env.READ_DOC_ID;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--thread-id" && args[i + 1]) {
      threadId = args[i + 1];
      i++;
    } else if (args[i] === "--doc-id" && args[i + 1]) {
      readDocId = args[i + 1];
      i++;
    }
  }

  if (!threadId) {
    throw new Error("THREAD_ID or --thread-id is required");
  }

  if (!readDocId) {
    throw new Error("READ_DOC_ID or --doc-id is required");
  }

  // Parse headers
  let headers: Record<string, string> = {};
  const headersJson = process.env.HEADERS_JSON;
  if (headersJson) {
    try {
      headers = JSON.parse(headersJson) as Record<string, string>;
    } catch {
      throw new Error("HEADERS_JSON is not valid JSON");
    }
  }

  const sessionCookie = process.env.SESSION_COOKIE;
  if (sessionCookie && !headers.Cookie) {
    headers.Cookie = `sessionid=${sessionCookie}`;
  }

  const csrfToken = process.env.CSRF_TOKEN;
  if (csrfToken && !headers["X-CSRFToken"]) {
    headers["X-CSRFToken"] = csrfToken;
  }

  return { threadId, readDocId, headers };
}

function printUsage(): void {
  console.error(`
Snapshot - Export ReplyDB state as JSON

Usage:
  node snapshot.js [options]

Options:
  --thread-id <id>   Thread media ID (or set THREAD_ID env var)
  --doc-id <id>      GraphQL doc ID (or set READ_DOC_ID env var)

Environment Variables:
  THREAD_ID          The Threads post ID to snapshot
  READ_DOC_ID        GraphQL doc ID for reading replies
  HEADERS_JSON       JSON string of HTTP headers
  SESSION_COOKIE     Alternative: just the sessionid cookie value
  CSRF_TOKEN         Optional: X-CSRFToken header value

Output:
  Outputs JSON to stdout with the current state snapshot.
  Errors and progress are written to stderr.

Example:
  THREAD_ID=123 READ_DOC_ID=abc HEADERS_JSON='{"Cookie":"sessionid=xyz"}' \\
    node snapshot.js > backup.json
`);
}

async function main(): Promise<void> {
  // Check for help
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let config;
  try {
    config = getConfig();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Configuration error: ${error.message}`);
    }
    printUsage();
    process.exit(1);
  }

  console.error(`Creating snapshot of thread ${config.threadId}...`);

  const adapter = new ThreadsAdapter({
    readDocId: config.readDocId,
    headers: config.headers,
  });

  const db = new ReplyDB({
    adapter,
    threadId: config.threadId,
  });

  try {
    const result = await db.read();

    const output: SnapshotOutput = {
      metadata: {
        threadId: config.threadId,
        timestamp: new Date().toISOString(),
        recordCount: result.store.size,
        eventCount: result.accepted.length,
      },
      records: Object.fromEntries(result.store),
      events: result.accepted.map(({ event, meta }) => ({
        replyId: meta.replyId,
        authorId: meta.authorId,
        createdAt: new Date(meta.createdAt).toISOString(),
        op: event.op,
        id: event.id,
        content: event.content,
      })),
    };

    console.error(
      `Snapshot complete: ${String(result.store.size)} records, ${String(result.accepted.length)} events`
    );

    // Output JSON to stdout
    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching data: ${error.message}`);
    } else {
      console.error("An unknown error occurred");
    }
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
