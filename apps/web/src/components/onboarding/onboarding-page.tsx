import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUserRole } from "@/hooks/use-user-role";
import { useSession } from "@/hooks/use-session";
import { TeacherOnboardingForm } from "@/components/onboarding/teacher-onboarding-form";
import { StudentOnboardingForm } from "@/components/onboarding/student-onboarding-form";
import Loader from "@/components/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { role, isLoading } = useUserRole();

  // If user already has a profile, redirect them
  useEffect(() => {
    if (!isLoading) {
      if (role === "teacher") {
        navigate({ to: "/caseload" });
      } else if (role === "student") {
        navigate({ to: "/student-dashboard" });
      }
    }
  }, [role, isLoading, navigate]);

  // Show loading while checking role
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  // If role is still unknown after loading, show onboarding
  // This shouldn't happen due to the redirect above, but handle it anyway
  if (role !== "unknown") {
    return null; // Will redirect
  }

  // Determine which form to show based on URL or user preference
  // For now, we'll show both options and let user choose
  // Or we can detect from the signup flow - let's show both for flexibility

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Complete Your Profile</h1>
        <p className="text-muted-foreground">
          Choose your role and complete your profile to get started
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>I'm a Teacher</CardTitle>
            <CardDescription>
              Create your Speech Language Pathologist profile to manage students and sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeacherOnboardingForm defaultName={session?.user?.name || ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>I'm a Student</CardTitle>
            <CardDescription>
              Create your student profile to join therapy sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudentOnboardingForm defaultName={session?.user?.name || ""} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
