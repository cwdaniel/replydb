/**
 * A reply record as returned by an adapter.
 * This is the raw data from the platform before parsing.
 */
export type ReplyRecord = {
  /** Unique identifier of the reply on the platform */
  replyId: string;
  /** Author's identifier on the platform */
  authorId: string;
  /** The raw text content of the reply */
  text: string;
  /** Timestamp when the reply was created (milliseconds since epoch) */
  createdAt: number;
  /** Number of likes/reactions on the reply */
  likeCount?: number;
};

/**
 * Result of posting a reply through an adapter.
 */
export type PostReplyResult = {
  /** The reply ID assigned by the platform */
  replyId: string;
};

/**
 * Base configuration for all adapters.
 */
export type BaseAdapterConfig = {
  /** Optional custom fetch implementation for testing */
  fetch?: typeof globalThis.fetch;
};
