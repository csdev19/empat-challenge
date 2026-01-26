import { createFileRoute, Link } from "@tanstack/react-router";

import TeacherSignUpForm from "@/components/teacher-sign-up-form";

export const Route = createFileRoute("/auth/teacher/signup")({
  component: TeacherSignUpPage,
});

function TeacherSignUpPage() {
  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <TeacherSignUpForm />
      <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
        <div>
          Already have an account?{" "}
          <Link to="/auth/teacher/login" className="text-primary hover:underline">
            Sign In as Teacher
          </Link>
        </div>
        <div>
          Are you a student?{" "}
          <Link to="/auth/student/signup" className="text-primary hover:underline">
            Sign Up as Student
          </Link>
        </div>
      </div>
    </div>
  );
}
