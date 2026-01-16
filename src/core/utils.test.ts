import { describe, it, expect } from "vitest";
import { deriveRecordId, sortRepliesForReplay } from "./utils.js";
import type { ReplyRecord } from "../adapters/base/types.js";

describe("deriveRecordId", () => {
  it("should prefix replyId with r_", () => {
    expect(deriveRecordId("123456")).toBe("r_123456");
    expect(deriveRecordId("abc")).toBe("r_abc");
    expect(deriveRecordId("")).toBe("r_");
  });
});

describe("sortRepliesForReplay", () => {
  it("should sort by createdAt ascending", () => {
    const replies: ReplyRecord[] = [
      { replyId: "c", authorId: "user1", text: "{}", createdAt: 3000 },
      { replyId: "a", authorId: "user1", text: "{}", createdAt: 1000 },
      { replyId: "b", authorId: "user1", text: "{}", createdAt: 2000 },
    ];

    const sorted = sortRepliesForReplay(replies);

    expect(sorted[0]?.replyId).toBe("a");
    expect(sorted[1]?.replyId).toBe("b");
    expect(sorted[2]?.replyId).toBe("c");
  });

  it("should use replyId as tiebreaker when createdAt is equal", () => {
    const replies: ReplyRecord[] = [
      { replyId: "z", authorId: "user1", text: "{}", createdAt: 1000 },
      { replyId: "a", authorId: "user1", text: "{}", createdAt: 1000 },
      { replyId: "m", authorId: "user1", text: "{}", createdAt: 1000 },
    ];

    const sorted = sortRepliesForReplay(replies);

    expect(sorted[0]?.replyId).toBe("a");
    expect(sorted[1]?.replyId).toBe("m");
    expect(sorted[2]?.replyId).toBe("z");
  });

  it("should not mutate the original array", () => {
    const replies: ReplyRecord[] = [
      { replyId: "b", authorId: "user1", text: "{}", createdAt: 2000 },
      { replyId: "a", authorId: "user1", text: "{}", createdAt: 1000 },
    ];

    const sorted = sortRepliesForReplay(replies);

    expect(replies[0]?.replyId).toBe("b");
    expect(sorted[0]?.replyId).toBe("a");
    expect(sorted).not.toBe(replies);
  });

  it("should handle empty array", () => {
    const sorted = sortRepliesForReplay([]);
    expect(sorted).toEqual([]);
  });
});
