"use client";

/**
 * Subclass Form Component
 *
 * Story 4.2: Define Subclasses
 * AC-4.2.2: Create subclass with name (1-50 chars)
 *
 * Form for creating a new subclass within an asset class.
 */

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateSubclass } from "@/hooks/use-asset-classes";

interface SubclassFormProps {
  classId: string;
  onSuccess: () => void;
  disabled?: boolean;
}

export function SubclassForm({ classId, onSuccess, disabled }: SubclassFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const { createSubclass, isCreating } = useCreateSubclass();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const result = await createSubclass(classId, { name: name.trim() });

    if (result) {
      setName("");
      setIsOpen(false);
      onSuccess();
    }
  };

  const handleCancel = () => {
    setName("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-full justify-start text-xs text-muted-foreground"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add Subclass
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Subclass name..."
        className="h-7 flex-1 text-sm"
        maxLength={50}
        disabled={isCreating}
        autoFocus
      />
      <Button
        type="submit"
        size="icon"
        className="h-7 w-7"
        disabled={isCreating || name.trim().length === 0}
      >
        {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        <span className="sr-only">Create</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={handleCancel}
        disabled={isCreating}
      >
        Cancel
      </Button>
    </form>
  );
}
