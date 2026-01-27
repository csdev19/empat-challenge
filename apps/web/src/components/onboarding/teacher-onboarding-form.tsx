import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { createSLPSchema } from "@empat-challenge/domain/schemas";
import { Button, Input, Label } from "@empat-challenge/web-ui";
import { useCreateSLP } from "@/hooks/use-slp";
import { toast } from "sonner";
import type z from "zod";

interface TeacherOnboardingFormProps {
  defaultName?: string;
}

export function TeacherOnboardingForm({ defaultName = "" }: TeacherOnboardingFormProps) {
  const navigate = useNavigate();
  const createSLP = useCreateSLP();

  const defaultValues: z.infer<typeof createSLPSchema> = {
    name: defaultName,
    phone: undefined,
  };
  const form = useForm({
    defaultValues,
    validators: {
      onChange: createSLPSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createSLP.mutateAsync(value);
        toast.success("Teacher profile created successfully!");
        navigate({ to: "/caseload" });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create profile";
        toast.error(errorMessage);
      }
    },
  });

  return (
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
            <Label htmlFor={field.name}>Full Name *</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Your full name"
              required
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
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value || undefined)}
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

      <form.Subscribe>
        {(state) => (
          <Button
            type="submit"
            className="w-full"
            disabled={!state.canSubmit || state.isSubmitting || createSLP.isPending}
          >
            {createSLP.isPending ? "Creating Profile..." : "Create Teacher Profile"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
