import type { PostReplyResult } from "../base/types.js";
import type { XConfig } from "./types.js";
import { postReplyApi } from "./api.js";
import { parsePostReplyId } from "./parser.js";

/**
 * Maximum tweet length for X Premium accounts.
 * Standard accounts have 280 character limit.
 */
const MAX_TWEET_LENGTH = 25000;

/**
 * Post a reply to an X thread.
 *
 * @param config - X adapter configuration
 * @param threadId - The tweet ID to reply to
 * @param text - The text content to post (JSON-serialized event)
 * @param fetchFn - Fetch implementation to use
 * @returns Result with the new reply ID
 * @throws Error if posting fails or response doesn't contain reply ID
 */
export async function postReply(
  config: XConfig,
  threadId: string,
  text: string,
  fetchFn: typeof globalThis.fetch
): Promise<PostReplyResult> {
  // Validate authentication is configured for posting
  if (!config.oauthAccessToken) {
    throw new Error(
      "XAdapter: oauthAccessToken must be configured to post replies. " +
        "Bearer token (App-only) authentication is not supported for posting."
    );
  }

  // Validate text length (X Premium has 25,000 character limit)
  if (text.length > MAX_TWEET_LENGTH) {
    throw new Error(
      `XAdapter: Reply text exceeds maximum length of ${String(MAX_TWEET_LENGTH)} characters (got ${String(text.length)})`
    );
  }

  const response = await postReplyApi(config, threadId, text, fetchFn);

  // Check for API errors
  if (response.errors && response.errors.length > 0) {
    const errorMessages = response.errors
      .map((e) => e.detail || e.title)
      .join(", ");
    throw new Error(`X API error posting reply: ${errorMessages}`);
  }

  // Extract reply ID from response
  const replyId = parsePostReplyId(response);
  if (!replyId) {
    throw new Error(
      "X API response did not contain a tweet ID. The post may have failed."
    );
  }

  return { replyId };
}
