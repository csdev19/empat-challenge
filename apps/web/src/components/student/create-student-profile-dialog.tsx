import { useForm } from "@tanstack/react-form";
import { createStudentProfileSchema } from "@empat-challenge/domain/schemas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@empat-challenge/web-ui";
import { Button, Input, Label } from "@empat-challenge/web-ui";
import { useCreateStudentProfile } from "@/hooks/use-student-profile";
import { toast } from "sonner";
import type z from "zod";

interface CreateStudentProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultName?: string;
}

export function CreateStudentProfileDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultName = "",
}: CreateStudentProfileDialogProps) {
  const createProfile = useCreateStudentProfile();

  const defaultValues: z.infer<typeof createStudentProfileSchema> = {
    name: defaultName,
    age: undefined,
  };
  const form = useForm({
    defaultValues,
    validators: {
      onChange: createStudentProfileSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createProfile.mutateAsync(value);
        toast.success("Student profile created successfully!");
        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create profile";
        toast.error(errorMessage);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Student Profile</DialogTitle>
          <DialogDescription>
            Create your student profile to start joining therapy sessions.
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
                  placeholder="Your full name"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="age">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Age (Optional)</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  value={field.state.value?.toString() || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.handleChange(value ? parseInt(value, 10) : undefined);
                  }}
                  placeholder="Your age"
                  min={1}
                  max={120}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button
                  type="submit"
                  disabled={!state.canSubmit || state.isSubmitting || createProfile.isPending}
                >
                  {createProfile.isPending ? "Creating..." : "Create Profile"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
