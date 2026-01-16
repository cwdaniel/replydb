import { describe, it, expect } from "vitest";
import { replayThread } from "./replay.js";
import type { ReplyRecord } from "../adapters/base/types.js";

describe("replayThread", () => {
  describe("insert operations", () => {
    it("should create records from insert events", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "123",
          authorId: "user1",
          text: '{"v":1,"op":"ins","content":{"text":"hello"}}',
          createdAt: 1000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.size).toBe(1);
      expect(result.store.get("r_123")).toMatchObject({
        id: "r_123",
        content: { text: "hello" },
        authorId: "user1",
        createdAt: 1000,
      });
    });

    it("should derive canonical ID even if user provides one", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "456",
          authorId: "user1",
          text: '{"v":1,"op":"ins","id":"custom_id","content":{"text":"hello"}}',
          createdAt: 1000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.has("r_456")).toBe(true);
      expect(result.store.has("custom_id")).toBe(false);
    });
  });

  describe("update operations", () => {
    it("should update existing records", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "123",
          authorId: "user1",
          text: '{"v":1,"op":"ins","content":{"text":"hello","done":false}}',
          createdAt: 1000,
        },
        {
          replyId: "124",
          authorId: "user2",
          text: '{"v":1,"op":"upd","id":"r_123","content":{"done":true}}',
          createdAt: 2000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.size).toBe(1);
      const record = result.store.get("r_123");
      expect(record?.content).toEqual({ text: "hello", done: true });
      expect(record?.updatedAt).toBe(2000);
    });

    it("should ignore updates to non-existent records", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "124",
          authorId: "user1",
          text: '{"v":1,"op":"upd","id":"r_999","content":{"done":true}}',
          createdAt: 1000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.size).toBe(0);
      expect(result.accepted.length).toBe(1);
    });

    it("should shallow merge content updates", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "123",
          authorId: "user1",
          text: '{"v":1,"op":"ins","content":{"a":1,"b":2,"c":3}}',
          createdAt: 1000,
        },
        {
          replyId: "124",
          authorId: "user1",
          text: '{"v":1,"op":"upd","id":"r_123","content":{"b":20}}',
          createdAt: 2000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.get("r_123")?.content).toEqual({ a: 1, b: 20, c: 3 });
    });
  });

  describe("delete operations", () => {
    it("should remove existing records", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "123",
          authorId: "user1",
          text: '{"v":1,"op":"ins","content":{"text":"hello"}}',
          createdAt: 1000,
        },
        {
          replyId: "124",
          authorId: "user2",
          text: '{"v":1,"op":"del","id":"r_123"}',
          createdAt: 2000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.size).toBe(0);
      expect(result.accepted.length).toBe(2);
    });

    it("should ignore deletes for non-existent records", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "124",
          authorId: "user1",
          text: '{"v":1,"op":"del","id":"r_999"}',
          createdAt: 1000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.size).toBe(0);
      expect(result.accepted.length).toBe(1);
    });
  });

  describe("invalid events", () => {
    it("should ignore invalid JSON", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "123",
          authorId: "user1",
          text: "not json at all",
          createdAt: 1000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.size).toBe(0);
      expect(result.accepted.length).toBe(0);
    });

    it("should ignore valid JSON that is not a valid event", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "123",
          authorId: "user1",
          text: '{"message":"just a normal reply"}',
          createdAt: 1000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.size).toBe(0);
      expect(result.accepted.length).toBe(0);
    });
  });

  describe("ordering", () => {
    it("should process events in createdAt order", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "3",
          authorId: "user1",
          text: '{"v":1,"op":"del","id":"r_1"}',
          createdAt: 3000,
        },
        {
          replyId: "1",
          authorId: "user1",
          text: '{"v":1,"op":"ins","content":{"text":"first"}}',
          createdAt: 1000,
        },
        {
          replyId: "2",
          authorId: "user1",
          text: '{"v":1,"op":"upd","id":"r_1","content":{"text":"updated"}}',
          createdAt: 2000,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.size).toBe(0);
      expect(result.accepted.length).toBe(3);
      expect(result.accepted[0]?.event.op).toBe("ins");
      expect(result.accepted[1]?.event.op).toBe("upd");
      expect(result.accepted[2]?.event.op).toBe("del");
    });
  });

  describe("metadata", () => {
    it("should include likeCount in stored records", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "123",
          authorId: "user1",
          text: '{"v":1,"op":"ins","content":{"text":"popular"}}',
          createdAt: 1000,
          likeCount: 42,
        },
      ];

      const result = replayThread(replies);

      expect(result.store.get("r_123")?.likeCount).toBe(42);
    });

    it("should track accepted events with metadata", () => {
      const replies: ReplyRecord[] = [
        {
          replyId: "123",
          authorId: "user1",
          text: '{"v":1,"op":"ins","content":{"text":"hello"}}',
          createdAt: 1000,
        },
      ];

      const result = replayThread(replies);

      expect(result.accepted.length).toBe(1);
      expect(result.accepted[0]?.meta).toMatchObject({
        replyId: "123",
        authorId: "user1",
        createdAt: 1000,
      });
    });
  });
});
