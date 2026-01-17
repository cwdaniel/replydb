import type { Adapter } from "../base/Adapter.js";
import type { PostReplyResult, ReplyRecord } from "../base/types.js";
import type { XConfig } from "./types.js";
import { fetchAllRepliesApi } from "./api.js";
import { parseRepliesFromResponse } from "./parser.js";
import { postReply } from "./writer.js";

/**
 * X (Twitter) adapter for ReplyDB.
 *
 * Uses the X API v2 to read and write replies.
 * Requires appropriate authentication based on operation:
 * - Reading: Bearer token (App-only) or OAuth 2.0
 * - Writing: OAuth 2.0 User Context (Bearer token NOT supported)
 *
 * @example
 * ```typescript
 * // Read-only with Bearer token
 * const adapter = new XAdapter({
 *   bearerToken: "YOUR_BEARER_TOKEN",
 * });
 *
 * // Read and write with OAuth 2.0
 * const adapter = new XAdapter({
 *   bearerToken: "YOUR_BEARER_TOKEN",
 *   oauthAccessToken: "YOUR_OAUTH_ACCESS_TOKEN",
 * });
 *
 * const replies = await adapter.fetchReplies("1234567890123456789");
 * ```
 *
 * @remarks
 * This adapter uses the official X API v2.
 * Rate limits apply based on your API tier (Free, Basic, Pro, Enterprise).
 *
 * Important limitations:
 * - Recent search only returns tweets from the last 7 days
 * - Full archive search requires Pro or Enterprise tier
 * - Free tier has very limited rate limits
 * - Standard accounts have 280 character limit; X Premium has 25,000
 */
export class XAdapter implements Adapter {
  private readonly config: XConfig;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(config: XConfig) {
    this.config = config;
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  /**
   * Fetch all replies for a tweet/thread.
   *
   * Uses the search endpoint with conversation_id to find all replies.
   * Automatically paginates to fetch all available replies.
   *
   * @param threadId - The tweet ID (conversation_id) to fetch replies for
   * @returns Array of reply records
   */
  async fetchReplies(threadId: string): Promise<ReplyRecord[]> {
    const response = await fetchAllRepliesApi(
      this.config,
      threadId,
      this.fetchFn
    );
    return parseRepliesFromResponse(response);
  }

  /**
   * Post a new reply to a tweet.
   *
   * Requires OAuth 2.0 User Context authentication.
   * Bearer token (App-only) is NOT supported for posting.
   *
   * @param threadId - The tweet ID to reply to
   * @param text - The text content to post (JSON-serialized event)
   * @returns Result with the new reply ID
   */
  async postReply(threadId: string, text: string): Promise<PostReplyResult> {
    return postReply(this.config, threadId, text, this.fetchFn);
  }
}
