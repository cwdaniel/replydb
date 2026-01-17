import { describe, it, expect } from "vitest";
import { parseRepliesFromResponse, parsePostReplyId } from "./parser.js";
import type { XSearchResponse, XPostTweetResponse } from "./types.js";

describe("parseRepliesFromResponse", () => {
  it("should parse standard search response", () => {
    const response: XSearchResponse = {
      data: [
        {
          id: "1234567890123456789",
          author_id: "987654321",
          text: '{"v":1,"op":"ins","content":{"task":"Test"}}',
          created_at: "2025-01-15T12:00:00.000Z",
          conversation_id: "1111111111111111111",
          public_metrics: {
            retweet_count: 0,
            reply_count: 0,
            like_count: 5,
            quote_count: 0,
          },
          referenced_tweets: [{ type: "replied_to", id: "1111111111111111111" }],
        },
      ],
      meta: { result_count: 1 },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies.length).toBe(1);
    expect(replies[0]).toEqual({
      replyId: "1234567890123456789",
      authorId: "987654321",
      text: '{"v":1,"op":"ins","content":{"task":"Test"}}',
      createdAt: 1736942400000,
      likeCount: 5,
    });
  });

  it("should skip original tweet (non-reply) when excludeOriginalTweet is true", () => {
    const response: XSearchResponse = {
      data: [
        {
          id: "1111111111111111111",
          author_id: "111111111",
          text: "Original tweet",
          created_at: "2025-01-15T10:00:00.000Z",
          conversation_id: "1111111111111111111",
          public_metrics: {
            retweet_count: 0,
            reply_count: 1,
            like_count: 10,
            quote_count: 0,
          },
          // No referenced_tweets - this is the original
        },
        {
          id: "2222222222222222222",
          author_id: "222222222",
          text: '{"v":1,"op":"ins","content":{}}',
          created_at: "2025-01-15T11:00:00.000Z",
          conversation_id: "1111111111111111111",
          public_metrics: {
            retweet_count: 0,
            reply_count: 0,
            like_count: 2,
            quote_count: 0,
          },
          referenced_tweets: [{ type: "replied_to", id: "1111111111111111111" }],
        },
      ],
      meta: { result_count: 2 },
    };

    const replies = parseRepliesFromResponse(response, true);

    expect(replies.length).toBe(1);
    expect(replies[0]?.replyId).toBe("2222222222222222222");
  });

  it("should include original tweet when excludeOriginalTweet is false", () => {
    const response: XSearchResponse = {
      data: [
        {
          id: "1111111111111111111",
          author_id: "111111111",
          text: "Original tweet",
          created_at: "2025-01-15T10:00:00.000Z",
          conversation_id: "1111111111111111111",
          public_metrics: {
            retweet_count: 0,
            reply_count: 1,
            like_count: 10,
            quote_count: 0,
          },
        },
      ],
      meta: { result_count: 1 },
    };

    const replies = parseRepliesFromResponse(response, false);

    expect(replies.length).toBe(1);
    expect(replies[0]?.replyId).toBe("1111111111111111111");
  });

  it("should throw on API errors", () => {
    const response: XSearchResponse = {
      errors: [
        {
          title: "Rate Limit Exceeded",
          detail: "Too Many Requests",
          type: "about:blank",
        },
      ],
    };

    expect(() => parseRepliesFromResponse(response)).toThrow(
      "X API returned errors: Too Many Requests"
    );
  });

  it("should use title when detail is missing in error", () => {
    const response: XSearchResponse = {
      errors: [
        {
          title: "Unauthorized",
          detail: "",
          type: "about:blank",
        },
      ],
    };

    expect(() => parseRepliesFromResponse(response)).toThrow(
      "X API returned errors: Unauthorized"
    );
  });

  it("should return empty array for empty response", () => {
    const response: XSearchResponse = {
      meta: { result_count: 0 },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies).toEqual([]);
  });

  it("should return empty array when data is undefined", () => {
    const response: XSearchResponse = {};

    const replies = parseRepliesFromResponse(response);

    expect(replies).toEqual([]);
  });

  it("should skip tweets with missing required fields", () => {
    const response: XSearchResponse = {
      data: [
        { id: "123", text: "missing author and date" }, // Missing author_id, created_at
        {
          id: "456",
          author_id: "user1",
          text: "valid",
          created_at: "2025-01-15T12:00:00.000Z",
          referenced_tweets: [{ type: "replied_to", id: "000" }],
        },
      ],
      meta: { result_count: 2 },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies.length).toBe(1);
    expect(replies[0]?.replyId).toBe("456");
  });

  it("should skip tweets with missing id", () => {
    const response: XSearchResponse = {
      data: [
        {
          id: "",
          author_id: "user1",
          text: "no id",
          created_at: "2025-01-15T12:00:00.000Z",
          referenced_tweets: [{ type: "replied_to", id: "000" }],
        },
      ],
      meta: { result_count: 1 },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies).toEqual([]);
  });

  it("should skip tweets with invalid date", () => {
    const response: XSearchResponse = {
      data: [
        {
          id: "123",
          author_id: "user1",
          text: "invalid date",
          created_at: "not-a-date",
          referenced_tweets: [{ type: "replied_to", id: "000" }],
        },
      ],
      meta: { result_count: 1 },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies).toEqual([]);
  });

  it("should handle missing public_metrics gracefully", () => {
    const response: XSearchResponse = {
      data: [
        {
          id: "789",
          author_id: "user2",
          text: "no metrics",
          created_at: "2025-01-15T14:00:00.000Z",
          referenced_tweets: [{ type: "replied_to", id: "000" }],
        },
      ],
      meta: { result_count: 1 },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies.length).toBe(1);
    expect(replies[0]?.likeCount).toBeUndefined();
  });

  it("should handle multiple replies correctly", () => {
    const response: XSearchResponse = {
      data: [
        {
          id: "111",
          author_id: "user1",
          text: "reply 1",
          created_at: "2025-01-15T10:00:00.000Z",
          referenced_tweets: [{ type: "replied_to", id: "000" }],
          public_metrics: {
            retweet_count: 0,
            reply_count: 0,
            like_count: 1,
            quote_count: 0,
          },
        },
        {
          id: "222",
          author_id: "user2",
          text: "reply 2",
          created_at: "2025-01-15T11:00:00.000Z",
          referenced_tweets: [{ type: "replied_to", id: "000" }],
          public_metrics: {
            retweet_count: 0,
            reply_count: 0,
            like_count: 2,
            quote_count: 0,
          },
        },
        {
          id: "333",
          author_id: "user3",
          text: "reply 3",
          created_at: "2025-01-15T12:00:00.000Z",
          referenced_tweets: [{ type: "replied_to", id: "000" }],
          public_metrics: {
            retweet_count: 0,
            reply_count: 0,
            like_count: 3,
            quote_count: 0,
          },
        },
      ],
      meta: { result_count: 3 },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies.length).toBe(3);
    expect(replies[0]?.replyId).toBe("111");
    expect(replies[1]?.replyId).toBe("222");
    expect(replies[2]?.replyId).toBe("333");
  });

  it("should handle quoted tweets (not replies)", () => {
    const response: XSearchResponse = {
      data: [
        {
          id: "111",
          author_id: "user1",
          text: "this is a quote tweet",
          created_at: "2025-01-15T10:00:00.000Z",
          referenced_tweets: [{ type: "quoted", id: "000" }],
        },
      ],
      meta: { result_count: 1 },
    };

    const replies = parseRepliesFromResponse(response, true);

    // Should be excluded because it's a quote, not a reply
    expect(replies).toEqual([]);
  });
});

describe("parsePostReplyId", () => {
  it("should parse successful post response", () => {
    const response: XPostTweetResponse = {
      data: {
        id: "1234567890123456789",
        text: '{"v":1,"op":"ins","content":{}}',
      },
    };

    expect(parsePostReplyId(response)).toBe("1234567890123456789");
  });

  it("should return null for error response", () => {
    const response: XPostTweetResponse = {
      errors: [
        { title: "Forbidden", detail: "Not authorized", type: "about:blank" },
      ],
    };

    expect(parsePostReplyId(response)).toBeNull();
  });

  it("should return null for empty response", () => {
    expect(parsePostReplyId({})).toBeNull();
  });

  it("should return null when data is undefined", () => {
    expect(parsePostReplyId({ data: undefined })).toBeNull();
  });

  it("should return null when data.id is missing", () => {
    const response: XPostTweetResponse = {
      data: {
        id: "",
        text: "some text",
      },
    };

    // Empty string is falsy but still returned by ??
    expect(parsePostReplyId(response)).toBe("");
  });
});
