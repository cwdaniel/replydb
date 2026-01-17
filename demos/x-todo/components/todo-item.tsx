"use client";

import { useState, useTransition } from "react";
import { Trash2, Pencil, Check, X, Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toggleTodo, renameTodo, deleteTodo } from "@/app/actions";
import type { TodoItem as TodoItemType } from "@/lib/todoContent";

interface TodoItemProps {
  todo: TodoItemType;
  readOnly?: boolean;
}

export function TodoItem({ todo, readOnly }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.content);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    if (readOnly) return;
    startTransition(async () => {
      await toggleTodo(todo.id, checked);
    });
  }

  function handleDelete() {
    if (readOnly) return;
    startTransition(async () => {
      await deleteTodo(todo.id);
    });
  }

  function handleStartEdit() {
    if (readOnly) return;
    setEditValue(todo.content);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditValue(todo.content);
  }

  function handleSaveEdit() {
    if (editValue.trim() === todo.content) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await renameTodo(todo.id, editValue);
      if (result.success) {
        setIsEditing(false);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
        todo.done && "bg-muted/50",
        isPending && "opacity-50"
      )}
    >
      <Checkbox
        checked={todo.done}
        onCheckedChange={handleToggle}
        disabled={isPending || readOnly}
      />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSaveEdit}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancelEdit}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm truncate",
                todo.done && "line-through text-muted-foreground"
              )}
            >
              {todo.content}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground font-mono">
                {todo.id}
              </span>
              {todo.likeCount !== undefined && todo.likeCount > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3" />
                  {todo.likeCount}
                </span>
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStartEdit}
                disabled={isPending}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isPending}
                className="text-destructive hover:text-destructive"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
