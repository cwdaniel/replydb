import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReplyDB } from "./ReplyDB.js";
import type { Adapter } from "../adapters/base/Adapter.js";
import type { ReplyRecord, PostReplyResult } from "../adapters/base/types.js";

function createMockAdapter(
  replies: ReplyRecord[] = []
): Adapter & { postReply: ReturnType<typeof vi.fn> } {
  return {
    fetchReplies: vi.fn().mockResolvedValue(replies),
    postReply: vi.fn().mockResolvedValue({ replyId: "new_123" } as PostReplyResult),
  };
}

describe("ReplyDB", () => {
  describe("read", () => {
    it("should fetch replies and replay them", async () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "1",
          authorId: "user1",
          text: '{"v":1,"op":"ins","content":{"text":"hello"}}',
          createdAt: 1000,
        },
      ];

      const adapter = createMockAdapter(replies);
      const db = new ReplyDB({ adapter, threadId: "thread_123" });

      const result = await db.read<{ text: string }>();

      expect(adapter.fetchReplies).toHaveBeenCalledWith("thread_123");
      expect(result.store.size).toBe(1);
      expect(result.store.get("r_1")?.content.text).toBe("hello");
    });

    it("should return empty store for no valid events", async () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "1",
          authorId: "user1",
          text: "just a comment",
          createdAt: 1000,
        },
      ];

      const adapter = createMockAdapter(replies);
      const db = new ReplyDB({ adapter, threadId: "thread_123" });

      const result = await db.read();

      expect(result.store.size).toBe(0);
      expect(result.accepted.length).toBe(0);
    });
  });

  describe("append", () => {
    let adapter: ReturnType<typeof createMockAdapter>;
    let db: ReplyDB;

    beforeEach(() => {
      adapter = createMockAdapter();
      db = new ReplyDB({ adapter, threadId: "thread_123" });
    });

    it("should post serialized event via adapter", async () => {
      const result = await db.append({ v: 1, op: "ins", content: { text: "hello" } });

      expect(adapter.postReply).toHaveBeenCalledWith(
        "thread_123",
        '{"v":1,"op":"ins","content":{"text":"hello"}}'
      );
      expect(result.replyId).toBe("new_123");
    });

    it("should ensure version is set to 1", async () => {
      await db.append({ v: 1, op: "ins", content: { text: "hello" } });

      const call = adapter.postReply.mock.calls[0] as [string, string];
      const posted = JSON.parse(call[1]) as { v: number };
      expect(posted.v).toBe(1);
    });

    it("should serialize delete events", async () => {
      await db.append({ v: 1, op: "del", id: "r_123" });

      expect(adapter.postReply).toHaveBeenCalledWith(
        "thread_123",
        '{"v":1,"op":"del","id":"r_123"}'
      );
    });

    it("should serialize update events", async () => {
      await db.append({ v: 1, op: "upd", id: "r_123", content: { done: true } });

      expect(adapter.postReply).toHaveBeenCalledWith(
        "thread_123",
        '{"v":1,"op":"upd","id":"r_123","content":{"done":true}}'
      );
    });
  });

  describe("getThreadId", () => {
    it("should return the configured thread ID", () => {
      const adapter = createMockAdapter();
      const db = new ReplyDB({ adapter, threadId: "my_thread" });

      expect(db.getThreadId()).toBe("my_thread");
    });
  });
});
