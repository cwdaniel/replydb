"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTodo } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      Add
    </Button>
  );
}

interface AddTodoFormProps {
  disabled?: boolean;
}

export function AddTodoForm({ disabled }: AddTodoFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    const result = await addTodo(formData);
    if (result.success) {
      formRef.current?.reset();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex gap-2">
      <Input
        name="content"
        placeholder="What needs to be done?"
        disabled={disabled}
        required
        className="flex-1"
      />
      <SubmitButton />
    </form>
  );
}
