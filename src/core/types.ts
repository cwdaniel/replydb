/**
 * Metadata extracted from a social platform reply.
 * This is platform-agnostic and represents the common fields
 * that all adapters must provide.
 */
export type ReplyMeta = {
  /** Unique identifier of the reply on the source platform */
  replyId: string;
  /** Author's identifier on the source platform */
  authorId: string;
  /** Timestamp when the reply was created (milliseconds since epoch) */
  createdAt: number;
  /** Number of likes/reactions on the reply (optional) */
  likeCount?: number;
  /** The raw text content of the reply */
  rawText: string;
};

/**
 * The canonical event envelope used by all ReplyDB applications.
 *
 * Apps define their own `content` type and pass it as the generic parameter.
 * Core handles parsing, ordering, and replay - apps handle content semantics.
 *
 * @typeParam C - The application-specific content type
 */
export type ReplyDBEvent<C = unknown> = {
  /** Schema version, always 1 */
  v: 1;
  /** Operation type: insert, update, or delete */
  op: "ins" | "upd" | "del";
  /**
   * Record identifier.
   * - On `ins`: Ignored (core derives canonical ID from replyId)
   * - On `upd`: Required (must reference existing record)
   * - On `del`: Required (must reference existing record)
   */
  id?: string;
  /**
   * The application-specific content.
   * - On `ins`: Required (the full content to store)
   * - On `upd`: Optional partial patch (shallow merged with existing)
   * - On `del`: Ignored
   */
  content?: C;
  /**
   * Timestamp override. If omitted, uses meta.createdAt.
   */
  ts?: number;
};

/**
 * A stored record in the ReplyDB record store.
 * This is the materialized state after replaying all events.
 *
 * @typeParam C - The application-specific content type
 */
export type StoredRecord<C = unknown> = {
  /** Canonical record ID (derived: r_{replyId}) */
  id: string;
  /** The application-specific content */
  content: C;
  /** When the record was created (from first insert event) */
  createdAt: number;
  /** When the record was last updated */
  updatedAt: number;
  /** Author of the original insert */
  authorId: string;
  /** Like count from the original reply (optional) */
  likeCount?: number;
};

/**
 * The materialized state of all records after replay.
 * A Map keyed by record ID.
 *
 * @typeParam C - The application-specific content type
 */
export type RecordStore<C = unknown> = Map<string, StoredRecord<C>>;

/**
 * Result of the read() operation, containing both the
 * materialized store and the list of accepted events.
 *
 * @typeParam C - The application-specific content type
 */
export type ReadResult<C = unknown> = {
  /** The materialized record store after replay */
  store: RecordStore<C>;
  /** Events that were successfully parsed and applied */
  accepted: Array<{ event: ReplyDBEvent<C>; meta: ReplyMeta }>;
};

/**
 * Result of the append() operation.
 */
export type AppendResult = {
  /** The reply ID assigned by the platform */
  replyId: string;
};
