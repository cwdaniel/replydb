/**
 * Replay Script
 *
 * Reads raw reply data from stdin (JSON array of ReplyRecords) and outputs
 * the replayed state. Useful for debugging and testing replay logic.
 *
 * Usage:
 *   cat replies.json | node dist/scripts/replay.js
 *   node dist/scripts/replay.js < replies.json
 */

import { replayThread } from "../src/index.js";
import type { ReplyRecord } from "../src/index.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString("utf-8");
}

async function main(): Promise<void> {
  // Read input
  const input = await readStdin();

  if (!input.trim()) {
    console.error("Error: No input provided. Pipe JSON reply data to stdin.");
    console.error("Usage: cat replies.json | node replay.js");
    process.exit(1);
  }

  // Parse JSON
  let replies: ReplyRecord[];
  try {
    replies = JSON.parse(input) as ReplyRecord[];
  } catch {
    console.error("Error: Invalid JSON input");
    process.exit(1);
  }

  if (!Array.isArray(replies)) {
    console.error("Error: Input must be a JSON array of ReplyRecords");
    process.exit(1);
  }

  // Replay
  console.error(`Replaying ${String(replies.length)} replies...\n`);

  const result = replayThread(replies);

  // Output results
  console.log("=== REPLAY RESULTS ===\n");

  console.log(`Accepted Events: ${String(result.accepted.length)}`);
  console.log(`Final Records: ${String(result.store.size)}\n`);

  console.log("--- Records ---\n");

  for (const [id, record] of result.store) {
    console.log(`ID: ${id}`);
    console.log(`  Author: ${record.authorId}`);
    console.log(`  Created: ${new Date(record.createdAt).toISOString()}`);
    console.log(`  Updated: ${new Date(record.updatedAt).toISOString()}`);
    console.log(`  Likes: ${String(record.likeCount ?? "N/A")}`);
    console.log(`  Content: ${JSON.stringify(record.content)}`);
    console.log();
  }

  console.log("--- Accepted Events ---\n");

  for (const { event, meta } of result.accepted) {
    console.log(`Reply: ${meta.replyId}`);
    console.log(`  Op: ${event.op}`);
    console.log(`  ID: ${event.id ?? "(derived)"}`);
    console.log(`  Content: ${event.content !== undefined ? JSON.stringify(event.content) : "(none)"}`);
    console.log(`  Author: ${meta.authorId}`);
    console.log(`  Time: ${new Date(meta.createdAt).toISOString()}`);
    console.log();
  }

  // Output as JSON for piping
  console.log("--- JSON Output ---\n");
  console.log(
    JSON.stringify(
      {
        records: Object.fromEntries(result.store),
        accepted: result.accepted,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
