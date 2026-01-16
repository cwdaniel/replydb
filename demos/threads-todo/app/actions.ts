"use server";

import { revalidatePath } from "next/cache";
import { getDb, isConfigured } from "@/lib/db";
import {
  createTodo,
  setDone,
  rename,
  remove,
  type TodoContent,
  type TodoItem,
} from "@/lib/todoContent";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get all TODO items from the database.
 */
export async function getTodos(): Promise<ActionResult<TodoItem[]>> {
  if (!isConfigured()) {
    return {
      success: false,
      error: "Database not configured. Please set environment variables.",
    };
  }

  const db = getDb();
  if (!db) {
    return { success: false, error: "Failed to initialize database." };
  }

  try {
    const result = await db.read<TodoContent>();
    const todos: TodoItem[] = [];

    for (const [id, record] of result.store) {
      todos.push({
        id,
        content: record.content.content,
        done: record.content.done,
        authorId: record.authorId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        likeCount: record.likeCount,
      });
    }

    // Sort by creation time, newest first
    todos.sort((a, b) => b.createdAt - a.createdAt);

    return { success: true, data: todos };
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Add a new TODO item.
 */
export async function addTodo(formData: FormData): Promise<ActionResult> {
  const content = formData.get("content");

  if (typeof content !== "string" || !content.trim()) {
    return { success: false, error: "Content is required" };
  }

  const db = getDb();
  if (!db) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const event = createTodo(content.trim());
    await db.append(event);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to add todo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add todo",
    };
  }
}

/**
 * Toggle the done status of a TODO item.
 */
export async function toggleTodo(
  id: string,
  done: boolean
): Promise<ActionResult> {
  const db = getDb();
  if (!db) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const event = setDone(id, done);
    await db.append(event);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to toggle todo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update todo",
    };
  }
}

/**
 * Rename a TODO item.
 */
export async function renameTodo(
  id: string,
  content: string
): Promise<ActionResult> {
  if (!content.trim()) {
    return { success: false, error: "Content is required" };
  }

  const db = getDb();
  if (!db) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const event = rename(id, content.trim());
    await db.append(event);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to rename todo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rename todo",
    };
  }
}

/**
 * Delete a TODO item.
 */
export async function deleteTodo(id: string): Promise<ActionResult> {
  const db = getDb();
  if (!db) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const event = remove(id);
    await db.append(event);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete todo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete todo",
    };
  }
}
