import type { BaseAdapterConfig } from "../base/types.js";

/**
 * Configuration for the X (Twitter) adapter.
 *
 * Supports two authentication modes:
 * 1. Bearer Token (App-only): For reading public replies only
 * 2. OAuth 2.0 User Context: Required for posting replies
 */
export type XConfig = BaseAdapterConfig & {
  /** X API v2 base URL (default: https://api.x.com/2) */
  apiBaseUrl?: string;

  /**
   * Bearer token for App-only authentication.
   * Sufficient for reading public tweets/replies.
   * Obtain from X Developer Portal.
   */
  bearerToken?: string;

  /**
   * OAuth 2.0 Access Token for User Context authentication.
   * Required for posting replies.
   * Must have tweet.read and tweet.write scopes.
   */
  oauthAccessToken?: string;

  /**
   * OAuth 2.0 Refresh Token for token refresh.
   * Optional but recommended for long-running applications.
   */
  oauthRefreshToken?: string;

  /**
   * Search method for fetching replies.
   * - "recent": Last 7 days (available on all tiers)
   * - "all": Full archive (requires Academic Research or Enterprise tier)
   */
  searchTier?: "recent" | "all";

  /**
   * Maximum results per request (10-100, default: 100).
   */
  maxResults?: number;
};

/**
 * Default X API v2 base URL.
 */
export const DEFAULT_API_BASE_URL = "https://api.x.com/2";

/**
 * Public metrics for a tweet.
 */
export type XPublicMetrics = {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  bookmark_count?: number;
  impression_count?: number;
};

/**
 * A tweet object from the X API v2.
 */
export type XTweet = {
  id: string;
  text?: string;
  author_id?: string;
  created_at?: string; // ISO 8601 format
  conversation_id?: string;
  in_reply_to_user_id?: string;
  public_metrics?: XPublicMetrics;
  referenced_tweets?: Array<{
    type: "replied_to" | "quoted" | "retweeted";
    id: string;
  }>;
};

/**
 * Search response from X API v2.
 */
export type XSearchResponse = {
  data?: XTweet[];
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count: number;
    next_token?: string;
  };
  errors?: XApiError[];
};

/**
 * Response from posting a tweet.
 */
export type XPostTweetResponse = {
  data?: {
    id: string;
    text: string;
  };
  errors?: XApiError[];
};

/**
 * X API error structure.
 */
export type XApiError = {
  title: string;
  detail: string;
  type: string;
  status?: number;
  resource_type?: string;
  parameter?: string;
  value?: string;
};
