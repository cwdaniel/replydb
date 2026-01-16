import type { BaseAdapterConfig } from "../base/types.js";

/**
 * Configuration for the Threads adapter.
 *
 * Supports two modes:
 * 1. Template mode (recommended): Use full request body captured from browser
 * 2. Legacy mode: Use doc_id and build request (may not work with current API)
 */
export type ThreadsConfig = BaseAdapterConfig & {
  /** GraphQL endpoint URL (default: https://www.threads.com/api/graphql) */
  graphqlEndpoint?: string;

  /**
   * Full request body template for read operations (captured from browser).
   * This is the recommended approach as it includes all dynamic parameters.
   */
  readRequestBody?: string;

  /**
   * Full request body template for write operations (captured from browser).
   */
  writeRequestBody?: string;

  /**
   * Cookie header for authentication.
   * Required for the template-based approach.
   */
  cookie?: string;

  // Legacy fields (may not work with current API)
  /** @deprecated Use readRequestBody instead */
  readDocId?: string;
  /** @deprecated Use writeRequestBody instead */
  writeDocId?: string;
  /** @deprecated Use cookie instead */
  headers?: Record<string, string>;
};

/**
 * Default GraphQL endpoint for Threads.
 */
export const DEFAULT_GRAPHQL_ENDPOINT = "https://www.threads.com/api/graphql";

/**
 * A user node in the Threads GraphQL response.
 */
export type ThreadsUserNode = {
  pk?: string;
  id?: string;
  username?: string;
};

/**
 * A reply node in the Threads GraphQL response.
 */
export type ThreadsReplyNode = {
  post?: {
    pk?: string;
    id?: string;
    code?: string;
    taken_at?: number;
    text_post_app_info?: {
      direct_reply_count?: number;
      like_count?: number;
    };
    caption?: {
      text?: string;
    };
    user?: ThreadsUserNode;
  };
};

/**
 * Edge wrapper for reply nodes.
 */
export type ThreadsReplyEdge = {
  node?: ThreadsReplyNode;
};

/**
 * The replies connection in GraphQL response.
 */
export type ThreadsRepliesConnection = {
  edges?: ThreadsReplyEdge[];
  page_info?: {
    has_next_page?: boolean;
    end_cursor?: string;
  };
};

/**
 * The containing thread media structure.
 */
export type ThreadsMediaData = {
  reply_facepile_users?: unknown[];
  text_post_app_info?: {
    direct_reply_count?: number;
    like_count?: number;
  };
  replies?: ThreadsRepliesConnection;
};

/**
 * Root GraphQL response structure for fetching replies.
 */
export type ThreadsGraphQLResponse = {
  data?: {
    mediaData?: ThreadsMediaData;
    data?: {
      containing_thread?: {
        thread_items?: Array<{
          post?: ThreadsReplyNode["post"];
          line_type?: string;
        }>;
      };
      reply_threads?: Array<{
        thread_items?: Array<{
          post?: ThreadsReplyNode["post"];
        }>;
      }>;
    };
  };
  errors?: Array<{
    message: string;
    code?: number;
  }>;
};

/**
 * Variables for the read query.
 */
export type ReadQueryVariables = {
  postID?: string;
  mediaID?: string;
  [key: string]: unknown;
};

/**
 * Variables for the write mutation.
 */
export type WriteQueryVariables = {
  reply_to_media_id?: string;
  text?: string;
  [key: string]: unknown;
};

/**
 * Response from posting a reply.
 */
export type ThreadsPostResponse = {
  data?: {
    create_text_post_reply?: {
      media?: {
        pk?: string;
        id?: string;
        code?: string;
      };
    };
    xdt_create_text_post_reply?: {
      media?: {
        pk?: string;
        id?: string;
        code?: string;
      };
    };
  };
  errors?: Array<{
    message: string;
    code?: number;
  }>;
};
