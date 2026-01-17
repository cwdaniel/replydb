import { ReplyDB } from "replydb";
import { XAdapter } from "replydb/adapters/x";

export type DbConfig = {
  tweetId: string;
  bearerToken?: string;
  oauthAccessToken?: string;
  searchTier?: "recent" | "all";
};

function getConfig(): DbConfig | null {
  const tweetId = process.env.TWEET_ID;

  if (!tweetId) {
    return null;
  }

  const bearerToken = process.env.BEARER_TOKEN;
  const oauthAccessToken = process.env.OAUTH_ACCESS_TOKEN;

  if (!bearerToken && !oauthAccessToken) {
    console.error(
      "Missing authentication. Set BEARER_TOKEN (for reading) or OAUTH_ACCESS_TOKEN (for reading and writing)."
    );
    return null;
  }

  const searchTier = process.env.SEARCH_TIER as "recent" | "all" | undefined;

  return {
    tweetId,
    bearerToken,
    oauthAccessToken,
    searchTier: searchTier === "all" ? "all" : "recent",
  };
}

let dbInstance: ReplyDB | null = null;

export function getDb(): ReplyDB | null {
  if (dbInstance) {
    return dbInstance;
  }

  const config = getConfig();
  if (!config) {
    return null;
  }

  const adapter = new XAdapter({
    bearerToken: config.bearerToken,
    oauthAccessToken: config.oauthAccessToken,
    searchTier: config.searchTier,
  });

  dbInstance = new ReplyDB({
    adapter,
    threadId: config.tweetId,
  });

  return dbInstance;
}

export function isConfigured(): boolean {
  return getConfig() !== null;
}

export function canWrite(): boolean {
  const config = getConfig();
  return config !== null && !!config.oauthAccessToken;
}
