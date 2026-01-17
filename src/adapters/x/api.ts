import type {
  XConfig,
  XSearchResponse,
  XPostTweetResponse,
  XTweet,
} from "./types.js";
import { DEFAULT_API_BASE_URL } from "./types.js";

/**
 * Build authorization header based on config.
 *
 * @param config - X adapter configuration
 * @param requireUserContext - If true, requires OAuth token (not just bearer)
 * @returns Authorization header value
 * @throws Error if required credentials are not configured
 */
function getAuthHeader(config: XConfig, requireUserContext: boolean): string {
  if (requireUserContext) {
    if (config.oauthAccessToken) {
      return `Bearer ${config.oauthAccessToken}`;
    }
    throw new Error(
      "XAdapter: OAuth 2.0 access token required for posting. " +
        "Bearer token (App-only) authentication is not supported for posting."
    );
  }

  // For reading, prefer bearer token
  if (config.bearerToken) {
    return `Bearer ${config.bearerToken}`;
  }
  if (config.oauthAccessToken) {
    return `Bearer ${config.oauthAccessToken}`;
  }
  throw new Error("XAdapter: bearerToken or oauthAccessToken required");
}

/**
 * Parse API response and handle errors.
 *
 * @param response - Fetch response object
 * @returns Parsed JSON response
 * @throws Error if response is not OK or cannot be parsed
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    let errorDetail = text.slice(0, 500);
    try {
      const errorJson = JSON.parse(text) as {
        errors?: Array<{ detail?: string; message?: string }>;
      };
      if (errorJson.errors) {
        errorDetail = errorJson.errors
          .map((e) => e.detail || e.message)
          .join(", ");
      }
    } catch {
      // Use raw text
    }
    throw new Error(
      `X API request failed: ${String(response.status)} ${response.statusText} - ${errorDetail}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Failed to parse X API response as JSON: ${text.slice(0, 500)}`
    );
  }
}

/**
 * Fetch replies using the search endpoint.
 * Uses conversation_id to find all replies to a tweet.
 *
 * @param config - X adapter configuration
 * @param conversationId - The tweet ID (conversation_id) to search for
 * @param fetchFn - Fetch implementation to use
 * @param nextToken - Optional pagination token
 * @returns Search response with tweets and pagination info
 */
export async function fetchRepliesApi(
  config: XConfig,
  conversationId: string,
  fetchFn: typeof globalThis.fetch,
  nextToken?: string
): Promise<XSearchResponse> {
  const baseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const searchPath =
    config.searchTier === "all"
      ? "/tweets/search/all"
      : "/tweets/search/recent";

  const params = new URLSearchParams({
    query: `conversation_id:${conversationId}`,
    "tweet.fields":
      "id,author_id,text,created_at,public_metrics,conversation_id,referenced_tweets",
    max_results: String(config.maxResults ?? 100),
  });

  if (nextToken) {
    params.set("next_token", nextToken);
  }

  const url = `${baseUrl}${searchPath}?${params.toString()}`;

  const response = await fetchFn(url, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(config, false),
      "Content-Type": "application/json",
    },
  });

  return parseResponse<XSearchResponse>(response);
}

/**
 * Fetch all replies with pagination support.
 * Automatically follows next_token to retrieve all available replies.
 *
 * @param config - X adapter configuration
 * @param conversationId - The tweet ID (conversation_id) to search for
 * @param fetchFn - Fetch implementation to use
 * @returns Combined search response with all tweets
 */
export async function fetchAllRepliesApi(
  config: XConfig,
  conversationId: string,
  fetchFn: typeof globalThis.fetch
): Promise<XSearchResponse> {
  const allTweets: XTweet[] = [];
  let nextToken: string | undefined;

  do {
    const result = await fetchRepliesApi(
      config,
      conversationId,
      fetchFn,
      nextToken
    );

    if (result.data) {
      allTweets.push(...result.data);
    }

    nextToken = result.meta?.next_token;
  } while (nextToken);

  return {
    data: allTweets.length > 0 ? allTweets : undefined,
    meta: { result_count: allTweets.length },
  };
}

/**
 * Post a reply tweet.
 *
 * @param config - X adapter configuration
 * @param inReplyToTweetId - The tweet ID to reply to
 * @param text - The text content to post
 * @param fetchFn - Fetch implementation to use
 * @returns Post response with new tweet data
 */
export async function postReplyApi(
  config: XConfig,
  inReplyToTweetId: string,
  text: string,
  fetchFn: typeof globalThis.fetch
): Promise<XPostTweetResponse> {
  const baseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const url = `${baseUrl}/tweets`;

  const body = JSON.stringify({
    text,
    reply: {
      in_reply_to_tweet_id: inReplyToTweetId,
    },
  });

  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(config, true),
      "Content-Type": "application/json",
    },
    body,
  });

  return parseResponse<XPostTweetResponse>(response);
}
