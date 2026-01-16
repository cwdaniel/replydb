import type { ReplyRecord } from "../adapters/base/types.js";

/**
 * Generate a canonical record ID from a reply ID.
 * This ensures deterministic ID generation across replays.
 *
 * @param replyId - The platform-specific reply identifier
 * @returns Canonical record ID in format: r_{replyId}
 */
export function deriveRecordId(replyId: string): string {
  return `r_${replyId}`;
}

/**
 * Sort reply records for deterministic replay.
 * Primary sort: createdAt ascending
 * Secondary sort: replyId ascending (for stability when timestamps match)
 *
 * @param replies - Array of reply records to sort
 * @returns New sorted array (does not mutate input)
 */
export function sortRepliesForReplay(replies: ReplyRecord[]): ReplyRecord[] {
  return [...replies].sort((a, b) => {
    const timeDiff = a.createdAt - b.createdAt;
    if (timeDiff !== 0) return timeDiff;
    return a.replyId.localeCompare(b.replyId);
  });
}
