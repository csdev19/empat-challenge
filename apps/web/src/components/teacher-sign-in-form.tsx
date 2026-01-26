import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { sessionKeys } from "@/hooks/use-session";

import Loader from "./loader";
import { Button, Input, Label } from "@empat-challenge/web-ui";

export default function TeacherSignInForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: async () => {
            // Invalidate and refetch session to ensure it's up to date
            queryClient.invalidateQueries({ queryKey: sessionKeys.all });
            
            // Wait for session to be available
            const sessionData = await authClient.getSession();
            
            if (sessionData.data) {
              // Update session in query cache
              queryClient.setQueryData(sessionKeys.session(), sessionData.data);
              
              // Navigate to home (will redirect to caseload or onboarding based on profile)
              navigate({
                to: "/",
              });
              toast.success("Welcome back!");
            } else {
              // Fallback: use window location for hard redirect
              window.location.href = "/";
            }
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <>
      <h1 className="mb-6 text-center text-3xl font-bold">Teacher Sign In</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Sign in to your Speech-Language Pathologist account
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="teacher@example.com"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter your password"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? "Signing in..." : "Sign In as Teacher"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </>
  );
}
