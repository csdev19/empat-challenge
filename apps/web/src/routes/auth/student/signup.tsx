import { createFileRoute, Link } from "@tanstack/react-router";

import StudentSignUpForm from "@/components/student-sign-up-form";

export const Route = createFileRoute("/auth/student/signup")({
  component: StudentSignUpPage,
});

function StudentSignUpPage() {
  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <StudentSignUpForm />
      <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
        <div>
          Already have an account?{" "}
          <Link to="/auth/student/login" className="text-primary hover:underline">
            Sign In as Student
          </Link>
        </div>
        <div>
          Are you a teacher?{" "}
          <Link to="/auth/teacher/signup" className="text-primary hover:underline">
            Sign Up as Teacher
          </Link>
        </div>
      </div>
    </div>
  );
}
