import type { PostReplyResult } from "../base/types.js";
import type { ThreadsConfig } from "./types.js";
import { postReplyGraphQL } from "./graphql.js";
import { parsePostReplyId } from "./parser.js";

/**
 * Post a reply to a Threads thread.
 *
 * @param config - Threads adapter configuration
 * @param threadId - The media ID to reply to
 * @param text - The text content to post
 * @param fetchFn - Fetch implementation to use
 * @returns Result with the new reply ID
 * @throws Error if posting fails or response doesn't contain reply ID
 */
export async function postReply(
  config: ThreadsConfig,
  threadId: string,
  text: string,
  fetchFn: typeof globalThis.fetch
): Promise<PostReplyResult> {
  // Validate writeDocId is configured
  if (!config.writeDocId && !config.readDocId) {
    throw new Error(
      "ThreadsAdapter: writeDocId or readDocId must be configured to post replies"
    );
  }

  const response = await postReplyGraphQL(config, threadId, text, fetchFn);

  // Check for API errors
  if (response.errors && response.errors.length > 0) {
    const errorMessages = response.errors
      .map((e) => e.message)
      .join(", ");
    throw new Error(`Threads API error posting reply: ${errorMessages}`);
  }

  // Extract reply ID from response
  const replyId = parsePostReplyId(response);
  if (!replyId) {
    throw new Error(
      "Threads API response did not contain a reply ID. The post may have failed."
    );
  }

  return { replyId };
}
