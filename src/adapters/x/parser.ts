import type { ReplyRecord } from "../base/types.js";
import type { XSearchResponse, XTweet, XPostTweetResponse } from "./types.js";

/**
 * Parse a single tweet into a ReplyRecord.
 *
 * @param tweet - Raw tweet object from X API
 * @returns Parsed ReplyRecord or null if required fields are missing
 */
function parseTweet(tweet: XTweet): ReplyRecord | null {
  // Required fields
  if (!tweet.id) {
    return null;
  }

  const authorId = tweet.author_id;
  if (!authorId) {
    return null;
  }

  const text = tweet.text;
  if (text === undefined) {
    return null;
  }

  // Parse ISO 8601 timestamp to milliseconds
  const createdAtStr = tweet.created_at;
  if (!createdAtStr) {
    return null;
  }
  const createdAt = new Date(createdAtStr).getTime();
  if (isNaN(createdAt)) {
    return null;
  }

  // Optional like count
  const likeCount = tweet.public_metrics?.like_count;

  return {
    replyId: tweet.id,
    authorId,
    text,
    createdAt,
    likeCount,
  };
}

/**
 * Parse X API search response into an array of ReplyRecords.
 *
 * @param response - The search response from X API v2
 * @param excludeOriginalTweet - If true, excludes the original tweet (not a reply). Default: true
 * @returns Array of parsed reply records
 * @throws Error if the response contains API errors
 */
export function parseRepliesFromResponse(
  response: XSearchResponse,
  excludeOriginalTweet: boolean = true
): ReplyRecord[] {
  const replies: ReplyRecord[] = [];

  // Check for API errors
  if (response.errors && response.errors.length > 0) {
    const errorMessages = response.errors
      .map((e) => e.detail || e.title)
      .join(", ");
    throw new Error(`X API returned errors: ${errorMessages}`);
  }

  const tweets = response.data;
  if (!tweets) {
    return replies;
  }

  for (const tweet of tweets) {
    // Optionally skip tweets that are not replies (the original tweet)
    if (excludeOriginalTweet) {
      const isReply = tweet.referenced_tweets?.some(
        (ref) => ref.type === "replied_to"
      );
      if (!isReply) {
        continue;
      }
    }

    const record = parseTweet(tweet);
    if (record) {
      replies.push(record);
    }
  }

  return replies;
}

/**
 * Parse a post tweet response to extract the new tweet ID.
 *
 * @param response - The post response from X API
 * @returns The new tweet ID or null if not found
 */
export function parsePostReplyId(response: XPostTweetResponse): string | null {
  // Check for errors
  if (response.errors && response.errors.length > 0) {
    return null;
  }

  return response.data?.id ?? null;
}
