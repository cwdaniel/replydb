import type { ReplyRecord } from "../adapters/base/types.js";
import type { RecordStore, ReplyDBEvent, ReplyMeta, StoredRecord } from "./types.js";
import { deriveRecordId, sortRepliesForReplay } from "./utils.js";
import { parseEventFromText } from "./validator.js";

/**
 * Result of replaying a thread's replies.
 *
 * @typeParam C - The application-specific content type
 */
export type ReplayResult<C = unknown> = {
  /** The materialized record store after replay */
  store: RecordStore<C>;
  /** Events that were successfully parsed and applied */
  accepted: Array<{ event: ReplyDBEvent<C>; meta: ReplyMeta }>;
};

/**
 * Normalize an event by filling in derived/default values.
 *
 * - For ins: derives canonical ID from replyId, ignores user-provided id
 * - Fills missing ts with meta.createdAt
 *
 * @param event - The parsed event
 * @param meta - Reply metadata
 * @returns Normalized event with all fields populated
 */
function normalizeEvent<C>(
  event: ReplyDBEvent<C>,
  meta: ReplyMeta
): ReplyDBEvent<C> & { id: string; ts: number } {
  const ts = event.ts ?? meta.createdAt;

  if (event.op === "ins") {
    // For inserts, always derive canonical ID from replyId
    return {
      ...event,
      id: deriveRecordId(meta.replyId),
      ts,
    };
  }

  // For upd/del, id is required (validator ensures this)
  // If id is somehow missing, use empty string (will be a no-op)
  return {
    ...event,
    id: event.id ?? "",
    ts,
  };
}

/**
 * Apply an insert operation to the store.
 */
function applyInsert<C>(
  store: RecordStore<C>,
  event: ReplyDBEvent<C> & { id: string; ts: number },
  meta: ReplyMeta
): void {
  // Create new record with derived ID
  const record: StoredRecord<C> = {
    id: event.id,
    content: event.content as C,
    createdAt: event.ts,
    updatedAt: event.ts,
    authorId: meta.authorId,
    likeCount: meta.likeCount,
  };
  store.set(event.id, record);
}

/**
 * Apply an update operation to the store.
 */
function applyUpdate<C>(
  store: RecordStore<C>,
  event: ReplyDBEvent<C> & { id: string; ts: number },
  meta: ReplyMeta
): void {
  const existing = store.get(event.id);

  // If record doesn't exist, ignore the update
  if (!existing) {
    return;
  }

  // Shallow merge content (event.content is treated as Partial<C>)
  const updatedContent =
    event.content !== undefined
      ? { ...existing.content, ...(event.content as Partial<C>) }
      : existing.content;

  const updated: StoredRecord<C> = {
    ...existing,
    content: updatedContent,
    updatedAt: event.ts,
    // Optionally update likeCount from latest meta
    likeCount: meta.likeCount ?? existing.likeCount,
  };

  store.set(event.id, updated);
}

/**
 * Apply a delete operation to the store.
 */
function applyDelete<C>(
  store: RecordStore<C>,
  event: ReplyDBEvent<C> & { id: string }
): void {
  // Delete record if it exists (no-op if it doesn't)
  store.delete(event.id);
}

/**
 * Apply a normalized event to the store.
 */
function applyEvent<C>(
  store: RecordStore<C>,
  event: ReplyDBEvent<C> & { id: string; ts: number },
  meta: ReplyMeta
): void {
  switch (event.op) {
    case "ins":
      applyInsert(store, event, meta);
      break;
    case "upd":
      applyUpdate(store, event, meta);
      break;
    case "del":
      applyDelete(store, event);
      break;
  }
}

/**
 * Replay a thread's replies to reconstruct the record store.
 *
 * Algorithm:
 * 1. Sort replies by createdAt, then replyId for stability
 * 2. For each reply:
 *    - Parse JSON and validate event shape
 *    - Create ReplyMeta from reply data
 *    - Normalize event (fill ts, derive id for ins)
 *    - Apply to store (ins/upd/del)
 * 3. Return materialized store and list of accepted events
 *
 * Invalid events are silently ignored.
 *
 * @typeParam C - The application-specific content type
 * @param replies - Array of reply records from the adapter
 * @returns Replay result with store and accepted events
 */
export function replayThread<C = unknown>(
  replies: ReplyRecord[]
): ReplayResult<C> {
  const store: RecordStore<C> = new Map();
  const accepted: Array<{ event: ReplyDBEvent<C>; meta: ReplyMeta }> = [];

  // Sort for deterministic replay
  const sorted = sortRepliesForReplay(replies);

  for (const reply of sorted) {
    // Parse and validate event
    const event = parseEventFromText(reply.text);
    if (!event) {
      // Invalid event, skip
      continue;
    }

    // Create metadata
    const meta: ReplyMeta = {
      replyId: reply.replyId,
      authorId: reply.authorId,
      createdAt: reply.createdAt,
      likeCount: reply.likeCount,
      rawText: reply.text,
    };

    // Normalize event
    const normalized = normalizeEvent(event as ReplyDBEvent<C>, meta);

    // Apply to store
    applyEvent(store, normalized, meta);

    // Track accepted event
    accepted.push({ event: event as ReplyDBEvent<C>, meta });
  }

  return { store, accepted };
}
