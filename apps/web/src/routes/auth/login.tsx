import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@empat-challenge/web-ui";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { clientTreaty } from "@/lib/client-treaty";

import SignInForm from "@/components/sign-in-form";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  // Check API health
  const {
    data: healthData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const result = await clientTreaty.api.v1.health.get();
      if (result.error) {
        throw new Error("API is not reachable");
      }
      return result.data;
    },
    retry: 1,
  });

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      {/* API Health Status */}
      {!isLoading && (
        <div className="mb-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cannot connect to the server. Please check your connection.
              </AlertDescription>
            </Alert>
          ) : healthData ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Server is online and ready</AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}

      <SignInForm />
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link to="/auth/signup" className="text-primary hover:underline">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
