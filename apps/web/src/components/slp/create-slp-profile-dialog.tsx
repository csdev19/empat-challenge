import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@empat-challenge/web-ui";
import { Button, Input, Label } from "@empat-challenge/web-ui";
import { useCreateSLP } from "@/hooks/use-slp";
import type { createSLPSchema } from "@empat-challenge/domain/schemas";

interface CreateSLPProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultName?: string;
}

export function CreateSLPProfileDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultName = "",
}: CreateSLPProfileDialogProps) {
  const createSLP = useCreateSLP();

  const defaultValues: z.infer<typeof createSLPSchema> = {
    name: defaultName,
    phone: undefined,
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      try {
        await createSLP.mutateAsync({
          name: value.name,
          phone: value.phone || undefined,
        });
        toast.success("SLP profile created successfully!");
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create SLP profile";
        toast.error(errorMessage);
      }
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        phone: z.string().optional(),
      }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create SLP Profile</DialogTitle>
          <DialogDescription>
            Create your Speech Language Pathologist profile to start using the platform.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Dr. Jane Smith"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Phone (Optional)</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="tel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="+1-555-0100"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createSLP.isPending}
            >
              Cancel
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button
                  type="submit"
                  disabled={!state.canSubmit || state.isSubmitting || createSLP.isPending}
                >
                  {createSLP.isPending ? "Creating..." : "Create Profile"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
