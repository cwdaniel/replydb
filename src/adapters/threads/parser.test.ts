import { describe, it, expect } from "vitest";
import { parseRepliesFromResponse, parsePostReplyId } from "./parser.js";
import type { ThreadsGraphQLResponse } from "./types.js";

describe("parseRepliesFromResponse", () => {
  it("should parse mediaData.replies.edges structure", () => {
    const response: ThreadsGraphQLResponse = {
      data: {
        mediaData: {
          replies: {
            edges: [
              {
                node: {
                  post: {
                    pk: "123",
                    user: { pk: "user1" },
                    caption: { text: '{"v":1,"op":"ins","content":{}}' },
                    taken_at: 1000,
                    text_post_app_info: { like_count: 5 },
                  },
                },
              },
            ],
          },
        },
      },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies.length).toBe(1);
    expect(replies[0]).toEqual({
      replyId: "123",
      authorId: "user1",
      text: '{"v":1,"op":"ins","content":{}}',
      createdAt: 1000000,
      likeCount: 5,
    });
  });

  it("should parse data.data.containing_thread.thread_items structure", () => {
    const response: ThreadsGraphQLResponse = {
      data: {
        data: {
          containing_thread: {
            thread_items: [
              {
                post: {
                  pk: "456",
                  user: { pk: "user2" },
                  caption: { text: '{"v":1,"op":"ins","content":{}}' },
                  taken_at: 2000,
                },
              },
            ],
          },
        },
      },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies.length).toBe(1);
    expect(replies[0]?.replyId).toBe("456");
  });

  it("should skip items with line_type squiggle", () => {
    const response: ThreadsGraphQLResponse = {
      data: {
        data: {
          containing_thread: {
            thread_items: [
              {
                line_type: "squiggle",
                post: {
                  pk: "original",
                  user: { pk: "user1" },
                  caption: { text: "original post" },
                  taken_at: 1000,
                },
              },
              {
                post: {
                  pk: "reply1",
                  user: { pk: "user2" },
                  caption: { text: "reply" },
                  taken_at: 2000,
                },
              },
            ],
          },
        },
      },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies.length).toBe(1);
    expect(replies[0]?.replyId).toBe("reply1");
  });

  it("should throw on API errors", () => {
    const response: ThreadsGraphQLResponse = {
      errors: [{ message: "Rate limited" }, { message: "Try again" }],
    };

    expect(() => parseRepliesFromResponse(response)).toThrow(
      "Threads API returned errors: Rate limited, Try again"
    );
  });

  it("should skip nodes with missing required fields", () => {
    const response: ThreadsGraphQLResponse = {
      data: {
        mediaData: {
          replies: {
            edges: [
              { node: { post: { pk: "123" } } },
              {
                node: {
                  post: {
                    pk: "456",
                    user: { pk: "user1" },
                    caption: { text: "valid" },
                    taken_at: 1000,
                  },
                },
              },
            ],
          },
        },
      },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies.length).toBe(1);
    expect(replies[0]?.replyId).toBe("456");
  });

  it("should fallback to id if pk is not available", () => {
    const response: ThreadsGraphQLResponse = {
      data: {
        mediaData: {
          replies: {
            edges: [
              {
                node: {
                  post: {
                    id: "fallback_id",
                    user: { id: "user_fallback" },
                    caption: { text: "test" },
                    taken_at: 1000,
                  },
                },
              },
            ],
          },
        },
      },
    };

    const replies = parseRepliesFromResponse(response);

    expect(replies[0]?.replyId).toBe("fallback_id");
    expect(replies[0]?.authorId).toBe("user_fallback");
  });
});

describe("parsePostReplyId", () => {
  it("should parse create_text_post_reply response", () => {
    const response = {
      data: {
        create_text_post_reply: {
          media: {
            pk: "new_123",
          },
        },
      },
    };

    expect(parsePostReplyId(response)).toBe("new_123");
  });

  it("should parse xdt_create_text_post_reply response", () => {
    const response = {
      data: {
        xdt_create_text_post_reply: {
          media: {
            pk: "new_456",
          },
        },
      },
    };

    expect(parsePostReplyId(response)).toBe("new_456");
  });

  it("should return null for invalid response", () => {
    expect(parsePostReplyId(null)).toBeNull();
    expect(parsePostReplyId({})).toBeNull();
    expect(parsePostReplyId({ data: {} })).toBeNull();
    expect(parsePostReplyId({ data: { other: {} } })).toBeNull();
  });

  it("should fallback to id if pk not available", () => {
    const response = {
      data: {
        create_text_post_reply: {
          media: {
            id: "fallback_789",
          },
        },
      },
    };

    expect(parsePostReplyId(response)).toBe("fallback_789");
  });
});
