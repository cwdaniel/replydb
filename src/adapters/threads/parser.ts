import type { ReplyRecord } from "../base/types.js";
import type { ThreadsGraphQLResponse, ThreadsReplyNode } from "./types.js";

/**
 * Extract a ReplyRecord from a Threads post node.
 *
 * @param node - The post node from GraphQL response
 * @returns ReplyRecord or null if required fields are missing
 */
function parsePostNode(node: ThreadsReplyNode["post"]): ReplyRecord | null {
  if (!node) {
    return null;
  }

  // Extract reply ID (prefer pk, fall back to id)
  const replyId = node.pk ?? node.id;
  if (!replyId) {
    return null;
  }

  // Extract author ID
  const authorId = node.user?.pk ?? node.user?.id ?? node.user?.username;
  if (!authorId) {
    return null;
  }

  // Extract text content
  const text = node.caption?.text;
  if (text === undefined) {
    return null;
  }

  // Extract timestamp (taken_at is in seconds, convert to ms)
  const takenAt = node.taken_at;
  if (!takenAt) {
    return null;
  }
  const createdAt = takenAt * 1000;

  // Extract like count (optional)
  const likeCount = node.text_post_app_info?.like_count;

  return {
    replyId,
    authorId,
    text,
    createdAt,
    likeCount,
  };
}

/**
 * Parse a Threads GraphQL response into an array of ReplyRecords.
 *
 * Handles multiple response structures that Threads may return:
 * 1. mediaData.replies.edges structure
 * 2. data.containing_thread.thread_items structure
 * 3. data.reply_threads structure
 *
 * @param response - The GraphQL response
 * @returns Array of parsed reply records
 */
export function parseRepliesFromResponse(
  response: ThreadsGraphQLResponse
): ReplyRecord[] {
  const replies: ReplyRecord[] = [];

  // Check for errors
  if (response.errors && response.errors.length > 0) {
    const errorMessages = response.errors
      .map((e) => e.message)
      .join(", ");
    throw new Error(`Threads API returned errors: ${errorMessages}`);
  }

  // Try structure 1: mediaData.replies.edges
  const edges = response.data?.mediaData?.replies?.edges;
  if (edges) {
    for (const edge of edges) {
      const record = parsePostNode(edge.node?.post);
      if (record) {
        replies.push(record);
      }
    }
  }

  // Try structure 2: data.data.containing_thread.thread_items
  const threadItems = response.data?.data?.containing_thread?.thread_items;
  if (threadItems) {
    for (const item of threadItems) {
      // Skip the original post (usually first item or marked as "squiggle")
      if (item.line_type === "squiggle") {
        continue;
      }
      const record = parsePostNode(item.post);
      if (record) {
        replies.push(record);
      }
    }
  }

  // Try structure 3: data.data.reply_threads
  const replyThreads = response.data?.data?.reply_threads;
  if (replyThreads) {
    for (const thread of replyThreads) {
      if (thread.thread_items) {
        for (const item of thread.thread_items) {
          const record = parsePostNode(item.post);
          if (record) {
            replies.push(record);
          }
        }
      }
    }
  }

  return replies;
}

/**
 * Parse a post response to extract the new reply ID.
 *
 * @param response - The post response
 * @returns The new reply ID or null if not found
 */
export function parsePostReplyId(response: unknown): string | null {
  if (typeof response !== "object" || response === null) {
    return null;
  }

  const resp = response as Record<string, unknown>;
  const data = resp.data as Record<string, unknown> | undefined;
  if (!data) {
    return null;
  }

  // Try create_text_post_reply structure
  const createReply = data.create_text_post_reply as
    | Record<string, unknown>
    | undefined;
  if (createReply?.media) {
    const media = createReply.media as Record<string, unknown>;
    const id = media.pk ?? media.id;
    if (typeof id === "string") {
      return id;
    }
  }

  // Try xdt_create_text_post_reply structure
  const xdtCreateReply = data.xdt_create_text_post_reply as
    | Record<string, unknown>
    | undefined;
  if (xdtCreateReply?.media) {
    const media = xdtCreateReply.media as Record<string, unknown>;
    const id = media.pk ?? media.id;
    if (typeof id === "string") {
      return id;
    }
  }

  return null;
}
