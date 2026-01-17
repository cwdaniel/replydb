import type { ReplyDBEvent } from "replydb";

/**
 * Content type for TODO items.
 */
export type TodoContent = {
  content: string;
  done: boolean;
};

/**
 * Stored TODO item with metadata.
 */
export type TodoItem = {
  id: string;
  content: string;
  done: boolean;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  likeCount?: number;
};

/**
 * Create a new TODO insert event.
 */
export function createTodo(content: string): ReplyDBEvent<TodoContent> {
  return {
    v: 1,
    op: "ins",
    content: {
      content,
      done: false,
    },
  };
}

/**
 * Create an update event to change the done status.
 */
export function setDone(
  id: string,
  done: boolean
): ReplyDBEvent<Partial<TodoContent>> {
  return {
    v: 1,
    op: "upd",
    id,
    content: { done },
  };
}

/**
 * Create an update event to rename a TODO.
 */
export function rename(
  id: string,
  content: string
): ReplyDBEvent<Partial<TodoContent>> {
  return {
    v: 1,
    op: "upd",
    id,
    content: { content },
  };
}

/**
 * Create a delete event to remove a TODO.
 */
export function remove(id: string): ReplyDBEvent<never> {
  return {
    v: 1,
    op: "del",
    id,
  };
}
