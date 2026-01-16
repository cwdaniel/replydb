import type { Adapter } from "../adapters/base/Adapter.js";
import type { AppendResult, ReadResult, ReplyDBEvent } from "./types.js";
import { replayThread } from "./replay.js";

/**
 * Configuration for ReplyDB instance.
 */
export type ReplyDBConfig = {
  /** The adapter to use for reading/writing */
  adapter: Adapter;
  /** The thread ID to use as the database */
  threadId: string;
};

/**
 * ReplyDB - A database where replies are writes.
 *
 * Core class for interacting with a ReplyDB-backed data store.
 * Uses an adapter to communicate with the underlying social platform.
 *
 * @example
 * ```typescript
 * const db = new ReplyDB({
 *   adapter: threadsAdapter,
 *   threadId: "123456789"
 * });
 *
 * // Read current state
 * const { store } = await db.read<TodoContent>();
 *
 * // Append a new event
 * await db.append({ v: 1, op: "ins", content: { text: "Hello" } });
 * ```
 */
export class ReplyDB {
  private readonly adapter: Adapter;
  private readonly threadId: string;

  constructor(config: ReplyDBConfig) {
    this.adapter = config.adapter;
    this.threadId = config.threadId;
  }

  /**
   * Append a new event to the database.
   *
   * Serializes the event to JSON and posts it as a reply to the thread.
   *
   * @typeParam C - The application-specific content type
   * @param event - The event to append
   * @returns Result containing the new reply ID
   */
  async append<C>(event: ReplyDBEvent<C>): Promise<AppendResult> {
    // Ensure version is set
    const normalizedEvent: ReplyDBEvent<C> = {
      ...event,
      v: 1,
    };

    // Serialize to compact JSON
    const text = JSON.stringify(normalizedEvent);

    // Post via adapter
    const result = await this.adapter.postReply(this.threadId, text);

    return { replyId: result.replyId };
  }

  /**
   * Read the current state of the database.
   *
   * Fetches all replies from the thread, replays them deterministically
   * using the core reducer, and returns the materialized store.
   *
   * @typeParam C - The application-specific content type
   * @returns The materialized store and list of accepted events
   */
  async read<C = unknown>(): Promise<ReadResult<C>> {
    // Fetch replies via adapter
    const replies = await this.adapter.fetchReplies(this.threadId);

    // Replay using core reducer
    const result = replayThread<C>(replies);

    return result;
  }

  /**
   * Get the thread ID this database is connected to.
   */
  getThreadId(): string {
    return this.threadId;
  }
}
