import { TodoItem } from "./todo-item";
import type { TodoItem as TodoItemType } from "@/lib/todoContent";
import { ListTodo } from "lucide-react";

interface TodoListProps {
  todos: TodoItemType[];
}

export function TodoList({ todos }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ListTodo className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No TODOs yet</p>
        <p className="text-sm">Add one above to get started</p>
      </div>
    );
  }

  const completed = todos.filter((t) => t.done);
  const pending = todos.filter((t) => !t.done);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            To Do ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
