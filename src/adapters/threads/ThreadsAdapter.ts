import type { Adapter } from "../base/Adapter.js";
import type { PostReplyResult, ReplyRecord } from "../base/types.js";
import type { ThreadsConfig } from "./types.js";
import { fetchRepliesGraphQL } from "./graphql.js";
import { parseRepliesFromResponse } from "./parser.js";
import { postReply } from "./writer.js";

/**
 * Threads adapter for ReplyDB.
 *
 * Uses the Threads internal GraphQL API to read and write replies.
 * Requires session cookies for authentication.
 *
 * @example
 * ```typescript
 * const adapter = new ThreadsAdapter({
 *   readDocId: "YOUR_READ_DOC_ID",
 *   writeDocId: "YOUR_WRITE_DOC_ID",
 *   headers: {
 *     "Cookie": "sessionid=YOUR_SESSION_COOKIE",
 *     "X-CSRFToken": "YOUR_CSRF_TOKEN"
 *   }
 * });
 *
 * const replies = await adapter.fetchReplies("1234567890");
 * ```
 *
 * @remarks
 * This adapter uses the reverse-engineered internal GraphQL API.
 * It may break without notice if Threads changes their API.
 */
export class ThreadsAdapter implements Adapter {
  private readonly config: ThreadsConfig;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(config: ThreadsConfig) {
    this.config = config;
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  /**
   * Fetch all replies for a thread.
   *
   * @param threadId - The media ID of the thread
   * @returns Array of reply records
   */
  async fetchReplies(threadId: string): Promise<ReplyRecord[]> {
    const response = await fetchRepliesGraphQL(
      this.config,
      threadId,
      this.fetchFn
    );
    return parseRepliesFromResponse(response);
  }

  /**
   * Post a new reply to a thread.
   *
   * @param threadId - The media ID to reply to
   * @param text - The text content to post
   * @returns Result with the new reply ID
   */
  async postReply(threadId: string, text: string): Promise<PostReplyResult> {
    return postReply(this.config, threadId, text, this.fetchFn);
  }
}
