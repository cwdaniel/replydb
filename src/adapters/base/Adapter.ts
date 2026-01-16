import type { PostReplyResult, ReplyRecord } from "./types.js";

/**
 * Abstract adapter interface for social platform backends.
 *
 * Adapters translate platform-specific APIs into a common interface
 * for fetching and posting replies.
 */
export interface Adapter {
  /**
   * Fetch all replies for a thread.
   *
   * @param threadId - The thread/post ID to fetch replies from
   * @returns Array of reply records sorted by creation time
   */
  fetchReplies(threadId: string): Promise<ReplyRecord[]>;

  /**
   * Post a new reply to a thread.
   *
   * @param threadId - The thread/post ID to reply to
   * @param text - The text content to post (JSON-serialized event)
   * @returns The result containing the new reply's ID
   */
  postReply(threadId: string, text: string): Promise<PostReplyResult>;
}
